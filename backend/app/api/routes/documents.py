import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.config import BASE_DIR, MAX_UPLOAD_SIZE, UPLOAD_DIR
from app.core.document_set_access import require_document_access, require_set_access
from app.api.routes.auth import get_current_user
from app.db.database import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.models.user import User
from app.models.processing_job import ProcessingJob
from app.schemas.document import (
    ChunkingRequest,
    ChunkResponse,
    ChunkUpdate,
    DeleteDocumentResponse,
    DocumentCreate,
    DocumentDetail,
    DocumentResponse,
    DocumentMetadataUpdate,
    IngestResponse,
)
from app.services.document_extractor import ExtractionError, extract_text
from app.services.qdrant import QdrantClient, QdrantError
from app.services.text_chunker import hierarchical_chunks
from app.services.document_jobs import enqueue_document_job
from app.services.chunk_enrichment import enrich_chunk

router = APIRouter(prefix="/documents", tags=["documents"])
ALLOWED_FILE_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
}


def _sync_active_chunks(document: Document) -> None:
    client = QdrantClient()
    client.ensure_collection()
    client.replace_document_chunks(str(document.id), document.filename, [{"id": str(chunk.id), "chunk_index": chunk.chunk_index, "content": chunk.content} for chunk in document.chunks if chunk.is_active])


@router.patch("/{document_id}/chunks/{chunk_id}", response_model=ChunkResponse)
def update_chunk(document_id: uuid.UUID, chunk_id: uuid.UUID, payload: ChunkUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access is required")
    document = db.scalar(select(Document).options(selectinload(Document.chunks)).where(Document.id == document_id, Document.organization_id == user.organization_id))
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    chunk = next((item for item in document.chunks if item.id == chunk_id), None)
    if chunk is None:
        raise HTTPException(status_code=404, detail="Chunk not found")
    if payload.content is not None:
        chunk.content = payload.content
        chunk.token_count = len(payload.content.split())
        chunk.keywords, chunk.suggested_questions = enrich_chunk(payload.content)
    if payload.is_active is not None:
        chunk.is_active = payload.is_active
    document.updated_at = datetime.now(timezone.utc)
    try:
        db.flush()
        _sync_active_chunks(document)
        db.commit()
        db.refresh(chunk)
    except QdrantError as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not update chunk") from exc
    return chunk


@router.post("/{document_id}/chunks/{chunk_id}/enrich", response_model=ChunkResponse)
def regenerate_chunk_enrichment(document_id: uuid.UUID, chunk_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access is required")
    chunk = db.scalar(select(Chunk).join(Document, Document.id == Chunk.document_id).where(Chunk.id == chunk_id, Chunk.document_id == document_id, Document.organization_id == user.organization_id))
    if chunk is None:
        raise HTTPException(status_code=404, detail="Chunk not found")
    chunk.keywords, chunk.suggested_questions = enrich_chunk(chunk.content)
    db.commit(); db.refresh(chunk)
    return chunk


@router.patch("/{document_id}/metadata", response_model=DocumentResponse)
def update_document_metadata(document_id: uuid.UUID, payload: DocumentMetadataUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document = require_document_access(db, user, document_id, "edit")
    document.author = payload.author
    document.language = payload.language
    document.source_type = payload.source_type
    document.document_date = payload.document_date
    document.tags = payload.tags
    db.commit(); db.refresh(document)
    return document


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access is required")
    document = Document(
        organization_id=user.organization_id,
        filename=payload.filename,
        content_type=payload.content_type,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    document_set_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "admin" and document_set_id is None:
        raise HTTPException(status_code=403, detail="A permitted knowledge set is required")
    statement = select(Document).where(Document.organization_id == user.organization_id)
    if document_set_id is not None:
        if db.scalar(select(DocumentSet).where(DocumentSet.id == document_set_id, DocumentSet.organization_id == user.organization_id)) is None:
            raise HTTPException(status_code=404, detail="Document set not found")
        require_set_access(db, user, document_set_id)
        statement = statement.join(Document.document_sets).where(DocumentSet.id == document_set_id)
    statement = (
        statement
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return db.scalars(statement).all()


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content_type = file.content_type or ""
    expected_suffix = ALLOWED_FILE_TYPES.get(content_type)
    safe_filename = Path(file.filename or "").name

    if expected_suffix is None or Path(safe_filename).suffix.lower() != expected_suffix:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF and UTF-8 TXT files are supported",
        )
    if not safe_filename:
        raise HTTPException(status_code=400, detail="A filename is required")

    document_id = uuid.uuid4()
    document_dir = UPLOAD_DIR / str(document_id)
    original_path = document_dir / f"original{expected_suffix}"
    extracted_path = document_dir / "extracted.txt"

    try:
        document_dir.mkdir(parents=True, exist_ok=False)
        size = _save_upload(file, original_path)
        if size == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty")

        extracted_text = extract_text(original_path, content_type)
        extracted_path.write_text(extracted_text, encoding="utf-8")

        document = Document(
            id=document_id,
            organization_id=user.organization_id,
            filename=safe_filename,
            content_type=content_type,
            storage_path=original_path.relative_to(BASE_DIR).as_posix(),
            extracted_text_path=extracted_path.relative_to(BASE_DIR).as_posix(),
            status="extracted",
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        return document
    except ExtractionError as exc:
        db.rollback()
        shutil.rmtree(document_dir, ignore_errors=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        db.rollback()
        shutil.rmtree(document_dir, ignore_errors=True)
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        shutil.rmtree(document_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Could not save document") from exc
    finally:
        file.file.close()


@router.post(
    "/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
)
def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    chunk_size: int = Query(default=1000, ge=200, le=4000),
    overlap: int = Query(default=200, ge=0, le=1000),
    document_set_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if document_set_id is None:
        if user.role != "admin":
            raise HTTPException(status_code=403, detail="A permitted knowledge set is required")
    else:
        target_set = db.scalar(select(DocumentSet).where(DocumentSet.id == document_set_id, DocumentSet.organization_id == user.organization_id))
        if target_set is None:
            raise HTTPException(status_code=404, detail="Document set not found")
        require_set_access(db, user, document_set_id, "edit")
    try:
        chunking = ChunkingRequest(chunk_size=chunk_size, overlap=overlap)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    document: Document | None = None
    document_dir: Path | None = None
    try:
        content_type = file.content_type or ""
        expected_suffix = ALLOWED_FILE_TYPES.get(content_type)
        safe_filename = Path(file.filename or "").name
        if expected_suffix is None or Path(safe_filename).suffix.lower() != expected_suffix:
            raise HTTPException(status_code=415, detail="Only PDF and UTF-8 TXT files are supported")
        document_id = uuid.uuid4()
        document_dir = UPLOAD_DIR / str(document_id)
        document_dir.mkdir(parents=True, exist_ok=False)
        original_path = document_dir / f"original{expected_suffix}"
        size = _save_upload(file, original_path)
        if size == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty")
        document = Document(
            id=document_id, organization_id=user.organization_id, filename=safe_filename,
            content_type=content_type, storage_path=original_path.relative_to(BASE_DIR).as_posix(),
            status="queued", processing_progress=0, processing_stage="queued", source_type="upload", tags=[],
        )
        db.add(document)
        db.flush()
        if document_set_id is not None:
            document.document_sets.append(target_set)
        job = ProcessingJob(organization_id=user.organization_id, document_id=document.id)
        db.add(job)
        db.commit()
        db.refresh(document)
        db.refresh(job)
        if document_set_id is not None:
            background_tasks.add_task(enqueue_document_job, job.id, target_set.child_chunk_size, target_set.chunk_overlap, target_set.parent_chunk_size)
        else:
            background_tasks.add_task(enqueue_document_job, job.id, chunking.chunk_size, chunking.overlap)
        return IngestResponse(
            **DocumentResponse.model_validate(document).model_dump(),
            job_id=job.id,
        )
    except HTTPException:
        db.rollback()
        if document_dir is not None: shutil.rmtree(document_dir, ignore_errors=True)
        raise
    except (OSError, SQLAlchemyError) as exc:
        db.rollback()
        if document_dir is not None: shutil.rmtree(document_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Could not queue document processing") from exc
    finally:
        file.file.close()


@router.post("/{document_id}/retry", response_model=IngestResponse)
def retry_document(document_id: uuid.UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document = db.scalar(select(Document).where(Document.id == document_id, Document.organization_id == user.organization_id))
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    require_document_access(db, user, document_id, "edit")
    job = db.scalar(select(ProcessingJob).where(ProcessingJob.document_id == document_id))
    if job is None:
        job = ProcessingJob(organization_id=user.organization_id, document_id=document.id)
        db.add(job)
    elif job.status in {"queued", "running", "retrying"}:
        raise HTTPException(status_code=409, detail="Document processing is already active")
    job.status = "retrying"; job.progress = 0; job.stage = "queued"; job.error = None; job.completed_at = None
    document.status = "queued"; document.processing_progress = 0; document.processing_stage = "queued"; document.processing_error = None
    db.commit(); db.refresh(job); db.refresh(document)
    background_tasks.add_task(enqueue_document_job, job.id)
    return IngestResponse(**DocumentResponse.model_validate(document).model_dump(), job_id=job.id)


def _save_upload(file: UploadFile, destination: Path) -> int:
    total_size = 0
    with destination.open("wb") as output:
        while chunk := file.file.read(1024 * 1024):
            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="File size cannot exceed 10 MB",
                )
            output.write(chunk)
    return total_size


@router.post("/{document_id}/chunks", response_model=DocumentDetail)
def create_document_chunks(
    document_id: uuid.UUID,
    payload: ChunkingRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    if user is not None and user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access is required")
    statement = select(Document).options(selectinload(Document.chunks)).where(Document.id == document_id)
    if user is not None:
        statement = statement.where(Document.organization_id == user.organization_id)
    document = db.scalar(statement)

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.extracted_text_path:
        raise HTTPException(status_code=409, detail="Document text has not been extracted")

    extracted_path = (BASE_DIR / document.extracted_text_path).resolve()
    storage_root = UPLOAD_DIR.resolve()
    if storage_root not in extracted_path.parents or not extracted_path.is_file():
        raise HTTPException(status_code=409, detail="Extracted text file is unavailable")

    text = extracted_path.read_text(encoding="utf-8")
    contents = hierarchical_chunks(text, payload.chunk_size, payload.overlap)
    if not contents:
        raise HTTPException(status_code=422, detail="Document contains no text to chunk")

    try:
        for existing_chunk in list(document.chunks):
            db.delete(existing_chunk)
        db.flush()
        document.chunks.clear()
        document.chunks.extend(
            Chunk(chunk_index=index, content=child, parent_index=parent_index, parent_content=parent, keywords=enrich_chunk(child)[0], suggested_questions=enrich_chunk(child)[1])
            for index, (child, parent_index, parent) in enumerate(contents)
        )
        document.status = "chunked"
        document.processing_error = None
        db.commit()
        db.refresh(document)
        return document
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not save document chunks") from exc


@router.post("/{document_id}/index", response_model=DocumentDetail)
def index_document(document_id: uuid.UUID, db: Session = Depends(get_db), user: User | None = Depends(get_current_user)):
    if user is not None and user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access is required")
    statement = select(Document).options(selectinload(Document.chunks)).where(Document.id == document_id)
    if user is not None:
        statement = statement.where(Document.organization_id == user.organization_id)
    document = db.scalar(statement)

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.chunks:
        raise HTTPException(status_code=409, detail="Document has no chunks to index")

    chunks = [
        {
            "id": str(chunk.id),
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
        }
        for chunk in document.chunks
    ]
    try:
        client = QdrantClient()
        client.ensure_collection()
        client.replace_document_chunks(str(document.id), document.filename, chunks)
    except QdrantError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    document.status = "indexed"
    document.processing_error = None
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", response_model=DeleteDocumentResponse)
def delete_document(document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access is required")
    document = db.scalar(select(Document).where(Document.id == document_id, Document.organization_id == user.organization_id))
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    document_dir = _get_document_directory(document)
    try:
        qdrant = QdrantClient()
        qdrant.ensure_collection()
        qdrant.delete_document(str(document.id))
    except QdrantError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    try:
        db.delete(document)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not delete document") from exc

    storage_removed = True
    if document_dir is not None and document_dir.exists():
        try:
            shutil.rmtree(document_dir)
        except OSError:
            storage_removed = False

    return DeleteDocumentResponse(
        id=document_id,
        status="deleted",
        storage_removed=storage_removed,
    )


def _get_document_directory(document: Document) -> Path | None:
    stored_source = document.storage_path or document.extracted_text_path
    if not stored_source:
        return None

    storage_root = UPLOAD_DIR.resolve()
    document_dir = (BASE_DIR / stored_source).resolve().parent
    expected_dir = storage_root / str(document.id)
    if document_dir != expected_dir:
        raise HTTPException(
            status_code=409,
            detail="Document storage path failed safety validation",
        )
    return document_dir


def _document_source_path(document: Document) -> Path:
    stored_source = document.storage_path or document.extracted_text_path
    if not stored_source:
        raise HTTPException(status_code=404, detail="Original document is unavailable")
    _get_document_directory(document)
    source_path = (BASE_DIR / stored_source).resolve()
    if not source_path.is_file():
        raise HTTPException(status_code=404, detail="Original document is unavailable")
    return source_path


@router.get("/{document_id}/content")
def get_document_content(document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document = require_document_access(db, user, document_id)
    source_path = _document_source_path(document)
    return FileResponse(source_path, media_type=document.content_type or "application/octet-stream", filename=document.filename, content_disposition_type="inline")


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    statement = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(Document.id == document_id, Document.organization_id == user.organization_id)
    )
    document = db.scalar(statement)

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if user.role != "admin":
        allowed = False
        for document_set in document.document_sets:
            try:
                require_set_access(db, user, document_set.id)
                allowed = True
                break
            except HTTPException:
                continue
        if not allowed:
            raise HTTPException(status_code=403, detail="You do not have access to this document")

    if document.content_type == "application/pdf" and document.storage_path:
        try:
            pages = [" ".join((page.extract_text() or "").split()).lower() for page in PdfReader(_document_source_path(document)).pages]
            for chunk in document.chunks:
                needle = " ".join(chunk.content.split()).lower()[:180]
                chunk.page_number = next((index for index, page in enumerate(pages, 1) if needle and needle in page), None)
        except Exception:
            for chunk in document.chunks:
                chunk.page_number = None
    return document
