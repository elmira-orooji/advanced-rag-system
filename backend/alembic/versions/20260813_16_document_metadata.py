"""document metadata filters

Revision ID: 20260813_16
Revises: 20260813_15
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260813_16"
down_revision: Union[str, None] = "20260813_15"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("author", sa.String(160)))
    op.add_column("documents", sa.Column("language", sa.String(20)))
    op.add_column("documents", sa.Column("source_type", sa.String(40)))
    op.add_column("documents", sa.Column("document_date", sa.Date()))
    op.add_column("documents", sa.Column("tags", sa.JSON(), server_default="[]", nullable=False))
    for column in ("author", "language", "source_type", "document_date"):
        op.create_index(f"ix_documents_{column}", "documents", [column])


def downgrade() -> None:
    for column in ("document_date", "source_type", "language", "author"):
        op.drop_column("documents", column)
    op.drop_column("documents", "tags")
