import inspect
import unittest
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.api.routes.documents import _save_upload, ingest_document, upload_document


class DocumentUploadExecutionTests(unittest.TestCase):
    def test_blocking_upload_routes_are_sync_endpoints(self):
        self.assertFalse(inspect.iscoroutinefunction(upload_document))
        self.assertFalse(inspect.iscoroutinefunction(ingest_document))

    def test_save_upload_reads_from_sync_spooled_file(self):
        upload = SimpleNamespace(file=BytesIO(b"uploaded content"))
        destination = MagicMock()
        output = destination.open.return_value.__enter__.return_value

        size = _save_upload(upload, destination)

        self.assertEqual(size, len(b"uploaded content"))
        output.write.assert_called_once_with(b"uploaded content")
