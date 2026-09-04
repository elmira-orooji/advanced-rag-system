import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi import HTTPException, Response
from starlette.requests import Request

from app.api.routes.auth import get_current_user, login, logout
from app.core.config import AUTH_COOKIE_NAME, AUTH_REMEMBER_SECONDS, AUTH_SESSION_SECONDS
from app.core.security import create_access_token
from app.models.auth_session import AuthSession
from app.schemas.auth import LoginRequest


def request_with_cookie(value: str) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/v1/auth/me",
            "query_string": b"",
            "headers": [(b"cookie", f"{AUTH_COOKIE_NAME}={value}".encode())],
            "scheme": "http",
            "server": ("testserver", 80),
            "client": ("testclient", 50000),
        }
    )


def login_request() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/api/v1/auth/login", "query_string": b"", "headers": [], "scheme": "https", "server": ("testserver", 443), "client": ("203.0.113.10", 50000)})


class AuthCookieTests(unittest.TestCase):
    def setUp(self):
        organization_id = uuid4()
        self.organization = SimpleNamespace(
            id=organization_id,
            name="Default",
            slug="default",
        )
        self.user = SimpleNamespace(
            id=uuid4(),
            organization_id=organization_id,
            username="admin",
            password_hash="hash",
            role="admin",
            is_active=True,
        )

    def test_login_sets_http_only_session_cookie_without_returning_token(self):
        db = MagicMock()
        db.scalar.side_effect = [self.organization, self.user]
        response = Response()

        with patch("app.api.routes.auth.retry_after", return_value=None), patch("app.api.routes.auth.clear_account_failures"), patch("app.api.routes.auth.verify_password", return_value=True), patch(
            "app.api.routes.auth.create_access_token", return_value="signed-token"
        ) as create_token:
            result = login(
                LoginRequest(
                    username="admin",
                    password="password123",
                    organization="default",
                    remember_me=False,
                ),
                response,
                login_request(),
                db,
            )

        cookie = response.headers["set-cookie"]
        self.assertIn(f"{AUTH_COOKIE_NAME}=signed-token", cookie)
        self.assertIn("HttpOnly", cookie)
        self.assertIn("Secure", cookie)
        self.assertIn("SameSite=lax", cookie)
        self.assertNotIn("Max-Age", cookie)
        self.assertEqual(result.expires_in, AUTH_SESSION_SECONDS)
        self.assertFalse(hasattr(result, "access_token"))
        auth_session = db.add.call_args.args[0]
        self.assertIsInstance(auth_session, AuthSession)
        self.assertEqual(auth_session.user_id, self.user.id)
        create_token.assert_called_once_with(
            str(self.user.id),
            self.user.role,
            AUTH_SESSION_SECONDS,
            str(auth_session.id),
        )

    def test_remember_me_sets_persistent_cookie(self):
        db = MagicMock()
        db.scalar.side_effect = [self.organization, self.user]
        response = Response()

        with patch("app.api.routes.auth.retry_after", return_value=None), patch("app.api.routes.auth.clear_account_failures"), patch("app.api.routes.auth.verify_password", return_value=True), patch(
            "app.api.routes.auth.create_access_token", return_value="signed-token"
        ):
            result = login(
                LoginRequest(
                    username="admin",
                    password="password123",
                    organization="default",
                    remember_me=True,
                ),
                response,
                login_request(),
                db,
            )

        self.assertIn(f"Max-Age={AUTH_REMEMBER_SECONDS}", response.headers["set-cookie"])
        self.assertEqual(result.expires_in, AUTH_REMEMBER_SECONDS)

    def test_cookie_authenticates_request(self):
        session_id = uuid4()
        token = create_access_token(str(self.user.id), self.user.role, 60, str(session_id))
        db = MagicMock()
        auth_session = SimpleNamespace(
            id=session_id,
            user_id=self.user.id,
            revoked_at=None,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=60),
        )
        db.get.side_effect = lambda model, _id: auth_session if model is AuthSession else self.user

        current = get_current_user(request_with_cookie(token), None, db)

        self.assertIs(current, self.user)

    def test_logout_expires_the_same_cookie(self):
        response = Response()
        request = login_request()
        db = MagicMock()

        logout(response, request, None, db)

        cookie = response.headers["set-cookie"]
        self.assertIn(f"{AUTH_COOKIE_NAME}=", cookie)
        self.assertIn("Max-Age=0", cookie)
        self.assertIn("Path=/api/v1", cookie)

    def test_logout_revokes_the_presented_session(self):
        session_id = uuid4()
        token = create_access_token(str(self.user.id), self.user.role, 60, str(session_id))
        response = Response()
        db = MagicMock()

        logout(response, request_with_cookie(token), None, db)

        statement = db.execute.call_args.args[0]
        self.assertIn("auth_sessions", str(statement))
        db.commit.assert_called_once()

    def test_revoked_session_cannot_authenticate(self):
        session_id = uuid4()
        token = create_access_token(str(self.user.id), self.user.role, 60, str(session_id))
        db = MagicMock()
        db.get.return_value = SimpleNamespace(
            user_id=self.user.id,
            revoked_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=60),
        )

        with self.assertRaises(HTTPException) as raised:
            get_current_user(request_with_cookie(token), None, db)

        self.assertEqual(raised.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
