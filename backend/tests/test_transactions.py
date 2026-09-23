from unittest.mock import MagicMock

from sqlalchemy.exc import SQLAlchemyError

from app.services.transactions import commit_or_rollback


def test_commit_failure_rolls_back_the_whole_unit_of_work():
    db = MagicMock()
    db.commit.side_effect = SQLAlchemyError("database unavailable")

    try:
        commit_or_rollback(db)
    except SQLAlchemyError:
        pass
    else:
        raise AssertionError("Expected commit failure")

    db.rollback.assert_called_once_with()
