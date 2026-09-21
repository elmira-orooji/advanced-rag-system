import logging
import os
import signal
import socket
import time
import uuid

from app.core.config import DOCUMENT_JOB_POLL_SECONDS, WORKER_HEARTBEAT_SECONDS
from app.core.logging import configure_logging
from app.services.document_jobs import claim_document_job, maintain_document_job_lease, process_document_job, recover_document_jobs
from app.services.indexing_reconciler import reconcile_indexing_outbox
from app.services.worker_heartbeat import deregister_worker, maintain_worker_heartbeat, register_worker

logger = logging.getLogger(__name__)
_stopping = False


def _stop(_signum, _frame) -> None:
    global _stopping
    _stopping = True


def run() -> None:
    worker_id = f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    # Register this worker in the persistent registry
    register_worker(
        worker_id=worker_id,
        worker_type="document_worker",
        metadata={"hostname": socket.gethostname(), "pid": os.getpid()},
    )

    try:
        metadata = {"hostname": socket.gethostname(), "pid": os.getpid()}
        with maintain_worker_heartbeat(
            worker_id,
            "document_worker",
            metadata,
            WORKER_HEARTBEAT_SECONDS,
        ):
            recovered = recover_document_jobs()
            logger.info("Document worker started", extra={"worker_id": worker_id, "recovered_jobs": recovered})
            next_recovery = time.monotonic() + 60
            next_reconcile = time.monotonic() + 10

            while not _stopping:
                now_mono = time.monotonic()
                if now_mono >= next_recovery:
                    recovered = recover_document_jobs()
                    if recovered:
                        logger.warning("Recovered abandoned document jobs", extra={"recovered_jobs": recovered})
                    next_recovery = now_mono + 60
                if now_mono >= next_reconcile:
                    try:
                        reconciled = reconcile_indexing_outbox()
                        if reconciled:
                            logger.info("Reconciled pending indexing outbox entries", extra={"reconciled": reconciled})
                    except Exception:
                        logger.exception("Indexing outbox reconciliation failed")
                    next_reconcile = now_mono + 30

                job_id = claim_document_job(worker_id)
                if job_id is None:
                    time.sleep(DOCUMENT_JOB_POLL_SECONDS)
                    continue
                try:
                    with maintain_document_job_lease(job_id, worker_id):
                        process_document_job(job_id, worker_id)
                except Exception:
                    logger.exception("Unhandled document job failure", extra={"job_id": str(job_id)})
    finally:
        deregister_worker(worker_id)
        logger.info("Document worker stopped", extra={"worker_id": worker_id})


if __name__ == "__main__":
    configure_logging()
    run()
