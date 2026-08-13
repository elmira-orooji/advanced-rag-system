"""add connector change summary

Revision ID: 20260813_26
Revises: 20260813_25
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_26"
down_revision = "20260813_25"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("connectors", sa.Column("last_sync_summary", sa.JSON(), server_default="{}", nullable=False))
    op.alter_column("connectors", "last_sync_summary", server_default=None)


def downgrade() -> None:
    op.drop_column("connectors", "last_sync_summary")
