import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.api.routes.assistants import list_assistants


class AssistantListingTests(unittest.TestCase):
    def test_admin_can_list_assistant_without_knowledge_sets(self):
        item = SimpleNamespace(
            id=uuid4(), name="Support", description=None, instructions="Help with support.",
            is_active=True, created_by_id=uuid4(), document_sets=[],
            created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
        )
        db = MagicMock()
        db.scalars.return_value.all.return_value = [item]
        with patch("app.api.routes.assistants.accessible_set_ids", return_value=set()):
            result = list_assistants(db=db, user=SimpleNamespace(role="admin", organization_id=uuid4()))
        self.assertEqual([assistant.id for assistant in result], [item.id])

    def test_member_cannot_list_assistant_without_accessible_sets(self):
        item = SimpleNamespace(document_sets=[])
        db = MagicMock()
        db.scalars.return_value.all.return_value = [item]
        with patch("app.api.routes.assistants.accessible_set_ids", return_value=set()):
            result = list_assistants(db=db, user=SimpleNamespace(role="user", organization_id=uuid4()))
        self.assertEqual(result, [])
