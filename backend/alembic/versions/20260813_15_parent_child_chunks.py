"""parent child chunks

Revision ID: 20260813_15
Revises: 20260812_14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260813_15"
down_revision: Union[str, None] = "20260812_14"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chunks", sa.Column("parent_index", sa.Integer(), server_default="0", nullable=False))
    op.add_column("chunks", sa.Column("parent_content", sa.Text(), nullable=True))
    op.execute("UPDATE chunks SET parent_content = content")
    op.alter_column("chunks", "parent_content", nullable=False)


def downgrade() -> None:
    op.drop_column("chunks", "parent_content")
    op.drop_column("chunks", "parent_index")
