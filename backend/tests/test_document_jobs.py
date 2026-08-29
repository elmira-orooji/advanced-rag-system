import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.processing_job import ProcessingJob
from app.services.document_jobs import recover_document_jobs
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
        with tempfile.TemporaryDirectory() as directory, patch.object(document_jobs, "BASE_DIR", Path(directory)), patch.object(document_jobs, "SessionLocal", sessions), patch.object(document_jobs, "extract_text", return_value="source text"), patch.object(document_jobs, "hierarchical_chunks", return_value=generated), patch("app.services.incremental_index.hierarchical_chunks", return_value=generated), patch("app.services.incremental_index.enrich_chunk", return_value=([], [])), patch.object(document_jobs, "QdrantClient") as factory:
            client = factory.return_value
            client.upsert_chunks.side_effect = write_vectors
            client.replace_document_chunks.side_effect = replace_vectors
            document_jobs.process_document_job(job_id)
            with sessions() as db:
                self.assertEqual(db.get(ProcessingJob, job_id).status, "failed")
                document = db.get(Document, document_id)
                self.assertEqual(len(document.chunks), 2)
                self.assertNotEqual(document.status, "indexed")
                self.assertIsNone(document.content_checksum)
                expected = {str(chunk.id): chunk.content for chunk in document.chunks}
                db.get(ProcessingJob, job_id).status = "retrying"
                db.commit()
            self.assertNotEqual(vectors, expected)
            # A second failed attempt must not mark the document indexed either.
            fail_next = True
            document_jobs.process_document_job(job_id)
            with sessions() as db:
                self.assertEqual(db.get(ProcessingJob, job_id).status, "failed")
                self.assertEqual(db.get(Document, document_id).status, "failed")
                self.assertIsNone(db.get(Document, document_id).content_checksum)
                db.get(ProcessingJob, job_id).status = "retrying"
                db.commit()
            vectors["stale-point-without-sql-row"] = "old content"
            document_jobs.process_document_job(job_id)
            self.assertEqual(vectors, expected)
            with sessions() as db:
                self.assertEqual(db.get(ProcessingJob, job_id).status, "completed")
                self.assertEqual(db.get(Document, document_id).status, "indexed")
                self.assertEqual(db.get(Document, document_id).content_checksum, document_jobs.checksum("source text"))
                db.get(ProcessingJob, job_id).status = "retrying"
                db.commit()
            factory.reset_mock()
            document_jobs.process_document_job(job_id)
            factory.assert_not_called()
            with sessions() as db:
                self.assertEqual(db.get(ProcessingJob, job_id).stage, "unchanged")

            with sessions() as db:
                db.get(ProcessingJob, job_id).status = "retrying"
                db.commit()
            factory.reset_mock()
            document_jobs.process_document_job(job_id, chunk_size=999, overlap=111, parent_size=2500)
            factory.assert_called_once()
            with sessions() as db:
                document = db.get(Document, document_id)
                self.assertEqual(document.indexed_child_chunk_size, 999)
                self.assertEqual(document.indexed_chunk_overlap, 111)
                self.assertEqual(document.indexed_parent_chunk_size, 2500)
                self.assertEqual(db.get(ProcessingJob, job_id).stage, "ready")
