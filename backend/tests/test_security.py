import hashlib
import hmac
import json
import unittest
from unittest.mock import patch
from uuid import uuid4

from app.core import security
from app.core.security import create_access_token, decode_access_token


class AccessTokenTests(unittest.TestCase):
    def test_token_expiry_is_required(self):
        with self.assertRaises(ValueError):
            create_access_token("user-id", "user", None, str(uuid4()))

    def test_non_positive_token_expiry_is_rejected(self):
        with self.assertRaises(ValueError):
            create_access_token("user-id", "user", 0, str(uuid4()))

    def test_session_id_is_required(self):
        with self.assertRaises(ValueError):
            create_access_token("user-id", "user", 60, "")

    def test_legacy_persistent_token_without_expiry_is_rejected(self):
        header = security._b64url_encode(b'{"alg":"HS256","typ":"JWT"}')
        payload = security._b64url_encode(
            json.dumps({"sub": "user-id", "role": "user", "iat": 1000, "persistent": True}).encode()
        )
        message = f"{header}.{payload}".encode("ascii")
        signature = hmac.new(
            security.AUTH_SECRET_KEY.encode(),
            message,
            hashlib.sha256,
        ).digest()
        token = f"{header}.{payload}.{security._b64url_encode(signature)}"

        self.assertIsNone(decode_access_token(token))

    def test_existing_expiring_tokens_still_expire(self):
        with patch("app.core.security.time.time", return_value=1000):
            token = create_access_token("user-id", "user", 60, str(uuid4()))
        with patch("app.core.security.time.time", return_value=1059):
            self.assertIsNotNone(decode_access_token(token))
        with patch("app.core.security.time.time", return_value=1060):
            self.assertIsNone(decode_access_token(token))

    def test_tampered_token_is_rejected(self):
        token = create_access_token("user-id", "user", 60, str(uuid4()))
        header, payload, signature = token.split(".")
        changed = ("A" if signature[0] != "A" else "B") + signature[1:]
        self.assertIsNone(decode_access_token(f"{header}.{payload}.{changed}"))

    def test_changed_signing_key_invalidates_token(self):
        token = create_access_token("user-id", "user", 60, str(uuid4()))
        with patch("app.core.security.AUTH_SECRET_KEY", "different-test-key"):
            self.assertIsNone(decode_access_token(token))


if __name__ == "__main__":
    unittest.main()
