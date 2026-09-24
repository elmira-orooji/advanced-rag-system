import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.chunk import Chunk
    from app.models.document_set import DocumentSet


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("organization_id", "idempotency_key", name="uq_documents_org_idempotency_key"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="RESTRICT"), index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(100))
    storage_path: Mapped[str | None] = mapped_column(String(500))
    extracted_text_path: Mapped[str | None] = mapped_column(String(500))
    content_checksum: Mapped[str | None] = mapped_column(String(64), index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128))
    idempotency_fingerprint: Mapped[str | None] = mapped_column(String(64))
    indexed_child_chunk_size: Mapped[int | None] = mapped_column(Integer)
    indexed_chunk_overlap: Mapped[int | None] = mapped_column(Integer)
    indexed_parent_chunk_size: Mapped[int | None] = mapped_column(Integer)
    indexed_chunking_config: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    processing_error: Mapped[str | None] = mapped_column(String(500))
    processing_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processing_stage: Mapped[str] = mapped_column(String(40), default="queued", nullable=False)
    ocr_provenance: Mapped[dict | None] = mapped_column(JSON)
    author: Mapped[str | None] = mapped_column(String(160), index=True)
    language: Mapped[str | None] = mapped_column(String(20), index=True)
    source_type: Mapped[str | None] = mapped_column(String(40), index=True)
    document_date: Mapped[date | None] = mapped_column(Date, index=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    document_sets: Mapped[list["DocumentSet"]] = relationship(
        secondary="document_set_documents", back_populates="documents"
    )
