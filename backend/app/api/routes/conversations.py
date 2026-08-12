import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.auth import get_current_user
from app.core.document_set_access import accessible_set_ids, require_document_access, require_set_access
from app.db.database import get_db
from app.models.assistant import Assistant
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.models.message import Message
from app.models.user import User
from app.schemas.conversation import ChatMessageCreate, ConversationCreate, ConversationDetail, ConversationResponse, ConversationUpdate, MessageResponse
from app.schemas.search import SearchHit
from app.services.openrouter import OpenRouterClient, OpenRouterError
from app.services.qdrant import QdrantClient, QdrantError

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _owned(db: Session, conversation_id: uuid.UUID, user: User, messages: bool = False) -> Conversation:
    statement = select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    if messages: statement = statement.options(selectinload(Conversation.messages))
    item = db.scalar(statement)
    if item is None: raise HTTPException(status_code=404, detail="Conversation not found")
    return item


def _assistant_sets(db: Session, assistant: Assistant, user: User) -> list[uuid.UUID]:
    if not assistant.is_active: raise HTTPException(status_code=409, detail="Assistant is inactive")
    set_ids = [item.id for item in assistant.document_sets]
    allowed = accessible_set_ids(db, user)
    if allowed is not None: set_ids = [value for value in set_ids if value in allowed]
    if not set_ids: raise HTTPException(status_code=403, detail="You do not have access to this assistant's knowledge")
    return set_ids


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scopes = sum(value is not None for value in (payload.document_id, payload.document_set_id, payload.assistant_id))
    if scopes != 1: raise HTTPException(status_code=422, detail="Choose exactly one document, knowledge set, or assistant")
    if payload.document_id: require_document_access(db, user, payload.document_id)
    if payload.document_set_id:
        if db.get(DocumentSet, payload.document_set_id) is None: raise HTTPException(status_code=404, detail="Document set not found")
        require_set_access(db, user, payload.document_set_id)
    if payload.assistant_id:
        assistant = db.scalar(select(Assistant).options(selectinload(Assistant.document_sets)).where(Assistant.id == payload.assistant_id))
        if assistant is None: raise HTTPException(status_code=404, detail="Assistant not found")
        _assistant_sets(db, assistant, user)
    conversation = Conversation(user_id=user.id, title=payload.title or "New conversation", document_id=payload.document_id, document_set_id=payload.document_set_id, assistant_id=payload.assistant_id)
    db.add(conversation); db.commit(); db.refresh(conversation); return conversation


@router.get("", response_model=list[ConversationResponse])
def list_conversations(offset: int = Query(default=0, ge=0), limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(select(Conversation).where(Conversation.user_id == user.id).order_by(Conversation.updated_at.desc()).offset(offset).limit(limit)).all()


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _owned(db, conversation_id, user, messages=True)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
def update_conversation(conversation_id: uuid.UUID, payload: ConversationUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conversation = _owned(db, conversation_id, user)
    conversation.title = payload.title.strip()
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_owned(db, conversation_id, user)); db.commit()


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def send_message(conversation_id: uuid.UUID, payload: ChatMessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conversation = _owned(db, conversation_id, user, messages=True)
    document_id: str | None = None; document_ids: list[str] | None = None; instructions: str | None = None
    if conversation.document_id:
        require_document_access(db, user, conversation.document_id); document_id = str(conversation.document_id)
    elif conversation.document_set_id:
        require_set_access(db, user, conversation.document_set_id)
        document_ids = [str(value) for value in db.scalars(select(Document.id).join(Document.document_sets).where(DocumentSet.id == conversation.document_set_id, Document.status == "indexed")).all()]
    elif conversation.assistant_id:
        assistant = db.scalar(select(Assistant).options(selectinload(Assistant.document_sets)).where(Assistant.id == conversation.assistant_id))
        if assistant is None: raise HTTPException(status_code=409, detail="Conversation assistant is unavailable")
        set_ids = _assistant_sets(db, assistant, user); instructions = assistant.instructions
        document_ids = [str(value) for value in db.scalars(select(Document.id).join(Document.document_sets).where(DocumentSet.id.in_(set_ids), Document.status == "indexed").distinct()).all()]
    else: raise HTTPException(status_code=409, detail="Conversation has no valid knowledge scope")
    try:
        qdrant = QdrantClient(); qdrant.ensure_collection(); points = qdrant.search(query=payload.content, limit=payload.limit, document_id=document_id, document_ids=document_ids)
    except QdrantError as exc: raise HTTPException(status_code=502, detail=str(exc)) from exc
    sources = [SearchHit(score=point["score"], **point["payload"]) for point in points]
    if sources:
        history = [{"role": message.role, "content": message.content} for message in conversation.messages[-10:]]
        try: answer = OpenRouterClient().answer(payload.content, [source.model_dump(mode="json") for source in sources], history=history, instructions=instructions)
        except OpenRouterError as exc: raise HTTPException(status_code=502, detail=str(exc)) from exc
    else: answer = _no_results_message(payload.content)
    user_message = Message(role="user", content=payload.content)
    assistant_message = Message(role="assistant", content=answer, sources=[source.model_dump(mode="json") for source in sources] or None)
    conversation.messages.extend([user_message, assistant_message])
    if conversation.title == "New conversation": conversation.title = payload.content[:200]
    conversation.updated_at = datetime.now(timezone.utc); db.commit(); db.refresh(assistant_message); return assistant_message


def _no_results_message(question: str) -> str:
    if any("\u0600" <= character <= "\u06ff" for character in question): return "در اسناد مجاز اطلاعات مرتبطی برای پاسخ پیدا نشد."
    return "No relevant information was found in the permitted indexed documents."
