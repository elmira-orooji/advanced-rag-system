"""Create indexing_outbox for durable Qdrant/file reconciliation."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20260905_39"
down_revision = "20260903_38"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "indexing_outbox",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("job_id", UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_indexing_outbox_pending", "indexing_outbox", ["status", "created_at"])


def downgrade():
    op.drop_index("ix_indexing_outbox_pending", table_name="indexing_outbox")
    op.drop_table("indexing_outbox")
