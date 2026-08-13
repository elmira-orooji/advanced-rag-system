import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ConnectorCreate(BaseModel):
    connector_type: Literal["website", "github"]
    name: str = Field(min_length=2, max_length=120)
    source_url: HttpUrl
    schedule_enabled: bool = False
    schedule_interval: Literal["hourly", "daily", "weekly"] = "daily"


class ConnectorScheduleUpdate(BaseModel):
    schedule_enabled: bool
    schedule_interval: Literal["hourly", "daily", "weekly"] = "daily"


class ConnectorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    document_set_id: uuid.UUID
    connector_type: str
    name: str
    source_url: str
    status: str
    last_error: str | None
    last_synced_at: datetime | None
    schedule_enabled: bool
    schedule_interval: str
    next_sync_at: datetime | None
    last_sync_summary: dict
    created_at: datetime


class SyncResponse(BaseModel):
    connector_id: uuid.UUID
    discovered: int
    created: int
    updated: int
    unchanged: int
    deleted: int
