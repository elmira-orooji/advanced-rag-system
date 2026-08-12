import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    username: str
    role: Literal["admin", "user"]
    is_active: bool
    created_at: datetime


class SetPermissionItem(BaseModel):
    document_set_id: uuid.UUID
    document_set_name: str
    permission: Literal["view", "edit", "manage"]


class SetPermissionUpdateItem(BaseModel):
    document_set_id: uuid.UUID
    permission: Literal["view", "edit", "manage"]


class SetPermissionsUpdate(BaseModel):
    permissions: list[SetPermissionUpdateItem] = Field(max_length=100)
