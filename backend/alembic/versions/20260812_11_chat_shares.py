"""shareable chat snapshots

Revision ID: 20260812_11
Revises: 20260812_10
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
revision: str = "20260812_11"
down_revision: Union[str, None] = "20260812_10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    op.create_table("chat_shares", sa.Column("id", sa.Uuid(), nullable=False), sa.Column("owner_id", sa.Uuid(), nullable=False), sa.Column("title", sa.String(200), nullable=False), sa.Column("visibility", sa.String(20), nullable=False), sa.Column("token_hash", sa.String(64), nullable=False), sa.Column("messages", sa.JSON(), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.Column("revoked_at", sa.DateTime(timezone=True)), sa.CheckConstraint("visibility IN ('team', 'link')", name="ck_chat_share_visibility"), sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_chat_shares_owner_id", "chat_shares", ["owner_id"]); op.create_index("ix_chat_shares_token_hash", "chat_shares", ["token_hash"], unique=True)
def downgrade() -> None: op.drop_table("chat_shares")
