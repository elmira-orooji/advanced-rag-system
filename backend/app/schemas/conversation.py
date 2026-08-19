import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.search import SearchHit


class ConversationCreate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    document_id: uuid.UUID | None = None
    document_set_id: uuid.UUID | None = None
    assistant_id: uuid.UUID | None = None


class ConversationUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    document_id: uuid.UUID | None
    document_set_id: uuid.UUID | None
    assistant_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=2, max_length=4000)
    limit: int = Field(default=5, ge=1, le=8)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    sources: list[SearchHit] | None
    answer_id: uuid.UUID | None
    created_at: datetime


class ConversationDetail(ConversationResponse):
    messages: list[MessageResponse]
