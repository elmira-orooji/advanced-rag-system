"""link negative feedback to evaluation cases

Revision ID: 20260813_23
Revises: 20260813_22
"""
from alembic import op
import sqlalchemy as sa

revision = "20260813_23"
down_revision = "20260813_22"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("answer_feedback", sa.Column("evaluation_case_id", sa.Uuid()))
    op.create_foreign_key("fk_answer_feedback_evaluation_case", "answer_feedback", "evaluation_cases", ["evaluation_case_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_answer_feedback_evaluation_case_id", "answer_feedback", ["evaluation_case_id"])


def downgrade() -> None:
    op.drop_index("ix_answer_feedback_evaluation_case_id", table_name="answer_feedback")
    op.drop_constraint("fk_answer_feedback_evaluation_case", "answer_feedback", type_="foreignkey")
    op.drop_column("answer_feedback", "evaluation_case_id")
