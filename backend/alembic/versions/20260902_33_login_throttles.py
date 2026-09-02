"""Add shared login throttling state."""
from alembic import op
import sqlalchemy as sa

revision = "20260902_33"
down_revision = "20260830_32"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "login_throttles",
        sa.Column("key_hash", sa.String(length=64), primary_key=True),
        sa.Column("failures", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_login_throttles_locked_until", "login_throttles", ["locked_until"])
    op.create_index("ix_login_throttles_updated_at", "login_throttles", ["updated_at"])


def downgrade():
    op.drop_index("ix_login_throttles_updated_at", table_name="login_throttles")
    op.drop_index("ix_login_throttles_locked_until", table_name="login_throttles")
    op.drop_table("login_throttles")
