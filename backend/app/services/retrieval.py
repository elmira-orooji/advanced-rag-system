import math
import re
import uuid
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.document import Document
from app.services.qdrant import QdrantClient

TOKEN_PATTERN = re.compile(r"[\w\u0600-\u06ff]+", re.UNICODE)
RRF_K = 60


def _normalize(text: str) -> str:
    return text.lower().translate(str.maketrans({"ي": "ی", "ك": "ک", "ة": "ه", "ۀ": "ه"}))


def _tokens(text: str) -> list[str]:
    return [token for token in TOKEN_PATTERN.findall(_normalize(text)) if len(token) > 1]


def _bm25(query: str, rows: list[tuple[Chunk, str]], limit: int) -> list[dict]:
    query_tokens = _tokens(query)
    if not query_tokens or not rows:
        return []
    documents = [_tokens(chunk.content) for chunk, _ in rows]
    average_length = sum(map(len, documents)) / len(documents) or 1
    document_frequency = Counter(token for tokens in documents for token in set(tokens))
    total = len(documents)
    scored: list[tuple[float, Chunk, str]] = []
    for (chunk, filename), tokens in zip(rows, documents):
        frequencies = Counter(tokens)
        score = 0.0
        for token in query_tokens:
            frequency = frequencies[token]
            if not frequency:
                continue
            inverse_frequency = math.log(1 + (total - document_frequency[token] + 0.5) / (document_frequency[token] + 0.5))
            denominator = frequency + 1.5 * (1 - 0.75 + 0.75 * len(tokens) / average_length)
            score += inverse_frequency * frequency * 2.5 / denominator
        if score > 0:
            scored.append((score, chunk, filename))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [{"id": str(chunk.id), "score": score, "payload": {"chunk_id": str(chunk.id), "document_id": str(chunk.document_id), "filename": filename, "chunk_index": chunk.chunk_index, "content": chunk.content}} for score, chunk, filename in scored[:limit]]


def hybrid_search(db: Session, query: str, limit: int, document_id: str | None = None, document_ids: list[str] | None = None) -> list[dict]:
    if document_id:
        scoped_ids = [uuid.UUID(document_id)]
    elif document_ids is not None:
        if not document_ids:
            return []
        scoped_ids = [uuid.UUID(value) for value in document_ids]
    else:
        raise ValueError("Hybrid search requires an explicit document scope")

    candidate_limit = min(max(limit * 4, 20), 80)
    vector_results = QdrantClient().search(query=query, limit=candidate_limit, document_id=document_id, document_ids=document_ids)
    rows = list(db.execute(select(Chunk, Document.filename).join(Document, Document.id == Chunk.document_id).where(Chunk.document_id.in_(scoped_ids))).all())
    lexical_results = _bm25(query, rows, candidate_limit)

    fused: dict[str, dict] = {}
    for source, weight in ((vector_results, 1.0), (lexical_results, 1.0)):
        for rank, result in enumerate(source, 1):
            chunk_id = str(result.get("payload", {}).get("chunk_id") or result.get("id"))
            item = fused.setdefault(chunk_id, {"point": result, "score": 0.0, "vector_rank": None, "lexical_rank": None})
            item["score"] += weight / (RRF_K + rank)
            if source is vector_results:
                item["vector_rank"] = rank
                item["point"] = result
            else:
                item["lexical_rank"] = rank
                if item["vector_rank"] is None:
                    item["point"] = result

    ranked = sorted(fused.values(), key=lambda item: item["score"], reverse=True)[:limit]
    maximum = 2 / (RRF_K + 1)
    results = []
    for item in ranked:
        point = item["point"]
        results.append({**point, "score": min(item["score"] / maximum, 1.0), "retrieval": {"method": "hybrid", "vector_rank": item["vector_rank"], "bm25_rank": item["lexical_rank"]}})
    return results
