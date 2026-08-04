from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=200)
    remember_me: bool = False


class AuthUser(BaseModel):
    id: UUID
    username: str
    role: Literal["admin", "user"]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser
