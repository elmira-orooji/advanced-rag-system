import uuid
from datetime import date, datetime

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
    processing_progress: int
    processing_stage: str
    author: str | None
    language: str | None
    source_type: str | None
    document_date: date | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime


class IngestResponse(DocumentResponse):
    job_id: uuid.UUID


class DocumentMetadataUpdate(BaseModel):
    author: str | None = Field(default=None, max_length=160)
    language: str | None = Field(default=None, max_length=20)
    source_type: str | None = Field(default=None, max_length=40)
    document_date: date | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def normalize_metadata(self):
        self.author = self.author.strip() if self.author else None
        self.language = self.language.strip().lower() if self.language else None
        self.source_type = self.source_type.strip().lower() if self.source_type else None
        self.tags = list(dict.fromkeys(tag.strip().lower() for tag in self.tags if tag.strip()))
        return self


class DeleteDocumentResponse(BaseModel):
    id: uuid.UUID
    status: str
    storage_removed: bool


class ChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chunk_index: int
    content: str
    parent_index: int
    parent_content: str
    token_count: int | None
    created_at: datetime
    page_number: int | None = None
    is_active: bool


class ChunkUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=20, max_length=12000)
    is_active: bool | None = None

    @model_validator(mode="after")
    def require_change(self):
        if self.content is None and self.is_active is None:
            raise ValueError("At least one chunk field is required")
        if self.content is not None:
            self.content = self.content.strip()
        return self


class DocumentDetail(DocumentResponse):
    chunks: list[ChunkResponse]
