"""Add document processing error.

Revision ID: 20260803_03
Revises: 20260802_02
Create Date: 2026-08-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260803_03"
down_revision: str | Sequence[str] | None = "20260802_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("processing_error", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "processing_error")
