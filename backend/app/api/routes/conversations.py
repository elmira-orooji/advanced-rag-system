import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.database import get_db
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.schemas.conversation import (
    ChatMessageCreate,
    ConversationCreate,
    ConversationDetail,
    ConversationResponse,
    MessageResponse,
)
from app.schemas.search import SearchHit
from app.services.openrouter import OpenRouterClient, OpenRouterError
from app.services.qdrant import QdrantClient, QdrantError

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db)):
    if payload.document_id and db.get(Document, payload.document_id) is None:
        raise HTTPException(status_code=404, detail="Document not found")

    conversation = Conversation(
        title=payload.title or "New conversation",
        document_id=payload.document_id,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    statement = (
        select(Conversation)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return db.scalars(statement).all()


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: uuid.UUID, db: Session = Depends(get_db)):
    statement = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    conversation = db.scalar(statement)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def send_message(
    conversation_id: uuid.UUID,
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
):
    conversation = db.scalar(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        qdrant = QdrantClient()
        qdrant.ensure_collection()
        points = qdrant.search(
            query=payload.content,
            limit=payload.limit,
            document_id=str(conversation.document_id) if conversation.document_id else None,
        )
    except QdrantError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    sources = [SearchHit(score=point["score"], **point["payload"]) for point in points]
    if sources:
        history = [
            {"role": message.role, "content": message.content}
            for message in conversation.messages[-10:]
        ]
        try:
            answer = OpenRouterClient().answer(
                payload.content,
                [source.model_dump(mode="json") for source in sources],
                history=history,
            )
        except OpenRouterError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        answer = _no_results_message(payload.content)

    user_message = Message(role="user", content=payload.content)
    assistant_message = Message(
        role="assistant",
        content=answer,
        sources=[source.model_dump(mode="json") for source in sources] or None,
    )
    conversation.messages.extend([user_message, assistant_message])
    if conversation.title == "New conversation":
        conversation.title = payload.content[:200]
    conversation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(assistant_message)
    return assistant_message


def _no_results_message(question: str) -> str:
    if any("\u0600" <= character <= "\u06ff" for character in question):
        return "در اسناد ایندکس‌شده اطلاعات مرتبطی برای پاسخ پیدا نشد."
    return "No relevant information was found in the indexed documents."
