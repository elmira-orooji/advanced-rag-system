import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.config import BASE_DIR, MAX_UPLOAD_SIZE, UPLOAD_DIR
from app.db.database import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.document import (
    ChunkingRequest,
    DocumentCreate,
    DocumentDetail,
    DocumentResponse,
)
from app.services.document_extractor import ExtractionError, extract_text
from app.services.text_chunker import chunk_text

router = APIRouter(prefix="/documents", tags=["documents"])
ALLOWED_FILE_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
}


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    document = Document(
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
    db: Session = Depends(get_db),
):
    statement = (
        select(Document)
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
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
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
        size = await _save_upload(file, original_path)
        if size == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty")

        extracted_text = extract_text(original_path, content_type)
        extracted_path.write_text(extracted_text, encoding="utf-8")

        document = Document(
            id=document_id,
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
        await file.close()


async def _save_upload(file: UploadFile, destination: Path) -> int:
    total_size = 0
    with destination.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
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
):
    statement = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(Document.id == document_id)
    )
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
    contents = chunk_text(text, payload.chunk_size, payload.overlap)
    if not contents:
        raise HTTPException(status_code=422, detail="Document contains no text to chunk")

    try:
        for existing_chunk in list(document.chunks):
            db.delete(existing_chunk)
        db.flush()
        document.chunks.clear()
        document.chunks.extend(
            Chunk(chunk_index=index, content=content)
            for index, content in enumerate(contents)
        )
        document.status = "chunked"
        db.commit()
        db.refresh(document)
        return document
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not save document chunks") from exc


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db)):
    statement = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(Document.id == document_id)
    )
    document = db.scalar(statement)

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return document
