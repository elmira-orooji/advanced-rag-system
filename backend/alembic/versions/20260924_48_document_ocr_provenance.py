"""Persist the OCR provider used for each extracted document."""

from alembic import op
import sqlalchemy as sa


revision = "20260924_48"
down_revision = "20260923_47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("ocr_provenance", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "ocr_provenance")
