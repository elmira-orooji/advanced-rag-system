import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.services import retrieval
from app.services.retrieval import _expand_parents, hybrid_search


class RetrievalContextTests(unittest.TestCase):
    def setUp(self):
        self.document_id = uuid4()
        retrieval._lexical_cache.clear()

    @staticmethod
    def result(rows):
        result = MagicMock()
        result.all.return_value = rows
        return result

    def chunk(self, index, content, active=True, document_id=None):
        return SimpleNamespace(id=uuid4(), document_id=document_id or self.document_id,
                               chunk_index=index, parent_index=0, content=content,
                               parent_content="old text and disabled secret", is_active=active)

    def point(self, chunk):
        return {"id": str(chunk.id), "score": 0.9, "payload": {
            "chunk_id": str(chunk.id), "document_id": str(chunk.document_id),
            "chunk_index": chunk.chunk_index, "filename": "test.txt", "content": "stale vector text"}}

    def test_parent_context_uses_current_active_siblings_in_order(self):
        edited = self.chunk(0, "edited text")
        active = self.chunk(2, "current neighbor")
        disabled = self.chunk(1, "disabled secret", active=False)
        other_document = self.chunk(0, "other document", document_id=uuid4())
        rows = [(chunk, "test.txt") for chunk in (active, disabled, other_document, edited)]
        results = _expand_parents(rows, [self.point(active), self.point(edited)], 5)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["payload"]["content"], "edited text\n\ncurrent neighbor")
        self.assertEqual(results[0]["payload"]["matched_child_content"], "current neighbor")

    def test_disabled_vector_hit_is_not_expanded(self):
        disabled = self.chunk(0, "disabled secret", active=False)
        self.assertEqual(_expand_parents([(disabled, "test.txt")], [self.point(disabled)], 5), [])

    def test_hybrid_search_reranks_current_database_text_only(self):
        edited = self.chunk(0, "edited text")
        disabled = self.chunk(1, "disabled secret", active=False)
        db = MagicMock()
        db.execute.side_effect = [
            self.result([(self.document_id, datetime.now(timezone.utc))]),
            self.result([(edited, "test.txt")]),
        ]
        with patch("app.services.retrieval.QdrantClient") as client, patch("app.services.retrieval._rerank", side_effect=lambda query, candidates, limit: candidates) as rerank:
            client.return_value.search.return_value = [self.point(disabled), self.point(edited)]
            results = hybrid_search(db, "edited", 5, document_id=str(self.document_id))
        candidates = rerank.call_args.args[1]
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["payload"]["content"], "edited text")
        self.assertEqual(results[0]["payload"]["content"], "edited text")

    def test_zero_vector_weight_skips_qdrant(self):
        chunk = self.chunk(0, "lexical match")
        db = MagicMock()
        db.execute.side_effect = [
            self.result([(self.document_id, datetime.now(timezone.utc))]),
            self.result([(chunk, "test.txt")]),
        ]
        with patch("app.services.retrieval.QdrantClient") as client:
            results = hybrid_search(
                db, "lexical", 5, document_id=str(self.document_id),
                vector_weight=0, bm25_weight=1, use_reranker=False,
            )
        client.assert_not_called()
        self.assertEqual(results[0]["payload"]["content"], "lexical match")

    def test_unchanged_scope_reuses_tokenized_bm25_corpus(self):
        chunk = self.chunk(0, "cached lexical text")
        version = datetime.now(timezone.utc)
        db = MagicMock()
        db.execute.side_effect = [
            self.result([(self.document_id, version)]),
            self.result([(chunk, "test.txt")]),
            self.result([(self.document_id, version)]),
        ]
        with patch("app.services.retrieval.QdrantClient") as client, patch(
            "app.services.retrieval._tokens", wraps=retrieval._tokens
        ) as tokens:
            client.return_value.search.return_value = []
            hybrid_search(db, "cached", 5, document_id=str(self.document_id), use_reranker=False)
            hybrid_search(db, "cached", 5, document_id=str(self.document_id), use_reranker=False)

        corpus_tokenizations = [
            call for call in tokens.call_args_list if call.args[0] == "cached lexical text"
        ]
        self.assertEqual(len(corpus_tokenizations), 1)
        self.assertEqual(db.execute.call_count, 3)
