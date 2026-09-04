import uuid
import logging
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select, update
from sqlalchemy.orm import selectinload

from app.core.config import BASE_DIR, DOCUMENT_JOB_HEARTBEAT_SECONDS, DOCUMENT_JOB_LEASE_SECONDS, DOCUMENT_JOB_MAX_ATTEMPTS, DOCUMENT_JOB_RETRY_BASE_SECONDS, DOCUMENT_JOB_RETRY_MAX_SECONDS, document_storage_relative, resolve_document_path
from app.db.database import SessionLocal
from app.models.document import Document
from app.models.indexing_outbox import IndexingOutbox
from app.models.processing_job import ProcessingJob
from app.services.document_extractor import extract_text
from app.services.qdrant import QdrantClient, QdrantError
from app.services.text_chunker import hierarchical_chunks
from app.services.incremental_index import checksum, incremental_chunks

logger = logging.getLogger(__name__)


class DocumentJobOwnershipLost(RuntimeError):
    pass


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
        now = datetime.now(timezone.utc)
        job = db.scalar(
            select(ProcessingJob)
            .where(
                ProcessingJob.status.in_(["queued", "retrying"]),
                or_(ProcessingJob.next_attempt_at.is_(None), ProcessingJob.next_attempt_at <= now),
            )
            .order_by(ProcessingJob.created_at, ProcessingJob.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if job is None:
            return None
        job.status = "running"
        job.attempts += 1
        job.started_at = now
        job.worker_id = worker_id
        job.locked_at = now
        job.next_attempt_at = None
        return job.id


def _retryable_document_error(exc: Exception) -> bool:
    if isinstance(exc, QdrantError):
        return exc.status_code is None or exc.status_code in {408, 429} or exc.status_code >= 500
    return isinstance(exc, (TimeoutError, ConnectionError))


def _retry_delay(attempts: int) -> int:
    return min(DOCUMENT_JOB_RETRY_BASE_SECONDS * (2 ** max(0, attempts - 1)), DOCUMENT_JOB_RETRY_MAX_SECONDS)


def _document_failure_values(exc: Exception, attempts: int, now: datetime) -> dict:
    retrying = _retryable_document_error(exc) and attempts < DOCUMENT_JOB_MAX_ATTEMPTS
    return {
        "status": "retrying" if retrying else "dead_letter",
        "stage": "retry_wait" if retrying else "dead_letter",
        "error": str(exc)[:500],
        "error_type": type(exc).__name__,
        "next_attempt_at": now + timedelta(seconds=_retry_delay(attempts)) if retrying else None,
        "dead_lettered_at": None if retrying else now,
        "completed_at": None if retrying else now,
        "worker_id": None,
        "locked_at": None,
    }


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


def _progress(
    db,
    document: Document,
    job: ProcessingJob,
    worker_id: str,
    value: int,
    stage: str,
    *,
    completed: bool = False,
) -> None:
    now = datetime.now(timezone.utc)
    result = db.execute(
        update(ProcessingJob)
        .where(
            ProcessingJob.id == job.id,
            ProcessingJob.status == "running",
            ProcessingJob.worker_id == worker_id,
        )
        .values(
            progress=value,
            stage=stage,
            status="completed" if completed else "running",
            completed_at=now if completed else None,
            worker_id=None if completed else worker_id,
            locked_at=None if completed else now,
        )
    )
    if result.rowcount != 1:
        db.rollback()
        raise DocumentJobOwnershipLost(f"Document job {job.id} is no longer owned by {worker_id}")
    document.processing_progress = value
    document.processing_stage = stage
    document.status = "processing" if value < 100 else "indexed"
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
        _progress(db, document, job, worker_id, 10, "extracting")
        outbox_payload: dict | None = None
        try:
            settings = document.document_sets[0] if document.document_sets else None
            chunk_size = job.chunk_size or (settings.child_chunk_size if settings else 800)
            overlap = job.chunk_overlap if job.chunk_overlap is not None else (settings.chunk_overlap if settings else 120)
            parent_size = job.parent_chunk_size or (settings.parent_chunk_size if settings else 2400)
            stored_source = document.storage_path or document.extracted_text_path
            if not stored_source:
                raise RuntimeError("Document file is unavailable")
            source_path = resolve_document_path(stored_source)
            text = extract_text(source_path, document.content_type or "")
            text_checksum = checksum(text)
            chunking_is_unchanged = (
                document.indexed_child_chunk_size == chunk_size
                and document.indexed_chunk_overlap == overlap
                and document.indexed_parent_chunk_size == parent_size
            )
            if document.content_checksum == text_checksum and document.chunks and chunking_is_unchanged:
                document.processing_error = None
                _progress(db, document, job, worker_id, 100, "unchanged", completed=True)
                return
            extracted_path = source_path.parent / "extracted.txt"
            extracted_path.write_text(text, encoding="utf-8")
            document.extracted_text_path = document_storage_relative(extracted_path)
            document.content_checksum = None
            _progress(db, document, job, worker_id, 35, "chunking")
            contents = hierarchical_chunks(text, child_size=chunk_size, child_overlap=overlap, parent_size=parent_size)
            if not contents:
                raise RuntimeError("Document contains no text to index")
            _progress(db, document, job, worker_id, 65, "indexing")
            next_chunks, _, removed_ids = incremental_chunks(document, text, chunk_size, overlap, parent_size)
            pending_chunks = [
                {"id": str(chunk.id), "chunk_index": chunk.chunk_index, "content": chunk.content}
                for chunk in next_chunks
            ]
            for chunk in list(document.chunks):
                if str(chunk.id) in removed_ids:
                    db.delete(chunk)
            document.chunks = next_chunks
            document.content_checksum = text_checksum
            document.indexed_child_chunk_size = chunk_size
            document.indexed_chunk_overlap = overlap
            document.indexed_parent_chunk_size = parent_size
            document.processing_error = None
            # Durable outbox: record intended Qdrant state in the SAME transaction
            outbox_payload = {
                "document_id": str(document.id),
                "filename": document.filename,
                "chunks": pending_chunks,
            }
            db.add(IndexingOutbox(
                document_id=document.id,
                job_id=job_id,
                action="replace_document_chunks",
                payload=outbox_payload,
                status="pending",
            ))
            _progress(db, document, job, worker_id, 100, "ready", completed=True)
        except Exception as exc:
            db.rollback()
            if isinstance(exc, DocumentJobOwnershipLost):
                logger.warning("Stopped document processing after lease ownership changed", extra={"job_id": str(job_id), "worker_id": worker_id})
                return
            job = db.get(ProcessingJob, job_id)
            document = db.get(Document, job.document_id) if job else None
            if job and document:
                message = str(exc)[:500]
                now = datetime.now(timezone.utc)
                failure_values = _document_failure_values(exc, job.attempts, now)
                retrying = failure_values["status"] == "retrying"
                result = db.execute(
                    update(ProcessingJob)
                    .where(
                        ProcessingJob.id == job_id,
                        ProcessingJob.status == "running",
                        ProcessingJob.worker_id == worker_id,
                    )
                    .values(**failure_values)
                )
                if result.rowcount != 1:
                    db.rollback()
                    return
                document.status = "queued" if retrying else "failed"; document.processing_error = message
                document.processing_stage = "retry_wait" if retrying else "dead_letter"; document.processing_progress = job.progress
                db.commit()
            return

        # Transaction committed with outbox entry. Best-effort immediate apply.
        if outbox_payload is not None:
            try:
                qdrant = QdrantClient()
                qdrant.ensure_collection()
                qdrant.replace_document_chunks(
                    outbox_payload["document_id"],
                    outbox_payload["filename"],
                    outbox_payload["chunks"],
                )
                with SessionLocal() as apply_db:
                    apply_db.execute(
                        update(IndexingOutbox)
                        .where(
                            IndexingOutbox.document_id == document.id,
                            IndexingOutbox.job_id == job_id,
                            IndexingOutbox.status == "pending",
                        )
                        .values(status="applied")
                    )
                    apply_db.commit()
            except Exception:
                logger.warning(
                    "Immediate Qdrant apply failed; reconciler will retry",
                    extra={"job_id": str(job_id), "document_id": str(document.id)},
                    exc_info=True,
                )
