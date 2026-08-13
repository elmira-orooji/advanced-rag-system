from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.document_set_access import require_document_access, require_set_access
from app.core.metadata_filters import filter_document_ids
from app.db.database import get_db
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.models.user import User
from app.schemas.search import PlaygroundHit, PlaygroundResponse, RetrievalDiagnostics, SearchHit, SearchRequest, SearchResponse
from app.services.qdrant import QdrantClient, QdrantError
from app.services.retrieval import hybrid_search

router = APIRouter(prefix="/search", tags=["search"])


def _scope(payload: SearchRequest, db: Session, user: User) -> tuple[str | None, list[str] | None, int]:
    if payload.document_id and (payload.document_set_id or payload.document_ids): raise HTTPException(status_code=422, detail="Choose either a document or a document-set scope")
    if payload.document_ids and not payload.document_set_id: raise HTTPException(status_code=422, detail="Selected documents require a document set")
    if not payload.document_id and not payload.document_set_id: raise HTTPException(status_code=422, detail="A permitted document or knowledge set is required")
    if payload.document_id:
        require_document_access(db, user, payload.document_id)
        return str(payload.document_id), None, 1
    assert payload.document_set_id is not None
    if db.scalar(select(DocumentSet).where(DocumentSet.id == payload.document_set_id, DocumentSet.organization_id == user.organization_id)) is None: raise HTTPException(status_code=404, detail="Document set not found")
    require_set_access(db, user, payload.document_set_id)
    available = set(db.scalars(select(Document.id).join(Document.document_sets).where(DocumentSet.id == payload.document_set_id, Document.status == "indexed")).all())
    available = filter_document_ids(db, available, payload.filters)
    if payload.document_ids:
        requested = set(payload.document_ids)
        if requested - available: raise HTTPException(status_code=422, detail="Selected documents are unavailable or outside this set")
        available = requested
    return None, [str(value) for value in available], len(available)


@router.post("", response_model=SearchResponse)
def semantic_search(payload: SearchRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document_id, document_ids, _ = _scope(payload, db, user)
    try:
        client = QdrantClient(); client.ensure_collection()
        points = hybrid_search(db, query=payload.query, limit=payload.limit, document_id=document_id, document_ids=document_ids)
    except QdrantError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return SearchResponse(query=payload.query, results=[SearchHit(score=point["score"], **point["payload"]) for point in points])


@router.post("/playground", response_model=PlaygroundResponse)
def retrieval_playground(payload: SearchRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document_id, document_ids, scoped_count = _scope(payload, db, user)
    try:
        QdrantClient().ensure_collection()
        points = hybrid_search(db, payload.query, payload.limit, document_id=document_id, document_ids=document_ids)
    except QdrantError as exc: raise HTTPException(status_code=502, detail=str(exc)) from exc
    results = []
    for point in points:
        meta = point.get("retrieval", {}); data = point["payload"]
        results.append(PlaygroundHit(
            **data,
            score=point["score"],
            parent_index=data.get("parent_index", 0),
            matched_child_content=data.get("matched_child_content", data["content"]),
            diagnostics=RetrievalDiagnostics(
                method=meta.get("method", "hybrid"),
                vector_rank=meta.get("vector_rank"),
                bm25_rank=meta.get("bm25_rank"),
                hybrid_score=meta.get("hybrid_score", point["score"]),
                reranker_score=point["score"],
                term_coverage=meta.get("term_coverage", 0),
                phrase_match=meta.get("phrase_match", False),
                expanded_to_parent=meta.get("expanded_to_parent", False),
            ),
        ))
    return PlaygroundResponse(query=payload.query, scoped_document_count=scoped_count, result_count=len(results), results=results)
