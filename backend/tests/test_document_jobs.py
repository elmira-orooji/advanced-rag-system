import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import sessionmaker

from app.models.processing_job import ProcessingJob
from app.services.document_jobs import DocumentJobOwnershipLost, claim_document_job, recover_document_jobs, refresh_document_job_lease
from app.services import document_jobs
from app.db.database import Base
from app.models.document import Document
from app.services.qdrant import QdrantError


class DocumentJobRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        ProcessingJob.__table__.create(self.engine)
        self.sessions = sessionmaker(bind=self.engine, expire_on_commit=True)
        self.addCleanup(self.engine.dispose)

    def test_only_abandoned_running_jobs_are_requeued(self):
        ids = {status: uuid4() for status in ("queued", "retrying", "completed", "failed")}
        stale_id, live_id = uuid4(), uuid4()
        with self.sessions() as db:
            for status, job_id in ids.items():
                db.add(ProcessingJob(id=job_id, organization_id=uuid4(), document_id=uuid4(), status=status, stage="original"))
            db.add(ProcessingJob(id=stale_id, organization_id=uuid4(), document_id=uuid4(), status="running", stage="indexing", worker_id="dead", locked_at=datetime.now(timezone.utc) - timedelta(hours=2)))
            db.add(ProcessingJob(id=live_id, organization_id=uuid4(), document_id=uuid4(), status="running", stage="indexing", worker_id="live", locked_at=datetime.now(timezone.utc)))
            db.commit()

        with patch("app.services.document_jobs.SessionLocal", self.sessions), patch("app.services.document_jobs.DOCUMENT_JOB_LEASE_SECONDS", 3600):
            self.assertEqual(recover_document_jobs(), 1)
        with self.sessions() as db:
            stale = db.get(ProcessingJob, stale_id)
            self.assertEqual((stale.status, stale.stage, stale.worker_id, stale.locked_at), ("queued", "queued", None, None))
            self.assertEqual(db.get(ProcessingJob, live_id).status, "running")
            for status, job_id in ids.items():
                self.assertEqual(db.get(ProcessingJob, job_id).status, status)

    def test_recovery_query_uses_skip_locked(self):
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        expired = document_jobs._expired_document_job_ids(cutoff)
        sql = str(expired.compile(dialect=postgresql.dialect()))
        self.assertIn("FOR UPDATE SKIP LOCKED", sql)

    def test_empty_queue_returns_zero(self):
        with patch("app.services.document_jobs.SessionLocal", self.sessions):
            self.assertEqual(recover_document_jobs(), 0)

    def test_claim_persists_owner_and_attempt_before_returning(self):
        queued_id = uuid4()
        with self.sessions() as db:
            db.add(ProcessingJob(id=queued_id, organization_id=uuid4(), document_id=uuid4(), status="queued", chunk_size=900, chunk_overlap=100))
            db.commit()

        with patch("app.services.document_jobs.SessionLocal", self.sessions):
            self.assertEqual(claim_document_job("worker-1"), queued_id)
            self.assertIsNone(claim_document_job("worker-2"))

        with self.sessions() as db:
            job = db.get(ProcessingJob, queued_id)
            self.assertEqual((job.status, job.worker_id, job.attempts), ("running", "worker-1", 1))
            self.assertIsNotNone(job.locked_at)

    def test_future_retry_is_not_claimed_until_due(self):
        job_id = uuid4()
        with self.sessions() as db:
            db.add(ProcessingJob(
                id=job_id,
                organization_id=uuid4(),
                document_id=uuid4(),
                status="retrying",
                next_attempt_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            ))
            db.commit()

        with patch("app.services.document_jobs.SessionLocal", self.sessions):
            self.assertIsNone(claim_document_job("worker"))

    def test_retry_policy_classifies_transient_and_permanent_errors(self):
        self.assertTrue(document_jobs._retryable_document_error(QdrantError("unavailable", status_code=503)))
        self.assertTrue(document_jobs._retryable_document_error(QdrantError("limited", status_code=429)))
        self.assertTrue(document_jobs._retryable_document_error(TimeoutError("timeout")))
        self.assertFalse(document_jobs._retryable_document_error(QdrantError("bad request", status_code=400)))
        self.assertFalse(document_jobs._retryable_document_error(ValueError("invalid document")))

    def test_retry_delay_is_exponential_and_capped(self):
        with patch("app.services.document_jobs.DOCUMENT_JOB_RETRY_BASE_SECONDS", 10), patch("app.services.document_jobs.DOCUMENT_JOB_RETRY_MAX_SECONDS", 25):
            self.assertEqual(document_jobs._retry_delay(1), 10)
            self.assertEqual(document_jobs._retry_delay(2), 20)
            self.assertEqual(document_jobs._retry_delay(3), 25)

    def test_transient_failures_exhaust_into_dead_letter(self):
        now = datetime.now(timezone.utc)
        with patch("app.services.document_jobs.DOCUMENT_JOB_MAX_ATTEMPTS", 3), patch("app.services.document_jobs.DOCUMENT_JOB_RETRY_BASE_SECONDS", 10):
            retry = document_jobs._document_failure_values(QdrantError("unavailable", status_code=503), 2, now)
            exhausted = document_jobs._document_failure_values(QdrantError("unavailable", status_code=503), 3, now)
            permanent = document_jobs._document_failure_values(ValueError("invalid document"), 1, now)

        self.assertEqual(retry["status"], "retrying")
        self.assertEqual(retry["next_attempt_at"], now + timedelta(seconds=20))
        self.assertIsNone(retry["dead_lettered_at"])
        self.assertEqual(exhausted["status"], "dead_letter")
        self.assertEqual(exhausted["dead_lettered_at"], now)
        self.assertEqual(permanent["status"], "dead_letter")

    def test_heartbeat_only_refreshes_the_current_owner(self):
        job_id = uuid4()
        old_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        with self.sessions() as db:
            db.add(ProcessingJob(id=job_id, organization_id=uuid4(), document_id=uuid4(), status="running", worker_id="worker-1", locked_at=old_time))
            db.commit()

        with patch("app.services.document_jobs.SessionLocal", self.sessions):
            self.assertFalse(refresh_document_job_lease(job_id, "worker-2"))
            self.assertTrue(refresh_document_job_lease(job_id, "worker-1"))

        with self.sessions() as db:
            refreshed = db.get(ProcessingJob, job_id)
            self.assertEqual(refreshed.worker_id, "worker-1")
            self.assertGreater(refreshed.locked_at.replace(tzinfo=timezone.utc), old_time)

    def test_processing_cannot_bypass_claim_or_use_another_owner(self):
        job_id = uuid4()
        with self.sessions() as db:
            db.add(ProcessingJob(id=job_id, organization_id=uuid4(), document_id=uuid4(), status="queued"))
            db.commit()

        with patch("app.services.document_jobs.SessionLocal", self.sessions), patch.object(document_jobs, "_progress") as progress:
            document_jobs.process_document_job(job_id, "worker-without-claim")
            self.assertEqual(claim_document_job("owner"), job_id)
            document_jobs.process_document_job(job_id, "different-worker")

        progress.assert_not_called()

    def test_progress_is_fenced_by_current_owner(self):
        job_id = uuid4()
        document = SimpleNamespace(processing_progress=0, processing_stage="queued", status="queued")
        with self.sessions() as db:
            job = ProcessingJob(id=job_id, organization_id=uuid4(), document_id=uuid4(), status="running", worker_id="new-owner", locked_at=datetime.now(timezone.utc))
            db.add(job)
            db.commit()
            with self.assertRaises(DocumentJobOwnershipLost):
                document_jobs._progress(db, document, job, "old-owner", 65, "indexing")

        with self.sessions() as db:
            job = db.get(ProcessingJob, job_id)
            self.assertEqual((job.worker_id, job.progress, job.stage), ("new-owner", 0, "queued"))
        self.assertEqual((document.processing_progress, document.processing_stage, document.status), (0, "queued", "queued"))


class DocumentIndexRetryTests(unittest.TestCase):
    def test_retry_resends_committed_chunks_after_partial_qdrant_failure(self):
        engine = create_engine("sqlite://")
        self.addCleanup(engine.dispose)
        Base.metadata.create_all(engine)
        sessions = sessionmaker(bind=engine, expire_on_commit=True)
        document_id, job_id = uuid4(), uuid4()
        with sessions() as db:
            db.add(Document(id=document_id, organization_id=uuid4(), filename="test.txt", storage_path="test.txt"))
            db.add(ProcessingJob(id=job_id, organization_id=uuid4(), document_id=document_id))
            db.commit()
        vectors = {}
        fail_next = True
        def write_vectors(document_id, filename, chunks):
            nonlocal fail_next
            for chunk in chunks:
                vectors[chunk["id"]] = chunk["content"]
                if fail_next:
                    fail_next = False
                    raise QdrantError("Partial write failed")
        def replace_vectors(document_id, filename, chunks):
            vectors.clear()
            write_vectors(document_id, filename, chunks)
        generated = [("first chunk", 0, "parent"), ("second chunk", 0, "parent")]
        with patch.object(document_jobs, "BASE_DIR", Path.cwd()), patch.object(document_jobs, "SessionLocal", sessions), patch.object(document_jobs, "extract_text", return_value="source text"), patch.object(document_jobs, "hierarchical_chunks", return_value=generated), patch("app.services.incremental_index.hierarchical_chunks", return_value=generated), patch("app.services.incremental_index.enrich_chunk", return_value=([], [])), patch("pathlib.Path.write_text"), patch.object(document_jobs, "QdrantClient") as factory:
            client = factory.return_value
            client.upsert_chunks.side_effect = write_vectors
            client.replace_document_chunks.side_effect = replace_vectors
            worker_id = "test-worker"
            self.assertEqual(document_jobs.claim_document_job(worker_id), job_id)
            document_jobs.process_document_job(job_id, worker_id)
            with sessions() as db:
                failed_job = db.get(ProcessingJob, job_id)
                self.assertEqual((failed_job.status, failed_job.error_type), ("retrying", "QdrantError"))
                self.assertIsNotNone(failed_job.next_attempt_at)
                document = db.get(Document, document_id)
                self.assertEqual(len(document.chunks), 0)
                self.assertNotEqual(document.status, "indexed")
                self.assertIsNone(document.content_checksum)
                db.get(ProcessingJob, job_id).status = "retrying"
                db.get(ProcessingJob, job_id).next_attempt_at = None
                db.commit()
            self.assertEqual(vectors, {})
            # A second failed attempt must not mark the document indexed either.
            fail_next = True
            self.assertEqual(document_jobs.claim_document_job(worker_id), job_id)
            document_jobs.process_document_job(job_id, worker_id)
            with sessions() as db:
                self.assertEqual(db.get(ProcessingJob, job_id).status, "retrying")
                self.assertEqual(db.get(Document, document_id).status, "queued")
                self.assertIsNone(db.get(Document, document_id).content_checksum)
                self.assertEqual(len(db.get(Document, document_id).chunks), 0)
                db.get(ProcessingJob, job_id).status = "retrying"
                db.get(ProcessingJob, job_id).next_attempt_at = None
                db.commit()
            vectors["stale-point-without-sql-row"] = "old content"
            self.assertEqual(document_jobs.claim_document_job(worker_id), job_id)
            document_jobs.process_document_job(job_id, worker_id)
            with sessions() as db:
                expected = {str(chunk.id): chunk.content for chunk in db.get(Document, document_id).chunks}
                self.assertEqual(vectors, expected)
                self.assertEqual(db.get(ProcessingJob, job_id).status, "completed")
                self.assertEqual(db.get(Document, document_id).status, "indexed")
                self.assertEqual(db.get(Document, document_id).content_checksum, document_jobs.checksum("source text"))
                db.get(ProcessingJob, job_id).status = "retrying"
                db.commit()
            factory.reset_mock()
            self.assertEqual(document_jobs.claim_document_job(worker_id), job_id)
            document_jobs.process_document_job(job_id, worker_id)
            factory.assert_not_called()
            with sessions() as db:
                self.assertEqual(db.get(ProcessingJob, job_id).stage, "unchanged")

            with sessions() as db:
                job = db.get(ProcessingJob, job_id)
                job.status = "retrying"
                job.chunk_size = 999
                job.chunk_overlap = 111
                job.parent_chunk_size = 2500
                db.commit()
            factory.reset_mock()
            self.assertEqual(document_jobs.claim_document_job(worker_id), job_id)
            document_jobs.process_document_job(job_id, worker_id)
            factory.assert_called_once()
            with sessions() as db:
                document = db.get(Document, document_id)
                self.assertEqual(document.indexed_child_chunk_size, 999)
                self.assertEqual(document.indexed_chunk_overlap, 111)
                self.assertEqual(document.indexed_parent_chunk_size, 2500)
                self.assertEqual(db.get(ProcessingJob, job_id).stage, "ready")
