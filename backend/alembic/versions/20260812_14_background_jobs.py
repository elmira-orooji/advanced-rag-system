"""persistent document processing jobs

Revision ID: 20260812_14
Revises: 20260812_13
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260812_14"
down_revision: Union[str, None] = "20260812_13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("processing_progress", sa.Integer(), server_default="0", nullable=False))
    op.add_column("documents", sa.Column("processing_stage", sa.String(40), server_default="queued", nullable=False))
    op.execute("UPDATE documents SET processing_progress = CASE WHEN status = 'indexed' THEN 100 ELSE 0 END, processing_stage = status")
    op.create_table(
        "processing_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(20), server_default="queued", nullable=False),
        sa.Column("progress", sa.Integer(), server_default="0", nullable=False),
        sa.Column("stage", sa.String(40), server_default="queued", nullable=False),
        sa.Column("error", sa.String(500)),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("document_id"),
    )
    op.create_index("ix_processing_jobs_organization_id", "processing_jobs", ["organization_id"])
    op.create_index("ix_processing_jobs_document_id", "processing_jobs", ["document_id"], unique=True)
    op.create_index("ix_processing_jobs_status", "processing_jobs", ["status"])


def downgrade() -> None:
    op.drop_table("processing_jobs")
    op.drop_column("documents", "processing_stage")
    op.drop_column("documents", "processing_progress")
