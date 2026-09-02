"""Add durable document job queue claims and parameters."""
from alembic import op
import sqlalchemy as sa

revision = "20260902_34"
down_revision = "20260902_33"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("processing_jobs", sa.Column("chunk_size", sa.Integer(), nullable=True))
    op.add_column("processing_jobs", sa.Column("chunk_overlap", sa.Integer(), nullable=True))
    op.add_column("processing_jobs", sa.Column("parent_chunk_size", sa.Integer(), nullable=True))
    op.add_column("processing_jobs", sa.Column("worker_id", sa.String(length=100), nullable=True))
    op.add_column("processing_jobs", sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_processing_jobs_worker_id", "processing_jobs", ["worker_id"])
    op.create_index("ix_processing_jobs_locked_at", "processing_jobs", ["locked_at"])


def downgrade():
    op.drop_index("ix_processing_jobs_locked_at", table_name="processing_jobs")
    op.drop_index("ix_processing_jobs_worker_id", table_name="processing_jobs")
    op.drop_column("processing_jobs", "locked_at")
    op.drop_column("processing_jobs", "worker_id")
    op.drop_column("processing_jobs", "parent_chunk_size")
    op.drop_column("processing_jobs", "chunk_overlap")
    op.drop_column("processing_jobs", "chunk_size")
