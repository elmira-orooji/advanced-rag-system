import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.connector import Connector
from app.services.connector_scheduler import run_due_connector_syncs


class ConnectorSchedulerTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        self.addCleanup(self.engine.dispose)
        Connector.__table__.create(self.engine)
        self.sessions = sessionmaker(bind=self.engine, expire_on_commit=True)
        self.enterContext(patch("app.services.connector_scheduler.SessionLocal", self.sessions))

    def seed(self, count):
        ids = [uuid4() for _ in range(count)]
        with self.sessions() as db:
            for connector_id in ids:
                db.add(Connector(id=connector_id, document_set_id=uuid4(), created_by_id=uuid4(),
                                 connector_type="website", name="Test", source_url="https://example.com",
                                 status="ready", schedule_enabled=True, schedule_interval="daily",
                                 next_sync_at=datetime.now(timezone.utc) - timedelta(days=1)))
            db.commit()
        return ids

    def test_second_worker_after_first_commit_does_not_duplicate_remaining_jobs(self):
        ids = self.seed(3)
        seen = []
        def sync(db, item):
            seen.append(item.id)
            if len(seen) == 1:
                # The other worker starts after the first worker releases its locks.
                run_due_connector_syncs()
        with patch("app.services.connector_scheduler.sync_connector", side_effect=sync):
            run_due_connector_syncs()
        self.assertCountEqual(seen, ids)

    def test_failure_does_not_prevent_next_job(self):
        ids = self.seed(2)
        with patch("app.services.connector_scheduler.sync_connector", side_effect=[RuntimeError("Sync failed"), None]):
            self.assertEqual(run_due_connector_syncs(), 2)
        with self.sessions() as db:
            self.assertCountEqual([db.get(Connector, value).status for value in ids], ["failed", "ready"])

    def test_run_is_bounded_to_ten_claims(self):
        self.seed(11)
        with patch("app.services.connector_scheduler.sync_connector") as sync:
            self.assertEqual(run_due_connector_syncs(), 10)
            self.assertEqual(sync.call_count, 10)
            self.assertEqual(run_due_connector_syncs(), 1)

    def test_empty_queue_does_not_run_sync(self):
        with patch("app.services.connector_scheduler.sync_connector") as sync:
            self.assertEqual(run_due_connector_syncs(), 0)
        sync.assert_not_called()
