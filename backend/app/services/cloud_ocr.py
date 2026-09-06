"""Opt-in cloud OCR with Google Vision as the preferred provider.

No network request is made unless OCR_PROVIDER and the matching credential are
configured. Google Vision receives rasterized PDF pages, which avoids requiring
Cloud Storage for ordinary uploaded PDFs.
"""

from __future__ import annotations

import base64
import json
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import (
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    AZURE_DOCUMENT_INTELLIGENCE_KEY,
    GOOGLE_VISION_API_KEY,
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
            "This document has no embedded text. Configure OCR_PROVIDER with Google Vision or Azure Document Intelligence."
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
    raise OCRUnavailableError("Cloud OCR could not read this document. " + " | ".join(errors[:2]))


def _providers():
    if OCR_PROVIDER == "disabled":
        return []
    available = []
    if GOOGLE_VISION_API_KEY:
        available.append(_google_vision)
    if AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY:
        available.append(_azure_document_intelligence)
    if OCR_PROVIDER == "google_vision":
        return [_google_vision] if GOOGLE_VISION_API_KEY else []
    if OCR_PROVIDER == "azure_document_intelligence":
        return [_azure_document_intelligence] if AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY else []
    return available


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
