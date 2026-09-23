"""Translate infrastructure failures into stable, safe API responses."""

from fastapi import HTTPException, status

from app.services.openrouter import OpenRouterError
from app.services.qdrant import QdrantError


def provider_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, QdrantError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Knowledge search is temporarily unavailable. Please retry shortly.",
        )
    if isinstance(exc, OpenRouterError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI response service is temporarily unavailable. Please retry shortly.",
        )
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="A required service is currently unavailable.")
