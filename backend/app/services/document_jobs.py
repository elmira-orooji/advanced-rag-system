import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import BASE_DIR
from app.db.database import SessionLocal
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.processing_job import ProcessingJob
from app.services.document_extractor import extract_text
from app.services.qdrant import QdrantClient
from app.services.text_chunker import hierarchical_chunks
from app.services.chunk_enrichment import enrich_chunk

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="document-jobs")


def enqueue_document_job(job_id: uuid.UUID, chunk_size: int | None = None, overlap: int | None = None, parent_size: int | None = None) -> None:
    _executor.submit(process_document_job, job_id, chunk_size, overlap, parent_size)


def recover_document_jobs() -> int:
    with SessionLocal() as db:
        jobs = list(db.scalars(select(ProcessingJob).where(ProcessingJob.status.in_(["queued", "running", "retrying"]))).all())
        for job in jobs:
            job.status = "queued"
            job.stage = "queued"
        db.commit()
    for job in jobs:
        enqueue_document_job(job.id)
    return len(jobs)


def _progress(db, document: Document, job: ProcessingJob, value: int, stage: str) -> None:
    job.progress = value
    job.stage = stage
    document.processing_progress = value
    document.processing_stage = stage
    document.status = "processing" if value < 100 else "indexed"
    db.commit()


def process_document_job(job_id: uuid.UUID, chunk_size: int | None = None, overlap: int | None = None, parent_size: int | None = None) -> None:
    with SessionLocal() as db:
        job = db.get(ProcessingJob, job_id)
        if job is None or job.status not in {"queued", "retrying"}:
            return
        document = db.scalar(select(Document).options(selectinload(Document.chunks), selectinload(Document.document_sets)).where(Document.id == job.document_id))
        if document is None:
            return
        job.status = "running"
        job.attempts += 1
        job.started_at = datetime.now(timezone.utc)
        _progress(db, document, job, 10, "extracting")
        try:
            settings = document.document_sets[0] if document.document_sets else None
            chunk_size = chunk_size or (settings.child_chunk_size if settings else 800)
            overlap = overlap if overlap is not None else (settings.chunk_overlap if settings else 120)
            parent_size = parent_size or (settings.parent_chunk_size if settings else 2400)
            if not document.storage_path:
                raise RuntimeError("Document file is unavailable")
            source_path = BASE_DIR / document.storage_path
            text = extract_text(source_path, document.content_type or "")
            extracted_path = source_path.parent / "extracted.txt"
            extracted_path.write_text(text, encoding="utf-8")
            document.extracted_text_path = extracted_path.relative_to(BASE_DIR).as_posix()
            _progress(db, document, job, 35, "chunking")
            contents = hierarchical_chunks(text, child_size=chunk_size, child_overlap=overlap, parent_size=parent_size)
            if not contents:
                raise RuntimeError("Document contains no text to index")
            for chunk in list(document.chunks):
                db.delete(chunk)
            db.flush()
            document.chunks = [Chunk(chunk_index=index, content=child, parent_index=parent_index, parent_content=parent, keywords=enrich_chunk(child)[0], suggested_questions=enrich_chunk(child)[1]) for index, (child, parent_index, parent) in enumerate(contents)]
            db.flush()
            _progress(db, document, job, 65, "indexing")
            client = QdrantClient()
            client.ensure_collection()
            client.replace_document_chunks(str(document.id), document.filename, [{"id": str(chunk.id), "chunk_index": chunk.chunk_index, "content": chunk.content} for chunk in document.chunks])
            document.processing_error = None
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            _progress(db, document, job, 100, "ready")
        except Exception as exc:
            db.rollback()
            job = db.get(ProcessingJob, job_id)
            document = db.get(Document, job.document_id) if job else None
            if job and document:
                message = str(exc)[:500]
                job.status = "failed"; job.error = message; job.completed_at = datetime.now(timezone.utc)
                document.status = "failed"; document.processing_error = message
                document.processing_stage = "failed"; document.processing_progress = job.progress
                db.commit()
