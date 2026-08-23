"""Add job title to workspace users.

Revision ID: 20260824_30
Revises: 20260820_29
"""

from alembic import op
import sqlalchemy as sa


revision = "20260824_30"
down_revision = "20260820_29"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("job_title", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "job_title")
