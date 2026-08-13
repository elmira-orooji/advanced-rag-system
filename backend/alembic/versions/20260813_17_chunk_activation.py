"""add chunk activation

Revision ID: 20260813_17
Revises: 20260813_16
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_17"
down_revision = "20260813_16"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chunks", sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.alter_column("chunks", "is_active", server_default=None)


def downgrade() -> None:
    op.drop_column("chunks", "is_active")
