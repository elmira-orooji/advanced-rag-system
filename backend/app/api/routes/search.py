from fastapi import APIRouter, HTTPException, status

from app.schemas.search import SearchHit, SearchRequest, SearchResponse
from app.services.qdrant import QdrantClient, QdrantError

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
def semantic_search(payload: SearchRequest):
    try:
        client = QdrantClient()
        client.ensure_collection()
        points = client.search(
            query=payload.query,
            limit=payload.limit,
            document_id=str(payload.document_id) if payload.document_id else None,
        )
    except QdrantError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    results = [
        SearchHit(score=point["score"], **point["payload"])
        for point in points
    ]
    return SearchResponse(query=payload.query, results=results)
