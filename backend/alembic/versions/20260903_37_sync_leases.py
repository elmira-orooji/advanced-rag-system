"""add sync_leases table for PgBouncer-compatible connector locking

Revision ID: 20260903_37
Revises: 20260903_36
Create Date: 2026-09-03

"""
from alembic import op
import sqlalchemy as sa

revision = "20260903_37"
down_revision = "20260903_36"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sync_leases",
        sa.Column("connector_id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("connector_id"),
    )


def downgrade() -> None:
    op.drop_table("sync_leases")
