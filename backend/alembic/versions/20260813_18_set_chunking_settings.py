"""add knowledge set chunking settings

Revision ID: 20260813_18
Revises: 20260813_17
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_18"
down_revision = "20260813_17"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("document_sets", sa.Column("child_chunk_size", sa.Integer(), server_default="800", nullable=False))
    op.add_column("document_sets", sa.Column("chunk_overlap", sa.Integer(), server_default="120", nullable=False))
    op.add_column("document_sets", sa.Column("parent_chunk_size", sa.Integer(), server_default="2400", nullable=False))
    for name in ("child_chunk_size", "chunk_overlap", "parent_chunk_size"):
        op.alter_column("document_sets", name, server_default=None)


def downgrade() -> None:
    op.drop_column("document_sets", "parent_chunk_size")
    op.drop_column("document_sets", "chunk_overlap")
    op.drop_column("document_sets", "child_chunk_size")
