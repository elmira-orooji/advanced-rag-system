import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ChunkingSettings(BaseModel):
    child_chunk_size: int = Field(default=800, ge=200, le=2000)
    chunk_overlap: int = Field(default=120, ge=0, le=500)
    parent_chunk_size: int = Field(default=2400, ge=600, le=8000)

    @model_validator(mode="after")
    def validate_sizes(self):
        if self.chunk_overlap >= self.child_chunk_size:
            raise ValueError("Chunk overlap must be smaller than child chunk size")
        if self.parent_chunk_size < self.child_chunk_size:
            raise ValueError("Parent chunk size must be at least the child chunk size")
        return self

from app.schemas.document import DocumentResponse


class DocumentSetCreate(ChunkingSettings):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class DocumentSetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    child_chunk_size: int | None = Field(default=None, ge=200, le=2000)
    chunk_overlap: int | None = Field(default=None, ge=0, le=500)
    parent_chunk_size: int | None = Field(default=None, ge=600, le=8000)

    @model_validator(mode="after")
    def validate_provided_sizes(self):
        if self.child_chunk_size is not None and self.chunk_overlap is not None and self.chunk_overlap >= self.child_chunk_size:
            raise ValueError("Chunk overlap must be smaller than child chunk size")
        if self.child_chunk_size is not None and self.parent_chunk_size is not None and self.parent_chunk_size < self.child_chunk_size:
            raise ValueError("Parent chunk size must be at least the child chunk size")
        return self


class DocumentSetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_by_id: uuid.UUID
    document_count: int = 0
    indexed_document_count: int = 0
    access_level: str = "manage"
    child_chunk_size: int
    chunk_overlap: int
    parent_chunk_size: int
    created_at: datetime
    updated_at: datetime


class DocumentSetDetail(DocumentSetResponse):
    documents: list[DocumentResponse]


class DocumentMembershipRequest(BaseModel):
    document_id: uuid.UUID
