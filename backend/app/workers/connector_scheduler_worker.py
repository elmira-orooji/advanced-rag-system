import logging
import signal
import threading

from app.core.config import CONNECTOR_SCHEDULER_POLL_SECONDS
from app.services.connector_scheduler import run_due_connector_syncs

logger = logging.getLogger(__name__)


def scheduler_loop(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        try:
            run_due_connector_syncs()
        except Exception:
            logger.exception("Connector scheduler iteration failed")
        stop_event.wait(CONNECTOR_SCHEDULER_POLL_SECONDS)


def run() -> None:
    stop_event = threading.Event()

    def stop(_signum, _frame) -> None:
        stop_event.set()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    logger.info("Connector scheduler worker started")
    scheduler_loop(stop_event)
    logger.info("Connector scheduler worker stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
