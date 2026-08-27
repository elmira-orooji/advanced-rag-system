import uuid
from typing import Literal
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AssistantCreate(BaseModel):
    model_id: str | None = Field(default=None, max_length=160, pattern=r"^[A-Za-z0-9_.:-]+/[A-Za-z0-9_./:-]+$")
    answer_mode: Literal["sources", "hybrid"] = "hybrid"
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=300)
    instructions: str = Field(min_length=10, max_length=5000)
    document_set_ids: list[uuid.UUID] = Field(default_factory=list, max_length=20)
    is_active: bool = True


class AssistantUpdate(BaseModel):
    model_id: str | None = Field(default=None, max_length=160, pattern=r"^[A-Za-z0-9_.:-]+/[A-Za-z0-9_./:-]+$")
    answer_mode: Literal["sources", "hybrid"] | None = None
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=300)
    instructions: str | None = Field(default=None, min_length=10, max_length=5000)
    document_set_ids: list[uuid.UUID] | None = Field(default=None, max_length=20)
    is_active: bool | None = None


class AssistantResponse(BaseModel):
    model_id: str | None = None
    answer_mode: Literal["sources", "hybrid"] = "sources"
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    instructions: str
    is_active: bool
    created_by_id: uuid.UUID
    document_set_ids: list[uuid.UUID]
    document_set_names: list[str]
    created_at: datetime
    updated_at: datetime


class AssistantAnswerRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    limit: int = Field(default=5, ge=1, le=8)
