import logging
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.routes import analytics_router, assistants_router, auth_router, chat_shares_router, connectors_router, conversations_router, document_sets_router, documents_router, evaluations_router, feedback_router, rag_router, research_router, search_router, users_router
from app.core.config import FRONTEND_ORIGINS, UPLOAD_DIR
from app.db.database import get_db
from app.services.qdrant import QdrantClient, QdrantError

logger = logging.getLogger(__name__)

app = FastAPI(title="Advanced RAG API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(assistants_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(document_sets_router, prefix="/api/v1")
app.include_router(evaluations_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(rag_router, prefix="/api/v1")
app.include_router(research_router, prefix="/api/v1")
app.include_router(conversations_router, prefix="/api/v1")
app.include_router(connectors_router, prefix="/api/v1")
app.include_router(chat_shares_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
@app.get("/")
def root():
    return {
        "status": "API is running"
    }


@app.get("/health")
def health(response: Response, db: Session = Depends(get_db)):
    checks: dict[str, str] = {}
    failures: list[str] = []

    # Database connectivity
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except SQLAlchemyError as exc:
        logger.warning("Health check database probe failed: %s", exc)
        checks["database"] = "unavailable"
        failures.append("database")

    # Qdrant vector store availability (critical for RAG)
    try:
        client = QdrantClient()
        client.ensure_collection()
        checks["qdrant"] = "connected"
    except QdrantError as exc:
        logger.warning("Health check qdrant probe failed: %s", exc)
        checks["qdrant"] = "unavailable"
        failures.append("qdrant")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Health check qdrant probe unexpected failure: %s", exc)
        checks["qdrant"] = "unavailable"
        failures.append("qdrant")

    # Document storage filesystem writability
    try:
        upload_root = Path(UPLOAD_DIR) if UPLOAD_DIR else None
        if upload_root is None:
            checks["storage"] = "misconfigured"
            failures.append("storage")
        else:
            upload_root.mkdir(parents=True, exist_ok=True)
            probe = upload_root / ".healthcheck"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            checks["storage"] = "writable"
    except OSError as exc:
        logger.warning("Health check storage probe failed: %s", exc)
        checks["storage"] = "unavailable"
        failures.append("storage")

    overall_status = "healthy" if not failures else "degraded"
    status_code = status.HTTP_200_OK if not failures else status.HTTP_503_SERVICE_UNAVAILABLE
    response.status_code = status_code

    return {
        "status": overall_status,
        "checks": checks,
        "failures": failures,
    }
