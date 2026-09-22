"""Provider-agnostic contracts used by application services.

Concrete adapters such as Qdrant and OpenRouter implement these shapes without
leaking their implementation details into retrieval orchestration.
"""

from typing import Any, Protocol


class VectorSearchPort(Protocol):
    def search(
        self,
        query: str,
        limit: int,
        document_id: str | None = None,
        document_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]: ...


class LanguageModelPort(Protocol):
    def answer(self, question: str, contexts: list[dict[str, Any]], **kwargs: Any) -> str: ...

    def answer_with_usage(self, question: str, contexts: list[dict[str, Any]], **kwargs: Any) -> Any: ...

    def rewrite_query(self, question: str, history: list[dict[str, str]]) -> str: ...

    def research_plan(self, question: str, max_steps: int) -> list[str]: ...
