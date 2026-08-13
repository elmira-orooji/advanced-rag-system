import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.database import get_db
from app.models.answer_feedback import AnswerFeedback, AnswerRecord
from app.models.user import User
from app.models.evaluation_case import EvaluationCase
from app.schemas.feedback import FeedbackResponse, FeedbackUpsert

router = APIRouter(prefix="/answers", tags=["feedback"])


@router.put("/{answer_id}/feedback", response_model=FeedbackResponse)
def upsert_feedback(answer_id: uuid.UUID, payload: FeedbackUpsert, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    answer = db.get(AnswerRecord, answer_id)
    if answer is None or (answer.user_id != user.id and user.role != "admin"):
        raise HTTPException(status_code=404, detail="Answer not found")
    item = db.scalar(select(AnswerFeedback).where(AnswerFeedback.answer_id == answer_id, AnswerFeedback.user_id == user.id))
    if item is None:
        item = AnswerFeedback(answer_id=answer_id, user_id=user.id, rating=payload.rating)
        db.add(item)
    item.rating = payload.rating; item.reason = payload.reason; item.comment = payload.comment.strip() if payload.comment else None
    if payload.rating == -1 and answer.document_set_id and item.evaluation_case_id is None:
        keywords = [value.strip() for value in (item.comment or "").split(",") if len(value.strip()) >= 2][:20]
        case = EvaluationCase(document_set_id=answer.document_set_id, created_by_id=user.id, question=answer.question, expected_answer=None, expected_keywords=keywords, relevant_chunk_ids=[])
        db.add(case); db.flush(); item.evaluation_case_id = case.id
    db.commit(); db.refresh(item)
    return FeedbackResponse(id=item.id, answer_id=item.answer_id, rating=item.rating, reason=item.reason, comment=item.comment)
