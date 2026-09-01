from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, verify_password
from app.core.config import (
    AUTH_COOKIE_NAME,
    AUTH_COOKIE_SECURE,
    AUTH_REMEMBER_SECONDS,
    AUTH_SESSION_SECONDS,
)
from app.db.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.schemas.auth import AuthUser, LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if token is None and credentials is not None and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    if token is None:
        raise unauthorized
    payload = decode_access_token(token)
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
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    organization = db.scalar(select(Organization).where(Organization.slug == payload.organization.strip().lower()))
    user = db.scalar(select(User).where(User.username == payload.username.strip(), User.organization_id == organization.id)) if organization else None
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    expires_in = AUTH_REMEMBER_SECONDS if payload.remember_me else AUTH_SESSION_SECONDS
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=create_access_token(str(user.id), user.role, expires_in),
        max_age=expires_in if payload.remember_me else None,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/api/v1",
    )
    response.headers["Cache-Control"] = "no-store"
    return LoginResponse(
        expires_in=expires_in,
        user=AuthUser(id=user.id, username=user.username, role=user.role, organization_id=organization.id, organization_name=organization.name, organization_slug=organization.slug),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/api/v1",
    )
    response.headers["Cache-Control"] = "no-store"


@router.get("/me", response_model=AuthUser)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    organization = db.get(Organization, user.organization_id)
    return AuthUser(id=user.id, username=user.username, role=user.role, organization_id=user.organization_id, organization_name=organization.name, organization_slug=organization.slug)
