from unittest import TestCase
from unittest.mock import patch

from app.services import operational_alerts


class OperationalAlertsTests(TestCase):
    def setUp(self):
        operational_alerts._last_sent.clear()

    @patch.object(operational_alerts, "ALERT_RECIPIENTS", ("ops@example.com",))
    @patch.object(operational_alerts, "SMTP_FROM_EMAIL", "alerts@example.com")
    @patch.object(operational_alerts, "SMTP_HOST", "smtp.example.com")
    def test_alert_is_queued_once_within_cooldown(self):
        with patch.object(operational_alerts._executor, "submit") as submit:
            self.assertTrue(operational_alerts.send_operational_alert("model-failure", "Model failed", "Check provider"))
            self.assertFalse(operational_alerts.send_operational_alert("model-failure", "Model failed", "Check provider"))
        submit.assert_called_once()

    def test_alert_is_not_queued_without_smtp_configuration(self):
        with patch.object(operational_alerts._executor, "submit") as submit:
            self.assertFalse(operational_alerts.send_operational_alert("model-failure", "Model failed", "Check provider"))
        submit.assert_not_called()
