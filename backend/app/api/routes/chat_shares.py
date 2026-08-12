import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.database import get_db
from app.models.chat_share import ChatShare
from app.models.user import User
from app.schemas.chat_share import ChatShareCreate, ChatShareCreated, ChatShareSummary, ChatShareView, SharedMessage

router = APIRouter(tags=["chat-sharing"])


def _hash(token: str) -> str: return hashlib.sha256(token.encode()).hexdigest()


def _resolve(token: str, db: Session) -> ChatShare:
    item = db.scalar(select(ChatShare).where(ChatShare.token_hash == _hash(token), ChatShare.is_active.is_(True)))
    now = datetime.now(timezone.utc)
    if item is None or (item.expires_at is not None and item.expires_at <= now):
        raise HTTPException(status_code=404, detail="Shared conversation not found or expired")
    return item


def _view(item: ChatShare, db: Session) -> ChatShareView:
    owner = db.get(User, item.owner_id)
    return ChatShareView(id=item.id, title=item.title, owner_username=owner.username if owner else "Former member", visibility=item.visibility, messages=[SharedMessage.model_validate(value) for value in item.messages], created_at=item.created_at, expires_at=item.expires_at)


@router.post("/chat-shares", response_model=ChatShareCreated, status_code=status.HTTP_201_CREATED)
def create_share(payload: ChatShareCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days) if payload.expires_in_days else None
    item = ChatShare(owner_id=user.id, title=payload.title.strip(), visibility=payload.visibility, token_hash=_hash(token), messages=[value.model_dump(mode="json") for value in payload.messages], expires_at=expires_at)
    db.add(item); db.commit(); db.refresh(item)
    return ChatShareCreated(id=item.id, share_token=token, visibility=item.visibility, expires_at=item.expires_at)


@router.get("/chat-shares", response_model=list[ChatShareSummary])
def list_active_shares(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    items = db.scalars(select(ChatShare).where(ChatShare.owner_id == user.id, ChatShare.is_active.is_(True)).order_by(ChatShare.created_at.desc())).all()
    return [ChatShareSummary(id=item.id, title=item.title, visibility=item.visibility, expires_at=item.expires_at, created_at=item.created_at) for item in items if item.expires_at is None or item.expires_at > now]


@router.get("/shared/team/{token}", response_model=ChatShareView)
def view_team_share(token: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = _resolve(token, db)
    if item.visibility != "team": raise HTTPException(status_code=404, detail="Shared conversation not found")
    owner = db.get(User, item.owner_id)
    if owner is None or owner.organization_id != user.organization_id: raise HTTPException(status_code=404, detail="Shared conversation not found")
    return _view(item, db)


@router.get("/shared/link/{token}", response_model=ChatShareView)
def view_public_share(token: str, db: Session = Depends(get_db)):
    item = _resolve(token, db)
    if item.visibility != "link": raise HTTPException(status_code=404, detail="Shared conversation not found")
    return _view(item, db)


@router.delete("/chat-shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share(share_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.get(ChatShare, share_id)
    owner = db.get(User, item.owner_id) if item else None
    if item is None or owner is None or owner.organization_id != user.organization_id or (item.owner_id != user.id and user.role != "admin"): raise HTTPException(status_code=404, detail="Shared conversation not found")
    item.is_active = False; item.revoked_at = datetime.now(timezone.utc); db.commit()
