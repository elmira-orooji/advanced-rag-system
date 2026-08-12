import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.schemas.metadata import MetadataFilters


def filter_document_ids(db: Session, allowed_ids: set[uuid.UUID], filters: MetadataFilters | None) -> set[uuid.UUID]:
    if not filters or not allowed_ids:
        return allowed_ids
    statement = select(Document.id).where(Document.id.in_(allowed_ids))
    if filters.authors:
        statement = statement.where(Document.author.in_([value.strip() for value in filters.authors]))
    if filters.languages:
        statement = statement.where(Document.language.in_([value.strip().lower() for value in filters.languages]))
    if filters.source_types:
        statement = statement.where(Document.source_type.in_([value.strip().lower() for value in filters.source_types]))
    if filters.tags:
        for tag in filters.tags:
            statement = statement.where(Document.tags.contains([tag.strip().lower()]))
    if filters.date_from:
        statement = statement.where(Document.document_date >= filters.date_from)
    if filters.date_to:
        statement = statement.where(Document.document_date <= filters.date_to)
    return set(db.scalars(statement).all())
