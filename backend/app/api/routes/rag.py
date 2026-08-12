import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.document_set_access import require_set_access
from app.db.database import get_db
from app.models.document import Document
from app.models.document_set import DocumentSet
from app.models.user import User
from app.schemas.rag import Citation, RagRequest, RagResponse
from app.schemas.search import SearchHit
from app.services.openrouter import OpenRouterClient, OpenRouterError
from app.services.qdrant import QdrantClient, QdrantError

router = APIRouter(prefix="/rag", tags=["rag"])


def _normalize_citations(answer: str, source_count: int) -> tuple[str, set[int]]:
    used: set[int] = set()

    def replace(match: re.Match[str]) -> str:
        number = int(match.group(1))
        if 1 <= number <= source_count:
            used.add(number)
            return f"[{number}]"
        return ""

    normalized = re.sub(r"\[\s*(?:Source\s*)?(\d+)\s*\]", replace, answer, flags=re.IGNORECASE)
    return re.sub(r"[ \t]{2,}", " ", normalized).strip(), used


@router.post("/answer", response_model=RagResponse)
def answer_question(
    payload: RagRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.document_id and (payload.document_set_id or payload.document_ids):
        raise HTTPException(status_code=422, detail="Choose either a document or a document set scope")
    if payload.document_ids and not payload.document_set_id:
        raise HTTPException(status_code=422, detail="Selected documents require a document set")

    document_ids: list[str] | None = None
    if payload.document_set_id:
        require_set_access(db, user, payload.document_set_id)
        document_set = db.get(DocumentSet, payload.document_set_id)
        if document_set is None:
            raise HTTPException(status_code=404, detail="Document set not found")
        available_ids = set(db.scalars(
            select(Document.id)
            .join(Document.document_sets)
            .where(
                DocumentSet.id == payload.document_set_id,
                Document.status == "indexed",
            )
        ).all())
        if payload.document_ids:
            requested_ids = set(payload.document_ids)
            invalid_ids = requested_ids - available_ids
            if invalid_ids:
                raise HTTPException(
                    status_code=422,
                    detail="One or more selected documents are unavailable or outside this set",
                )
            document_ids = [str(item) for item in payload.document_ids]
        else:
            document_ids = [str(item) for item in available_ids]
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
            grounded=False,
            citations=[],
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

    answer, used_citation_ids = _normalize_citations(answer, len(sources))
    citations = [
        Citation(
            id=index,
            chunk_id=source.chunk_id,
            document_id=source.document_id,
            filename=source.filename,
            chunk_index=source.chunk_index,
            excerpt=source.content,
            score=source.score,
        )
        for index, source in enumerate(sources, start=1)
        if index in used_citation_ids
    ]
    return RagResponse(
        question=payload.question,
        answer=answer,
        grounded=bool(citations),
        citations=citations,
        sources=sources,
    )
import re
