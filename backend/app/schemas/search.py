import uuid

from pydantic import BaseModel, Field
from app.schemas.metadata import MetadataFilters


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=2000)
    limit: int = Field(default=5, ge=1, le=20)
    document_id: uuid.UUID | None = None
    document_set_id: uuid.UUID | None = None
    document_ids: list[uuid.UUID] | None = Field(default=None, max_length=50)
    filters: MetadataFilters | None = None


class SearchHit(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    content: str
    score: float


class SearchResponse(BaseModel):
    query: str
    results: list[SearchHit]


class RetrievalDiagnostics(BaseModel):
    method: str
    vector_rank: int | None = None
    bm25_rank: int | None = None
    hybrid_score: float
    reranker_score: float
    term_coverage: float
    phrase_match: bool
    expanded_to_parent: bool


class PlaygroundHit(SearchHit):
    parent_index: int
    matched_child_content: str
    diagnostics: RetrievalDiagnostics


class PlaygroundResponse(BaseModel):
    query: str
    scoped_document_count: int
    result_count: int
    results: list[PlaygroundHit]
