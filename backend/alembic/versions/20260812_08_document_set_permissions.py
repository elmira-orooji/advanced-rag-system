"""document set permissions

Revision ID: 20260812_08
Revises: 20260812_07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260812_08"
down_revision: Union[str, None] = "20260812_07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_set_permissions",
        sa.Column("user_id", sa.Uuid(), nullable=False), sa.Column("document_set_id", sa.Uuid(), nullable=False),
        sa.Column("permission", sa.String(20), nullable=False), sa.Column("granted_by_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("permission IN ('view', 'edit', 'manage')", name="ck_document_set_permission_level"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_set_id"], ["document_sets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["granted_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("user_id", "document_set_id"),
    )


def downgrade() -> None:
    op.drop_table("document_set_permissions")
