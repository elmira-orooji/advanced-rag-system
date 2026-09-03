import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ConnectorCreate(BaseModel):
    connector_type: Literal["website", "github", "google_drive", "s3", "sharepoint"]
    name: str = Field(min_length=2, max_length=120)
    source_url: HttpUrl
    schedule_enabled: bool = False
    schedule_interval: Literal["hourly", "daily", "weekly"] = "daily"


class ConnectorScheduleUpdate(BaseModel):
    schedule_enabled: bool
    schedule_interval: Literal["hourly", "daily", "weekly"] = "daily"


class WebhookConnectorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class WebhookConnectorCreated(BaseModel):
    connector: "ConnectorResponse"
    endpoint: str
    secret: str


class WebhookEvent(BaseModel):
    action: Literal["upsert", "delete"] = "upsert"
    external_id: str = Field(min_length=1, max_length=1000)
    title: str | None = Field(default=None, max_length=255)
    content: str | None = Field(default=None, max_length=1_000_000)
    source_url: str | None = Field(default=None, max_length=1500)

    def model_post_init(self, __context) -> None:
        if self.action == "upsert" and (not self.title or not self.content or len(self.content.strip()) < 20):
            raise ValueError("title and at least 20 characters of content are required for upsert")


class WebhookEventResponse(BaseModel):
    connector_id: uuid.UUID
    action: str
    result: Literal["created", "updated", "unchanged", "deleted", "not_found"]


class ConnectorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    document_set_id: uuid.UUID
    connector_type: str
    name: str
    source_url: str
    status: str
    last_error: str | None
    error_type: str | None = None
    attempts: int = 0
    last_synced_at: datetime | None
    schedule_enabled: bool
    schedule_interval: str
    next_sync_at: datetime | None
    next_attempt_at: datetime | None = None
    dead_lettered_at: datetime | None = None
    last_sync_summary: dict
    created_at: datetime


class SyncResponse(BaseModel):
    connector_id: uuid.UUID
    status: str
    message: str | None = None
