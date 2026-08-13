import threading
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.database import SessionLocal
from app.models.connector import Connector
from app.services.connector_sync import sync_connector

_started = False


def _delay(interval: str) -> timedelta:
    return {"hourly": timedelta(hours=1), "daily": timedelta(days=1), "weekly": timedelta(days=7)}.get(interval, timedelta(days=1))


def run_due_connector_syncs() -> int:
    now = datetime.now(timezone.utc); processed = 0
    with SessionLocal() as db:
        due = list(db.scalars(select(Connector).where(Connector.schedule_enabled.is_(True), Connector.next_sync_at <= now, Connector.status != "syncing").with_for_update(skip_locked=True).limit(10)).all())
        for item in due:
            connector_id = item.id
            item.status = "syncing"; item.last_error = None; item.next_sync_at = now + _delay(item.schedule_interval); db.commit()
            try:
                sync_connector(db, item); item = db.get(Connector, connector_id); item.status = "ready"; item.last_synced_at = datetime.now(timezone.utc); item.last_error = None
            except Exception as exc:
                db.rollback(); item = db.get(Connector, connector_id); item.status = "failed"; item.last_error = str(exc)[:500]
            item.next_sync_at = datetime.now(timezone.utc) + _delay(item.schedule_interval); db.commit(); processed += 1
    return processed


def start_connector_scheduler() -> None:
    global _started
    if _started: return
    _started = True
    def loop():
        while True:
            try: run_due_connector_syncs()
            except Exception: pass
            threading.Event().wait(60)
    threading.Thread(target=loop, name="connector-scheduler", daemon=True).start()
