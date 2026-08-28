import unittest
from contextlib import ExitStack
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi import HTTPException

from app.api.routes.conversations import send_message
from app.schemas.conversation import ChatMessageCreate


class ConversationAssistantTests(unittest.TestCase):
    def setUp(self):
        self.assistant = SimpleNamespace(id=uuid4(), is_active=True, document_sets=[],
                                         model_id="selected/model", answer_mode="hybrid", instructions="Custom instructions")
        self.user = SimpleNamespace(id=uuid4(), role="admin", organization_id=uuid4())
        self.conversation = SimpleNamespace(id=uuid4(), document_id=None, document_set_id=None,
                                             assistant_id=self.assistant.id, messages=[], title="Test")
        self.db = MagicMock()
        self.db.scalar.return_value = self.assistant
        self.db.scalars.return_value.all.return_value = []
        stack = self.enterContext(ExitStack())
        stack.enter_context(patch("app.api.routes.conversations._owned", return_value=self.conversation))
        stack.enter_context(patch("app.api.routes.conversations.accessible_set_ids", return_value=None))
        self.rewrite = stack.enter_context(patch("app.api.routes.conversations.should_rewrite", return_value=False))
        self.qdrant = stack.enter_context(patch("app.api.routes.conversations.QdrantClient"))
        self.search = stack.enter_context(patch("app.api.routes.conversations.hybrid_search", return_value=[]))
        self.client = stack.enter_context(patch("app.api.routes.conversations.OpenRouterClient"))
        self.client.return_value.answer.return_value = "Generated answer"
        self.client.return_value.rewrite_query.return_value = "Rewritten question"

    def send(self):
        return send_message(self.conversation.id, ChatMessageCreate(content="Test question"), self.db, self.user)

    def test_hybrid_without_documents_uses_selected_model(self):
        result = self.send()
        self.assertEqual(result.content, "Generated answer")
        self.client.assert_called_once_with(model="selected/model")
        self.assertTrue(self.client.return_value.answer.call_args.kwargs["hybrid"])
        self.search.assert_not_called()
        self.qdrant.assert_not_called()

    def test_sources_without_documents_does_not_generate_answer(self):
        self.assistant.answer_mode = "sources"
        self.send()
        self.client.assert_not_called()

    def test_selected_model_is_used_for_rewrite_and_answer_with_sources(self):
        set_id, document_id = uuid4(), uuid4()
        self.assistant.document_sets = [SimpleNamespace(id=set_id)]
        self.db.scalars.return_value.all.return_value = [document_id]
        self.rewrite.return_value = True
        self.search.return_value = [{"score": 0.9, "payload": {"chunk_id": uuid4(), "document_id": document_id, "filename": "test.txt", "chunk_index": 0, "content": "Source text"}}]
        self.assistant.answer_mode = "sources"
        self.send()
        self.assertTrue(all(call.kwargs == {"model": "selected/model"} for call in self.client.call_args_list))
        self.assertEqual(self.search.call_args.kwargs["query"], "Rewritten question")
        self.assertEqual(self.search.call_args.kwargs["document_ids"], [str(document_id)])
        kwargs = self.client.return_value.answer.call_args.kwargs
        self.assertFalse(kwargs["hybrid"])
        self.assertEqual(kwargs["instructions"], "Custom instructions")

    def test_inactive_assistant_cannot_trigger_rewrite(self):
        self.assistant.is_active = False
        self.rewrite.return_value = True
        with self.assertRaises(HTTPException) as raised:
            self.send()
        self.assertEqual(raised.exception.status_code, 409)
        self.client.assert_not_called()

    def test_hybrid_does_not_bypass_member_permissions(self):
        self.user.role = "user"
        with patch("app.api.routes.conversations.accessible_set_ids", return_value=set()):
            with self.assertRaises(HTTPException) as raised:
                self.send()
        self.assertEqual(raised.exception.status_code, 403)
        self.client.assert_not_called()
