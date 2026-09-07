import logging
import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.routes import analytics_router, assistants_router, auth_router, chat_shares_router, connectors_router, conversations_router, document_sets_router, documents_router, evaluations_router, feedback_router, rag_router, research_router, search_router, users_router
from app.core.config import FRONTEND_ORIGINS, READINESS_PROBE_TIMEOUT_SECONDS, UPLOAD_DIR, WORKER_STALE_THRESHOLD_SECONDS
from app.db.database import get_db
from app.services.qdrant import QdrantClient, QdrantError
from app.services.worker_heartbeat import get_available_worker_types
from app.core.rate_limit import RateLimitMiddleware

logger = logging.getLogger(__name__)

app = FastAPI(title="Advanced RAG API")
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_collection_setup():
    """Keep API startup independent from external vector-store availability.

    Collection creation belongs to the indexing worker or deployment setup.
    Readiness performs the bounded, read-only vector-store probe.
    """
    logger.info("API started; Qdrant collection setup is deferred to indexing")


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
def health():
    """Lightweight, side-effect-free process liveness probe."""
    return {"status": "alive"}


@app.get("/ready")
def readiness(response: Response, db: Session = Depends(get_db)):
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
        client.check_ready(timeout_seconds=READINESS_PROBE_TIMEOUT_SECONDS)
        checks["qdrant"] = "connected"
    except QdrantError as exc:
        logger.warning("Health check qdrant probe failed: %s", exc)
        checks["qdrant"] = "unavailable"
        failures.append("qdrant")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Health check qdrant probe unexpected failure: %s", exc)
        checks["qdrant"] = "unavailable"
        failures.append("qdrant")

    # Document storage availability without creating or deleting probe files
    try:
        upload_root = Path(UPLOAD_DIR) if UPLOAD_DIR else None
        if upload_root is None:
            checks["storage"] = "misconfigured"
            failures.append("storage")
        elif not upload_root.is_dir() or not os.access(upload_root, os.W_OK):
            checks["storage"] = "unavailable"
            failures.append("storage")
        else:
            checks["storage"] = "writable"
    except OSError as exc:
        logger.warning("Health check storage probe failed: %s", exc)
        checks["storage"] = "unavailable"
        failures.append("storage")

    # Background workers required for ingestion and scheduled connector syncs
    required_worker_types = ("document_worker", "connector_scheduler")
    try:
        available_worker_types = get_available_worker_types(WORKER_STALE_THRESHOLD_SECONDS)
    except SQLAlchemyError as exc:
        logger.warning("Health check worker registry probe failed: %s", exc)
        available_worker_types = set()
    for worker_type in required_worker_types:
        available = worker_type in available_worker_types
        checks[worker_type] = "available" if available else "unavailable"
        if not available:
            failures.append(worker_type)

    overall_status = "healthy" if not failures else "degraded"
    status_code = status.HTTP_200_OK if not failures else status.HTTP_503_SERVICE_UNAVAILABLE
    response.status_code = status_code

    return {
        "status": overall_status,
        "checks": checks,
        "failures": failures,
    }
