"""Add document job retry scheduling and dead-letter state."""
from alembic import op
import sqlalchemy as sa

revision = "20260902_35"
down_revision = "20260902_34"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("processing_jobs", sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("processing_jobs", sa.Column("error_type", sa.String(length=100), nullable=True))
    op.add_column("processing_jobs", sa.Column("dead_lettered_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_processing_jobs_next_attempt_at", "processing_jobs", ["next_attempt_at"])
    op.create_index("ix_processing_jobs_dead_lettered_at", "processing_jobs", ["dead_lettered_at"])


def downgrade():
    op.drop_index("ix_processing_jobs_dead_lettered_at", table_name="processing_jobs")
    op.drop_index("ix_processing_jobs_next_attempt_at", table_name="processing_jobs")
    op.drop_column("processing_jobs", "dead_lettered_at")
    op.drop_column("processing_jobs", "error_type")
    op.drop_column("processing_jobs", "next_attempt_at")
