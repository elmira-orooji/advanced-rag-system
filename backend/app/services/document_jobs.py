import uuid
import logging
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.core.config import BASE_DIR, DOCUMENT_JOB_HEARTBEAT_SECONDS, DOCUMENT_JOB_LEASE_SECONDS
from app.db.database import SessionLocal
from app.models.document import Document
from app.models.processing_job import ProcessingJob
from app.services.document_extractor import extract_text
from app.services.qdrant import QdrantClient
from app.services.text_chunker import hierarchical_chunks
from app.services.incremental_index import checksum, incremental_chunks

logger = logging.getLogger(__name__)


def _expired_document_job_ids(cutoff: datetime):
    return (
        select(ProcessingJob.id)
        .where(
            ProcessingJob.status == "running",
            (ProcessingJob.locked_at.is_(None)) | (ProcessingJob.locked_at < cutoff),
        )
        .with_for_update(skip_locked=True)
    )


def recover_document_jobs() -> int:
    """Atomically release expired claims without waiting on active heartbeats."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=DOCUMENT_JOB_LEASE_SECONDS)
    expired = _expired_document_job_ids(cutoff).cte("expired_document_jobs")
    statement = (
        update(ProcessingJob)
        .where(
            ProcessingJob.id.in_(select(expired.c.id)),
            ProcessingJob.status == "running",
            (ProcessingJob.locked_at.is_(None)) | (ProcessingJob.locked_at < cutoff),
        )
        .values(status="queued", stage="queued", worker_id=None, locked_at=None)
        .returning(ProcessingJob.id)
    )
    with SessionLocal() as db, db.begin():
        return len(list(db.scalars(statement)))


def claim_document_job(worker_id: str) -> uuid.UUID | None:
    """Atomically claim the oldest available job across competing workers."""
    with SessionLocal() as db, db.begin():
        job = db.scalar(
            select(ProcessingJob)
            .where(ProcessingJob.status.in_(["queued", "retrying"]))
            .order_by(ProcessingJob.created_at, ProcessingJob.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if job is None:
            return None
        now = datetime.now(timezone.utc)
        job.status = "running"
        job.attempts += 1
        job.started_at = now
        job.worker_id = worker_id
        job.locked_at = now
        return job.id


def refresh_document_job_lease(job_id: uuid.UUID, worker_id: str) -> bool:
    """Refresh a lease only while the same worker still owns the running job."""
    with SessionLocal() as db:
        result = db.execute(
            update(ProcessingJob)
            .where(
                ProcessingJob.id == job_id,
                ProcessingJob.status == "running",
                ProcessingJob.worker_id == worker_id,
            )
            .values(locked_at=datetime.now(timezone.utc))
        )
        db.commit()
        return result.rowcount == 1


@contextmanager
def maintain_document_job_lease(job_id: uuid.UUID, worker_id: str):
    """Keep the claim alive while blocking extraction and Qdrant calls run."""
    stop_event = threading.Event()

    def heartbeat() -> None:
        while not stop_event.wait(DOCUMENT_JOB_HEARTBEAT_SECONDS):
            try:
                if not refresh_document_job_lease(job_id, worker_id):
                    logger.error("Document job lease ownership was lost", extra={"job_id": str(job_id), "worker_id": worker_id})
                    return
            except Exception:
                logger.exception("Document job heartbeat failed", extra={"job_id": str(job_id), "worker_id": worker_id})

    thread = threading.Thread(target=heartbeat, name=f"document-heartbeat-{job_id}", daemon=True)
    thread.start()
    try:
        yield
    finally:
        stop_event.set()
        thread.join(timeout=DOCUMENT_JOB_HEARTBEAT_SECONDS + 1)


def _progress(db, document: Document, job: ProcessingJob, value: int, stage: str) -> None:
    job.progress = value
    job.stage = stage
    document.processing_progress = value
    document.processing_stage = stage
    document.status = "processing" if value < 100 else "indexed"
    job.locked_at = datetime.now(timezone.utc) if value < 100 else None
    db.commit()


def process_document_job(
    job_id: uuid.UUID,
    worker_id: str,
) -> None:
    with SessionLocal() as db:
        job = db.scalar(
            select(ProcessingJob).where(
                ProcessingJob.id == job_id,
                ProcessingJob.status == "running",
                ProcessingJob.worker_id == worker_id,
            )
        )
        if job is None:
            return
        document = db.scalar(select(Document).options(selectinload(Document.chunks), selectinload(Document.document_sets)).where(Document.id == job.document_id))
        if document is None:
            return
        _progress(db, document, job, 10, "extracting")
        try:
            settings = document.document_sets[0] if document.document_sets else None
            chunk_size = job.chunk_size or (settings.child_chunk_size if settings else 800)
            overlap = job.chunk_overlap if job.chunk_overlap is not None else (settings.chunk_overlap if settings else 120)
            parent_size = job.parent_chunk_size or (settings.parent_chunk_size if settings else 2400)
            stored_source = document.storage_path or document.extracted_text_path
            if not stored_source:
                raise RuntimeError("Document file is unavailable")
            source_path = BASE_DIR / stored_source
            text = extract_text(source_path, document.content_type or "")
            text_checksum = checksum(text)
            chunking_is_unchanged = (
                document.indexed_child_chunk_size == chunk_size
                and document.indexed_chunk_overlap == overlap
                and document.indexed_parent_chunk_size == parent_size
            )
            if document.content_checksum == text_checksum and document.chunks and chunking_is_unchanged:
                document.processing_error = None; job.status = "completed"; job.completed_at = datetime.now(timezone.utc)
                job.worker_id = None
                _progress(db, document, job, 100, "unchanged")
                return
            extracted_path = source_path.parent / "extracted.txt"
            extracted_path.write_text(text, encoding="utf-8")
            document.extracted_text_path = extracted_path.relative_to(BASE_DIR).as_posix()
            # Persist an invalid index marker before committing new chunks.
            document.content_checksum = None
            _progress(db, document, job, 35, "chunking")
            contents = hierarchical_chunks(text, child_size=chunk_size, child_overlap=overlap, parent_size=parent_size)
            if not contents:
                raise RuntimeError("Document contains no text to index")
            next_chunks, _, removed_ids = incremental_chunks(document, text, chunk_size, overlap, parent_size)
            for chunk in list(document.chunks):
                if str(chunk.id) in removed_ids: db.delete(chunk)
            document.chunks = next_chunks
            db.flush()
            _progress(db, document, job, 65, "indexing")
            client = QdrantClient()
            client.ensure_collection()
            # SQL chunks may survive a failed/partial Qdrant write. Reconcile the
            # whole document, including stale vectors whose SQL rows are gone.
            client.replace_document_chunks(str(document.id), document.filename, [
                {"id": str(chunk.id), "chunk_index": chunk.chunk_index, "content": chunk.content}
                for chunk in document.chunks
            ])
            document.content_checksum = text_checksum
            document.indexed_child_chunk_size = chunk_size
            document.indexed_chunk_overlap = overlap
            document.indexed_parent_chunk_size = parent_size
            document.processing_error = None
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            job.worker_id = None
            _progress(db, document, job, 100, "ready")
        except Exception as exc:
            db.rollback()
            job = db.get(ProcessingJob, job_id)
            document = db.get(Document, job.document_id) if job else None
            if job and document:
                message = str(exc)[:500]
                job.status = "failed"; job.error = message; job.completed_at = datetime.now(timezone.utc)
                job.worker_id = None; job.locked_at = None
                document.status = "failed"; document.processing_error = message
                document.processing_stage = "failed"; document.processing_progress = job.progress
                db.commit()
