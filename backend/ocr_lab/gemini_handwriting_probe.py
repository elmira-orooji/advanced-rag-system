from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import pypdfium2 as pdfium
import requests
from PIL import Image


LAB_ROOT = Path(__file__).resolve().parent
OUTPUT_ROOT = LAB_ROOT / "output"
DEFAULT_MODEL = "gemini-2.5-flash"
API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"

PROMPT = """این صفحه از جزوه دست‌نویس فارسی درس بینایی ماشین است.
محتوای صفحه را بدون خلاصه‌سازی و بدون حدس‌زدن رونویسی کن.
ترتیب خواندن فارسی را راست به چپ و از بالا به پایین حفظ کن.
متن انگلیسی را همان‌طور که نوشته شده نگه دار و فرمول‌ها را با LaTeX ثبت کن.
نمودارها را فقط در یک توضیح کوتاه داخل [نمودار: ...] توصیف کن.
هر قسمت ناخوانا را با [ناخوانا] مشخص کن و متن تازه نساز.
فقط JSON معتبر با این ساختار برگردان:
{"handwritten_text":"...","formulas":["..."],"diagram_notes":["..."],"unclear_count":0}
"""


def load_api_key(env_file: Path | None = None) -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    path = env_file or LAB_ROOT / ".env"
    if not path.is_file():
        return ""
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() == "GEMINI_API_KEY":
            return value.strip().strip('"\'')
    return ""


def parse_pages(value: str) -> list[int]:
    pages = sorted({int(item.strip()) for item in value.split(",") if item.strip()})
    if not pages or pages[0] < 1:
        raise argparse.ArgumentTypeError("Pages must be positive, one-based numbers")
    return pages


def render_page(document: pdfium.PdfDocument, page_number: int, dpi: int) -> bytes:
    if page_number > len(document):
        raise ValueError(f"Page {page_number} is outside this {len(document)}-page PDF")
    page = document[page_number - 1]
    bitmap = page.render(scale=dpi / 72)
    image = bitmap.to_pil().convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90, optimize=True)
    image.close()
    bitmap.close()
    page.close()
    return buffer.getvalue()


def extract_response_text(response: dict[str, Any]) -> str:
    try:
        parts = response["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Gemini response does not contain generated content") from exc
    text = "".join(str(part.get("text", "")) for part in parts).strip()
    if not text:
        raise ValueError("Gemini returned an empty response")
    return text


def parse_json_text(value: str) -> dict[str, Any]:
    value = value.strip()
    if value.startswith("```"):
        value = value.removeprefix("```json").removeprefix("```")
        value = value.removesuffix("```").strip()
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise ValueError("Gemini output must be a JSON object")
    return parsed


def request_gemini(api_key: str, model: str, image_bytes: bytes, timeout: int) -> dict[str, Any]:
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(image_bytes).decode("ascii")}},
                    {"text": PROMPT},
                ],
            }
        ],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }
    for attempt in range(3):
        try:
            response = requests.post(
                f"{API_ROOT}/{model}:generateContent",
                json=payload,
                headers={"x-goog-api-key": api_key},
                timeout=timeout,
            )
            if response.ok:
                return response.json()
            detail = response.text[:500]
            if response.status_code not in {429, 500, 502, 503, 504} or attempt == 2:
                raise RuntimeError(f"Gemini HTTP {response.status_code}: {detail}")
            retry_after = response.headers.get("Retry-After")
            time.sleep(float(retry_after) if retry_after and retry_after.isdigit() else 2**attempt)
        except requests.RequestException as exc:
            if attempt == 2:
                raise RuntimeError(f"Could not reach Gemini API: {exc}") from exc
            time.sleep(2**attempt)
    raise RuntimeError("Gemini request failed after retries")


def run(pdf_path: Path, pages: list[int], dpi: int, model: str, timeout: int, dry_run: bool) -> Path:
    if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
        raise ValueError("Input must be an existing PDF file")
    api_key = load_api_key()
    if not dry_run and not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    destination = OUTPUT_ROOT / f"{pdf_path.stem}-gemini-probe"
    destination.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(pdf_path)
    results: list[dict[str, Any]] = []
    started = time.perf_counter()
    try:
        for page_number in pages:
            page_started = time.perf_counter()
            image_bytes = render_page(document, page_number, dpi)
            item: dict[str, Any] = {
                "page": page_number,
                "image_bytes": len(image_bytes),
                "dpi": dpi,
            }
            if not dry_run:
                response = request_gemini(api_key, model, image_bytes, timeout)
                raw_text = extract_response_text(response)
                item["transcription"] = parse_json_text(raw_text)
                item["usage_metadata"] = response.get("usageMetadata", {})
            item["elapsed_seconds"] = round(time.perf_counter() - page_started, 3)
            results.append(item)
            (destination / f"page-{page_number}.json").write_text(
                json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8"
            )
    finally:
        document.close()

    summary = {
        "source": str(pdf_path.resolve()),
        "model": model,
        "pages": pages,
        "dry_run": dry_run,
        "privacy_notice": "Selected page images are sent to Google Gemini when dry_run is false.",
        "elapsed_seconds": round(time.perf_counter() - started, 3),
        "results": results,
    }
    summary_path = destination / "summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare Gemini vision transcription on selected handwritten PDF pages")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--pages", type=parse_pages, default=parse_pages("1,20,38"))
    parser.add_argument("--dpi", type=int, default=180, choices=range(120, 301), metavar="120..300")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--dry-run", action="store_true", help="Render and validate without sending data to Google")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        summary = run(args.pdf, args.pages, args.dpi, args.model, args.timeout, args.dry_run)
    except Exception as exc:
        print(f"Gemini probe failed: {exc}", file=sys.stderr)
        return 1
    print(f"Gemini probe report: {summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
