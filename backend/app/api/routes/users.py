import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import case, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user, revoke_user_sessions
from app.core.security import hash_password
from app.db.database import get_db
from app.models.document_set import DocumentSet
from app.models.document_set_permission import DocumentSetPermission
from app.models.user import User
from app.schemas.user_management import SetPermissionItem, SetPermissionsUpdate, UserAdminCreate, UserAdminResponse, UserAdminUpdate

router = APIRouter(prefix="/users", tags=["users"])


def admin_only(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access is required")
    return user


@router.get("", response_model=list[UserAdminResponse])
def list_users(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    role_rank = case((User.role == "admin", 0), else_=1)
    return db.scalars(
        select(User)
        .where(User.organization_id == admin.organization_id)
        .order_by(role_rank, User.created_at.asc(), User.id.asc())
    ).all()


@router.post("", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserAdminCreate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    username = payload.username.strip()
    item = User(
        organization_id=admin.organization_id,
        username=username,
        job_title=payload.job_title.strip() if payload.job_title and payload.job_title.strip() else None,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A member with this username already exists") from exc
    db.refresh(item)
    return item


@router.patch("/{user_id}", response_model=UserAdminResponse)
def update_user(user_id: uuid.UUID, payload: UserAdminUpdate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    target = db.scalar(select(User).where(
        User.id == user_id, User.organization_id == admin.organization_id,
    ))
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=403, detail="You cannot deactivate your own account")
    target.is_active = payload.is_active
    if not payload.is_active:
        # Deactivating an account must also invalidate its live sessions.
        revoke_user_sessions(db, target.id)
    db.commit()
    db.refresh(target)
    return target


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    target = db.scalar(select(User).where(
        User.id == user_id, User.organization_id == admin.organization_id,
    ).with_for_update())
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts cannot be deleted")
    db.delete(target)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This member owns shared resources and cannot be deleted") from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{user_id}/document-set-permissions", response_model=list[SetPermissionItem])
def get_permissions(user_id: uuid.UUID, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    if db.scalar(select(User).where(User.id == user_id, User.organization_id == admin.organization_id)) is None:
        raise HTTPException(status_code=404, detail="User not found")
    rows = db.execute(select(DocumentSetPermission, DocumentSet.name).join(DocumentSet, DocumentSet.id == DocumentSetPermission.document_set_id).where(DocumentSetPermission.user_id == user_id, DocumentSet.organization_id == admin.organization_id).order_by(DocumentSet.name)).all()
    return [SetPermissionItem(document_set_id=item.document_set_id, document_set_name=name, permission=item.permission) for item, name in rows]


@router.put("/{user_id}/document-set-permissions", response_model=list[SetPermissionItem])
def replace_permissions(user_id: uuid.UUID, payload: SetPermissionsUpdate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    target = db.scalar(select(User).where(User.id == user_id, User.organization_id == admin.organization_id))
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == "admin" and payload.permissions:
        raise HTTPException(status_code=422, detail="Admins already have access to all knowledge sets")
    set_ids = {item.document_set_id for item in payload.permissions}
    existing_ids = set(db.scalars(select(DocumentSet.id).where(DocumentSet.id.in_(set_ids), DocumentSet.organization_id == admin.organization_id)).all()) if set_ids else set()
    if existing_ids != set_ids:
        raise HTTPException(status_code=422, detail="One or more knowledge sets do not exist")
    db.execute(delete(DocumentSetPermission).where(DocumentSetPermission.user_id == user_id))
    db.add_all([DocumentSetPermission(user_id=user_id, document_set_id=item.document_set_id, permission=item.permission, granted_by_id=admin.id) for item in payload.permissions])
    db.commit()
    return get_permissions(user_id, db, admin)
