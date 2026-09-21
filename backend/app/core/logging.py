"""Application logging with optional bounded on-disk retention."""

import logging
from logging.handlers import RotatingFileHandler

from app.core.config import LOG_BACKUP_COUNT, LOG_FILE, LOG_LEVEL, LOG_MAX_BYTES


def configure_logging() -> None:
    """Configure console logging and an optional rotating file handler once."""
    level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)
    if not root.handlers:
        logging.basicConfig(level=level)
    if LOG_FILE is None:
        return

    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    resolved_path = str(LOG_FILE.resolve())
    if any(getattr(handler, "baseFilename", None) == resolved_path for handler in root.handlers):
        return

    handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=LOG_MAX_BYTES,
        backupCount=LOG_BACKUP_COUNT,
        encoding="utf-8",
    )
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    root.addHandler(handler)
