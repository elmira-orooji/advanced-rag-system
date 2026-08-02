from fastapi import APIRouter, HTTPException, status

from app.schemas.rag import RagRequest, RagResponse
from app.schemas.search import SearchHit
from app.services.openrouter import OpenRouterClient, OpenRouterError
from app.services.qdrant import QdrantClient, QdrantError

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/answer", response_model=RagResponse)
def answer_question(payload: RagRequest):
    try:
        qdrant = QdrantClient()
        qdrant.ensure_collection()
        points = qdrant.search(
            query=payload.question,
            limit=payload.limit,
            document_id=str(payload.document_id) if payload.document_id else None,
        )
    except QdrantError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    sources = [
        SearchHit(score=point["score"], **point["payload"])
        for point in points
    ]
    if not sources:
        return RagResponse(
            question=payload.question,
            answer="No relevant information was found in the indexed documents.",
            sources=[],
        )

    contexts = [source.model_dump(mode="json") for source in sources]
    try:
        answer = OpenRouterClient().answer(payload.question, contexts)
    except OpenRouterError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return RagResponse(
        question=payload.question,
        answer=answer,
        sources=sources,
    )
