import uuid

from pydantic import BaseModel, Field

from app.schemas.search import SearchHit


class RagRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    limit: int = Field(default=5, ge=1, le=8)
    document_id: uuid.UUID | None = None
    document_set_id: uuid.UUID | None = None
    document_ids: list[uuid.UUID] | None = Field(default=None, max_length=50)


class RagResponse(BaseModel):
    question: str
    answer: str
    grounded: bool
    citations: list["Citation"]
    sources: list[SearchHit]


class Citation(BaseModel):
    id: int
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    excerpt: str
    score: float
    page: int | None = None
    section: str | None = None
