import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.core.config import (
    QDRANT_API_KEY,
    QDRANT_COLLECTION,
    QDRANT_EMBEDDING_MODEL,
    QDRANT_URL,
)

VECTOR_NAME = "dense"
VECTOR_SIZE = 384


class QdrantError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class QdrantClient:
    def __init__(self) -> None:
        if not QDRANT_URL or not QDRANT_API_KEY:
            raise QdrantError("Qdrant configuration is missing")
        self.base_url = QDRANT_URL
        self.api_key = QDRANT_API_KEY
        self.collection = QDRANT_COLLECTION
        self.model = QDRANT_EMBEDDING_MODEL

    def ensure_collection(self) -> None:
        collection = quote(self.collection, safe="")
        collection_info: dict[str, Any] | None = None
        try:
            collection_info = self._request("GET", f"/collections/{collection}")
        except QdrantError as exc:
            if exc.status_code != 404:
                raise
            self._request(
                "PUT",
                f"/collections/{collection}",
                {
                    "vectors": {
                        VECTOR_NAME: {
                            "size": VECTOR_SIZE,
                            "distance": "Cosine",
                        }
                    }
                },
            )

        payload_schema = (collection_info or {}).get("result", {}).get("payload_schema", {})
        if "document_id" not in payload_schema:
            self._request(
                "PUT",
                f"/collections/{collection}/index?wait=true",
                {"field_name": "document_id", "field_schema": "keyword"},
            )

    def replace_document_chunks(
        self,
        document_id: str,
        filename: str,
        chunks: list[dict[str, Any]],
    ) -> None:
        collection = quote(self.collection, safe="")
        self._request(
            "POST",
            f"/collections/{collection}/points/delete?wait=true",
            {
                "filter": {
                    "must": [
                        {"key": "document_id", "match": {"value": document_id}}
                    ]
                }
            },
        )

        for start in range(0, len(chunks), 32):
            batch = chunks[start : start + 32]
            points = [
                {
                    "id": chunk["id"],
                    "vector": {
                        VECTOR_NAME: {
                            "text": chunk["content"],
                            "model": self.model,
                        }
                    },
                    "payload": {
                        "chunk_id": chunk["id"],
                        "document_id": document_id,
                        "filename": filename,
                        "chunk_index": chunk["chunk_index"],
                        "content": chunk["content"],
                    },
                }
                for chunk in batch
            ]
            self._request(
                "PUT",
                f"/collections/{collection}/points?wait=true",
                {"points": points},
            )

    def search(
        self,
        query: str,
        limit: int,
        document_id: str | None = None,
    ) -> list[dict[str, Any]]:
        collection = quote(self.collection, safe="")
        body: dict[str, Any] = {
            "query": {"text": query, "model": self.model},
            "using": VECTOR_NAME,
            "limit": limit,
            "with_payload": True,
        }
        if document_id:
            body["filter"] = {
                "must": [
                    {"key": "document_id", "match": {"value": document_id}}
                ]
            }

        response = self._request(
            "POST",
            f"/collections/{collection}/points/query",
            body,
        )
        return response.get("result", {}).get("points", [])

    def _request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={
                "api-key": self.api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            error_message = f"Qdrant returned HTTP {exc.code}"
            try:
                error_body = json.loads(exc.read().decode("utf-8"))
                reason = error_body.get("status", {}).get("error")
                if reason:
                    error_message = f"{error_message}: {reason[:300]}"
            except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
                pass
            raise QdrantError(error_message, status_code=exc.code) from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise QdrantError("Could not communicate with Qdrant") from exc
