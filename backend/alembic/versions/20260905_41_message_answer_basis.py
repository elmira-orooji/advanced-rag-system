"""add message answer basis

Revision ID: 20260905_41
Revises: 20260905_40
Create Date: 2026-09-05
"""

from alembic import op
import sqlalchemy as sa


revision = "20260905_41"
down_revision = "20260905_40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("answer_basis", sa.String(length=20), nullable=True))
    op.execute("UPDATE messages SET answer_basis = 'sources' WHERE role = 'assistant'")


def downgrade() -> None:
    op.drop_column("messages", "answer_basis")
