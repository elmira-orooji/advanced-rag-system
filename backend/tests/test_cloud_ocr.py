import json
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.services import cloud_ocr
from app.services.document_extractor import _extract_pdf


class CloudOCRTests(unittest.TestCase):
    def test_google_vision_sends_language_hints_and_returns_document_text(self):
        response = MagicMock()
        response.read.return_value = json.dumps({"responses": [{"fullTextAnnotation": {"text": "سلام world"}}]}).encode()
        context = MagicMock()
        context.__enter__.return_value = response

        image = MagicMock()
        image.read_bytes.return_value = b"png-bytes"
        with patch.object(cloud_ocr, "GOOGLE_VISION_API_KEY", "test-key"), patch.object(cloud_ocr, "urlopen", return_value=context) as urlopen:
            text = cloud_ocr._google_vision(image, "image/png")

        self.assertEqual(text, "سلام world")
        request = urlopen.call_args.args[0]
        self.assertIn("key=test-key", request.full_url)
        payload = json.loads(request.data)
        self.assertEqual(payload["requests"][0]["imageContext"]["languageHints"], ["fa", "en"])
        self.assertEqual(payload["requests"][0]["features"][0]["type"], "DOCUMENT_TEXT_DETECTION")

    def test_auto_prefers_google_then_azure(self):
        with patch.object(cloud_ocr, "OCR_PROVIDER", "auto"), patch.object(cloud_ocr, "GOOGLE_VISION_API_KEY", "google"), patch.object(cloud_ocr, "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", "https://example.test"), patch.object(cloud_ocr, "AZURE_DOCUMENT_INTELLIGENCE_KEY", "azure"):
            self.assertEqual(cloud_ocr._providers(), [cloud_ocr._google_vision, cloud_ocr._azure_document_intelligence])

    def test_scanned_pdf_uses_ocr_after_native_extraction_is_empty(self):
        reader = MagicMock()
        reader.pages = [MagicMock(extract_text=lambda: "")]
        with patch("app.services.document_extractor.PdfReader", return_value=reader), patch("app.services.document_extractor.extract_scanned_document_text", return_value="متن اسکن‌شده") as ocr:
            self.assertEqual(_extract_pdf(Path("scan.pdf")), "متن اسکن‌شده")
        ocr.assert_called_once_with(Path("scan.pdf"), "application/pdf")


if __name__ == "__main__":
    unittest.main()
