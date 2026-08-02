from dotenv import load_dotenv
from pathlib import Path
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
UPLOAD_DIR = BASE_DIR / "storage" / "documents"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024
