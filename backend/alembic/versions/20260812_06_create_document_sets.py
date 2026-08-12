"""create document sets

Revision ID: 20260812_06
Revises: 20260805_05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260812_06"
down_revision: Union[str, None] = "20260805_05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_sets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_document_sets_name", "document_sets", ["name"], unique=True)
    op.create_index("ix_document_sets_created_by_id", "document_sets", ["created_by_id"])
    op.create_table(
        "document_set_documents",
        sa.Column("document_set_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_set_id"], ["document_sets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("document_set_id", "document_id"),
    )


def downgrade() -> None:
    op.drop_table("document_set_documents")
    op.drop_index("ix_document_sets_created_by_id", table_name="document_sets")
    op.drop_index("ix_document_sets_name", table_name="document_sets")
    op.drop_table("document_sets")
