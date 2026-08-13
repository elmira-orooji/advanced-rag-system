import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.document_set_access import require_set_access
from app.db.database import get_db
from app.models.evaluation_case import EvaluationCase
from app.models.user import User
from app.schemas.evaluation import EvaluationCaseCreate, EvaluationCaseResponse, EvaluationCaseUpdate

router = APIRouter(prefix="/document-sets/{set_id}/evaluation-cases", tags=["evaluation"])


@router.get("", response_model=list[EvaluationCaseResponse])
def list_cases(set_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_set_access(db, user, set_id)
    return db.scalars(select(EvaluationCase).where(EvaluationCase.document_set_id == set_id).order_by(EvaluationCase.created_at.desc())).all()


@router.post("", response_model=EvaluationCaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(set_id: uuid.UUID, payload: EvaluationCaseCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_set_access(db, user, set_id, "manage")
    item = EvaluationCase(document_set_id=set_id, created_by_id=user.id, **payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.patch("/{case_id}", response_model=EvaluationCaseResponse)
def update_case(set_id: uuid.UUID, case_id: uuid.UUID, payload: EvaluationCaseUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_set_access(db, user, set_id, "manage")
    item = db.scalar(select(EvaluationCase).where(EvaluationCase.id == case_id, EvaluationCase.document_set_id == set_id))
    if item is None: raise HTTPException(status_code=404, detail="Evaluation case not found")
    for key, value in payload.model_dump().items(): setattr(item, key, value)
    db.commit(); db.refresh(item)
    return item


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(set_id: uuid.UUID, case_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_set_access(db, user, set_id, "manage")
    item = db.scalar(select(EvaluationCase).where(EvaluationCase.id == case_id, EvaluationCase.document_set_id == set_id))
    if item is None: raise HTTPException(status_code=404, detail="Evaluation case not found")
    db.delete(item); db.commit()
