from pathlib import Path

from pypdf import PdfReader


class ExtractionError(ValueError):
    pass


def extract_text(file_path: Path, content_type: str) -> str:
    if content_type == "application/pdf":
        return _extract_pdf(file_path)
    if content_type == "text/plain":
        return _extract_text_file(file_path)
    raise ExtractionError("Unsupported file type")


def _extract_pdf(file_path: Path) -> str:
    try:
        reader = PdfReader(file_path)
        text = "\n\n".join((page.extract_text() or "").strip() for page in reader.pages)
    except Exception as exc:
        raise ExtractionError("Could not read the PDF file") from exc

    text = text.strip()
    if not text:
        raise ExtractionError("No extractable text found in the PDF")
    return text


def _extract_text_file(file_path: Path) -> str:
    try:
        text = file_path.read_text(encoding="utf-8").strip()
    except UnicodeDecodeError as exc:
        raise ExtractionError("Text files must use UTF-8 encoding") from exc

    if not text:
        raise ExtractionError("The text file is empty")
    return text
