import json
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from zipfile import ZipFile

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

    def test_auto_prefers_mineru_then_google_and_azure(self):
        with patch.object(cloud_ocr, "OCR_PROVIDER", "auto"), patch.object(cloud_ocr, "MINERU_API_TOKEN", "mineru"), patch.object(cloud_ocr, "GOOGLE_VISION_API_KEY", "google"), patch.object(cloud_ocr, "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", "https://example.test"), patch.object(cloud_ocr, "AZURE_DOCUMENT_INTELLIGENCE_KEY", "azure"):
            self.assertEqual(cloud_ocr._providers(), [cloud_ocr._mineru, cloud_ocr._google_vision, cloud_ocr._azure_document_intelligence])

    def test_mineru_uploads_then_polls_and_reads_markdown(self):
        archive = BytesIO()
        with ZipFile(archive, "w") as bundle:
            bundle.writestr("result/full.md", "# عنوان\n\nسلام NEXORA")
        responses = [
            _context(json.dumps({"code": 0, "data": {"batch_id": "batch-1", "file_urls": ["https://upload.test/file"]}}).encode()),
            _context(),
            _context(json.dumps({"code": 0, "data": {"extract_result": [{"state": "done", "full_zip_url": "https://result.test/archive.zip"}]}}).encode()),
            _context(archive.getvalue()),
        ]
        source = Path(__file__).parent / "fixtures" / "scanned-blank.pdf"
        with patch.object(cloud_ocr, "MINERU_API_TOKEN", "test-token"), patch.object(cloud_ocr, "urlopen", side_effect=responses) as urlopen, patch.object(cloud_ocr.time, "sleep"):
            text = cloud_ocr._mineru(source, "application/pdf")

        self.assertEqual(text, "# عنوان\n\nسلام NEXORA")
        requests = [call.args[0] for call in urlopen.call_args_list]
        self.assertEqual(requests[0].full_url, "https://mineru.net/api/v4/file-urls/batch")
        self.assertEqual(requests[0].get_header("Authorization"), "Bearer test-token")
        self.assertEqual(json.loads(requests[0].data)["language"], cloud_ocr.MINERU_LANGUAGE)
        self.assertEqual(requests[1].method, "PUT")
        self.assertEqual(requests[2].full_url, "https://mineru.net/api/v4/extract-results/batch/batch-1")

    def test_mineru_rejects_archive_without_markdown(self):
        archive = BytesIO()
        with ZipFile(archive, "w") as bundle:
            bundle.writestr("result/layout.json", "{}")
        response = _context(archive.getvalue())
        with patch.object(cloud_ocr, "urlopen", return_value=response):
            with self.assertRaisesRegex(cloud_ocr.OCRUnavailableError, "Markdown"):
                cloud_ocr._mineru_markdown({"full_zip_url": "https://result.test/archive.zip"})

    def test_scanned_pdf_uses_ocr_after_native_extraction_is_empty(self):
        reader = MagicMock()
        reader.pages = [MagicMock(extract_text=lambda: "")]
        with patch("app.services.document_extractor.PdfReader", return_value=reader), patch("app.services.document_extractor.extract_scanned_document_text", return_value="متن اسکن‌شده") as ocr:
            self.assertEqual(_extract_pdf(Path("scan.pdf")), "متن اسکن‌شده")
        ocr.assert_called_once_with(Path("scan.pdf"), "application/pdf")

    def test_real_pdf_without_text_layer_is_rendered_as_a_png_page(self):
        # This mirrors the scanned-PDF route: a page without an embedded text layer.
        source = Path(__file__).parent / "fixtures" / "scanned-blank.pdf"
        pages = cloud_ocr._vision_pages(source, "application/pdf")

        self.assertEqual(len(pages), 1)
        self.assertTrue(pages[0].startswith(b"\x89PNG\r\n\x1a\n"))

    def test_google_quota_error_becomes_a_safe_ocr_failure(self):
        image = MagicMock()
        image.read_bytes.return_value = b"png-bytes"
        quota_error = HTTPError("https://vision.googleapis.test", 429, "Too Many Requests", {}, BytesIO(b"quota exceeded"))

        with patch.object(cloud_ocr, "GOOGLE_VISION_API_KEY", "test-key"), patch.object(cloud_ocr, "urlopen", side_effect=quota_error):
            with self.assertRaisesRegex(cloud_ocr.OCRUnavailableError, "Google Vision request failed"):
                cloud_ocr._google_vision(image, "image/png")

    def test_google_timeout_becomes_a_safe_ocr_failure(self):
        image = MagicMock()
        image.read_bytes.return_value = b"png-bytes"

        with patch.object(cloud_ocr, "GOOGLE_VISION_API_KEY", "test-key"), patch.object(cloud_ocr, "urlopen", side_effect=TimeoutError):
            with self.assertRaisesRegex(cloud_ocr.OCRUnavailableError, "Google Vision request failed"):
                cloud_ocr._google_vision(image, "image/png")

    def test_azure_polls_until_the_operation_succeeds(self):
        submit = MagicMock()
        submit.headers.get.return_value = "https://azure.example/operations/42"
        running = MagicMock()
        running.read.return_value = b'{"status":"running"}'
        complete = MagicMock()
        complete.read.return_value = json.dumps(
            {"status": "succeeded", "analyzeResult": {"content": "سلام world"}}
        ).encode("utf-8")
        contexts = []
        for response in (submit, running, complete):
            context = MagicMock()
            context.__enter__.return_value = response
            contexts.append(context)
        image = MagicMock()
        image.read_bytes.return_value = b"png-bytes"

        with patch.object(cloud_ocr, "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", "https://azure.example"), patch.object(cloud_ocr, "AZURE_DOCUMENT_INTELLIGENCE_KEY", "test-key"), patch.object(cloud_ocr, "urlopen", side_effect=contexts), patch.object(cloud_ocr.time, "sleep"):
            self.assertEqual(cloud_ocr._azure_document_intelligence(image, "image/png"), "سلام world")


if __name__ == "__main__":
    unittest.main()


def _context(body: bytes = b"") -> MagicMock:
    response = MagicMock()
    response.read.return_value = body
    context = MagicMock()
    context.__enter__.return_value = response
    return context
