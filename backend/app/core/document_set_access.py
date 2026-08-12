import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document_set_permission import DocumentSetPermission
from app.models.document import Document
from app.models.user import User

LEVELS = {"view": 1, "edit": 2, "manage": 3}


def accessible_set_ids(db: Session, user: User, minimum: str = "view") -> set[uuid.UUID] | None:
    if user.role == "admin":
        return None
    threshold = LEVELS[minimum]
    rows = db.execute(select(DocumentSetPermission.document_set_id, DocumentSetPermission.permission).where(DocumentSetPermission.user_id == user.id)).all()
    return {set_id for set_id, level in rows if LEVELS[level] >= threshold}


def require_set_access(db: Session, user: User, set_id: uuid.UUID, minimum: str = "view") -> None:
    allowed = accessible_set_ids(db, user, minimum)
    if allowed is not None and set_id not in allowed:
        raise HTTPException(status_code=403, detail=f"{minimum.capitalize()} access to this knowledge set is required")


def require_document_access(db: Session, user: User, document_id: uuid.UUID, minimum: str = "view") -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if user.role == "admin":
        return document
    allowed = accessible_set_ids(db, user, minimum) or set()
    memberships = {item.id for item in document.document_sets}
    if not memberships.intersection(allowed):
        raise HTTPException(status_code=403, detail="You do not have access to this document")
    return document
