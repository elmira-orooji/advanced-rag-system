import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from app.core.config import AUTH_SECRET_KEY

PBKDF2_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt_hex, expected_hex = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
        return hmac.compare_digest(actual.hex(), expected_hex)
    except (ValueError, TypeError):
        return False


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_access_token(subject: str, role: str, expires_in: int, session_id: str) -> str:
    if not isinstance(expires_in, int) or isinstance(expires_in, bool) or expires_in <= 0:
        raise ValueError("expires_in must be a positive integer")
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    if not session_id:
        raise ValueError("session_id is required")
    payload = {
        "sub": subject,
        "role": role,
        "jti": session_id,
        "iat": now,
        "exp": now + expires_in,
    }
    encoded_header = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    encoded_payload = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    message = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(AUTH_SECRET_KEY.encode(), message, hashlib.sha256).digest()
    return f"{encoded_header}.{encoded_payload}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        message = f"{encoded_header}.{encoded_payload}".encode("ascii")
        expected = hmac.new(AUTH_SECRET_KEY.encode(), message, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64url_decode(encoded_signature)):
            return None
        payload = json.loads(_b64url_decode(encoded_payload))
        if not isinstance(payload, dict):
            return None
        if not payload.get("jti") or "exp" not in payload or int(payload["exp"]) <= int(time.time()):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
