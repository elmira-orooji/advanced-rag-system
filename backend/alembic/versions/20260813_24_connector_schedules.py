"""add connector schedules

Revision ID: 20260813_24
Revises: 20260813_23
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_24"
down_revision = "20260813_23"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("connectors", sa.Column("schedule_enabled", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("connectors", sa.Column("schedule_interval", sa.String(20), server_default="daily", nullable=False))
    op.add_column("connectors", sa.Column("next_sync_at", sa.DateTime(timezone=True)))
    op.create_index("ix_connectors_next_sync_at", "connectors", ["next_sync_at"])
    op.alter_column("connectors", "schedule_enabled", server_default=None); op.alter_column("connectors", "schedule_interval", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_connectors_next_sync_at", table_name="connectors")
    op.drop_column("connectors", "next_sync_at"); op.drop_column("connectors", "schedule_interval"); op.drop_column("connectors", "schedule_enabled")
