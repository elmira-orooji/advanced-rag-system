"""Stable HTTP contract primitives shared by the versioned public API."""

from __future__ import annotations

from typing import Any

from fastapi import Response

API_MAJOR_VERSION = "1"
API_PREFIX = f"/api/v{API_MAJOR_VERSION}"

_STATUS_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    422: "validation_error",
    429: "rate_limited",
    500: "internal_error",
    502: "upstream_unavailable",
    503: "service_unavailable",
}


def error_code(status_code: int) -> str:
    """Return a stable machine-readable code without exposing implementation details."""
    return _STATUS_CODES.get(status_code, "request_failed")


def error_body(*, status_code: int, detail: Any, request_id: str) -> dict[str, Any]:
    """Keep FastAPI's ``detail`` field while adding an additive stable envelope."""
    message = detail if isinstance(detail, str) else "The request could not be processed."
    return {
        "detail": detail,
        "error": {
            "code": error_code(status_code),
            "message": message,
            "request_id": request_id,
        },
    }


def set_offset_pagination_headers(response: Response, *, offset: int, limit: int, returned: int) -> None:
    """Expose cursor-free pagination metadata without changing v1 list bodies."""
    has_more = returned == limit
    response.headers["X-Pagination-Offset"] = str(offset)
    response.headers["X-Pagination-Limit"] = str(limit)
    response.headers["X-Pagination-Returned"] = str(returned)
    response.headers["X-Pagination-Has-More"] = str(has_more).lower()
    if has_more:
        response.headers["X-Pagination-Next-Offset"] = str(offset + returned)
