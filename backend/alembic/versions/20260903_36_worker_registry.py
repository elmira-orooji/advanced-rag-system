"""Add worker_registry table for persistent worker/scheduler liveness tracking."""
from alembic import op
import sqlalchemy as sa


revision = "20260903_36"
down_revision = "20260902_35"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "worker_registry",
        sa.Column("id", sa.String(length=150), primary_key=True),
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column(
            "last_heartbeat",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("metadata_json", sa.String(length=1000), nullable=True),
    )
    op.create_index("ix_worker_registry_status", "worker_registry", ["status"])
    op.create_index("ix_worker_registry_last_heartbeat", "worker_registry", ["last_heartbeat"])


def downgrade():
    op.drop_index("ix_worker_registry_last_heartbeat", table_name="worker_registry")
    op.drop_index("ix_worker_registry_status", table_name="worker_registry")
    op.drop_table("worker_registry")
