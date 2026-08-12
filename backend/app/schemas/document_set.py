import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.document import DocumentResponse


class DocumentSetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class DocumentSetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class DocumentSetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_by_id: uuid.UUID
    document_count: int = 0
    indexed_document_count: int = 0
    created_at: datetime
    updated_at: datetime


class DocumentSetDetail(DocumentSetResponse):
    documents: list[DocumentResponse]


class DocumentMembershipRequest(BaseModel):
    document_id: uuid.UUID
