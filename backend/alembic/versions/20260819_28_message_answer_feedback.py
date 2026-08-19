"""Link persisted assistant messages to answer records.

Revision ID: 20260819_28
Revises: 20260814_27
"""

from alembic import op
import sqlalchemy as sa


revision = "20260819_28"
down_revision = "20260814_27"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("answer_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_messages_answer_id"), "messages", ["answer_id"], unique=False)
    op.create_foreign_key(
        "fk_messages_answer_id_answer_records",
        "messages",
        "answer_records",
        ["answer_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_messages_answer_id_answer_records", "messages", type_="foreignkey")
    op.drop_index(op.f("ix_messages_answer_id"), table_name="messages")
    op.drop_column("messages", "answer_id")
