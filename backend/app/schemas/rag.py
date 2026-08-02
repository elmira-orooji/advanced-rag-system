import uuid

from pydantic import BaseModel, Field

from app.schemas.search import SearchHit


class RagRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    limit: int = Field(default=5, ge=1, le=8)
    document_id: uuid.UUID | None = None


class RagResponse(BaseModel):
    question: str
    answer: str
    sources: list[SearchHit]
