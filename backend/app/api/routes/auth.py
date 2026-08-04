from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, REMEMBER_TOKEN_EXPIRE_DAYS
from app.core.security import create_access_token, decode_access_token, verify_password
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import AuthUser, LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized
    payload = decode_access_token(credentials.credentials)
    if payload is None or not payload.get("sub"):
        raise unauthorized
    try:
        user_id = UUID(str(payload["sub"]))
    except ValueError as exc:
        raise unauthorized from exc
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == payload.username.strip()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    expires_in = (
        REMEMBER_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        if payload.remember_me
        else ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    return LoginResponse(
        access_token=create_access_token(str(user.id), user.role, expires_in),
        expires_in=expires_in,
        user=AuthUser(id=user.id, username=user.username, role=user.role),
    )


@router.get("/me", response_model=AuthUser)
def me(user: User = Depends(get_current_user)):
    return AuthUser(id=user.id, username=user.username, role=user.role)
