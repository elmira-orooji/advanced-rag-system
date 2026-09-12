"""Low-overhead, rate-limited operational email notifications."""

from __future__ import annotations

import logging
import smtplib
import ssl
import time
from concurrent.futures import ThreadPoolExecutor
from email.message import EmailMessage
from threading import Lock

from app.core.config import (
    ALERT_RECIPIENTS,
    OPERATIONAL_ALERT_COOLDOWN_SECONDS,
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_TIMEOUT_SECONDS,
    SMTP_USERNAME,
    SMTP_USE_TLS,
)

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="operational-alert")
_last_sent: dict[str, float] = {}
_lock = Lock()


def is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM_EMAIL and ALERT_RECIPIENTS)


def send_operational_alert(key: str, subject: str, body: str) -> bool:
    """Queue one email without delaying the caller or retrying aggressively."""
    if not is_configured():
        return False
    now = time.monotonic()
    with _lock:
        previous = _last_sent.get(key)
        if previous is not None and now - previous < OPERATIONAL_ALERT_COOLDOWN_SECONDS:
            return False
        _last_sent[key] = now
    _executor.submit(_deliver, subject, body)
    return True


def _deliver(subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = f"[Nexora] {subject}"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = ", ".join(ALERT_RECIPIENTS)
    message.set_content(body)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS) as client:
            if SMTP_USE_TLS:
                client.starttls(context=ssl.create_default_context())
            if SMTP_USERNAME:
                client.login(SMTP_USERNAME, SMTP_PASSWORD)
            client.send_message(message)
    except (OSError, smtplib.SMTPException):
        logger.exception("Operational alert delivery failed", extra={"alert_subject": subject})
