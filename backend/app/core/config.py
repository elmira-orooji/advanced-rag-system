from dotenv import load_dotenv
from pathlib import Path
import json
import os

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env", override=True)

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
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "nexora_session")
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").strip().lower() in {"1", "true", "yes", "on"}
AUTH_SESSION_SECONDS = int(os.getenv("AUTH_SESSION_SECONDS", str(8 * 60 * 60)))
AUTH_REMEMBER_SECONDS = int(os.getenv("AUTH_REMEMBER_SECONDS", str(30 * 24 * 60 * 60)))
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
