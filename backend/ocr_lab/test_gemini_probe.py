import unittest
from pathlib import Path
from unittest.mock import patch

from gemini_handwriting_probe import LAB_ROOT, extract_response_text, load_api_key, parse_json_text, parse_pages


class GeminiProbeTests(unittest.TestCase):
    def test_parse_pages_deduplicates_and_sorts(self) -> None:
        self.assertEqual(parse_pages("38, 1,20,1"), [1, 20, 38])

    def test_extract_response_text(self) -> None:
        response = {"candidates": [{"content": {"parts": [{"text": "{\"unclear_count\": 0}"}]}}]}
        self.assertEqual(extract_response_text(response), '{"unclear_count": 0}')

    def test_parse_json_text_accepts_fenced_json(self) -> None:
        self.assertEqual(parse_json_text('```json\n{"unclear_count": 2}\n```')["unclear_count"], 2)

    def test_load_api_key_from_ignored_env_file(self) -> None:
        test_root = LAB_ROOT / "output"
        test_root.mkdir(parents=True, exist_ok=True)
        env_file = test_root / "test-gemini.env"
        try:
            env_file.write_text("GEMINI_API_KEY=test-key\n", encoding="utf-8")
            with patch.dict("os.environ", {}, clear=True):
                self.assertEqual(load_api_key(env_file), "test-key")
        finally:
            env_file.unlink(missing_ok=True)

    def test_environment_key_takes_precedence(self) -> None:
        with patch.dict("os.environ", {"GEMINI_API_KEY": "environment-key"}, clear=True):
            self.assertEqual(load_api_key(Path("missing.env")), "environment-key")


if __name__ == "__main__":
    unittest.main()
