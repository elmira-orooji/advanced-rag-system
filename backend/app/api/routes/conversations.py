import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.conversation import ChatMessageCreate, ConversationCreate, ConversationDetail, ConversationResponse, ConversationUpdate, MessageResponse
from app.services.conversation_service import ConversationService
from app.services.provider_factory import get_provider_factory
from app.api.contracts import set_offset_pagination_headers

router = APIRouter(prefix="/conversations", tags=["conversations"])


def get_conversation_service(db: Session) -> ConversationService:
    return ConversationService(db, providers=get_provider_factory())


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_conversation_service(db).create(payload, user)


@router.get("", response_model=list[ConversationResponse])
def list_conversations(response: Response, offset: int = Query(default=0, ge=0), limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = get_conversation_service(db).list(user, offset, limit)
    set_offset_pagination_headers(response, offset=offset, limit=limit, returned=len(items))
    return items


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_conversation_service(db).get(conversation_id, user, with_messages=True)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
def update_conversation(conversation_id: uuid.UUID, payload: ConversationUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_conversation_service(db).update(conversation_id, payload, user)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    get_conversation_service(db).delete(conversation_id, user)


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def send_message(conversation_id: uuid.UUID, payload: ChatMessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_conversation_service(db).send_message(conversation_id, payload, user)
