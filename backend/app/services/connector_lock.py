import hashlib
from contextlib import contextmanager
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Engine


@contextmanager
def connector_sync_lock(engine: Engine, connector_id: UUID):
    """Hold a session advisory lock across the sync's database commits.

    A dedicated connection keeps the lock until completion or process death.
    This requires PostgreSQL with session pooling (not transaction pooling).
    """
    key = int.from_bytes(hashlib.blake2b(b"connector-sync:" + connector_id.bytes, digest_size=8).digest(), "big", signed=True)
    with engine.connect() as connection:
        acquired = False
        try:
            acquired = bool(connection.scalar(text("SELECT pg_try_advisory_lock(:key)"), {"key": key}))
            connection.commit()
            yield acquired
        finally:
            if acquired:
                try:
                    connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": key})
                    connection.commit()
                except Exception:
                    # Never return a connection still holding the lock to the pool.
                    connection.invalidate()
                    raise
