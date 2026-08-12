"""website and github connectors

Revision ID: 20260812_10
Revises: 20260812_09
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
revision: str = "20260812_10"
down_revision: Union[str, None] = "20260812_09"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("connectors", sa.Column("id", sa.Uuid(), nullable=False), sa.Column("document_set_id", sa.Uuid(), nullable=False), sa.Column("created_by_id", sa.Uuid(), nullable=False), sa.Column("connector_type", sa.String(20), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("source_url", sa.String(1000), nullable=False), sa.Column("status", sa.String(30), nullable=False), sa.Column("last_error", sa.String(500)), sa.Column("last_synced_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.ForeignKeyConstraint(["document_set_id"], ["document_sets.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_connectors_document_set_id", "connectors", ["document_set_id"])
    op.create_table("connector_items", sa.Column("id", sa.Uuid(), nullable=False), sa.Column("connector_id", sa.Uuid(), nullable=False), sa.Column("document_id", sa.Uuid(), nullable=False), sa.Column("external_id", sa.String(1000), nullable=False), sa.Column("content_hash", sa.String(64), nullable=False), sa.Column("source_url", sa.String(1500), nullable=False), sa.Column("title", sa.String(255), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.ForeignKeyConstraint(["connector_id"], ["connectors.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("connector_id", "external_id", name="uq_connector_external_item"), sa.UniqueConstraint("document_id"))
    op.create_index("ix_connector_items_connector_id", "connector_items", ["connector_id"])


def downgrade() -> None:
    op.drop_table("connector_items"); op.drop_table("connectors")
