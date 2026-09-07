"""Opt-in OCR providers for scanned documents.

MinerU uses its hosted asynchronous Precision API, so no local model is loaded.
"""

from __future__ import annotations

import base64
import hashlib
from io import BytesIO
import json
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zipfile import BadZipFile, ZipFile

from app.core.config import (
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    AZURE_DOCUMENT_INTELLIGENCE_KEY,
    GOOGLE_VISION_API_KEY,
    MINERU_API_BASE_URL,
    MINERU_API_TOKEN,
    MINERU_LANGUAGE,
    MINERU_MODEL_VERSION,
    MINERU_POLL_SECONDS,
    MINERU_TIMEOUT_SECONDS,
    OCR_LANGUAGE_HINTS,
    OCR_MAX_PAGES,
    OCR_PROVIDER,
    OCR_TIMEOUT_SECONDS,
)


class OCRUnavailableError(RuntimeError):
    """OCR was needed but no configured provider could return text."""


def extract_scanned_document_text(file_path: Path, content_type: str) -> str:
    providers = _providers()
    if not providers:
        raise OCRUnavailableError(
            "This document has no embedded text. Configure OCR_PROVIDER with MinerU, Google Vision, or Azure Document Intelligence."
        )

    errors: list[str] = []
    for provider in providers:
        try:
            text = provider(file_path, content_type).strip()
            if text:
                return text
            errors.append("provider returned no text")
        except OCRUnavailableError as exc:
            errors.append(str(exc))
    raise OCRUnavailableError("OCR could not read this document. " + " | ".join(errors[:2]))


def _providers():
    if OCR_PROVIDER == "disabled":
        return []
    available = []
    if MINERU_API_TOKEN:
        available.append(_mineru)
    if GOOGLE_VISION_API_KEY:
        available.append(_google_vision)
    if AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY:
        available.append(_azure_document_intelligence)
    if OCR_PROVIDER == "google_vision":
        return [_google_vision] if GOOGLE_VISION_API_KEY else []
    if OCR_PROVIDER == "azure_document_intelligence":
        return [_azure_document_intelligence] if AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY else []
    if OCR_PROVIDER == "mineru":
        return [_mineru] if MINERU_API_TOKEN else []
    return available


def _mineru(file_path: Path, content_type: str) -> str:
    """Upload one document to MinerU and return its generated Markdown."""
    if not MINERU_API_TOKEN:
        raise OCRUnavailableError("MinerU OCR requires MINERU_API_TOKEN")
    data_id = hashlib.sha256(file_path.read_bytes()).hexdigest()
    headers = {"Authorization": f"Bearer {MINERU_API_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "files": [{"name": file_path.name, "data_id": data_id, "is_ocr": True}],
        "model_version": MINERU_MODEL_VERSION,
        "language": MINERU_LANGUAGE,
        "enable_formula": False,
        "enable_table": True,
    }
    submitted = _mineru_json_request(f"{MINERU_API_BASE_URL}/file-urls/batch", headers=headers, payload=payload)
    batch_id, upload_url = _mineru_upload_target(submitted)
    _mineru_upload(upload_url, file_path.read_bytes())
    result = _mineru_wait_for_result(batch_id, headers)
    return _mineru_markdown(result)


def _mineru_upload_target(response: dict) -> tuple[str, str]:
    data = _mineru_success_data(response)
    batch_id = data.get("batch_id")
    urls = data.get("file_urls") or []
    if not isinstance(batch_id, str) or not batch_id or not urls or not isinstance(urls[0], str):
        raise OCRUnavailableError("MinerU did not return an upload target")
    return batch_id, urls[0]


def _mineru_upload(upload_url: str, content: bytes) -> None:
    request = Request(upload_url, data=content, method="PUT")
    try:
        with urlopen(request, timeout=OCR_TIMEOUT_SECONDS):
            return
    except (HTTPError, URLError, TimeoutError) as exc:
        raise OCRUnavailableError("MinerU file upload failed") from exc


def _mineru_wait_for_result(batch_id: str, headers: dict[str, str]) -> dict:
    deadline = time.monotonic() + MINERU_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        response = _mineru_json_request(f"{MINERU_API_BASE_URL}/extract-results/batch/{batch_id}", headers=headers)
        data = _mineru_success_data(response)
        results = data.get("extract_result") or []
        result = results[0] if results else {}
        state = result.get("state")
        if state == "done":
            return result
        if state == "failed":
            raise OCRUnavailableError(f"MinerU could not read this document: {result.get('err_msg') or 'unknown error'}")
        time.sleep(MINERU_POLL_SECONDS)
    raise OCRUnavailableError("MinerU OCR timed out")


def _mineru_success_data(response: dict) -> dict:
    if response.get("code") != 0 or not isinstance(response.get("data"), dict):
        raise OCRUnavailableError(f"MinerU request failed: {response.get('msg') or 'unknown error'}")
    return response["data"]


def _mineru_json_request(url: str, *, headers: dict[str, str], payload: dict | None = None) -> dict:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=headers,
        method="POST" if payload is not None else "GET",
    )
    try:
        with urlopen(request, timeout=OCR_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise OCRUnavailableError("MinerU request failed") from exc


def _mineru_markdown(result: dict) -> str:
    zip_url = result.get("full_zip_url")
    if not isinstance(zip_url, str) or not zip_url:
        raise OCRUnavailableError("MinerU did not return an extraction archive")
    try:
        with urlopen(zip_url, timeout=OCR_TIMEOUT_SECONDS) as response:
            archive = response.read()
        with ZipFile(BytesIO(archive)) as bundle:
            markdown_names = [name for name in bundle.namelist() if name.endswith("/full.md") or name == "full.md"]
            if len(markdown_names) != 1:
                raise OCRUnavailableError("MinerU archive did not contain one Markdown result")
            return bundle.read(markdown_names[0]).decode("utf-8").strip()
    except OCRUnavailableError:
        raise
    except (HTTPError, URLError, TimeoutError, BadZipFile, UnicodeDecodeError) as exc:
        raise OCRUnavailableError("MinerU result archive could not be read") from exc


def _google_vision(file_path: Path, content_type: str) -> str:
    pages = _vision_pages(file_path, content_type)
    chunks: list[str] = []
    for page in pages:
        payload = {
            "requests": [{
                "image": {"content": base64.b64encode(page).decode("ascii")},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                "imageContext": {"languageHints": OCR_LANGUAGE_HINTS},
            }]
        }
        response = _json_request(
            f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_API_KEY}",
            payload,
        )
        item = (response.get("responses") or [{}])[0]
        if item.get("error"):
            raise OCRUnavailableError(f"Google Vision: {item['error'].get('message', 'request failed')}")
        text = (item.get("fullTextAnnotation") or {}).get("text", "").strip()
        if text:
            chunks.append(text)
    return "\n\n".join(chunks)


def _vision_pages(file_path: Path, content_type: str) -> list[bytes]:
    if content_type != "application/pdf":
        return [file_path.read_bytes()]
    try:
        import pypdfium2 as pdfium
    except ImportError as exc:  # pragma: no cover - deployment dependency
        raise OCRUnavailableError("PDF OCR requires the pypdfium2 package") from exc
    try:
        pdf = pdfium.PdfDocument(str(file_path))
        if len(pdf) > OCR_MAX_PAGES:
            raise OCRUnavailableError(f"PDF OCR is limited to {OCR_MAX_PAGES} pages")
        pages: list[bytes] = []
        for index in range(len(pdf)):
            image = pdf[index].render(scale=2).to_pil()
            from io import BytesIO
            buffer = BytesIO()
            image.save(buffer, format="PNG", optimize=True)
            pages.append(buffer.getvalue())
        return pages
    except OCRUnavailableError:
        raise
    except Exception as exc:
        raise OCRUnavailableError("Could not render the PDF for OCR") from exc


def _azure_document_intelligence(file_path: Path, content_type: str) -> str:
    request = Request(
        f"{AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30",
        data=file_path.read_bytes(),
        headers={"Ocp-Apim-Subscription-Key": AZURE_DOCUMENT_INTELLIGENCE_KEY, "Content-Type": content_type},
        method="POST",
    )
    try:
        with urlopen(request, timeout=OCR_TIMEOUT_SECONDS) as response:
            operation_url = response.headers.get("Operation-Location")
    except (HTTPError, URLError, TimeoutError) as exc:
        raise OCRUnavailableError("Azure Document Intelligence request failed") from exc
    if not operation_url:
        raise OCRUnavailableError("Azure Document Intelligence did not return an operation URL")
    deadline = time.monotonic() + OCR_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        poll = Request(operation_url, headers={"Ocp-Apim-Subscription-Key": AZURE_DOCUMENT_INTELLIGENCE_KEY})
        try:
            with urlopen(poll, timeout=min(10, OCR_TIMEOUT_SECONDS)) as response:
                result = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise OCRUnavailableError("Azure Document Intelligence result could not be read") from exc
        if result.get("status") == "succeeded":
            return (result.get("analyzeResult") or {}).get("content", "")
        if result.get("status") == "failed":
            raise OCRUnavailableError("Azure Document Intelligence could not read this document")
        time.sleep(0.5)
    raise OCRUnavailableError("Azure Document Intelligence timed out")


def _json_request(url: str, payload: dict) -> dict:
    request = Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(request, timeout=OCR_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise OCRUnavailableError("Google Vision request failed") from exc
