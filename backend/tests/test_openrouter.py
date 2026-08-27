import unittest
from unittest.mock import patch
from app.services.openrouter import OpenRouterClient


class ModelPromptTests(unittest.TestCase):
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
