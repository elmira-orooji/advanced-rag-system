import unittest
from pathlib import Path
from unittest.mock import patch

from app.core.config import _boolean_setting, _load_environment, _validate_cookie_security


class EnvironmentLoadingTests(unittest.TestCase):
    @patch("app.core.config.load_dotenv")
    def test_dotenv_cannot_override_host_environment(self, load_dotenv):
        env_file = Path("deployment.env")

        _load_environment(env_file)

        load_dotenv.assert_called_once_with(env_file, override=False)

    @patch.dict("os.environ", {}, clear=True)
    def test_session_cookie_is_secure_by_default(self):
        self.assertTrue(_boolean_setting("AUTH_COOKIE_SECURE", default=True))

    @patch.dict("os.environ", {"AUTH_COOKIE_SECURE": "not-a-boolean"})
    def test_invalid_cookie_secure_value_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "AUTH_COOKIE_SECURE"):
            _boolean_setting("AUTH_COOKIE_SECURE", default=True)

    def test_insecure_cookie_is_rejected_outside_local_environments(self):
        for environment in ("production", "staging", ""):
            with self.subTest(environment=environment):
                with self.assertRaisesRegex(RuntimeError, "APP_ENV"):
                    _validate_cookie_security(environment, False)

    def test_insecure_cookie_is_allowed_for_explicit_local_environments(self):
        for environment in ("development", "test"):
            with self.subTest(environment=environment):
                _validate_cookie_security(environment, False)


if __name__ == "__main__":
    unittest.main()
