"""Add idempotency protection for document ingestion."""
from alembic import op
import sqlalchemy as sa

revision = "20260921_46"
down_revision = "20260921_45"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("documents", sa.Column("idempotency_key", sa.String(length=128), nullable=True))
    op.add_column("documents", sa.Column("idempotency_fingerprint", sa.String(length=64), nullable=True))
    op.create_unique_constraint("uq_documents_org_idempotency_key", "documents", ["organization_id", "idempotency_key"])

def downgrade() -> None:
    op.drop_constraint("uq_documents_org_idempotency_key", "documents", type_="unique")
    op.drop_column("documents", "idempotency_fingerprint")
    op.drop_column("documents", "idempotency_key")
