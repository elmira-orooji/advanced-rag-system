import logging
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.core import logging as app_logging


class LoggingConfigurationTests(unittest.TestCase):
    def test_configures_rotating_file_handler_once(self):
        root = logging.getLogger()
        original_handlers = root.handlers[:]
        try:
            for handler in root.handlers[:]:
                root.removeHandler(handler)
            log_file = Path.cwd() / "nexora.log"
            handler = MagicMock()
            handler.baseFilename = str(log_file.resolve())
            with patch.object(app_logging, "LOG_FILE", log_file), patch.object(app_logging, "LOG_MAX_BYTES", 1024), patch.object(app_logging, "LOG_BACKUP_COUNT", 2), patch.object(app_logging, "RotatingFileHandler", return_value=handler) as rotating:
                app_logging.configure_logging()
                app_logging.configure_logging()
                rotating.assert_called_once_with(log_file, maxBytes=1024, backupCount=2, encoding="utf-8")
                self.assertIn(handler, root.handlers)
        finally:
            for handler in root.handlers[:]:
                root.removeHandler(handler)
                handler.close()
            root.handlers[:] = original_handlers
