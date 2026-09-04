"""Lightweight in-memory sliding-window rate limiter for FastAPI.

Uses a token-bucket approach per IP address with automatic cleanup of
stale entries to prevent unbounded memory growth.
"""

import time
import threading
from collections import OrderedDict
from functools import wraps
from typing import Callable

from fastapi import HTTPException, Request, status


class RateLimiter:
    """Thread-safe sliding window rate limiter with LRU eviction."""

    def __init__(self, max_requests: int = 30, window_seconds: int = 60, max_entries: int = 10_000):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_entries = max_entries
        self._buckets: OrderedDict[str, list[float]] = OrderedDict()
        self._lock = threading.Lock()

    def _cleanup(self, now: float) -> None:
        """Remove stale entries beyond the window and enforce max size."""
        cutoff = now - self.window_seconds
        # Remove expired buckets
        stale_keys = [
            key for key, timestamps in self._buckets.items()
            if not timestamps or timestamps[-1] < cutoff
        ]
        for key in stale_keys:
            del self._buckets[key]
        # Enforce max entries via LRU eviction
        while len(self._buckets) > self.max_entries:
            self._buckets.popitem(last=False)

    def check(self, key: str) -> tuple[bool, dict[str, str]]:
        """Check if request is allowed. Returns (allowed, headers)."""
        now = time.time()
        with self._lock:
            self._cleanup(now)
            timestamps = self._buckets.get(key, [])
            # Filter to current window
            cutoff = now - self.window_seconds
            timestamps = [t for t in timestamps if t >= cutoff]

            if len(timestamps) >= self.max_requests:
                retry_after = int(timestamps[0] - cutoff) + 1
                self._buckets[key] = timestamps
                return False, {
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                }

            timestamps.append(now)
            self._buckets[key] = timestamps
            remaining = self.max_requests - len(timestamps)
            return True, {
                "X-RateLimit-Limit": str(self.max_requests),
                "X-RateLimit-Remaining": str(remaining),
            }


# Default limiters for different endpoint categories
rag_limiter = RateLimiter(max_requests=20, window_seconds=60)
auth_limiter = RateLimiter(max_requests=10, window_seconds=60)
general_limiter = RateLimiter(max_requests=60, window_seconds=60)


def _get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For behind reverse proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(limiter: RateLimiter) -> Callable:
    """FastAPI dependency that enforces rate limiting."""
    async def dependency(request: Request) -> None:
        key = _get_client_ip(request)
        allowed, headers = limiter.check(key)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers=headers,
            )
        # Attach headers to response via state for middleware to pick up
        request.state.rate_limit_headers = headers
    return dependency