from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.document_set_access import require_document_access, require_set_access
from app.db.database import get_db
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.models.user import User
from app.schemas.search import SearchHit, SearchRequest, SearchResponse
from app.services.qdrant import QdrantClient, QdrantError

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
def semantic_search(payload: SearchRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.document_id and (payload.document_set_id or payload.document_ids):
        raise HTTPException(status_code=422, detail="Choose either a document or a document-set scope")
    if payload.document_ids and not payload.document_set_id:
        raise HTTPException(status_code=422, detail="Selected documents require a document set")
    if not payload.document_id and not payload.document_set_id:
        raise HTTPException(status_code=422, detail="A permitted document or knowledge set is required")
    document_ids: list[str] | None = None
    if payload.document_id:
        require_document_access(db, user, payload.document_id)
    else:
        assert payload.document_set_id is not None
        if db.get(DocumentSet, payload.document_set_id) is None: raise HTTPException(status_code=404, detail="Document set not found")
        require_set_access(db, user, payload.document_set_id)
        available = set(db.scalars(select(Document.id).join(Document.document_sets).where(DocumentSet.id == payload.document_set_id, Document.status == "indexed")).all())
        if payload.document_ids:
            requested = set(payload.document_ids)
            if requested - available: raise HTTPException(status_code=422, detail="Selected documents are unavailable or outside this set")
            document_ids = [str(value) for value in payload.document_ids]
        else: document_ids = [str(value) for value in available]
    try:
        client = QdrantClient(); client.ensure_collection()
        points = client.search(query=payload.query, limit=payload.limit, document_id=str(payload.document_id) if payload.document_id else None, document_ids=document_ids)
    except QdrantError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return SearchResponse(query=payload.query, results=[SearchHit(score=point["score"], **point["payload"]) for point in points])
