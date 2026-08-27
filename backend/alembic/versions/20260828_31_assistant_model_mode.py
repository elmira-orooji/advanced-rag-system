"""Add per-assistant model and answering mode."""
from alembic import op
import sqlalchemy as sa

revision = "20260828_31"
down_revision = "20260824_30"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("assistants", sa.Column("model_id", sa.String(160), nullable=True))
    op.add_column("assistants", sa.Column("answer_mode", sa.String(20), nullable=False, server_default="sources"))


def downgrade():
    op.drop_column("assistants", "answer_mode")
    op.drop_column("assistants", "model_id")
