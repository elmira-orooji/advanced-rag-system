import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SyncLease(Base):
    """Lightweight lease row used instead of a session advisory lock.

    Compatible with PgBouncer transaction pooling because ownership is
    determined by the ``owner_id`` column rather than the database session.
    """

    __tablename__ = "sync_leases"

    connector_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("connectors.id", ondelete="CASCADE"), primary_key=True
    )
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
