import hashlib
import hmac
import html
import ipaddress
import json
import re
import socket
import shutil
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from dataclasses import dataclass
from html.parser import HTMLParser
from http.client import HTTPSConnection
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, parse_qsl, quote, urlencode, urlparse
from urllib.request import Request, HTTPSHandler, HTTPRedirectHandler, ProxyHandler, build_opener

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import BASE_DIR, UPLOAD_DIR
from app.core.config import AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID
from app.models.chunk import Chunk
from app.models.connector import Connector, ConnectorItem
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.services.qdrant import QdrantClient
from app.services.text_chunker import hierarchical_chunks
from app.services.chunk_enrichment import enrich_chunk
from app.services.incremental_index import checksum, incremental_chunks

MAX_REMOTE_BYTES = 2 * 1024 * 1024
MAX_GITHUB_FILES = 40
ALLOWED_EXTENSIONS = {".md", ".txt", ".rst", ".py", ".ts", ".tsx", ".js", ".json", ".yaml", ".yml"}


class ConnectorSyncError(RuntimeError):
    pass


@dataclass
class SourceSnapshot:
    sources: list[tuple[str, str, str, str]]
    observed_ids: set[str]
    complete: bool = False


@dataclass
class ExternalDocumentState:
    document_id: str
    filename: str
    chunks: list[dict[str, object]]
    directory: Path
    files: dict[Path, bytes] | None
    existed: bool


def _chunk_payload(document: Document) -> list[dict[str, object]]:
    return [
        {"id": str(chunk.id), "chunk_index": chunk.chunk_index, "content": chunk.content}
        for chunk in document.chunks
    ]


def _capture_external_state(document: Document, existed: bool) -> ExternalDocumentState:
    directory = UPLOAD_DIR / str(document.id)
    files = None
    if directory.is_dir():
        files = {
            path.relative_to(directory): path.read_bytes()
            for path in directory.rglob("*")
            if path.is_file()
        }
    return ExternalDocumentState(
        document_id=str(document.id),
        filename=document.filename,
        chunks=_chunk_payload(document),
        directory=directory,
        files=files,
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
    for state in reversed(states):
        try:
            if state.directory.exists():
                shutil.rmtree(state.directory)
            if state.files is not None:
                for relative_path, content in state.files.items():
                    destination = state.directory / relative_path
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(content)
        except Exception as exc:
            compensation_errors.append(f"files for document {state.document_id}: {exc}")
        try:
            if state.existed:
                qdrant.replace_document_chunks(state.document_id, state.filename, state.chunks)
            else:
                qdrant.delete_document(state.document_id)
        except Exception as exc:
            compensation_errors.append(f"vectors for document {state.document_id}: {exc}")
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


def _google_drive(source_url: str) -> SourceSnapshot:
    if not all((GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)): raise ConnectorSyncError("Google Drive OAuth configuration is missing")
    match = re.search(r"/folders/([\w-]+)", source_url); folder_id = match.group(1) if match else parse_qs(urlparse(source_url).query).get("id", [None])[0]
    if not folder_id: raise ConnectorSyncError("Use a Google Drive folder URL")
    token = _oauth_token("https://oauth2.googleapis.com/token", {"client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "refresh_token": GOOGLE_REFRESH_TOKEN, "grant_type": "refresh_token"})
    query = quote(f"'{folder_id}' in parents and trashed=false")
    data = _authorized_json(f"https://www.googleapis.com/drive/v3/files?q={query}&pageSize=1000&fields=nextPageToken,incompleteSearch,files(id,name,mimeType,webViewLink,modifiedTime)", token)
    results = []
    for item in data.get("files", []):
        mime = item.get("mimeType", ""); name = item.get("name", "Untitled")
        if mime == "application/vnd.google-apps.document": url = f"https://www.googleapis.com/drive/v3/files/{item['id']}/export?mimeType=text/plain"
        elif Path(name).suffix.lower() in ALLOWED_EXTENSIONS: url = f"https://www.googleapis.com/drive/v3/files/{item['id']}?alt=media"
        else: continue
        text = _bearer_download(url, token).decode("utf-8", errors="replace").strip()
        if len(text) >= 20: results.append((item["id"], name[:255], text, item.get("webViewLink") or source_url))
    return SourceSnapshot(results, {item["id"] for item in data.get("files", [])},
                          "files" in data and not data.get("nextPageToken") and not data.get("incompleteSearch"))


def _sharepoint(source_url: str) -> SourceSnapshot:
    if not all((MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET)): raise ConnectorSyncError("SharePoint OAuth configuration is missing")
    parsed = urlparse(source_url)
    if parsed.hostname != "graph.microsoft.com" or "/children" not in parsed.path: raise ConnectorSyncError("Use a Microsoft Graph drive folder children URL")
    token = _oauth_token(f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token", {"client_id": MICROSOFT_CLIENT_ID, "client_secret": MICROSOFT_CLIENT_SECRET, "scope": "https://graph.microsoft.com/.default", "grant_type": "client_credentials"})
    data = _authorized_json(source_url, token); results = []
    for item in data.get("value", []):
        name = item.get("name", ""); download = item.get("@microsoft.graph.downloadUrl")
        if not download or Path(name).suffix.lower() not in ALLOWED_EXTENSIONS: continue
        body, _, final = _fetch(download); text = body.decode("utf-8", errors="replace").strip()
        if len(text) >= 20: results.append((item["id"], name[:255], text, item.get("webUrl") or final))
    return SourceSnapshot(results, {item["id"] for item in data.get("value", [])},
                          "value" in data and not data.get("@odata.nextLink"))


def _aws_signed_get(url: str) -> bytes:
    if not all((AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)):
        raise ConnectorSyncError("S3 credentials or region are missing")
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".amazonaws.com"):
        raise ConnectorSyncError("S3 requests must use an AWS HTTPS endpoint")
    now = datetime.now(timezone.utc); amz_date = now.strftime("%Y%m%dT%H%M%SZ"); date_stamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(b"").hexdigest(); host = parsed.netloc
    canonical_query = urlencode(sorted(parse_qsl(parsed.query, keep_blank_values=True)), quote_via=quote, safe="-_.~")
    canonical_headers = f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join(("GET", quote(parsed.path or "/", safe="/-_.~"), canonical_query, canonical_headers, signed_headers, payload_hash))
    scope = f"{date_stamp}/{AWS_REGION}/s3/aws4_request"
    string_to_sign = "\n".join(("AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(canonical_request.encode()).hexdigest()))
    sign = lambda key, value: hmac.new(key, value.encode(), hashlib.sha256).digest()
    signing_key = sign(sign(sign(sign(("AWS4" + AWS_SECRET_ACCESS_KEY).encode(), date_stamp), AWS_REGION), "s3"), "aws4_request")
    signature = hmac.new(signing_key, string_to_sign.encode(), hashlib.sha256).hexdigest()
    authorization = f"AWS4-HMAC-SHA256 Credential={AWS_ACCESS_KEY_ID}/{scope}, SignedHeaders={signed_headers}, Signature={signature}"
    try:
        with _public_urlopen(Request(url, headers={"Authorization": authorization, "x-amz-date": amz_date, "x-amz-content-sha256": payload_hash}), timeout=30) as response:
            data = response.read(MAX_REMOTE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError) as exc: raise ConnectorSyncError("S3 request failed") from exc
    if len(data) > MAX_REMOTE_BYTES: raise ConnectorSyncError("S3 response or file exceeds the 2 MB limit")
    return data


def _s3(source_url: str) -> SourceSnapshot:
    parsed = urlparse(source_url); host = (parsed.hostname or "").lower(); path = parsed.path.lstrip("/")
    virtual = re.fullmatch(r"([a-z0-9][a-z0-9.-]{1,61}[a-z0-9])\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com", host)
    if virtual: bucket, prefix = virtual.group(1), path
    else:
        regional = re.fullmatch(r"s3(?:\.[a-z0-9-]+)?\.amazonaws\.com", host)
        parts = path.split("/", 1)
        if not regional or not parts[0]: raise ConnectorSyncError("Use an S3 HTTPS URL such as https://bucket.s3.region.amazonaws.com/prefix")
        bucket, prefix = parts[0], parts[1] if len(parts) > 1 else ""
    endpoint = f"https://{bucket}.s3.{AWS_REGION}.amazonaws.com"
    listing = _aws_signed_get(f"{endpoint}/?{urlencode({'list-type': '2', 'prefix': prefix})}")
    try: root = ET.fromstring(listing)
    except ET.ParseError as exc: raise ConnectorSyncError("S3 returned invalid object metadata") from exc
    results = []
    nodes = root.findall("{*}Contents")
    for node in nodes[:100]:
        key = node.findtext("{*}Key") or ""
        if Path(key).suffix.lower() not in ALLOWED_EXTENSIONS: continue
        object_url = f"{endpoint}/{quote(key, safe='/')}"; body = _aws_signed_get(object_url)
        text = body.decode("utf-8", errors="replace").strip()
        if len(text) >= 20: results.append((key, Path(key).name[:255], text, object_url))
    return SourceSnapshot(results, {node.findtext("{*}Key") for node in nodes if node.findtext("{*}Key")},
                          root.findtext("{*}IsTruncated") == "false" and len(nodes) <= 100)


def _website(source_url: str) -> SourceSnapshot:
    data, content_type, final_url = _fetch(source_url)
    text = data.decode("utf-8", errors="replace")
    title = urlparse(final_url).hostname or "Website"
    if content_type == "text/html":
        match = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
        if match: title = re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()[:255]
        parser = TextHTMLParser(); parser.feed(text); text = re.sub(r"\n{3,}", "\n\n", "".join(parser.parts)); text = re.sub(r"[ \t]+", " ", text).strip()
    if len(text) < 50: raise ConnectorSyncError("The web page contains too little readable text")
    return SourceSnapshot([(final_url, title, text, final_url)], {final_url}, complete=True)


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
    results = []
    for item in files[:MAX_GITHUB_FILES]:
        path = item["path"]; raw = f"https://raw.githubusercontent.com/{quote(owner)}/{quote(repo)}/HEAD/{quote(path)}"
        body, _, final = _fetch(raw); text = body.decode("utf-8", errors="replace").strip()
        if len(text) >= 20: results.append((path, f"{repo}: {path}"[:255], text, final))
    if not results: raise ConnectorSyncError("No supported text files were found in this repository")
    return SourceSnapshot(results, {item["path"] for item in tree if item.get("type") == "blob"},
                          metadata.get("truncated") is False and len(files) <= MAX_GITHUB_FILES)


def sync_connector(db: Session, connector: Connector) -> dict[str, int]:
    fetchers = {"website": _website, "github": _github, "google_drive": _google_drive, "s3": _s3, "sharepoint": _sharepoint}
    fetcher = fetchers.get(connector.connector_type)
    if fetcher is None: raise ConnectorSyncError("Unsupported connector type")
    snapshot = fetcher(connector.source_url)
    sources = snapshot.sources
    existing = {item.external_id: item for item in db.scalars(select(ConnectorItem).where(ConnectorItem.connector_id == connector.id)).all()}
    created = updated = unchanged = deleted = 0
    removed_directories: list[Path] = []
    journal: dict[str, ExternalDocumentState] = {}
    qdrant = QdrantClient(); qdrant.ensure_collection()
    document_set = db.get(DocumentSet, connector.document_set_id)
    try:
        for external_id, title, text, source_url in sources:
            digest = hashlib.sha256(text.encode()).hexdigest(); item = existing.get(external_id)
            if item and item.content_hash == digest:
                document = db.get(Document, item.document_id)
                if document is not None and not document.storage_path and document.extracted_text_path:
                    document.storage_path = document.extracted_text_path
                unchanged += 1
                continue
            document = db.get(Document, item.document_id) if item else Document(organization_id=document_set.organization_id, filename=title, content_type="text/plain", status="chunked", source_type=connector.connector_type, tags=[])
            if not item: db.add(document); db.flush(); document.document_sets.append(document_set)
            document_id = str(document.id)
            if document_id not in journal:
                journal[document_id] = _capture_external_state(document, existed=item is not None)
            directory = UPLOAD_DIR / document_id; directory.mkdir(parents=True, exist_ok=True); extracted = directory / "extracted.txt"; extracted.write_text(text, encoding="utf-8")
            source_path = extracted.relative_to(BASE_DIR).as_posix()
            document.storage_path = source_path; document.extracted_text_path = source_path; document.filename = title; document.processing_error = None
            next_chunks, _, removed_ids = incremental_chunks(document, text, document_set.child_chunk_size, document_set.chunk_overlap, document_set.parent_chunk_size)
            for chunk in list(document.chunks):
                if str(chunk.id) in removed_ids: db.delete(chunk)
            document.chunks = next_chunks; document.content_checksum = checksum(text)
            document.indexed_child_chunk_size = document_set.child_chunk_size
            document.indexed_chunk_overlap = document_set.chunk_overlap
            document.indexed_parent_chunk_size = document_set.parent_chunk_size
            db.flush(); _replace_document_vectors(qdrant, document); document.status = "indexed"
            if item: item.content_hash = digest; item.source_url = source_url; item.title = title; updated += 1
            else: db.add(ConnectorItem(connector_id=connector.id, document_id=document.id, external_id=external_id, content_hash=digest, source_url=source_url, title=title)); created += 1
        for external_id, item in existing.items():
            # Absence in a capped or paginated response is not evidence of deletion.
            if not snapshot.complete or external_id in snapshot.observed_ids:
                continue
            document = db.get(Document, item.document_id)
            if document is not None:
                other_sets = [value for value in document.document_sets if value.id != connector.document_set_id]
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
        result = {"discovered": len(sources), "created": created, "updated": updated, "unchanged": unchanged, "deleted": deleted, "deletion_skipped": int(not snapshot.complete)}
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
        source_path = extracted.relative_to(BASE_DIR).as_posix()
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
