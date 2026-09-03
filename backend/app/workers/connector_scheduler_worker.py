import logging
import os
import signal
import socket
import threading
import time
import uuid

from app.core.config import CONNECTOR_SCHEDULER_POLL_SECONDS, WORKER_HEARTBEAT_SECONDS
from app.services.connector_scheduler import run_due_connector_syncs
from app.services.worker_heartbeat import deregister_worker, register_worker, send_heartbeat

logger = logging.getLogger(__name__)


def scheduler_loop(stop_event: threading.Event, worker_id: str) -> None:
    next_heartbeat = time.monotonic() + WORKER_HEARTBEAT_SECONDS

    while not stop_event.is_set():
        now_mono = time.monotonic()

        # Periodic heartbeat regardless of sync activity
        if now_mono >= next_heartbeat:
            if not send_heartbeat(worker_id):
                logger.warning("Failed to send heartbeat; re-registering", extra={"worker_id": worker_id})
                register_worker(
                    worker_id=worker_id,
                    worker_type="connector_scheduler",
                    metadata={"hostname": socket.gethostname(), "pid": os.getpid()},
                )
            next_heartbeat = now_mono + WORKER_HEARTBEAT_SECONDS

        try:
            run_due_connector_syncs()
        except Exception:
            logger.exception("Connector scheduler iteration failed")
        stop_event.wait(CONNECTOR_SCHEDULER_POLL_SECONDS)


def run() -> None:
    worker_id = f"scheduler:{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"
    stop_event = threading.Event()

    def stop(_signum, _frame) -> None:
        stop_event.set()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    # Register this scheduler in the persistent registry
    register_worker(
        worker_id=worker_id,
        worker_type="connector_scheduler",
        metadata={"hostname": socket.gethostname(), "pid": os.getpid()},
    )

    logger.info("Connector scheduler worker started", extra={"worker_id": worker_id})
    try:
        scheduler_loop(stop_event, worker_id)
    finally:
        deregister_worker(worker_id)
        logger.info("Connector scheduler worker stopped", extra={"worker_id": worker_id})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
