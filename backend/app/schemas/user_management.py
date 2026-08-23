import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    username: str
    job_title: str | None
    role: Literal["admin", "user"]
    is_active: bool
    created_at: datetime


class UserAdminCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    role: Literal["admin", "user"] = "user"
    job_title: str | None = Field(default=None, max_length=120)
    is_active: bool = True


class SetPermissionItem(BaseModel):
    document_set_id: uuid.UUID
    document_set_name: str
    permission: Literal["view", "edit", "manage"]


class SetPermissionUpdateItem(BaseModel):
    document_set_id: uuid.UUID
    permission: Literal["view", "edit", "manage"]


class SetPermissionsUpdate(BaseModel):
    permissions: list[SetPermissionUpdateItem] = Field(max_length=100)
