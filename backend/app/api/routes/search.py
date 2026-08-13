import re
from time import perf_counter

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
from app.schemas.search import PipelineTraceResponse, PlaygroundHit, PlaygroundResponse, RetrievalDiagnostics, SearchHit, SearchRequest, SearchResponse, TraceCitation, TraceStage
from app.services.openrouter import OpenRouterClient, OpenRouterError
from app.services.qdrant import QdrantClient, QdrantError
from app.services.retrieval import hybrid_search

router = APIRouter(prefix="/search", tags=["search"])


def _playground_hit(point: dict) -> PlaygroundHit:
    meta = point.get("retrieval", {}); data = point["payload"]
    return PlaygroundHit(**data, score=point["score"], parent_index=data.get("parent_index", 0), matched_child_content=data.get("matched_child_content", data["content"]), diagnostics=RetrievalDiagnostics(method=meta.get("method", "hybrid"), vector_rank=meta.get("vector_rank"), bm25_rank=meta.get("bm25_rank"), hybrid_score=meta.get("hybrid_score", point["score"]), reranker_score=point["score"], term_coverage=meta.get("term_coverage", 0), phrase_match=meta.get("phrase_match", False), expanded_to_parent=meta.get("expanded_to_parent", False)))


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


@router.post("/trace", response_model=PipelineTraceResponse)
def pipeline_trace(payload: SearchRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total_started = perf_counter(); scope_started = perf_counter()
    document_id, document_ids, scoped_count = _scope(payload, db, user)
    scope_ms = round((perf_counter() - scope_started) * 1000, 2)
    metrics: dict = {}
    try:
        QdrantClient().ensure_collection()
        points = hybrid_search(db, payload.query, payload.limit, document_id=document_id, document_ids=document_ids, trace=metrics)
    except QdrantError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    results = [_playground_hit(point) for point in points]
    answer_started = perf_counter()
    if results:
        try:
            answer = OpenRouterClient().answer(payload.query, [result.model_dump(mode="json") for result in results])
        except OpenRouterError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        answer = "No relevant information was found in the indexed documents."
    answer_ms = round((perf_counter() - answer_started) * 1000, 2)
    used = {int(value) for value in re.findall(r"\[\s*(?:Source\s*)?(\d+)\s*\]", answer, flags=re.IGNORECASE) if 1 <= int(value) <= len(results)}
    answer = re.sub(r"\[\s*Source\s*(\d+)\s*\]", r"[\1]", answer, flags=re.IGNORECASE)
    citations = [TraceCitation(id=index, chunk_id=result.chunk_id, filename=result.filename) for index, result in enumerate(results, 1) if index in used]
    stages = [
        TraceStage(key="question", duration_ms=scope_ms, input_count=1, output_count=scoped_count),
        TraceStage(key="retrieval", duration_ms=metrics.get("vector_ms", 0) + metrics.get("bm25_ms", 0), input_count=scoped_count, output_count=metrics.get("fused_count", 0)),
        TraceStage(key="rerank", duration_ms=metrics.get("rerank_ms", 0), input_count=metrics.get("fused_count", 0), output_count=len(results)),
        TraceStage(key="answer", duration_ms=answer_ms, input_count=len(results), output_count=len(citations)),
    ]
    return PipelineTraceResponse(question=payload.query, answer=answer, grounded=bool(citations), total_duration_ms=round((perf_counter() - total_started) * 1000, 2), stages=stages, results=results, citations=citations)
