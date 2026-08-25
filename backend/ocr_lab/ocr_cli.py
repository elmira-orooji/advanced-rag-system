from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable


LAB_ROOT = Path(__file__).resolve().parent
MODEL_ROOT = LAB_ROOT / "models"
OUTPUT_ROOT = LAB_ROOT / "output"
SUPPORTED_IMAGES = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp"}

# Keep every model/cache artifact inside this removable directory.
os.environ.setdefault("RAPIDOCR_HOME", str(MODEL_ROOT))
os.environ.setdefault("MODEL_DIR", str(MODEL_ROOT))


@dataclass(slots=True)
class OcrLine:
    page: int
    text: str
    confidence: float | None
    box: list[list[float]] | None


def normalize_persian(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.translate(str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "هٔ"}))
    value = re.sub(r"[\u200e\u200f\u202a-\u202e]", "", value)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def levenshtein(left: str, right: str) -> int:
    if len(left) < len(right):
        left, right = right, left
    previous = list(range(len(right) + 1))
    for row, left_char in enumerate(left, start=1):
        current = [row]
        for column, right_char in enumerate(right, start=1):
            current.append(min(current[-1] + 1, previous[column] + 1, previous[column - 1] + (left_char != right_char)))
        previous = current
    return previous[-1]


def character_error_rate(expected: str, actual: str) -> float:
    expected = normalize_persian(expected)
    actual = normalize_persian(actual)
    return levenshtein(expected, actual) / max(1, len(expected))


def iter_pages(path: Path, dpi: int) -> Iterable[tuple[int, Any]]:
    from PIL import Image

    if path.suffix.lower() in SUPPORTED_IMAGES:
        with Image.open(path) as image:
            yield 1, image.convert("RGB").copy()
        return

    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Unsupported file type: {path.suffix or '(none)'}")

    import pypdfium2 as pdfium

    document = pdfium.PdfDocument(path)
    scale = dpi / 72
    try:
        for page_index in range(len(document)):
            page = document[page_index]
            bitmap = page.render(scale=scale)
            yield page_index + 1, bitmap.to_pil().convert("RGB")
            bitmap.close()
            page.close()
    finally:
        document.close()


def create_engine() -> Any:
    from rapidocr import EngineType, LangDet, LangRec, ModelType, OCRVersion, RapidOCR

    return RapidOCR(
        params={
            "Global.model_root_dir": str(MODEL_ROOT),
            "Global.use_cls": False,
            "Det.engine_type": EngineType.ONNXRUNTIME,
            "Det.lang_type": LangDet.CH,
            "Det.model_type": ModelType.MOBILE,
            "Det.ocr_version": OCRVersion.PPOCRV5,
            "Rec.engine_type": EngineType.ONNXRUNTIME,
            "Rec.lang_type": LangRec.ARABIC,
            "Rec.model_type": ModelType.MOBILE,
            "Rec.ocr_version": OCRVersion.PPOCRV5,
        }
    )


def value_list(result: Any, *names: str) -> list[Any]:
    for name in names:
        value = getattr(result, name, None)
        if value is not None:
            try:
                return list(value)
            except TypeError:
                pass
    return []


def extract_lines(result: Any, page_number: int) -> list[OcrLine]:
    texts = value_list(result, "txts", "texts")
    scores = value_list(result, "scores", "confidences")
    boxes = value_list(result, "boxes")

    lines: list[OcrLine] = []
    for index, text in enumerate(texts):
        score = float(scores[index]) if index < len(scores) and scores[index] is not None else None
        box = boxes[index].tolist() if index < len(boxes) and hasattr(boxes[index], "tolist") else (boxes[index] if index < len(boxes) else None)
        lines.append(OcrLine(page=page_number, text=normalize_persian(str(text)), confidence=score, box=box))
    return lines


def reconstruct_page_text(lines: list[OcrLine]) -> str:
    positioned: list[tuple[float, float, float, OcrLine]] = []
    unpositioned: list[str] = []
    for line in lines:
        if not line.box:
            unpositioned.append(line.text)
            continue
        xs = [float(point[0]) for point in line.box]
        ys = [float(point[1]) for point in line.box]
        positioned.append((sum(xs) / len(xs), sum(ys) / len(ys), max(ys) - min(ys), line))

    rows: list[dict[str, Any]] = []
    for center_x, center_y, height, line in sorted(positioned, key=lambda item: item[1]):
        row = min(rows, key=lambda item: abs(item["center_y"] - center_y), default=None)
        if row is None or abs(row["center_y"] - center_y) > max(row["height"], height) * 0.7:
            rows.append({"center_y": center_y, "height": height, "items": [(center_x, line.text)]})
            continue
        count = len(row["items"])
        row["center_y"] = (row["center_y"] * count + center_y) / (count + 1)
        row["height"] = max(row["height"], height)
        row["items"].append((center_x, line.text))

    text_rows = [
        " ".join(text for _, text in sorted(row["items"], key=lambda item: item[0], reverse=True))
        for row in sorted(rows, key=lambda item: item["center_y"])
    ]
    text_rows.extend(unpositioned)
    return "\n".join(text_rows)


def run(path: Path, dpi: int, expected: str | None) -> Path:
    if not path.is_file():
        raise FileNotFoundError(path)

    MODEL_ROOT.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT_ROOT / path.stem
    destination.mkdir(parents=True, exist_ok=True)

    started = time.perf_counter()
    engine = create_engine()
    lines: list[OcrLine] = []
    page_times: list[dict[str, float | int]] = []

    for page_number, image in iter_pages(path, dpi):
        page_started = time.perf_counter()
        result = engine(image)
        lines.extend(extract_lines(result, page_number))
        page_times.append({"page": page_number, "seconds": round(time.perf_counter() - page_started, 3)})

    pages: dict[int, list[OcrLine]] = {}
    for line in lines:
        pages.setdefault(line.page, []).append(line)
    full_text = "\n\n".join(reconstruct_page_text(pages[page]) for page in sorted(pages))
    confidences = [line.confidence for line in lines if line.confidence is not None]

    report = {
        "source": str(path.resolve()),
        "engine": "RapidOCR / ONNX Runtime",
        "detector": "PP-OCRv5 mobile",
        "recognizer": "PP-OCRv5 Arabic (Arabic, Persian, Urdu)",
        "warning": "General multilingual OCR; not specifically trained for Persian handwriting.",
        "page_count": len(page_times),
        "line_count": len(lines),
        "average_confidence": round(sum(confidences) / len(confidences), 4) if confidences else None,
        "elapsed_seconds": round(time.perf_counter() - started, 3),
        "page_times": page_times,
        "character_error_rate": round(character_error_rate(expected, full_text), 4) if expected is not None else None,
        "text": full_text,
        "lines": [asdict(line) for line in lines],
    }

    (destination / "text.txt").write_text(full_text, encoding="utf-8")
    (destination / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return destination / "report.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Isolated lightweight Persian OCR experiment")
    parser.add_argument("input", type=Path, help="Image or scanned PDF")
    parser.add_argument("--dpi", type=int, default=220, choices=range(120, 401), metavar="120..400")
    parser.add_argument("--expected", help="Ground-truth text used to calculate character error rate")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        report = run(args.input, args.dpi, args.expected)
    except Exception as exc:
        print(f"OCR failed: {exc}", file=sys.stderr)
        return 1
    print(f"OCR report: {report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
