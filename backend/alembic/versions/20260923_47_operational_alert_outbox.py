"""Persist operational emails for retryable delivery."""

from alembic import op
import sqlalchemy as sa


revision = "20260923_47"
down_revision = "20260921_46"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "operational_alerts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("deduplication_key", sa.String(length=120), nullable=False),
        sa.Column("subject", sa.String(length=240), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True)),
        sa.Column("locked_at", sa.DateTime(timezone=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("last_error", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_operational_alerts_deduplication_key", "operational_alerts", ["deduplication_key"])
    op.create_index("ix_operational_alerts_status", "operational_alerts", ["status"])
    op.create_index("ix_operational_alerts_next_attempt_at", "operational_alerts", ["next_attempt_at"])
    op.create_index("ix_operational_alerts_locked_at", "operational_alerts", ["locked_at"])


def downgrade() -> None:
    op.drop_table("operational_alerts")
