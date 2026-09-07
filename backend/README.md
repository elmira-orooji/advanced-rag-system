# Backend processes

Apply database migrations before starting either process:

```powershell
alembic upgrade head
```

Run the API and durable document worker as separate services that share the same
database, document storage, and Qdrant configuration:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
python -m app.workers.document_worker
python -m app.workers.connector_scheduler_worker
```

More than one document worker may run at the same time. Jobs are claimed with
database row locks, and abandoned claims return to the queue after
`DOCUMENT_JOB_LEASE_SECONDS`. Active workers refresh their lease every
`DOCUMENT_JOB_HEARTBEAT_SECONDS`, including during blocking extraction and
Qdrant operations. Transient failures use exponential backoff up to
`DOCUMENT_JOB_MAX_ATTEMPTS`; permanent and exhausted jobs enter the
`dead_letter` state and can still be retried manually.

The connector scheduler is also a separate process. Run one scheduler instance;
it handles `SIGINT` and `SIGTERM` cleanly and is independent of the number of API
workers. Remote connector discovery releases its SQLAlchemy Session connection
while OAuth and network downloads are in progress.

## OCR for scanned documents

PDFs with an embedded text layer are extracted locally. Scanned PDFs and images
can use MinerU's hosted Precision API without installing a local OCR model. Set
`OCR_PROVIDER=mineru`, configure `MINERU_API_TOKEN`, and use `MINERU_LANGUAGE=fa`
for Persian documents. MinerU receives the original file through a signed upload
URL, processes it asynchronously, and returns structured Markdown; keep OCR
disabled unless the organisation has approved sending documents to MinerU.

Set `OCR_PROVIDER=auto` to try configured MinerU, Google Vision, then Azure
Document Intelligence. The API also accepts JPEG, PNG, and TIFF images when OCR
is configured.

The ordinary test suite mocks cloud providers. To run the opt-in live smoke
test, set a provider credential and its explicit switch, then run:

```powershell
$env:RUN_GOOGLE_VISION_OCR_INTEGRATION=1
.\.venv\Scripts\python.exe -m pytest -m integration
```

The test sends one synthetic image containing `NEXORA OCR 2026`; it does not
upload a user document. Use `RUN_AZURE_OCR_INTEGRATION=1` for Azure instead.
