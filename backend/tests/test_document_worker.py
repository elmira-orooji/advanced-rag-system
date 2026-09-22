from contextlib import nullcontext
from unittest.mock import patch
from uuid import uuid4

from app.workers.document_worker import DocumentWorker


def test_worker_processes_claimed_job_under_lease():
    job_id = uuid4()
    worker = DocumentWorker("worker-1")

    with patch("app.workers.document_worker.claim_document_job", return_value=job_id), patch("app.workers.document_worker.maintain_document_job_lease", return_value=nullcontext()) as lease, patch("app.workers.document_worker.process_document_job") as process:
        processed = worker._process_next_job()

    assert processed is True
    lease.assert_called_once_with(job_id, "worker-1")
    process.assert_called_once_with(job_id, "worker-1")


def test_worker_sleeps_only_when_no_job_is_claimed():
    worker = DocumentWorker("worker-1")

    with patch("app.workers.document_worker.claim_document_job", return_value=None):
        processed = worker._process_next_job()

    assert processed is False
