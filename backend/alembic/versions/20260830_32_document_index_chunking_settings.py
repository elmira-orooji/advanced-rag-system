"""Track the chunking settings used for each document index."""
from alembic import op
import sqlalchemy as sa

revision = "20260830_32"
down_revision = "20260828_31"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("documents", sa.Column("indexed_child_chunk_size", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("indexed_chunk_overlap", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("indexed_parent_chunk_size", sa.Integer(), nullable=True))


def downgrade():
    op.drop_column("documents", "indexed_parent_chunk_size")
    op.drop_column("documents", "indexed_chunk_overlap")
    op.drop_column("documents", "indexed_child_chunk_size")
