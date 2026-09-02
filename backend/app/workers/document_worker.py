import logging
import os
import signal
import socket
import time
import uuid

from app.core.config import DOCUMENT_JOB_POLL_SECONDS
from app.services.document_jobs import claim_document_job, process_document_job, recover_document_jobs

logger = logging.getLogger(__name__)
_stopping = False


def _stop(_signum, _frame) -> None:
    global _stopping
    _stopping = True


def run() -> None:
    worker_id = f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)
    recovered = recover_document_jobs()
    logger.info("Document worker started", extra={"worker_id": worker_id, "recovered_jobs": recovered})
    next_recovery = time.monotonic() + 60

    while not _stopping:
        if time.monotonic() >= next_recovery:
            recovered = recover_document_jobs()
            if recovered:
                logger.warning("Recovered abandoned document jobs", extra={"recovered_jobs": recovered})
            next_recovery = time.monotonic() + 60
        job_id = claim_document_job(worker_id)
        if job_id is None:
            time.sleep(DOCUMENT_JOB_POLL_SECONDS)
            continue
        try:
            process_document_job(job_id, claimed=True)
        except Exception:
            logger.exception("Unhandled document job failure", extra={"job_id": str(job_id)})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
