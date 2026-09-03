import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import DATABASE_URL


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


_DB_POOL_SIZE = _int_env("DB_POOL_SIZE", 10)
_DB_MAX_OVERFLOW = _int_env("DB_MAX_OVERFLOW", 20)
_DB_POOL_TIMEOUT = _float_env("DB_POOL_TIMEOUT", 30.0)
_DB_POOL_RECYCLE = _int_env("DB_POOL_RECYCLE", 1800)
_DB_POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").strip().lower() not in {
    "0",
    "false",
    "no",
    "off",
}

engine = create_engine(
    DATABASE_URL,
    pool_size=_DB_POOL_SIZE,
    max_overflow=_DB_MAX_OVERFLOW,
    pool_timeout=_DB_POOL_TIMEOUT,
    pool_recycle=_DB_POOL_RECYCLE,
    pool_pre_ping=_DB_POOL_PRE_PING,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()