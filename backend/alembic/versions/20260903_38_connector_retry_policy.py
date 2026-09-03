"""Add connector retry policy and dead-letter tracking."""
from alembic import op
import sqlalchemy as sa

revision = "20260903_38"
down_revision = "20260903_37"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("connectors", sa.Column("attempts", sa.Integer(), server_default="0", nullable=False))
    op.add_column("connectors", sa.Column("error_type", sa.String(length=100), nullable=True))
    op.add_column("connectors", sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("connectors", sa.Column("dead_lettered_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_connectors_next_attempt_at", "connectors", ["next_attempt_at"])
    op.create_index("ix_connectors_dead_lettered_at", "connectors", ["dead_lettered_at"])
    op.alter_column("connectors", "attempts", server_default=None)


def downgrade():
    op.drop_index("ix_connectors_dead_lettered_at", table_name="connectors")
    op.drop_index("ix_connectors_next_attempt_at", table_name="connectors")
    op.drop_column("connectors", "dead_lettered_at")
    op.drop_column("connectors", "next_attempt_at")
    op.drop_column("connectors", "error_type")
    op.drop_column("connectors", "attempts")
