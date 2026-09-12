"""Add persistent operation notifications.

Revision ID: 20260912_44
Revises: 20260908_43
Create Date: 2026-09-12
"""

from alembic import op
import sqlalchemy as sa


revision = "20260912_44"
down_revision = "20260908_43"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("target_path", sa.String(length=500), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_organization_id", "notifications", ["organization_id"])
    op.create_index("ix_notifications_read_at", "notifications", ["read_at"])
    with op.batch_alter_table("processing_jobs") as batch_op:
        batch_op.add_column(sa.Column("requested_by_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key("fk_processing_jobs_requested_by_id_users", "users", ["requested_by_id"], ["id"], ondelete="SET NULL")
        batch_op.create_index("ix_processing_jobs_requested_by_id", ["requested_by_id"])


def downgrade() -> None:
    with op.batch_alter_table("processing_jobs") as batch_op:
        batch_op.drop_index("ix_processing_jobs_requested_by_id")
        batch_op.drop_constraint("fk_processing_jobs_requested_by_id_users", type_="foreignkey")
        batch_op.drop_column("requested_by_id")
    op.drop_index("ix_notifications_read_at", table_name="notifications")
    op.drop_index("ix_notifications_organization_id", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
