import unittest
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.processing_job import ProcessingJob
from app.services.document_jobs import recover_document_jobs


class DocumentJobRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        ProcessingJob.__table__.create(self.engine)
        self.sessions = sessionmaker(bind=self.engine, expire_on_commit=True)
        self.addCleanup(self.engine.dispose)

    def test_unfinished_jobs_are_committed_then_requeued_by_id(self):
        ids = {status: uuid4() for status in ("queued", "running", "retrying", "completed", "failed")}
        with self.sessions() as db:
            for status, job_id in ids.items():
                db.add(ProcessingJob(id=job_id, organization_id=uuid4(), document_id=uuid4(), status=status, stage="original"))
            db.commit()

        def check_persisted_job(job_id):
            with self.sessions() as db:
                job = db.get(ProcessingJob, job_id)
                self.assertEqual((job.status, job.stage), ("queued", "queued"))

        with patch("app.services.document_jobs.SessionLocal", self.sessions), patch("app.services.document_jobs.enqueue_document_job", side_effect=check_persisted_job) as enqueue:
            self.assertEqual(recover_document_jobs(), 3)
        self.assertCountEqual([call.args[0] for call in enqueue.call_args_list], [ids[status] for status in ("queued", "running", "retrying")])
        with self.sessions() as db:
            for status in ("completed", "failed"):
                job = db.get(ProcessingJob, ids[status])
                self.assertEqual((job.status, job.stage), (status, "original"))

    def test_empty_queue_returns_zero(self):
        with patch("app.services.document_jobs.SessionLocal", self.sessions), patch("app.services.document_jobs.enqueue_document_job") as enqueue:
            self.assertEqual(recover_document_jobs(), 0)
        enqueue.assert_not_called()

    def test_failed_commit_does_not_enqueue_jobs(self):
        with self.sessions() as db:
            db.add(ProcessingJob(organization_id=uuid4(), document_id=uuid4(), status="running"))
            db.commit()
        with patch("app.services.document_jobs.SessionLocal", self.sessions), patch("sqlalchemy.orm.Session.commit", side_effect=RuntimeError("Commit failed")), patch("app.services.document_jobs.enqueue_document_job") as enqueue:
            with self.assertRaisesRegex(RuntimeError, "Commit failed"):
                recover_document_jobs()
        enqueue.assert_not_called()
