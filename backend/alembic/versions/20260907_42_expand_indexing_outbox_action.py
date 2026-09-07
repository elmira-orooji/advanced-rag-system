"""Expand indexing outbox action names.

Revision ID: 20260907_42
Revises: 20260905_41
Create Date: 2026-09-07
"""

from alembic import op
import sqlalchemy as sa


revision = "20260907_42"
down_revision = "20260905_41"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("indexing_outbox") as batch_op:
        batch_op.alter_column(
            "action",
            existing_type=sa.String(length=20),
            type_=sa.String(length=64),
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("indexing_outbox") as batch_op:
        batch_op.alter_column(
            "action",
            existing_type=sa.String(length=64),
            type_=sa.String(length=20),
            existing_nullable=False,
        )
