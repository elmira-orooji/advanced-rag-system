import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.connector import Connector
from app.services import connector_scheduler as scheduler
from app.services.connector_scheduler import run_due_connector_syncs
from app.services.connector_lock import connector_sync_lock


class ConnectorSchedulerTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        self.addCleanup(self.engine.dispose)
        Connector.__table__.create(self.engine)
        self.sessions = sessionmaker(bind=self.engine, expire_on_commit=True)
        self.enterContext(patch("app.services.connector_scheduler.SessionLocal", self.sessions))
        self.locked = set()
        @contextmanager
        def lock(engine, connector_id):
            if connector_id in self.locked:
                yield False
                return
            self.locked.add(connector_id)
            try:
                yield True
            finally:
                self.locked.remove(connector_id)
        self.enterContext(patch("app.services.connector_scheduler.connector_sync_lock", lock, create=True))

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
        with patch("app.services.connector_scheduler.sync_connector", side_effect=[RuntimeError("Sync failed"), None]), patch.object(scheduler.logger, "exception") as logged:
            self.assertEqual(run_due_connector_syncs(), 2)
        logged.assert_called_once()
        self.assertIn("connector_id", logged.call_args.kwargs["extra"])
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

    def test_abandoned_sync_is_recovered_before_next_schedule(self):
        connector_id = self.seed(1)[0]
        with self.sessions() as db:
            item = db.get(Connector, connector_id)
            item.status = "syncing"
            item.next_sync_at = datetime.now(timezone.utc) + timedelta(days=1)
            db.commit()
        with patch("app.services.connector_scheduler.sync_connector") as sync:
            self.assertEqual(run_due_connector_syncs(), 1)
        sync.assert_called_once()
        with self.sessions() as db:
            self.assertEqual(db.get(Connector, connector_id).status, "ready")

    def test_live_sync_is_skipped_until_owner_lock_is_released(self):
        connector_id = self.seed(1)[0]
        with self.sessions() as db:
            db.get(Connector, connector_id).status = "syncing"
            db.commit()
        self.locked.add(connector_id)
        with patch("app.services.connector_scheduler.sync_connector") as sync:
            self.assertEqual(run_due_connector_syncs(), 0)
            sync.assert_not_called()
            self.locked.remove(connector_id)
            self.assertEqual(run_due_connector_syncs(), 1)

    def test_interrupted_manual_sync_is_recovered_without_enabling_schedule(self):
        connector_id = self.seed(1)[0]
        with self.sessions() as db:
            item = db.get(Connector, connector_id)
            item.status = "syncing"
            item.schedule_enabled = False
            item.next_sync_at = None
            db.commit()
        with patch("app.services.connector_scheduler.sync_connector"):
            self.assertEqual(run_due_connector_syncs(), 1)
        with self.sessions() as db:
            item = db.get(Connector, connector_id)
            self.assertFalse(item.schedule_enabled)
            self.assertIsNone(item.next_sync_at)

    def test_scheduler_loop_logs_iteration_failure_and_continues(self):
        stop_event = MagicMock()
        stop_event.is_set.side_effect = [False, False, True]
        with patch.object(scheduler, "run_due_connector_syncs", side_effect=[RuntimeError("Database unavailable"), 0]) as run, patch.object(scheduler.logger, "exception") as logged:
            scheduler._scheduler_loop(stop_event)
        self.assertEqual(run.call_count, 2)
        logged.assert_called_once_with("Connector scheduler iteration failed")
        self.assertEqual(stop_event.wait.call_count, 2)


class ConnectorLockTests(unittest.TestCase):
    def setUp(self):
        self.engine = MagicMock()
        self.connection = self.engine.connect.return_value.__enter__.return_value

    def test_lock_is_released_after_success_or_failure(self):
        for fail in (False, True):
            with self.subTest(fail=fail):
                self.connection.reset_mock()
                self.connection.scalar.return_value = True
                try:
                    with connector_sync_lock(self.engine, uuid4()) as acquired:
                        self.assertTrue(acquired)
                        self.connection.execute.assert_not_called()
                        if fail:
                            raise RuntimeError("Worker failed")
                except RuntimeError:
                    self.assertTrue(fail)
                self.assertIn("pg_advisory_unlock", str(self.connection.execute.call_args.args[0]))
                self.assertEqual(self.connection.scalar.call_args.args[1], self.connection.execute.call_args.args[1])

    def test_busy_lock_is_not_released_by_non_owner(self):
        self.connection.scalar.return_value = False
        with connector_sync_lock(self.engine, uuid4()) as acquired:
            self.assertFalse(acquired)
        self.connection.execute.assert_not_called()

    def test_unlock_error_discards_connection(self):
        self.connection.scalar.return_value = True
        self.connection.execute.side_effect = RuntimeError("Connection lost")
        with self.assertRaises(RuntimeError):
            with connector_sync_lock(self.engine, uuid4()):
                pass
        self.connection.invalidate.assert_called_once()

    def test_manual_sync_rejects_live_owner(self):
        from fastapi import HTTPException
        from app.api.routes.connectors import sync
        from types import SimpleNamespace

        set_id, connector_id = uuid4(), uuid4()
        db = MagicMock()
        db.get.return_value = SimpleNamespace(document_set_id=set_id)
        @contextmanager
        def busy(*args):
            yield False
        with patch("app.api.routes.connectors.require_set_access"), patch("app.api.routes.connectors.connector_sync_lock", busy), patch("app.api.routes.connectors.sync_connector") as perform:
            with self.assertRaises(HTTPException) as raised:
                sync(set_id, connector_id, db, MagicMock())
        self.assertEqual(raised.exception.status_code, 409)
        perform.assert_not_called()
        db.commit.assert_not_called()
