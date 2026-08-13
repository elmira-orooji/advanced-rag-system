"""add evaluation dataset

Revision ID: 20260813_20
Revises: 20260813_19
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_20"
down_revision = "20260813_19"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("evaluation_cases", sa.Column("id", sa.Uuid(), nullable=False), sa.Column("document_set_id", sa.Uuid(), nullable=False), sa.Column("created_by_id", sa.Uuid(), nullable=False), sa.Column("question", sa.Text(), nullable=False), sa.Column("expected_answer", sa.Text()), sa.Column("expected_keywords", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.ForeignKeyConstraint(["document_set_id"], ["document_sets.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_evaluation_cases_document_set_id", "evaluation_cases", ["document_set_id"])


def downgrade() -> None:
    op.drop_index("ix_evaluation_cases_document_set_id", table_name="evaluation_cases")
    op.drop_table("evaluation_cases")
