"""Track the complete chunking configuration used for each document index.

Revision ID: 20260921_45
Revises: 20260912_44
Create Date: 2026-09-21
"""

from alembic import op
import sqlalchemy as sa


revision = "20260921_45"
down_revision = "20260912_44"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("indexed_chunking_config", sa.String(length=160), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "indexed_chunking_config")
