"""Small transaction boundary helpers for application services."""

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


def commit_or_rollback(db: Session) -> None:
    """Commit all pending changes, or leave no partial database write behind."""
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
