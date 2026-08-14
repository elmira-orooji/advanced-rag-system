"""add webhook connector secret hash

Revision ID: 20260814_27
Revises: 20260813_26
"""
from alembic import op
import sqlalchemy as sa

revision = "20260814_27"
down_revision = "20260813_26"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("connectors", sa.Column("webhook_secret_hash", sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column("connectors", "webhook_secret_hash")
