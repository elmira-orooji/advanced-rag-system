"""Composition root for external AI and retrieval providers."""

from app.services.openrouter import OpenRouterClient
from app.services.ports import LanguageModelPort, VectorSearchPort
from app.services.qdrant import QdrantClient


def get_vector_store() -> VectorSearchPort:
    return QdrantClient()


def get_language_model(model: str | None = None) -> LanguageModelPort:
    return OpenRouterClient(model=model)
