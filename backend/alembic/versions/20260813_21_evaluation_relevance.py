"""add evaluation relevance labels

Revision ID: 20260813_21
Revises: 20260813_20
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_21"
down_revision = "20260813_20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("evaluation_cases", sa.Column("relevant_chunk_ids", sa.JSON(), server_default="[]", nullable=False))
    op.alter_column("evaluation_cases", "relevant_chunk_ids", server_default=None)


def downgrade() -> None:
    op.drop_column("evaluation_cases", "relevant_chunk_ids")
