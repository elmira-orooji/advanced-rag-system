"""answer records and feedback

Revision ID: 20260812_09
Revises: 20260812_08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260812_09"
down_revision: Union[str, None] = "20260812_08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("answer_records",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("assistant_id", sa.Uuid()), sa.Column("document_set_id", sa.Uuid()),
        sa.Column("question", sa.Text(), nullable=False), sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("grounded", sa.Boolean(), nullable=False), sa.Column("citation_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assistant_id"], ["assistants.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["document_set_id"], ["document_sets.id"], ondelete="SET NULL"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_answer_records_user_id", "answer_records", ["user_id"])
    op.create_index("ix_answer_records_assistant_id", "answer_records", ["assistant_id"])
    op.create_index("ix_answer_records_document_set_id", "answer_records", ["document_set_id"])
    op.create_table("answer_feedback",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("answer_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False), sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("reason", sa.String(30)), sa.Column("comment", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("rating IN (-1, 1)", name="ck_answer_feedback_rating"),
        sa.CheckConstraint("reason IS NULL OR reason IN ('incorrect', 'irrelevant_source', 'incomplete', 'citation_issue', 'other')", name="ck_answer_feedback_reason"),
        sa.ForeignKeyConstraint(["answer_id"], ["answer_records.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("answer_id", "user_id", name="uq_answer_feedback_user"))
    op.create_index("ix_answer_feedback_answer_id", "answer_feedback", ["answer_id"])
    op.create_index("ix_answer_feedback_user_id", "answer_feedback", ["user_id"])


def downgrade() -> None:
    op.drop_table("answer_feedback")
    op.drop_table("answer_records")
