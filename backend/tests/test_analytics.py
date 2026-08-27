import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.api.routes.analytics import overview


class AnalyticsTimezoneTests(unittest.TestCase):
    def test_tehran_midnight_answer_is_bucketed_by_utc_date(self):
        tehran = timezone(timedelta(hours=3, minutes=30))
        answer = SimpleNamespace(
            id=uuid4(), user_id=uuid4(), assistant_id=None,
            document_set_id=None, grounded=True, citation_count=1,
            created_at=datetime(2026, 8, 28, 0, 32, tzinfo=tehran),
        )
        db = MagicMock()
        db.scalars.side_effect = [
            MagicMock(all=lambda: [answer]),
            MagicMock(all=lambda: []),
            MagicMock(all=lambda: []),
            MagicMock(all=lambda: []),
        ]
        db.execute.return_value.all.return_value = []
        db.query.return_value.filter.return_value.count.return_value = 0
        with patch("app.api.routes.analytics.datetime", wraps=datetime) as clock:
            clock.now.return_value = datetime(2026, 8, 27, 21, 45, tzinfo=timezone.utc)
            result = overview(days=7, db=db, admin=SimpleNamespace(organization_id=uuid4()))
        self.assertEqual(result.total_queries, 1)
        self.assertEqual(result.daily[-1].date.isoformat(), "2026-08-27")
        self.assertEqual(result.daily[-1].queries, 1)
        self.assertEqual(sum(day.queries for day in result.daily), result.total_queries)


if __name__ == "__main__":
    unittest.main()
