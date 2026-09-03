"""PgBouncer-compatible connector sync locking via lease rows.

Replaces the previous session advisory lock which required a dedicated
PostgreSQL connection for the entire sync duration and was incompatible
with transaction pooling. The new implementation uses short-lived
database transactions to acquire, renew, and release a lease row.
"""

import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models.sync_lease import SyncLease

# Lease lifetime must exceed the maximum expected gap between heartbeats.
_DEFAULT_LEASE_TTL = timedelta(minutes=5)
_HEARTBEAT_INTERVAL = timedelta(seconds=30)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(dt: datetime) -> datetime:
    """Return ``dt`` as a timezone-aware UTC datetime.

    SQLite may return naive datetimes even when the column is defined with
    ``DateTime(timezone=True)``. This helper normalises them so comparisons
    with ``_utcnow()`` never raise ``TypeError``.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@contextmanager
def connector_sync_lock(db: Session, connector_id: UUID):
    """Acquire a lease-based lock for ``connector_id``.

    Yields ``True`` if the lease was acquired, ``False`` otherwise.
    When acquired, a background heartbeat thread keeps the lease alive
    until the context exits. Compatible with PgBouncer transaction
    pooling because no session state is relied upon.
    """
    owner_id = str(uuid.uuid4())
    now = _utcnow()
    expires_at = now + _DEFAULT_LEASE_TTL

    # Try to acquire or take over an expired lease in a single statement.
    existing = db.execute(
        select(SyncLease).where(SyncLease.connector_id == connector_id)
    ).scalar_one_or_none()

    acquired = False
    if existing is None:
        try:
            db.add(SyncLease(connector_id=connector_id, owner_id=owner_id, expires_at=expires_at))
            db.commit()
            acquired = True
        except Exception:
            db.rollback()
    else:
        # Normalize for comparison: SQLite may return naive datetimes.
        lease_expires = existing.expires_at
        if lease_expires.tzinfo is None:
            lease_expires = lease_expires.replace(tzinfo=timezone.utc)
        if lease_expires < now:
            # Lease has expired; take ownership.
            existing.owner_id = owner_id
            existing.expires_at = expires_at
            try:
                db.commit()
                acquired = True
            except Exception:
                db.rollback()

    if not acquired:
        yield False
        return

    # Heartbeat loop to keep the lease alive during long syncs.
    stop_event = threading.Event()

    def _heartbeat():
        while not stop_event.wait(_HEARTBEAT_INTERVAL.total_seconds()):
            try:
                with db.bind.connect() as conn:
                    # Use a fresh transaction for each heartbeat to stay
                    # compatible with transaction poolers.
                    result = conn.execute(
                        update(SyncLease)
                        .where(
                            SyncLease.connector_id == connector_id,
                            SyncLease.owner_id == owner_id,
                        )
                        .values(expires_at=_utcnow() + _DEFAULT_LEASE_TTL)
                    )
                    conn.commit()
                    if result.rowcount == 0:
                        # Lost ownership; stop heartbeating.
                        break
            except Exception:
                # Transient DB errors should not kill the heartbeat thread;
                # the next tick will retry.
                continue

    thread = threading.Thread(target=_heartbeat, daemon=True)
    thread.start()
    try:
        yield True
    finally:
        stop_event.set()
        thread.join(timeout=5)
        # Release the lease if we still own it.
        try:
            db.execute(
                delete(SyncLease).where(
                    SyncLease.connector_id == connector_id,
                    SyncLease.owner_id == owner_id,
                )
            )
            db.commit()
        except Exception:
            db.rollback()
