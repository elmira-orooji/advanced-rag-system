import hashlib
import html
import ipaddress
import json
import re
import socket
import uuid
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import BASE_DIR, UPLOAD_DIR
from app.models.chunk import Chunk
from app.models.connector import Connector, ConnectorItem
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.services.qdrant import QdrantClient
from app.services.text_chunker import hierarchical_chunks
from app.services.chunk_enrichment import enrich_chunk

MAX_REMOTE_BYTES = 2 * 1024 * 1024
MAX_GITHUB_FILES = 40
ALLOWED_EXTENSIONS = {".md", ".txt", ".rst", ".py", ".ts", ".tsx", ".js", ".json", ".yaml", ".yml"}


class ConnectorSyncError(RuntimeError):
    pass


class TextHTMLParser(HTMLParser):
    def __init__(self): super().__init__(); self.parts: list[str] = []; self.skip = 0; self.title = ""
    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript", "svg"}: self.skip += 1
        if tag in {"p", "br", "h1", "h2", "h3", "li", "article", "section"}: self.parts.append("\n")
    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg"} and self.skip: self.skip -= 1
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)


def _validate_public_url(value: str, github_only: bool = False) -> None:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ConnectorSyncError("Only public HTTPS URLs are allowed")
    if github_only and parsed.hostname.lower() != "github.com":
        raise ConnectorSyncError("GitHub connectors require a github.com repository URL")
    try: addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc: raise ConnectorSyncError("Could not resolve the source host") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global: raise ConnectorSyncError("Private or local network addresses are not allowed")


def _fetch(url: str, accept: str = "text/plain,text/html,application/json") -> tuple[bytes, str, str]:
    _validate_public_url(url)
    request = Request(url, headers={"User-Agent": "KnowledgeFlow-Connector/1.0", "Accept": accept})
    try:
        with urlopen(request, timeout=20) as response:
            final_url = response.geturl(); _validate_public_url(final_url)
            content_type = response.headers.get_content_type(); data = response.read(MAX_REMOTE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError) as exc: raise ConnectorSyncError("Could not download the source") from exc
    if len(data) > MAX_REMOTE_BYTES: raise ConnectorSyncError("Remote content exceeds the 2 MB limit")
    return data, content_type, final_url


def _website(source_url: str) -> list[tuple[str, str, str, str]]:
    data, content_type, final_url = _fetch(source_url)
    text = data.decode("utf-8", errors="replace")
    title = urlparse(final_url).hostname or "Website"
    if content_type == "text/html":
        match = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
        if match: title = re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()[:255]
        parser = TextHTMLParser(); parser.feed(text); text = re.sub(r"\n{3,}", "\n\n", "".join(parser.parts)); text = re.sub(r"[ \t]+", " ", text).strip()
    if len(text) < 50: raise ConnectorSyncError("The web page contains too little readable text")
    return [(final_url, title, text, final_url)]


def _github(source_url: str) -> list[tuple[str, str, str, str]]:
    _validate_public_url(source_url, github_only=True)
    parts = [part for part in urlparse(source_url).path.split("/") if part]
    if len(parts) < 2: raise ConnectorSyncError("Use a GitHub repository URL such as https://github.com/owner/repo")
    owner, repo = parts[0], parts[1].removesuffix(".git")
    api = f"https://api.github.com/repos/{quote(owner)}/{quote(repo)}/git/trees/HEAD?recursive=1"
    data, _, _ = _fetch(api, "application/vnd.github+json")
    try: tree = json.loads(data).get("tree", [])
    except json.JSONDecodeError as exc: raise ConnectorSyncError("GitHub returned invalid repository metadata") from exc
    files = [item for item in tree if item.get("type") == "blob" and Path(item.get("path", "")).suffix.lower() in ALLOWED_EXTENSIONS and int(item.get("size", 0)) <= 300_000][:MAX_GITHUB_FILES]
    results = []
    for item in files:
        path = item["path"]; raw = f"https://raw.githubusercontent.com/{quote(owner)}/{quote(repo)}/HEAD/{quote(path)}"
        body, _, final = _fetch(raw); text = body.decode("utf-8", errors="replace").strip()
        if len(text) >= 20: results.append((path, f"{repo}: {path}"[:255], text, final))
    if not results: raise ConnectorSyncError("No supported text files were found in this repository")
    return results


def sync_connector(db: Session, connector: Connector) -> dict[str, int]:
    sources = _website(connector.source_url) if connector.connector_type == "website" else _github(connector.source_url)
    existing = {item.external_id: item for item in db.scalars(select(ConnectorItem).where(ConnectorItem.connector_id == connector.id)).all()}
    created = updated = unchanged = 0; qdrant = QdrantClient(); qdrant.ensure_collection(); document_set = db.get(DocumentSet, connector.document_set_id)
    for external_id, title, text, source_url in sources:
        digest = hashlib.sha256(text.encode()).hexdigest(); item = existing.get(external_id)
        if item and item.content_hash == digest: unchanged += 1; continue
        document = db.get(Document, item.document_id) if item else Document(organization_id=document_set.organization_id, filename=title, content_type="text/plain", status="chunked", source_type=connector.connector_type, tags=[])
        if not item: db.add(document); db.flush(); document.document_sets.append(document_set)
        else:
            qdrant.delete_document(str(document.id))
            for chunk in list(document.chunks): db.delete(chunk)
        directory = UPLOAD_DIR / str(document.id); directory.mkdir(parents=True, exist_ok=True); extracted = directory / "extracted.txt"; extracted.write_text(text, encoding="utf-8")
        document.extracted_text_path = extracted.relative_to(BASE_DIR).as_posix(); document.filename = title; document.processing_error = None
        configured_chunks = hierarchical_chunks(text, child_size=document_set.child_chunk_size, child_overlap=document_set.chunk_overlap, parent_size=document_set.parent_chunk_size)
        document.chunks = [Chunk(chunk_index=index, content=child, parent_index=parent_index, parent_content=parent, keywords=enrich_chunk(child)[0], suggested_questions=enrich_chunk(child)[1]) for index, (child, parent_index, parent) in enumerate(configured_chunks)]
        db.flush(); qdrant.replace_document_chunks(str(document.id), document.filename, [{"id": str(chunk.id), "chunk_index": chunk.chunk_index, "content": chunk.content} for chunk in document.chunks]); document.status = "indexed"
        if item: item.content_hash = digest; item.source_url = source_url; item.title = title; updated += 1
        else: db.add(ConnectorItem(connector_id=connector.id, document_id=document.id, external_id=external_id, content_hash=digest, source_url=source_url, title=title)); created += 1
    db.commit(); return {"discovered": len(sources), "created": created, "updated": updated, "unchanged": unchanged}
