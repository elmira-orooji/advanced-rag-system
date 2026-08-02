"""Add document storage paths.

Revision ID: 20260802_02
Revises: 20260802_01
Create Date: 2026-08-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260802_02"
down_revision: str | Sequence[str] | None = "20260802_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("storage_path", sa.String(length=500), nullable=True))
    op.add_column(
        "documents", sa.Column("extracted_text_path", sa.String(length=500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("documents", "extracted_text_path")
    op.drop_column("documents", "storage_path")
