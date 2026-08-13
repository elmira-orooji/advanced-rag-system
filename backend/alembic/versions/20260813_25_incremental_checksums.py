"""add incremental indexing checksums

Revision ID: 20260813_25
Revises: 20260813_24
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_25"
down_revision = "20260813_24"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("content_checksum", sa.String(64)))
    op.create_index("ix_documents_content_checksum", "documents", ["content_checksum"])
    op.add_column("chunks", sa.Column("content_checksum", sa.String(64)))
    op.create_index("ix_chunks_content_checksum", "chunks", ["content_checksum"])


def downgrade() -> None:
    op.drop_index("ix_chunks_content_checksum", table_name="chunks"); op.drop_column("chunks", "content_checksum")
    op.drop_index("ix_documents_content_checksum", table_name="documents"); op.drop_column("documents", "content_checksum")
