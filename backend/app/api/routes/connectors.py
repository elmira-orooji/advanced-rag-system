import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.document_set_access import require_set_access
from app.db.database import get_db
from app.models.connector import Connector
from app.models.document_set import DocumentSet
from app.models.user import User
from app.schemas.connector import ConnectorCreate, ConnectorResponse, ConnectorScheduleUpdate, SyncResponse
from app.services.connector_sync import ConnectorSyncError, sync_connector
from app.services.qdrant import QdrantError

router = APIRouter(prefix="/document-sets/{set_id}/connectors", tags=["connectors"])


def _next(interval: str) -> datetime:
    return datetime.now(timezone.utc) + {"hourly": timedelta(hours=1), "daily": timedelta(days=1), "weekly": timedelta(days=7)}[interval]


@router.get("", response_model=list[ConnectorResponse])
def list_connectors(set_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_set_access(db, user, set_id)
    return db.scalars(select(Connector).where(Connector.document_set_id == set_id).order_by(Connector.created_at.desc())).all()


@router.post("", response_model=ConnectorResponse, status_code=status.HTTP_201_CREATED)
def create_connector(set_id: uuid.UUID, payload: ConnectorCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if db.scalar(select(DocumentSet).where(DocumentSet.id == set_id, DocumentSet.organization_id == user.organization_id)) is None: raise HTTPException(status_code=404, detail="Document set not found")
    require_set_access(db, user, set_id, "edit")
    item = Connector(document_set_id=set_id, created_by_id=user.id, connector_type=payload.connector_type, name=payload.name.strip(), source_url=str(payload.source_url), status="pending", schedule_enabled=payload.schedule_enabled, schedule_interval=payload.schedule_interval, next_sync_at=_next(payload.schedule_interval) if payload.schedule_enabled else None)
    db.add(item); db.commit(); db.refresh(item); return item


@router.post("/{connector_id}/sync", response_model=SyncResponse)
def sync(set_id: uuid.UUID, connector_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_set_access(db, user, set_id, "edit")
    item = db.get(Connector, connector_id)
    if item is None or item.document_set_id != set_id: raise HTTPException(status_code=404, detail="Connector not found")
    item.status = "syncing"; item.last_error = None; db.commit()
    try:
        result = sync_connector(db, item)
    except (ConnectorSyncError, QdrantError) as exc:
        db.rollback(); item = db.get(Connector, connector_id); item.status = "failed"; item.last_error = str(exc)[:500]; db.commit()
        raise HTTPException(status_code=422 if isinstance(exc, ConnectorSyncError) else 502, detail=str(exc)) from exc
    item = db.get(Connector, connector_id); item.status = "ready"; item.last_synced_at = datetime.now(timezone.utc); item.last_error = None; item.next_sync_at = _next(item.schedule_interval) if item.schedule_enabled else None; db.commit()
    return SyncResponse(connector_id=item.id, **result)


@router.patch("/{connector_id}/schedule", response_model=ConnectorResponse)
def update_schedule(set_id: uuid.UUID, connector_id: uuid.UUID, payload: ConnectorScheduleUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_set_access(db, user, set_id, "edit")
    item = db.get(Connector, connector_id)
    if item is None or item.document_set_id != set_id: raise HTTPException(status_code=404, detail="Connector not found")
    item.schedule_enabled = payload.schedule_enabled; item.schedule_interval = payload.schedule_interval; item.next_sync_at = _next(payload.schedule_interval) if payload.schedule_enabled else None
    db.commit(); db.refresh(item); return item


@router.delete("/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connector(set_id: uuid.UUID, connector_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_set_access(db, user, set_id, "edit")
    item = db.get(Connector, connector_id)
    if item is None or item.document_set_id != set_id: raise HTTPException(status_code=404, detail="Connector not found")
    db.delete(item); db.commit()
