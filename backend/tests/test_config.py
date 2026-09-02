import unittest
from pathlib import Path
from unittest.mock import patch

from app.core.config import _load_environment


class EnvironmentLoadingTests(unittest.TestCase):
    @patch("app.core.config.load_dotenv")
    def test_dotenv_cannot_override_host_environment(self, load_dotenv):
        env_file = Path("deployment.env")

        _load_environment(env_file)

        load_dotenv.assert_called_once_with(env_file, override=False)


if __name__ == "__main__":
    unittest.main()
