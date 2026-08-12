"""create custom assistants

Revision ID: 20260812_07
Revises: 20260812_06
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260812_07"
down_revision: Union[str, None] = "20260812_06"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assistants",
        sa.Column("id", sa.Uuid(), nullable=False), sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(300)), sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("name"),
    )
    op.create_index("ix_assistants_name", "assistants", ["name"], unique=True)
    op.create_table(
        "assistant_document_sets",
        sa.Column("assistant_id", sa.Uuid(), nullable=False), sa.Column("document_set_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["assistant_id"], ["assistants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_set_id"], ["document_sets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("assistant_id", "document_set_id"),
    )


def downgrade() -> None:
    op.drop_table("assistant_document_sets")
    op.drop_index("ix_assistants_name", table_name="assistants")
    op.drop_table("assistants")
