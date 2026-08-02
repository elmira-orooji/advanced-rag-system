from dotenv import load_dotenv
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
UPLOAD_DIR = BASE_DIR / "storage" / "documents"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024
