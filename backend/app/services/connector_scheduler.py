import logging
import threading
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_, select

from app.db.database import SessionLocal
from app.models.connector import Connector
from app.services.connector_sync import sync_connector
from app.services.connector_lock import connector_sync_lock

_started = False
logger = logging.getLogger(__name__)


def _delay(interval: str) -> timedelta:
    return {"hourly": timedelta(hours=1), "daily": timedelta(days=1), "weekly": timedelta(days=7)}.get(interval, timedelta(days=1))


def run_due_connector_syncs() -> int:
    now = datetime.now(timezone.utc); processed = 0
    attempted = set()
    while processed < 10:
        with SessionLocal() as db:
            # Claim only the row we will process before commit releases its lock.
            item = db.scalar(select(Connector).where(
                Connector.connector_type != "webhook", Connector.id.not_in(attempted),
                or_(Connector.status == "syncing", and_(Connector.schedule_enabled.is_(True), Connector.next_sync_at <= now)),
            ).order_by(Connector.next_sync_at, Connector.id).with_for_update(skip_locked=True).limit(1))
            if item is None:
                break
            connector_id = item.id
            attempted.add(connector_id)
            with connector_sync_lock(db.get_bind(), connector_id) as acquired:
                if not acquired:
                    continue
                item.status = "syncing"; item.last_error = None; item.next_sync_at = now + _delay(item.schedule_interval) if item.schedule_enabled else None; db.commit()
                try:
                    sync_connector(db, item); item = db.get(Connector, connector_id); item.status = "ready"; item.last_synced_at = datetime.now(timezone.utc); item.last_error = None
                except Exception as exc:
                    logger.exception("Scheduled connector sync failed", extra={"connector_id": str(connector_id)})
                    db.rollback(); item = db.get(Connector, connector_id); item.status = "failed"; item.last_error = str(exc)[:500]
                item.next_sync_at = datetime.now(timezone.utc) + _delay(item.schedule_interval) if item.schedule_enabled else None; db.commit(); processed += 1
    return processed


def _scheduler_loop(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        try:
            run_due_connector_syncs()
        except Exception:
            logger.exception("Connector scheduler iteration failed")
        stop_event.wait(60)


def start_connector_scheduler() -> None:
    global _started
    if _started: return
    _started = True
    threading.Thread(target=_scheduler_loop, args=(threading.Event(),), name="connector-scheduler", daemon=True).start()
