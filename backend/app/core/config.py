from dotenv import load_dotenv
from pathlib import Path
import json
import os

BASE_DIR = Path(__file__).resolve().parents[2]
_TRUE_VALUES = {"1", "true", "yes", "on"}
_FALSE_VALUES = {"0", "false", "no", "off"}
_NON_PRODUCTION_ENVIRONMENTS = {"development", "test"}


def _load_environment(env_file: Path = BASE_DIR / ".env") -> None:
    """Load local defaults without replacing host-provided configuration."""
    load_dotenv(env_file, override=False)


def _boolean_setting(name: str, *, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    normalized = raw_value.strip().lower()
    if normalized in _TRUE_VALUES:
        return True
    if normalized in _FALSE_VALUES:
        return False
    raise RuntimeError(f"{name} must be a boolean value")


def _validate_cookie_security(environment: str, secure: bool) -> None:
    if not secure and environment not in _NON_PRODUCTION_ENVIRONMENTS:
        raise RuntimeError(
            "AUTH_COOKIE_SECURE may only be disabled when APP_ENV is development or test"
        )


_load_environment()

DATABASE_URL = os.getenv("DATABASE_URL")
QDRANT_URL = os.getenv("QDRANT_URL", "").rstrip("/")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "rag_chunks")
QDRANT_EMBEDDING_MODEL = os.getenv(
    "QDRANT_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")
OPENROUTER_INPUT_COST_PER_MILLION = float(os.getenv("OPENROUTER_INPUT_COST_PER_MILLION", "0"))
OPENROUTER_OUTPUT_COST_PER_MILLION = float(os.getenv("OPENROUTER_OUTPUT_COST_PER_MILLION", "0"))
UPLOAD_DIR = BASE_DIR / "storage" / "documents"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "")
if len(AUTH_SECRET_KEY) < 32:
    raise RuntimeError("AUTH_SECRET_KEY must be set to at least 32 characters")
APP_ENV = os.getenv("APP_ENV", "production").strip().lower()
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "nexora_session")
AUTH_COOKIE_SECURE = _boolean_setting("AUTH_COOKIE_SECURE", default=True)
_validate_cookie_security(APP_ENV, AUTH_COOKIE_SECURE)
AUTH_SESSION_SECONDS = int(os.getenv("AUTH_SESSION_SECONDS", str(8 * 60 * 60)))
AUTH_REMEMBER_SECONDS = int(os.getenv("AUTH_REMEMBER_SECONDS", str(30 * 24 * 60 * 60)))
AUTH_FAILURE_WINDOW_SECONDS = int(os.getenv("AUTH_FAILURE_WINDOW_SECONDS", "900"))
AUTH_ACCOUNT_FAILURE_LIMIT = int(os.getenv("AUTH_ACCOUNT_FAILURE_LIMIT", "5"))
AUTH_IP_FAILURE_LIMIT = int(os.getenv("AUTH_IP_FAILURE_LIMIT", "30"))
AUTH_LOCK_BASE_SECONDS = int(os.getenv("AUTH_LOCK_BASE_SECONDS", "30"))
AUTH_LOCK_MAX_SECONDS = int(os.getenv("AUTH_LOCK_MAX_SECONDS", "900"))
DOCUMENT_JOB_POLL_SECONDS = float(os.getenv("DOCUMENT_JOB_POLL_SECONDS", "1"))
DOCUMENT_JOB_LEASE_SECONDS = int(os.getenv("DOCUMENT_JOB_LEASE_SECONDS", "3600"))
CONNECTOR_SCHEDULER_POLL_SECONDS = float(os.getenv("CONNECTOR_SCHEDULER_POLL_SECONDS", "60"))
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
try:
    CONNECTOR_CREDENTIALS = json.loads(os.getenv("CONNECTOR_CREDENTIALS_JSON", "{}"))
except json.JSONDecodeError as exc:
    raise RuntimeError("CONNECTOR_CREDENTIALS_JSON must contain valid JSON") from exc
if not isinstance(CONNECTOR_CREDENTIALS, dict):
    raise RuntimeError("CONNECTOR_CREDENTIALS_JSON must be an object keyed by organization ID")
