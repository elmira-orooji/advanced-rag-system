import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class WorkerRegistry(Base):
    """Persistent registry for tracking worker and scheduler liveness."""

    __tablename__ = "worker_registry"

    id: Mapped[str] = mapped_column(String(150), primary_key=True)
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # "document_worker" | "connector_scheduler"
    last_heartbeat: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(String(1000))
