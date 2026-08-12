import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, SmallInteger, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AnswerRecord(Base):
    __tablename__ = "answer_records"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    assistant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assistants.id", ondelete="SET NULL"), index=True)
    document_set_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("document_sets.id", ondelete="SET NULL"), index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    grounded: Mapped[bool] = mapped_column(Boolean, nullable=False)
    citation_count: Mapped[int] = mapped_column(default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AnswerFeedback(Base):
    __tablename__ = "answer_feedback"
    __table_args__ = (
        CheckConstraint("rating IN (-1, 1)", name="ck_answer_feedback_rating"),
        CheckConstraint("reason IS NULL OR reason IN ('incorrect', 'irrelevant_source', 'incomplete', 'citation_issue', 'other')", name="ck_answer_feedback_reason"),
        UniqueConstraint("answer_id", "user_id", name="uq_answer_feedback_user"),
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    answer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("answer_records.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(30))
    comment: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
