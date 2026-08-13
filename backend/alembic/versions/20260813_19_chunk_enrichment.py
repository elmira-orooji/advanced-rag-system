"""add chunk keywords and suggested questions

Revision ID: 20260813_19
Revises: 20260813_18
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_19"
down_revision = "20260813_18"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chunks", sa.Column("keywords", sa.JSON(), server_default="[]", nullable=False))
    op.add_column("chunks", sa.Column("suggested_questions", sa.JSON(), server_default="[]", nullable=False))
    op.alter_column("chunks", "keywords", server_default=None)
    op.alter_column("chunks", "suggested_questions", server_default=None)


def downgrade() -> None:
    op.drop_column("chunks", "suggested_questions")
    op.drop_column("chunks", "keywords")
