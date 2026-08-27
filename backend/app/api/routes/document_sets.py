import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.routes.auth import get_current_user
from app.core.document_set_access import accessible_set_ids, require_document_access, require_set_access
from app.db.database import get_db
from app.models.document import Document
from app.models.document_set import DocumentSet, document_set_documents
from app.models.document_set_permission import DocumentSetPermission
from app.models.user import User
from app.schemas.document_set import (
    DocumentMembershipRequest,
    DocumentSetCreate,
    DocumentSetDetail,
    DocumentSetResponse,
    DocumentSetUpdate,
)

router = APIRouter(prefix="/document-sets", tags=["document-sets"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access is required")
    return user


def _get_set(db: Session, set_id: uuid.UUID, user: User, with_documents: bool = False) -> DocumentSet:
    statement = select(DocumentSet).where(DocumentSet.id == set_id, DocumentSet.organization_id == user.organization_id)
    if with_documents:
        statement = statement.options(selectinload(DocumentSet.documents))
    document_set = db.scalar(statement)
    if document_set is None:
        raise HTTPException(status_code=404, detail="Document set not found")
    return document_set


def _response(document_set: DocumentSet, document_count: int, indexed_count: int, access_level: str = "manage") -> DocumentSetResponse:
    return DocumentSetResponse(
        id=document_set.id,
        name=document_set.name,
        description=document_set.description,
        created_by_id=document_set.created_by_id,
        document_count=document_count,
        indexed_document_count=indexed_count,
        access_level=access_level,
        child_chunk_size=document_set.child_chunk_size,
        chunk_overlap=document_set.chunk_overlap,
        parent_chunk_size=document_set.parent_chunk_size,
        created_at=document_set.created_at,
        updated_at=document_set.updated_at,
    )


@router.get("", response_model=list[DocumentSetResponse])
def list_document_sets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    statement = (
        select(
            DocumentSet,
            func.count(Document.id),
            func.count(Document.id).filter(Document.status == "indexed"),
        )
        .outerjoin(document_set_documents, DocumentSet.id == document_set_documents.c.document_set_id)
        .outerjoin(Document, Document.id == document_set_documents.c.document_id)
        .group_by(DocumentSet.id)
        .where(DocumentSet.organization_id == user.organization_id)
        .order_by(DocumentSet.updated_at.desc())
    )
    allowed = accessible_set_ids(db, user)
    if allowed is not None:
        statement = statement.where(DocumentSet.id.in_(allowed))
    rows = db.execute(statement).all()
    permission_map = {} if user.role == "admin" else dict(db.execute(select(DocumentSetPermission.document_set_id, DocumentSetPermission.permission).where(DocumentSetPermission.user_id == user.id)).all())
    return [_response(item, total, indexed, permission_map.get(item.id, "manage")) for item, total, indexed in rows]


@router.post("", response_model=DocumentSetResponse, status_code=status.HTTP_201_CREATED)
def create_document_set(
    payload: DocumentSetCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    item = DocumentSet(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        created_by_id=user.id,
        organization_id=user.organization_id,
        child_chunk_size=payload.child_chunk_size,
        chunk_overlap=payload.chunk_overlap,
        parent_chunk_size=payload.parent_chunk_size,
    )
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A document set with this name already exists") from exc
    return _response(item, 0, 0)


@router.get("/{set_id}", response_model=DocumentSetDetail)
def get_document_set(
    set_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_set_access(db, user, set_id)
    item = _get_set(db, set_id, user, with_documents=True)
    return DocumentSetDetail(
        **_response(item, len(item.documents), sum(doc.status == "indexed" for doc in item.documents)).model_dump(),
        documents=item.documents,
    )


@router.patch("/{set_id}", response_model=DocumentSetResponse)
def update_document_set(
    set_id: uuid.UUID,
    payload: DocumentSetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_set_access(db, user, set_id, "manage")
    item = _get_set(db, set_id, user, with_documents=True)
    if payload.name is not None:
        item.name = payload.name.strip()
    if "description" in payload.model_fields_set:
        item.description = payload.description.strip() if payload.description else None
    for field in ("child_chunk_size", "chunk_overlap", "parent_chunk_size"):
        value = getattr(payload, field)
        if value is not None:
            setattr(item, field, value)
    if item.chunk_overlap >= item.child_chunk_size or item.parent_chunk_size < item.child_chunk_size:
        raise HTTPException(status_code=422, detail="Invalid chunking settings")
    try:
        db.commit()
        db.refresh(item)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A document set with this name already exists") from exc
    return _response(item, len(item.documents), sum(doc.status == "indexed" for doc in item.documents))


@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document_set(
    set_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_set_access(db, user, set_id, "manage")
    item = _get_set(db, set_id, user)
    db.delete(item)
    db.commit()


@router.post("/{set_id}/documents", response_model=DocumentSetDetail)
def add_document_to_set(
    set_id: uuid.UUID,
    payload: DocumentMembershipRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_set_access(db, user, set_id, "edit")
    item = _get_set(db, set_id, user, with_documents=True)
    if user.role == "admin":
        # Organization admins may also organize documents not yet in any set.
        document = db.scalar(select(Document).where(Document.id == payload.document_id, Document.organization_id == user.organization_id))
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found")
    else:
        # Attaching a document grants the destination's members access to it.
        document = require_document_access(db, user, payload.document_id, "manage")
    if all(existing.id != document.id for existing in item.documents):
        item.documents.append(document)
        db.commit()
        db.refresh(item)
    return DocumentSetDetail(
        **_response(item, len(item.documents), sum(doc.status == "indexed" for doc in item.documents)).model_dump(),
        documents=item.documents,
    )


@router.delete("/{set_id}/documents/{document_id}", response_model=DocumentSetDetail)
def remove_document_from_set(
    set_id: uuid.UUID,
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_set_access(db, user, set_id, "edit")
    item = _get_set(db, set_id, user, with_documents=True)
    document = next((doc for doc in item.documents if doc.id == document_id), None)
    if document is None:
        raise HTTPException(status_code=404, detail="Document is not in this set")
    item.documents.remove(document)
    db.commit()
    return DocumentSetDetail(
        **_response(item, len(item.documents), sum(doc.status == "indexed" for doc in item.documents)).model_dump(),
        documents=item.documents,
    )
