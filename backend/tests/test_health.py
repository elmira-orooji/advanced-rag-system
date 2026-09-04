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
        ):
            payload = health(response, db)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(payload["status"], "degraded")
        self.assertEqual(payload["failures"], ["database", "qdrant", "storage"])


if __name__ == "__main__":
    unittest.main()
