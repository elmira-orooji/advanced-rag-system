from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.database import get_db
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.models.user import User
from app.schemas.rag import RagRequest, RagResponse
from app.schemas.search import SearchHit
from app.services.openrouter import OpenRouterClient, OpenRouterError
from app.services.qdrant import QdrantClient, QdrantError

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/answer", response_model=RagResponse)
def answer_question(
    payload: RagRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if payload.document_id and payload.document_set_id:
        raise HTTPException(status_code=422, detail="Choose either a document or a document set")

    document_ids: list[str] | None = None
    if payload.document_set_id:
        document_set = db.get(DocumentSet, payload.document_set_id)
        if document_set is None:
            raise HTTPException(status_code=404, detail="Document set not found")
        document_ids = [
            str(item)
            for item in db.scalars(
                select(Document.id)
                .join(Document.document_sets)
                .where(
                    DocumentSet.id == payload.document_set_id,
                    Document.status == "indexed",
                )
            ).all()
        ]
    try:
        qdrant = QdrantClient()
        qdrant.ensure_collection()
        points = qdrant.search(
            query=payload.question,
            limit=payload.limit,
            document_id=str(payload.document_id) if payload.document_id else None,
            document_ids=document_ids,
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
