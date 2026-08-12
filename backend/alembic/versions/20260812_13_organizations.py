"""add organization tenancy

Revision ID: 20260812_13
Revises: 20260812_12
"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa

revision: str = "20260812_13"
down_revision: Union[str, None] = "20260812_12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    organizations = op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("slug", name="uq_organizations_slug"),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)
    default_id = uuid.uuid4()
    op.bulk_insert(organizations, [{"id": default_id, "name": "Default workspace", "slug": "default"}])

    for table in ("users", "documents", "document_sets", "assistants"):
        op.add_column(table, sa.Column("organization_id", sa.Uuid(), nullable=True))
        op.execute(sa.text(f"UPDATE {table} SET organization_id = :org").bindparams(org=default_id))
        op.alter_column(table, "organization_id", nullable=False)
        op.create_foreign_key(f"fk_{table}_organization", table, "organizations", ["organization_id"], ["id"], ondelete="RESTRICT")
        op.create_index(f"ix_{table}_organization_id", table, ["organization_id"])

    op.drop_index("ix_users_username", table_name="users")
    op.drop_constraint("users_username_key", "users", type_="unique")
    op.create_index("ix_users_username", "users", ["username"])
    op.create_unique_constraint("uq_users_org_username", "users", ["organization_id", "username"])
    op.drop_index("ix_document_sets_name", table_name="document_sets")
    op.drop_constraint("document_sets_name_key", "document_sets", type_="unique")
    op.create_index("ix_document_sets_name", "document_sets", ["name"])
    op.create_unique_constraint("uq_document_sets_org_name", "document_sets", ["organization_id", "name"])
    op.drop_index("ix_assistants_name", table_name="assistants")
    op.drop_constraint("assistants_name_key", "assistants", type_="unique")
    op.create_index("ix_assistants_name", "assistants", ["name"])
    op.create_unique_constraint("uq_assistants_org_name", "assistants", ["organization_id", "name"])


def downgrade() -> None:
    op.drop_constraint("uq_assistants_org_name", "assistants", type_="unique")
    op.drop_constraint("uq_document_sets_org_name", "document_sets", type_="unique")
    op.drop_constraint("uq_users_org_username", "users", type_="unique")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_document_sets_name", table_name="document_sets")
    op.drop_index("ix_assistants_name", table_name="assistants")
    op.create_unique_constraint("users_username_key", "users", ["username"])
    op.create_unique_constraint("document_sets_name_key", "document_sets", ["name"])
    op.create_unique_constraint("assistants_name_key", "assistants", ["name"])
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_document_sets_name", "document_sets", ["name"], unique=True)
    op.create_index("ix_assistants_name", "assistants", ["name"], unique=True)
    for table in ("assistants", "document_sets", "documents", "users"):
        op.drop_column(table, "organization_id")
    op.drop_table("organizations")
