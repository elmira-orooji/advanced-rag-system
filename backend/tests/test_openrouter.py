import unittest
import json
from unittest.mock import MagicMock
from unittest.mock import patch
from app.services.openrouter import OpenRouterClient


class ModelPromptTests(unittest.TestCase):
    def test_catalog_filters_non_text_models_and_sorts_free_first(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({"data": [
            {"id": "provider/paid", "name": "Paid", "pricing": {"prompt": "1", "completion": "2"}},
            {"id": "provider/free", "name": "Free", "pricing": {"prompt": "0", "completion": "0"}},
            {"id": "provider/image", "architecture": {"output_modalities": ["image"]}},
        ]}).encode()
        with patch("app.services.openrouter.OPENROUTER_API_KEY", "test-key"), patch("app.services.openrouter.urlopen", return_value=response):
            models = OpenRouterClient().list_models()
        self.assertEqual([model["id"] for model in models], ["provider/free", "provider/paid"])
        self.assertTrue(models[0]["free"])

    def test_hybrid_prompt_and_model_override(self):
        with patch("app.services.openrouter.OPENROUTER_API_KEY", "test-key"), patch.object(OpenRouterClient, "_request", return_value={"choices": [{"message": {"content": "Hello"}}]}) as request:
            client = OpenRouterClient(model="openrouter/free")
            client.answer("Hello", [], hybrid=True)
        body = request.call_args.args[0]
        self.assertEqual(body["model"], "openrouter/free")
        self.assertIn("general knowledge", body["messages"][0]["content"])
        self.assertIn("untrusted", body["messages"][0]["content"])
        self.assertNotIn("using only", body["messages"][-1]["content"])

    def test_default_prompt_remains_sources_only(self):
        with patch("app.services.openrouter.OPENROUTER_API_KEY", "test-key"), patch.object(OpenRouterClient, "_request", return_value={"choices": [{"message": {"content": "Answer"}}]}) as request:
            OpenRouterClient().answer("Question", [])
        self.assertIn("using only the sources", request.call_args.args[0]["messages"][-1]["content"])
