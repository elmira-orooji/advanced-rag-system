"""add llm usage records

Revision ID: 20260813_22
Revises: 20260813_21
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_22"
down_revision = "20260813_21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("llm_usage", sa.Column("id", sa.Uuid(), nullable=False), sa.Column("user_id", sa.Uuid(), nullable=False), sa.Column("document_set_id", sa.Uuid()), sa.Column("operation", sa.String(40), nullable=False), sa.Column("model", sa.String(160), nullable=False), sa.Column("latency_ms", sa.Float(), nullable=False), sa.Column("prompt_tokens", sa.Integer(), nullable=False), sa.Column("completion_tokens", sa.Integer(), nullable=False), sa.Column("total_tokens", sa.Integer(), nullable=False), sa.Column("estimated_cost_usd", sa.Float(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.ForeignKeyConstraint(["document_set_id"], ["document_sets.id"], ondelete="SET NULL"), sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_llm_usage_user_id", "llm_usage", ["user_id"])
    op.create_index("ix_llm_usage_document_set_id", "llm_usage", ["document_set_id"])


def downgrade() -> None:
    op.drop_table("llm_usage")
