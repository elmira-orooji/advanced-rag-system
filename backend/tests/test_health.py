import unittest
from unittest.mock import MagicMock, patch

from fastapi import Response, status
from sqlalchemy.exc import SQLAlchemyError

from app.main import health
from app.services.qdrant import QdrantError


class HealthCheckTests(unittest.TestCase):
    def test_dependency_failure_returns_service_unavailable(self):
        db = MagicMock()
        db.execute.side_effect = SQLAlchemyError("database unavailable")
        response = Response()

        with (
            patch("app.main.QdrantClient", side_effect=QdrantError("qdrant unavailable")),
            patch("app.main.UPLOAD_DIR", ""),
            patch("app.main.get_available_worker_types", return_value=set()),
        ):
            payload = health(response, db)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(payload["status"], "degraded")
        self.assertEqual(
            payload["failures"],
            ["database", "qdrant", "storage", "document_worker", "connector_scheduler"],
        )

    def test_missing_required_workers_returns_service_unavailable(self):
        db = MagicMock()
        response = Response()
        upload_root = MagicMock()

        with (
            patch("app.main.QdrantClient"),
            patch("app.main.Path", return_value=upload_root),
            patch("app.main.UPLOAD_DIR", "uploads"),
            patch("app.main.get_available_worker_types", return_value=set()),
        ):
            payload = health(response, db)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(payload["checks"]["document_worker"], "unavailable")
        self.assertEqual(payload["checks"]["connector_scheduler"], "unavailable")

    def test_fresh_required_workers_keep_service_healthy(self):
        db = MagicMock()
        response = Response()
        upload_root = MagicMock()

        with (
            patch("app.main.QdrantClient"),
            patch("app.main.Path", return_value=upload_root),
            patch("app.main.UPLOAD_DIR", "uploads"),
            patch(
                "app.main.get_available_worker_types",
                return_value={"document_worker", "connector_scheduler"},
            ),
        ):
            payload = health(response, db)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(payload["status"], "healthy")
        self.assertEqual(payload["failures"], [])


if __name__ == "__main__":
    unittest.main()
