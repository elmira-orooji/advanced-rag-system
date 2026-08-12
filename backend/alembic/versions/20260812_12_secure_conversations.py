"""secure conversation ownership and scopes

Revision ID: 20260812_12
Revises: 20260812_11
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
revision: str = "20260812_12"
down_revision: Union[str, None] = "20260812_11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    op.add_column("conversations", sa.Column("user_id", sa.Uuid(), nullable=True))
    op.add_column("conversations", sa.Column("document_set_id", sa.Uuid(), nullable=True))
    op.add_column("conversations", sa.Column("assistant_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_conversations_user", "conversations", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_conversations_document_set", "conversations", "document_sets", ["document_set_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_conversations_assistant", "conversations", "assistants", ["assistant_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])
    op.create_index("ix_conversations_document_set_id", "conversations", ["document_set_id"])
    op.create_index("ix_conversations_assistant_id", "conversations", ["assistant_id"])
def downgrade() -> None:
    op.drop_column("conversations", "assistant_id"); op.drop_column("conversations", "document_set_id"); op.drop_column("conversations", "user_id")
