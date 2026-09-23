"""HTTP-level integration tests for the API's critical request boundaries.

These tests exercise FastAPI routing, request validation, middleware and response
serialization while substituting only persistence and external providers. They do
not need PostgreSQL, Qdrant, OCR, or an LLM service.
"""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.routes.auth import get_current_user
from app.core.rate_limit import auth_limiter, general_limiter
from app.db.database import get_db
from app.main import app


@pytest.fixture(autouse=True)
def api_test_state():
    """Keep global dependency overrides and in-memory rate limits isolated."""
    app.dependency_overrides.clear()
    auth_limiter._buckets.clear()
    general_limiter._buckets.clear()
    yield
    app.dependency_overrides.clear()
    auth_limiter._buckets.clear()
    general_limiter._buckets.clear()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.integration
def test_health_endpoint_runs_through_application_middleware(client):
    response = client.get("/health", headers={"X-Request-ID": "critical-flow-test"})

    assert response.status_code == 200
    assert response.json() == {"status": "alive"}
    assert response.headers["X-Request-ID"] == "critical-flow-test"


@pytest.mark.integration
def test_v1_validation_errors_keep_detail_and_expose_a_stable_error_contract(client):
    response = client.post("/api/v1/auth/login", json={"username": "a", "password": "short"})

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)
    assert response.json()["error"]["code"] == "validation_error"
    assert response.json()["error"]["request_id"] == response.headers["X-Request-ID"]
    assert response.headers["X-API-Version"] == "1"


@pytest.mark.integration
def test_login_returns_a_cookie_backed_session_over_http(client):
    organization_id = uuid4()
    user = SimpleNamespace(
        id=uuid4(),
        organization_id=organization_id,
        username="admin",
        password_hash="stored-hash",
        role="admin",
        is_active=True,
    )
    organization = SimpleNamespace(id=organization_id, name="Nexora", slug="default")
    db = MagicMock()
    db.scalar.side_effect = [organization, user]

    def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    with (
        patch("app.api.routes.auth.verify_password", return_value=True),
        patch("app.api.routes.auth.clear_account_failures"),
        patch("app.api.routes.auth.retry_after", return_value=None),
        patch("app.api.routes.auth.create_access_token", return_value="signed-session"),
    ):
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "correct-password", "organization": "default"},
        )

    assert response.status_code == 200
    assert response.json()["user"]["username"] == "admin"
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "signed-session" in response.headers["set-cookie"]
    db.commit.assert_called_once()


@pytest.mark.integration
def test_upload_endpoint_accepts_multipart_and_queues_processing(client):
    user = SimpleNamespace(id=uuid4(), organization_id=uuid4(), role="admin")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: MagicMock()
    document_id, job_id = uuid4(), uuid4()
    queued_document = SimpleNamespace(
        id=document_id,
        filename="guide.txt",
        content_type="text/plain",
        status="queued",
        processing_error=None,
        processing_progress=0,
        processing_stage="queued",
        author=None,
        language=None,
        source_type="upload",
        document_date=None,
        tags=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        content_checksum=None,
        job_id=job_id,
    )

    with patch("app.api.routes.documents.DocumentIngestionService") as service_factory:
        service_factory.return_value.ingest.return_value = queued_document
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("guide.txt", b"Nexora knowledge", "text/plain")},
            headers={"Idempotency-Key": "upload-flow-1"},
        )

    assert response.status_code == 201
    assert response.json()["status"] == "queued"
    assert response.json()["job_id"] == str(job_id)
    service_factory.return_value.ingest.assert_called_once()


@pytest.mark.integration
def test_conversation_list_exposes_additive_offset_pagination_headers(client):
    user = SimpleNamespace(id=uuid4(), organization_id=uuid4(), role="user")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: MagicMock()
    conversation = SimpleNamespace(
        id=uuid4(),
        title="Policy questions",
        document_id=None,
        document_set_id=None,
        assistant_id=None,
        workspace_scope=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch("app.api.routes.conversations.get_conversation_service") as service_factory:
        service_factory.return_value.list.return_value = [conversation]
        response = client.get("/api/v1/conversations?offset=20&limit=1")

    assert response.status_code == 200
    assert response.headers["X-Pagination-Offset"] == "20"
    assert response.headers["X-Pagination-Limit"] == "1"
    assert response.headers["X-Pagination-Returned"] == "1"
    assert response.headers["X-Pagination-Has-More"] == "true"
    assert response.headers["X-Pagination-Next-Offset"] == "21"
