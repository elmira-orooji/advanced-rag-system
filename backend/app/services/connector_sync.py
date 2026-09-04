import hashlib
import hmac
import html
import ipaddress
import json
import os
import re
import socket
import shutil
import tempfile
import uuid
import xml.etree.ElementTree as ET
from collections.abc import Iterator
from datetime import datetime, timezone
from dataclasses import dataclass, field
from html.parser import HTMLParser
from http.client import HTTPSConnection
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, parse_qsl, quote, urlencode, urlparse
from urllib.request import Request, HTTPSHandler, HTTPRedirectHandler, ProxyHandler, build_opener

from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.core.config import BASE_DIR, UPLOAD_DIR, document_storage_relative
from app.db.database import SessionLocal
from app.models.chunk import Chunk
from app.models.connector import Connector, ConnectorItem
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.services.qdrant import QdrantClient
from app.services.text_chunker import hierarchical_chunks
from app.services.chunk_enrichment import enrich_chunk
from app.services.incremental_index import checksum, incremental_chunks
from app.services.connector_secrets import ConnectorSecretError, get_connector_credentials

MAX_REMOTE_BYTES = 2 * 1024 * 1024
MAX_GITHUB_FILES = 40
ALLOWED_EXTENSIONS = {".md", ".txt", ".rst", ".py", ".ts", ".tsx", ".js", ".json", ".yaml", ".yml"}


class ConnectorSyncError(RuntimeError):
    pass


CLOUD_CONNECTORS = {"google_drive", "s3", "sharepoint"}


def _organization_credentials(organization_id: uuid.UUID, connector_type: str) -> dict[str, str]:
    try:
        return get_connector_credentials(organization_id, connector_type)
    except ConnectorSecretError as exc:
        raise ConnectorSyncError(str(exc)) from exc


@dataclass
class SourceSnapshot:
    """Streaming source contract.

    ``source_iterator`` yields ``(external_id, title, text, url)`` tuples one
    at a time so that only ``STREAM_BATCH_SIZE`` documents are ever held in
    RAM.  ``observed_ids`` is populated lazily as the iterator is consumed and
    **must** be read only after the iterator is exhausted (i.e. after the apply
    loop finishes).
    """
    source_iterator: Iterator[tuple[str, str, str, str]]
    observed_ids: set[str] = field(default_factory=set)
    complete: bool = False


# Maximum number of documents to hold in memory before flushing to DB.
# With true streaming fetchers this now bounds BOTH fetch and apply RAM.
STREAM_BATCH_SIZE = 50


@dataclass
class ExternalDocumentState:
    document_id: str
    filename: str
    chunks: list[dict[str, object]]
    directory: Path
    # Snapshot of the document directory stored on disk to avoid holding large
    # binary payloads in RAM during compensation.  ``snapshot_dir`` points to a
    # temporary folder that mirrors the original layout; it is cleaned up when
    # ``cleanup`` is invoked.
    snapshot_dir: Path | None
    existed: bool

    def cleanup(self) -> None:
        if self.snapshot_dir is not None and self.snapshot_dir.exists():
            shutil.rmtree(self.snapshot_dir, ignore_errors=True)
            self.snapshot_dir = None


def _chunk_payload(document: Document) -> list[dict[str, object]]:
    return [
        {"id": str(chunk.id), "chunk_index": chunk.chunk_index, "content": chunk.content}
        for chunk in document.chunks
    ]


def _capture_external_state(document: Document, existed: bool) -> ExternalDocumentState:
    directory = UPLOAD_DIR / str(document.id)
    snapshot_dir: Path | None = None
    if directory.is_dir():
        # Stream the existing files to a temporary directory instead of loading
        # them entirely into RAM.  This keeps compensation memory-safe even when
        # a batch contains very large documents.
        snapshot_dir = Path(tempfile.mkdtemp(prefix="connector_snapshot_"))
        for source_path in directory.rglob("*"):
            if not source_path.is_file():
                continue
            relative = source_path.relative_to(directory)
            destination = snapshot_dir / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            with source_path.open("rb") as src, destination.open("wb") as dst:
                shutil.copyfileobj(src, dst)
    return ExternalDocumentState(
        document_id=str(document.id),
        filename=document.filename,
        chunks=_chunk_payload(document),
        directory=directory,
        snapshot_dir=snapshot_dir,
        existed=existed,
    )


def _replace_document_vectors(qdrant: QdrantClient, document: Document) -> None:
    qdrant.replace_document_chunks(str(document.id), document.filename, _chunk_payload(document))


def _restore_external_states(
    qdrant: QdrantClient,
    states: list[ExternalDocumentState],
    original_error: Exception,
) -> None:
    compensation_errors: list[str] = []
    try:
        for state in reversed(states):
            try:
                if state.directory.exists():
                    shutil.rmtree(state.directory)
                if state.snapshot_dir is not None and state.snapshot_dir.exists():
                    # Stream the snapshot back to the document directory so we
                    # never hold an entire file tree in RAM during rollback.
                    state.directory.mkdir(parents=True, exist_ok=True)
                    for snapshot_path in state.snapshot_dir.rglob("*"):
                        if not snapshot_path.is_file():
                            continue
                        relative = snapshot_path.relative_to(state.snapshot_dir)
                        destination = state.directory / relative
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        with snapshot_path.open("rb") as src, destination.open("wb") as dst:
                            shutil.copyfileobj(src, dst)
            except Exception as exc:
                compensation_errors.append(f"files for document {state.document_id}: {exc}")
            finally:
                # Always release the temporary snapshot regardless of success.
                state.cleanup()
            try:
                if state.existed:
                    qdrant.replace_document_chunks(state.document_id, state.filename, state.chunks)
                else:
                    qdrant.delete_document(state.document_id)
            except Exception as exc:
                compensation_errors.append(f"vectors for document {state.document_id}: {exc}")
    finally:
        # Belt-and-braces cleanup if the loop aborts unexpectedly.
        for state in states:
            state.cleanup()
    if compensation_errors and hasattr(original_error, "add_note"):
        original_error.add_note("External compensation errors: " + "; ".join(compensation_errors))


class TextHTMLParser(HTMLParser):
    def __init__(self): super().__init__(); self.parts: list[str] = []; self.skip = 0; self.title = ""
    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript", "svg"}: self.skip += 1
        if tag in {"p", "br", "h1", "h2", "h3", "li", "article", "section"}: self.parts.append("\n")
    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg"} and self.skip: self.skip -= 1
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)


def _validate_public_url(value: str, github_only: bool = False) -> list:
    try:
        parsed = urlparse(value)
        port = parsed.port or 443
    except ValueError as exc:
        raise ConnectorSyncError("Invalid source URL") from exc
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ConnectorSyncError("Only public HTTPS URLs are allowed")
    if github_only and parsed.hostname.lower() != "github.com":
        raise ConnectorSyncError("GitHub connectors require a github.com repository URL")
    try: addresses = socket.getaddrinfo(parsed.hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc: raise ConnectorSyncError("Could not resolve the source host") from exc
    if not addresses:
        raise ConnectorSyncError("Could not resolve the source host")
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global or ip.is_multicast: raise ConnectorSyncError("Private or local network addresses are not allowed")
    return addresses


class _PublicHTTPSConnection(HTTPSConnection):
    def connect(self):
        if self._tunnel_host:
            raise ConnectorSyncError("Connector proxy tunnels are not allowed")
        host = f"[{self.host}]" if ":" in self.host else self.host
        addresses = _validate_public_url(f"https://{host}:{self.port}")
        # Connect to the checked sockaddr directly: never resolve the hostname again.
        for index, (family, socktype, proto, _, sockaddr) in enumerate(addresses):
            sock = socket.socket(family, socktype, proto)
            try:
                sock.settimeout(self.timeout)
                sock.connect(sockaddr)
                self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
                return
            except OSError:
                sock.close()
                if index == len(addresses) - 1:
                    raise


class _PublicHTTPSHandler(HTTPSHandler):
    def https_open(self, request):
        return self.do_open(_PublicHTTPSConnection, request, context=self._context)


class _PublicRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        _validate_public_url(newurl)
        # Do not forward bearer tokens, signed headers, or OAuth bodies on redirects.
        if request.has_header("Authorization") or request.data is not None:
            raise ConnectorSyncError("Authenticated connector redirects are not allowed")
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def _public_urlopen(request: Request, timeout: int):
    _validate_public_url(request.full_url)
    # Environment proxies could resolve the target independently of our checks.
    opener = build_opener(ProxyHandler({}), _PublicHTTPSHandler(), _PublicRedirectHandler())
    return opener.open(request, timeout=timeout)


def _fetch(url: str, accept: str = "text/plain,text/html,application/json") -> tuple[bytes, str, str]:
    _validate_public_url(url)
    request = Request(url, headers={"User-Agent": "KnowledgeFlow-Connector/1.0", "Accept": accept})
    try:
        with _public_urlopen(request, timeout=20) as response:
            final_url = response.geturl(); _validate_public_url(final_url)
            content_type = response.headers.get_content_type(); data = response.read(MAX_REMOTE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError) as exc: raise ConnectorSyncError("Could not download the source") from exc
    if len(data) > MAX_REMOTE_BYTES: raise ConnectorSyncError("Remote content exceeds the 2 MB limit")
    return data, content_type, final_url


def _authorized_json(url: str, token: str) -> dict:
    _validate_public_url(url)
    try:
        with _public_urlopen(Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}), timeout=30) as response:
            return json.loads(response.read().decode())
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ConnectorSyncError("Cloud provider request failed") from exc


def _oauth_token(url: str, values: dict[str, str]) -> str:
    try:
        with _public_urlopen(Request(url, data=urlencode(values).encode(), headers={"Content-Type": "application/x-www-form-urlencoded"}), timeout=30) as response:
            token = json.loads(response.read().decode()).get("access_token")
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ConnectorSyncError("Could not authenticate with the cloud provider") from exc
    if not token: raise ConnectorSyncError("Cloud provider returned no access token")
    return token


def _bearer_download(url: str, token: str) -> bytes:
    _validate_public_url(url)
    try:
        with _public_urlopen(Request(url, headers={"Authorization": f"Bearer {token}"}), timeout=30) as response: data = response.read(MAX_REMOTE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError) as exc: raise ConnectorSyncError("Could not download cloud file") from exc
    if len(data) > MAX_REMOTE_BYTES: raise ConnectorSyncError("Cloud file exceeds the 2 MB limit")
    return data


def _google_drive(source_url: str, credentials: dict[str, str]) -> SourceSnapshot:
    client_id = credentials.get("client_id", ""); client_secret = credentials.get("client_secret", ""); refresh_token = credentials.get("refresh_token", "")
    if not all((client_id, client_secret, refresh_token)): raise ConnectorSyncError("Google Drive OAuth configuration is missing for this organization")
    match = re.search(r"/folders/([\w-]+)", source_url); folder_id = match.group(1) if match else parse_qs(urlparse(source_url).query).get("id", [None])[0]
    if not folder_id: raise ConnectorSyncError("Use a Google Drive folder URL")
    token = _oauth_token("https://oauth2.googleapis.com/token", {"client_id": client_id, "client_secret": client_secret, "refresh_token": refresh_token, "grant_type": "refresh_token"})
    query = quote(f"'{folder_id}' in parents and trashed=false")

    snapshot = SourceSnapshot(source_iterator=iter([]), complete=True)

    def _iter() -> Iterator[tuple[str, str, str, str]]:
        page_token = None
        complete = True
        while True:
            params: dict[str, str] = {"pageSize": "200", "fields": "nextPageToken,incompleteSearch,files(id,name,mimeType,webViewLink,modifiedTime)"}
            if page_token:
                params["pageToken"] = page_token
            data = _authorized_json(f"https://www.googleapis.com/drive/v3/files?q={query}&{urlencode(params)}", token)
            for item in data.get("files", []):
                snapshot.observed_ids.add(item["id"])
                mime = item.get("mimeType", ""); name = item.get("name", "Untitled")
                if mime == "application/vnd.google-apps.document": url = f"https://www.googleapis.com/drive/v3/files/{item['id']}/export?mimeType=text/plain"
                elif Path(name).suffix.lower() in ALLOWED_EXTENSIONS: url = f"https://www.googleapis.com/drive/v3/files/{item['id']}?alt=media"
                else: continue
                text = _bearer_download(url, token).decode("utf-8", errors="replace").strip()
                if len(text) >= 20:
                    yield (item["id"], name[:255], text, item.get("webViewLink") or source_url)
            if data.get("incompleteSearch"):
                complete = False
            page_token = data.get("nextPageToken")
            if not page_token:
                break
        snapshot.complete = complete

    snapshot.source_iterator = _iter()
    return snapshot


def _sharepoint(source_url: str, credentials: dict[str, str]) -> SourceSnapshot:
    tenant_id = credentials.get("tenant_id", ""); client_id = credentials.get("client_id", ""); client_secret = credentials.get("client_secret", "")
    if not all((tenant_id, client_id, client_secret)): raise ConnectorSyncError("SharePoint OAuth configuration is missing for this organization")
    parsed = urlparse(source_url)
    if parsed.hostname != "graph.microsoft.com" or "/children" not in parsed.path: raise ConnectorSyncError("Use a Microsoft Graph drive folder children URL")
    token = _oauth_token(f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token", {"client_id": client_id, "client_secret": client_secret, "scope": "https://graph.microsoft.com/.default", "grant_type": "client_credentials"})

    snapshot = SourceSnapshot(source_iterator=iter([]))

    def _iter() -> Iterator[tuple[str, str, str, str]]:
        next_url: str | None = source_url
        complete = True
        while next_url:
            data = _authorized_json(next_url, token)
            for item in data.get("value", []):
                snapshot.observed_ids.add(item["id"])
                name = item.get("name", ""); download = item.get("@microsoft.graph.downloadUrl")
                if not download or Path(name).suffix.lower() not in ALLOWED_EXTENSIONS: continue
                body, _, final = _fetch(download); text = body.decode("utf-8", errors="replace").strip()
                if len(text) >= 20:
                    yield (item["id"], name[:255], text, item.get("webUrl") or final)
            next_url = data.get("@odata.nextLink")
            if not next_url:
                complete = "value" in data
        snapshot.complete = complete

    snapshot.source_iterator = _iter()
    return snapshot


def _aws_signed_get(url: str, credentials: dict[str, str]) -> bytes:
    access_key_id = credentials.get("access_key_id", ""); secret_access_key = credentials.get("secret_access_key", ""); region = credentials.get("region", "")
    if not all((access_key_id, secret_access_key, region)):
        raise ConnectorSyncError("S3 credentials or region are missing for this organization")
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".amazonaws.com"):
        raise ConnectorSyncError("S3 requests must use an AWS HTTPS endpoint")
    now = datetime.now(timezone.utc); amz_date = now.strftime("%Y%m%dT%H%M%SZ"); date_stamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(b"").hexdigest(); host = parsed.netloc
    canonical_query = urlencode(sorted(parse_qsl(parsed.query, keep_blank_values=True)), quote_via=quote, safe="-_.~")
    canonical_headers = f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join(("GET", quote(parsed.path or "/", safe="/-_.~"), canonical_query, canonical_headers, signed_headers, payload_hash))
    scope = f"{date_stamp}/{region}/s3/aws4_request"
    string_to_sign = "\n".join(("AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(canonical_request.encode()).hexdigest()))
    sign = lambda key, value: hmac.new(key, value.encode(), hashlib.sha256).digest()
    signing_key = sign(sign(sign(sign(("AWS4" + secret_access_key).encode(), date_stamp), region), "s3"), "aws4_request")
    signature = hmac.new(signing_key, string_to_sign.encode(), hashlib.sha256).hexdigest()
    authorization = f"AWS4-HMAC-SHA256 Credential={access_key_id}/{scope}, SignedHeaders={signed_headers}, Signature={signature}"
    try:
        with _public_urlopen(Request(url, headers={"Authorization": authorization, "x-amz-date": amz_date, "x-amz-content-sha256": payload_hash}), timeout=30) as response:
            data = response.read(MAX_REMOTE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError) as exc: raise ConnectorSyncError("S3 request failed") from exc
    if len(data) > MAX_REMOTE_BYTES: raise ConnectorSyncError("S3 response or file exceeds the 2 MB limit")
    return data


def _s3(source_url: str, credentials: dict[str, str]) -> SourceSnapshot:
    parsed = urlparse(source_url); host = (parsed.hostname or "").lower(); path = parsed.path.lstrip("/")
    virtual = re.fullmatch(r"([a-z0-9][a-z0-9.-]{1,61}[a-z0-9])\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com", host)
    if virtual: bucket, prefix = virtual.group(1), path
    else:
        regional = re.fullmatch(r"s3(?:\.[a-z0-9-]+)?\.amazonaws\.com", host)
        parts = path.split("/", 1)
        if not regional or not parts[0]: raise ConnectorSyncError("Use an S3 HTTPS URL such as https://bucket.s3.region.amazonaws.com/prefix")
        bucket, prefix = parts[0], parts[1] if len(parts) > 1 else ""
    region = credentials.get("region", "")
    if not region: raise ConnectorSyncError("S3 region is missing for this organization")
    endpoint = f"https://{bucket}.s3.{region}.amazonaws.com"

    snapshot = SourceSnapshot(source_iterator=iter([]))

    def _iter() -> Iterator[tuple[str, str, str, str]]:
        continuation_token: str | None = None
        complete = True
        while True:
            params: dict[str, str] = {"list-type": "2", "prefix": prefix, "max-keys": "100"}
            if continuation_token:
                params["continuation-token"] = continuation_token
            listing = _aws_signed_get(f"{endpoint}/?{urlencode(params)}", credentials)
            try: root = ET.fromstring(listing)
            except ET.ParseError as exc: raise ConnectorSyncError("S3 returned invalid object metadata") from exc
            nodes = root.findall("{*}Contents")
            for node in nodes:
                key = node.findtext("{*}Key") or ""
                snapshot.observed_ids.add(key)
                if Path(key).suffix.lower() not in ALLOWED_EXTENSIONS: continue
                object_url = f"{endpoint}/{quote(key, safe='/')}"; body = _aws_signed_get(object_url, credentials)
                text = body.decode("utf-8", errors="replace").strip()
                if len(text) >= 20:
                    yield (key, Path(key).name[:255], text, object_url)
            is_truncated = root.findtext("{*}IsTruncated") == "true"
            if is_truncated:
                next_token = root.findtext("{*}NextContinuationToken")
                if next_token:
                    continuation_token = next_token
                else:
                    complete = False
                    break
            else:
                break
        snapshot.complete = complete

    snapshot.source_iterator = _iter()
    return snapshot


def _website(source_url: str) -> SourceSnapshot:
    data, content_type, final_url = _fetch(source_url)
    text = data.decode("utf-8", errors="replace")
    title = urlparse(final_url).hostname or "Website"
    if content_type == "text/html":
        match = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
        if match: title = re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()[:255]
        parser = TextHTMLParser(); parser.feed(text); text = re.sub(r"\n{3,}", "\n\n", "".join(parser.parts)); text = re.sub(r"[ \t]+", " ", text).strip()
    if len(text) < 50: raise ConnectorSyncError("The web page contains too little readable text")

    def _iter() -> Iterator[tuple[str, str, str, str]]:
        yield (final_url, title, text, final_url)

    snapshot = SourceSnapshot(source_iterator=_iter(), observed_ids={final_url}, complete=True)
    return snapshot


def _github(source_url: str) -> SourceSnapshot:
    _validate_public_url(source_url, github_only=True)
    parts = [part for part in urlparse(source_url).path.split("/") if part]
    if len(parts) < 2: raise ConnectorSyncError("Use a GitHub repository URL such as https://github.com/owner/repo")
    owner, repo = parts[0], parts[1].removesuffix(".git")
    api = f"https://api.github.com/repos/{quote(owner)}/{quote(repo)}/git/trees/HEAD?recursive=1"
    data, _, _ = _fetch(api, "application/vnd.github+json")
    try:
        metadata = json.loads(data)
        tree = metadata.get("tree", [])
    except json.JSONDecodeError as exc: raise ConnectorSyncError("GitHub returned invalid repository metadata") from exc
    files = [item for item in tree if item.get("type") == "blob" and Path(item.get("path", "")).suffix.lower() in ALLOWED_EXTENSIONS and int(item.get("size", 0)) <= 300_000]
    all_blob_ids = {item["path"] for item in tree if item.get("type") == "blob"}
    is_complete = metadata.get("truncated") is False and len(files) <= MAX_GITHUB_FILES

    snapshot = SourceSnapshot(source_iterator=iter([]), observed_ids=all_blob_ids, complete=is_complete)

    def _iter() -> Iterator[tuple[str, str, str, str]]:
        yielded = 0
        for item in files:
            if yielded >= MAX_GITHUB_FILES: break
            path = item["path"]; raw = f"https://raw.githubusercontent.com/{quote(owner)}/{quote(repo)}/HEAD/{quote(path)}"
            body, _, final = _fetch(raw); text = body.decode("utf-8", errors="replace").strip()
            if len(text) >= 20:
                yield (path, f"{repo}: {path}"[:255], text, final)
                yielded += 1
        if yielded == 0: raise ConnectorSyncError("No supported text files were found in this repository")

    snapshot.source_iterator = _iter()
    return snapshot


def sync_connector(connector_id: UUID) -> dict[str, int]:
    """Synchronise a connector's remote source into the local knowledge base.

    The Fetch phase reads connector metadata from a short-lived session and
    performs all remote I/O without holding any database connection.  The Apply
    phase opens its own session so that the caller's transaction is never
    closed, rolled back, or otherwise interfered with.
    """
    fetchers = {"website": _website, "github": _github, "google_drive": _google_drive, "s3": _s3, "sharepoint": _sharepoint}

    # --- Fetch phase -----------------------------------------------------------
    # Read only the immutable metadata we need to drive the remote fetch, then
    # release the connection immediately.
    with SessionLocal() as meta_db:
        connector = meta_db.get(Connector, connector_id)
        if connector is None:
            raise ConnectorSyncError("Connector no longer exists")
        connector_type = connector.connector_type
        source_url = connector.source_url
        document_set_id = connector.document_set_id
        organization_id = None
        if connector_type in CLOUD_CONNECTORS:
            document_set = meta_db.get(DocumentSet, document_set_id)
            if document_set is None:
                raise ConnectorSyncError("Connector knowledge set no longer exists")
            organization_id = document_set.organization_id

    fetcher = fetchers.get(connector_type)
    if fetcher is None:
        raise ConnectorSyncError("Unsupported connector type")

    if connector_type in CLOUD_CONNECTORS:
        credentials = _organization_credentials(organization_id, connector_type)
        snapshot = fetcher(source_url, credentials)
    else:
        snapshot = fetcher(source_url)

    # --- Apply phase (True Streaming Batch) ------------------------------------
    # Consume the source_iterator one item at a time, accumulating into
    # fixed-size batches.  Only STREAM_BATCH_SIZE documents are ever held in
    # RAM simultaneously — both fetch payloads and apply state are bounded.
    # Each batch gets its own DB session and Qdrant client so memory is
    # released before the next batch starts.  Deletion logic runs only once
    # after the iterator is fully exhausted.
    total_discovered = 0
    created = updated = unchanged = deleted = 0
    removed_directories: list[Path] = []
    batch: list[tuple[str, str, str, str]] = []

    def _apply_batch(items: list[tuple[str, str, str, str]]) -> tuple[int, int, int]:
        """Process one batch inside its own DB session. Returns (created, updated, unchanged)."""
        b_created = b_updated = b_unchanged = 0
        with SessionLocal() as db:
            connector = db.get(Connector, connector_id)
            if connector is None:
                raise ConnectorSyncError("Connector no longer exists")

            # OPTIMIZATION: Only query ConnectorItems whose external_id is in this batch.
            # Previously this loaded ALL ConnectorItems for the connector, causing O(Batches × TotalItems) reads.
            batch_external_ids = [item[0] for item in items]
            existing_query = select(ConnectorItem).where(
                and_(
                    ConnectorItem.connector_id == connector.id,
                    ConnectorItem.external_id.in_(batch_external_ids)
                )
            )
            existing = {item.external_id: item for item in db.scalars(existing_query).all()}

            journal: dict[str, ExternalDocumentState] = {}
            qdrant = QdrantClient(); qdrant.ensure_collection()
            document_set = db.get(DocumentSet, document_set_id)
            if document_set is None:
                raise ConnectorSyncError("Connector knowledge set no longer exists")
            try:
                for external_id, title, text, src_url in items:
                    digest = hashlib.sha256(text.encode()).hexdigest(); item = existing.get(external_id)
                    if item and item.content_hash == digest:
                        document = db.get(Document, item.document_id)
                        if document is not None and not document.storage_path and document.extracted_text_path:
                            document.storage_path = document.extracted_text_path
                        b_unchanged += 1
                        continue
                    document = db.get(Document, item.document_id) if item else Document(organization_id=document_set.organization_id, filename=title, content_type="text/plain", status="chunked", source_type=connector.connector_type, tags=[])
                    if not item: db.add(document); db.flush(); document.document_sets.append(document_set)
                    document_id = str(document.id)
                    if document_id not in journal:
                        journal[document_id] = _capture_external_state(document, existed=item is not None)
                    directory = UPLOAD_DIR / document_id; directory.mkdir(parents=True, exist_ok=True); extracted = directory / "extracted.txt"; extracted.write_text(text, encoding="utf-8")
                    source_path = document_storage_relative(extracted)
                    document.storage_path = source_path; document.extracted_text_path = source_path; document.filename = title; document.processing_error = None
                    next_chunks, _, removed_ids = incremental_chunks(document, text, document_set.child_chunk_size, document_set.chunk_overlap, document_set.parent_chunk_size)
                    for chunk in list(document.chunks):
                        if str(chunk.id) in removed_ids: db.delete(chunk)
                    document.chunks = next_chunks; document.content_checksum = checksum(text)
                    document.indexed_child_chunk_size = document_set.child_chunk_size
                    document.indexed_chunk_overlap = document_set.chunk_overlap
                    document.indexed_parent_chunk_size = document_set.parent_chunk_size
                    db.flush(); _replace_document_vectors(qdrant, document); document.status = "indexed"
                    if item: item.content_hash = digest; item.source_url = src_url; item.title = title; b_updated += 1
                    else: db.add(ConnectorItem(connector_id=connector.id, document_id=document.id, external_id=external_id, content_hash=digest, source_url=src_url, title=title)); b_created += 1
                db.commit()
            except Exception as exc:
                db.rollback()
                _restore_external_states(qdrant, list(journal.values()), exc)
                raise
        return b_created, b_updated, b_unchanged

    for source_tuple in snapshot.source_iterator:
        snapshot.observed_ids.add(source_tuple[0])
        batch.append(source_tuple)
        total_discovered += 1
        if len(batch) >= STREAM_BATCH_SIZE:
            c, u, n = _apply_batch(batch)
            created += c; updated += u; unchanged += n
            batch.clear()

    # Flush remaining items that didn't fill a complete batch.
    if batch:
        c, u, n = _apply_batch(batch)
        created += c; updated += u; unchanged += n
        batch.clear()

    # --- Deletion & Summary phase ----------------------------------------------
    # Runs once after all batches; safe because observed_ids covers the full run.
    with SessionLocal() as db:
        connector = db.get(Connector, connector_id)
        if connector is None:
            raise ConnectorSyncError("Connector no longer exists")
        existing = {item.external_id: item for item in db.scalars(select(ConnectorItem).where(ConnectorItem.connector_id == connector.id)).all()}
        journal: dict[str, ExternalDocumentState] = {}
        qdrant = QdrantClient(); qdrant.ensure_collection()
        try:
            for external_id, item in existing.items():
                # Absence in a capped or paginated response is not evidence of deletion.
                if not snapshot.complete or external_id in snapshot.observed_ids:
                    continue
                document = db.get(Document, item.document_id)
                if document is not None:
                    other_sets = [value for value in document.document_sets if value.id != document_set_id]
                    if other_sets:
                        document.document_sets = other_sets
                        db.delete(item)
                    else:
                        document_id = str(document.id)
                        if document_id not in journal:
                            journal[document_id] = _capture_external_state(document, existed=True)
                        qdrant.delete_document(document_id)
                        removed_directories.append(UPLOAD_DIR / document_id)
                        db.delete(document)
                else:
                    db.delete(item)
                deleted += 1
            result = {"discovered": total_discovered, "created": created, "updated": updated, "unchanged": unchanged, "deleted": deleted, "deletion_skipped": int(not snapshot.complete)}
            connector.last_sync_summary = result
            db.commit()
        except Exception as exc:
            db.rollback()
            _restore_external_states(qdrant, list(journal.values()), exc)
            raise
    for document_dir in removed_directories:
        if document_dir.is_dir(): shutil.rmtree(document_dir, ignore_errors=True)
    return result


def ingest_webhook_event(db: Session, connector: Connector, action: str, external_id: str, title: str | None = None, content: str | None = None, source_url: str | None = None) -> str:
    """Apply one webhook event without treating omitted remote items as deleted."""
    if connector.connector_type != "webhook": raise ConnectorSyncError("Connector does not accept webhook events")
    item = db.scalar(select(ConnectorItem).where(ConnectorItem.connector_id == connector.id, ConnectorItem.external_id == external_id))
    qdrant = QdrantClient(); qdrant.ensure_collection()
    if action == "delete":
        if item is None: return "not_found"
        journal: list[ExternalDocumentState] = []
        directory = None
        try:
            document = db.get(Document, item.document_id)
            if document is not None:
                other_sets = [value for value in document.document_sets if value.id != connector.document_set_id]
                if other_sets: document.document_sets = other_sets; db.delete(item)
                else:
                    journal.append(_capture_external_state(document, existed=True))
                    qdrant.delete_document(str(document.id)); directory = UPLOAD_DIR / str(document.id); db.delete(document)
            else: db.delete(item)
            db.commit()
        except Exception as exc:
            db.rollback(); _restore_external_states(qdrant, journal, exc); raise
        if directory is not None: shutil.rmtree(directory, ignore_errors=True)
        return "deleted"
    text = (content or "").strip(); digest = hashlib.sha256(text.encode()).hexdigest()
    if item and item.content_hash == digest: return "unchanged"
    document_set = db.get(DocumentSet, connector.document_set_id)
    if document_set is None: raise ConnectorSyncError("Knowledge base no longer exists")
    created = item is None
    document = db.get(Document, item.document_id) if item else None
    journal: list[ExternalDocumentState] = []
    try:
        if document is None:
            document = Document(organization_id=document_set.organization_id, filename=(title or external_id)[:255], content_type="text/plain", status="chunked", source_type="webhook", tags=[])
            db.add(document); db.flush(); document.document_sets.append(document_set)
        journal.append(_capture_external_state(document, existed=not created))
        directory = UPLOAD_DIR / str(document.id); directory.mkdir(parents=True, exist_ok=True); extracted = directory / "extracted.txt"; extracted.write_text(text, encoding="utf-8")
        source_path = document_storage_relative(extracted)
        document.storage_path = source_path; document.extracted_text_path = source_path; document.filename = (title or external_id)[:255]; document.processing_error = None
        next_chunks, _, removed_ids = incremental_chunks(document, text, document_set.child_chunk_size, document_set.chunk_overlap, document_set.parent_chunk_size)
        for chunk in list(document.chunks):
            if str(chunk.id) in removed_ids: db.delete(chunk)
        document.chunks = next_chunks; document.content_checksum = checksum(text)
        document.indexed_child_chunk_size = document_set.child_chunk_size
        document.indexed_chunk_overlap = document_set.chunk_overlap
        document.indexed_parent_chunk_size = document_set.parent_chunk_size
        db.flush(); _replace_document_vectors(qdrant, document); document.status = "indexed"
        resolved_source = source_url or f"webhook:{external_id}"
        if item: item.content_hash = digest; item.source_url = resolved_source; item.title = document.filename
        else: db.add(ConnectorItem(connector_id=connector.id, document_id=document.id, external_id=external_id, content_hash=digest, source_url=resolved_source, title=document.filename))
        connector.status = "ready"; connector.last_synced_at = datetime.now(timezone.utc); connector.last_error = None
        connector.last_sync_summary = {"discovered": 1, "created": int(created), "updated": int(not created), "unchanged": 0, "deleted": 0}
        db.commit()
    except Exception as exc:
        db.rollback(); _restore_external_states(qdrant, journal, exc); raise
    return "created" if created else "updated"
