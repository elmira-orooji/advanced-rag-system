import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DocumentCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str | None = Field(default=None, max_length=100)


class ChunkingRequest(BaseModel):
    chunk_size: int = Field(default=1000, ge=200, le=4000)
    overlap: int = Field(default=200, ge=0, le=1000)

    @model_validator(mode="after")
    def validate_overlap(self):
        if self.overlap >= self.chunk_size:
            raise ValueError("overlap must be smaller than chunk_size")
        return self


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    content_type: str | None
    status: str
    processing_error: str | None
    created_at: datetime
    updated_at: datetime


class IngestResponse(DocumentResponse):
    chunks_count: int


class DeleteDocumentResponse(BaseModel):
    id: uuid.UUID
    status: str
    storage_removed: bool


class ChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chunk_index: int
    content: str
    token_count: int | None
    created_at: datetime


class DocumentDetail(DocumentResponse):
    chunks: list[ChunkResponse]
