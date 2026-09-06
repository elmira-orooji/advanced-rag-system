import unittest
from unittest.mock import patch, MagicMock


def _mock_embedding(data, **kwargs):
    """Return list-of-lists instead of numpy array to avoid numpy dependency in tests."""
    if isinstance(data, str):
        return [[1.0, 0.0, 0.0]]
    # Return distinct vectors based on index to simulate similarity patterns
    results = []
    for i, _ in enumerate(data):
        if i < 2:
            results.append([1.0, 0.0, 0.0])  # Similar group A
        else:
            results.append([0.0, 0.0, 1.0])  # Different group B
    return results


class SemanticChunkerTests(unittest.TestCase):
    """Tests for semantic chunking logic without requiring heavy model download."""

    def test_empty_text_returns_empty(self):
        from app.services.semantic_chunker import semantic_chunks
        self.assertEqual(semantic_chunks(""), [])
        self.assertEqual(semantic_chunks("   "), [])

    def test_single_sentence_returns_as_is(self):
        from app.services.semantic_chunker import semantic_chunks
        text = "This is a single sentence without any punctuation breaks."
        with patch("app.services.semantic_chunker._load_model") as mock_load:
            mock_model = MagicMock()
            mock_model.encode.return_value = [[1.0, 0.0]]
            mock_load.return_value = mock_model
            result = semantic_chunks(text)
        self.assertEqual(len(result), 1)
        self.assertIn("single sentence", result[0])

    def test_split_on_low_similarity(self):
        from app.services.semantic_chunker import semantic_chunks
        text = "Cats are mammals. Dogs are mammals. Quantum physics is complex. The economy grew last year."
        with patch("app.services.semantic_chunker._load_model") as mock_load:
            mock_model = MagicMock()
            mock_model.encode.side_effect = _mock_embedding
            mock_load.return_value = mock_model
            result = semantic_chunks(text, min_chunk_size=5, similarity_threshold=0.4)

        self.assertGreaterEqual(len(result), 2)
        self.assertIn("mammals", result[0].lower())
        combined = " ".join(result).lower()
        self.assertIn("quantum", combined)

    def test_respects_max_chunk_size(self):
        from app.services.semantic_chunker import semantic_chunks
        sentences = ["The cat sat on the mat."] * 20
        text = " ".join(sentences)
        identical_embeddings = [[1.0, 0.0, 0.0] for _ in range(20)]

        with patch("app.services.semantic_chunker._load_model") as mock_load:
            mock_model = MagicMock()
            mock_model.encode.return_value = identical_embeddings
            mock_load.return_value = mock_model
            result = semantic_chunks(text, max_chunk_size=100, min_chunk_size=10)

        for chunk in result:
            self.assertLessEqual(len(chunk), 150)
