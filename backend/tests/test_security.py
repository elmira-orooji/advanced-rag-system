import unittest
from unittest.mock import patch

from app.core.security import create_access_token, decode_access_token


class AccessTokenTests(unittest.TestCase):
    def test_persistent_token_remains_valid_after_time_passes(self):
        with patch("app.core.security.time.time", return_value=1000):
            token = create_access_token("user-id", "user")
        with patch("app.core.security.time.time", return_value=10_000_000_000):
            payload = decode_access_token(token)
        self.assertEqual(payload["sub"], "user-id")
        self.assertIs(payload["persistent"], True)
        self.assertNotIn("exp", payload)

    def test_existing_expiring_tokens_still_expire(self):
        with patch("app.core.security.time.time", return_value=1000):
            token = create_access_token("user-id", "user", 60)
        with patch("app.core.security.time.time", return_value=1059):
            self.assertIsNotNone(decode_access_token(token))
        with patch("app.core.security.time.time", return_value=1060):
            self.assertIsNone(decode_access_token(token))

    def test_tampered_persistent_token_is_rejected(self):
        token = create_access_token("user-id", "user")
        header, payload, signature = token.split(".")
        changed = ("A" if signature[0] != "A" else "B") + signature[1:]
        self.assertIsNone(decode_access_token(f"{header}.{payload}.{changed}"))

    def test_changed_signing_key_invalidates_persistent_token(self):
        token = create_access_token("user-id", "user")
        with patch("app.core.security.AUTH_SECRET_KEY", "different-test-key"):
            self.assertIsNone(decode_access_token(token))


if __name__ == "__main__":
    unittest.main()
