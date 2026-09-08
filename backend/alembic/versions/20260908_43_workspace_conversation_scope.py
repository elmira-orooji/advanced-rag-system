"""Add explicit workspace-wide conversation scope.

Revision ID: 20260908_43
Revises: 20260907_42
Create Date: 2026-09-08
"""

from alembic import op
import sqlalchemy as sa


revision = "20260908_43"
down_revision = "20260907_42"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("conversations") as batch_op:
        batch_op.add_column(sa.Column("workspace_scope", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("conversations") as batch_op:
        batch_op.drop_column("workspace_scope")
