import math
import re
import uuid
from time import perf_counter
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.document import Document
from app.services.qdrant import QdrantClient

TOKEN_PATTERN = re.compile(r"[\w\u0600-\u06ff]+", re.UNICODE)
RRF_K = 60


def _normalize(text: str) -> str:
    mapping = {"\u064a": "\u06cc", "\u0643": "\u06a9", "\u0629": "\u0647", "\u06c0": "\u0647"}
    return text.lower().translate(str.maketrans(mapping))


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
            denominator = frequency + 1.5 * (0.25 + 0.75 * len(tokens) / average_length)
            score += inverse_frequency * frequency * 2.5 / denominator
        if score > 0:
            scored.append((score, chunk, filename))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [{"id": str(chunk.id), "score": score, "payload": {"chunk_id": str(chunk.id), "document_id": str(chunk.document_id), "filename": filename, "chunk_index": chunk.chunk_index, "content": chunk.content}} for score, chunk, filename in scored[:limit]]


def _proximity(query_terms: set[str], tokens: list[str]) -> float:
    positions = [index for index, token in enumerate(tokens) if token in query_terms]
    if len(positions) < 2:
        return 0.0
    return min(len(query_terms) / (positions[-1] - positions[0] + 1), 1.0)


def _rerank(query: str, candidates: list[dict], limit: int) -> list[dict]:
    query_tokens = _tokens(query)
    query_terms = set(query_tokens)
    if not query_terms:
        return candidates[:limit]
    normalized_query = " ".join(query_tokens)
    reranked = []
    for candidate in candidates:
        payload = candidate["payload"]
        content_tokens = _tokens(payload.get("content", ""))
        content_terms = set(content_tokens)
        filename_terms = set(_tokens(payload.get("filename", "")))
        coverage = len(query_terms & content_terms) / len(query_terms)
        title_coverage = len(query_terms & filename_terms) / len(query_terms)
        phrase_match = normalized_query in " ".join(content_tokens)
        hybrid_score = float(candidate.get("score", 0.0))
        score = 0.50 * hybrid_score + 0.25 * coverage + 0.10 * _proximity(query_terms, content_tokens) + 0.10 * float(phrase_match) + 0.05 * title_coverage
        reranked.append({**candidate, "score": min(score, 1.0), "retrieval": {**candidate.get("retrieval", {}), "reranked": True, "hybrid_score": round(hybrid_score, 6), "term_coverage": round(coverage, 6), "phrase_match": phrase_match}})
    reranked.sort(key=lambda item: item["score"], reverse=True)
    return reranked[:limit]


def _expand_parents(rows: list[tuple[Chunk, str]], ranked_children: list[dict], limit: int) -> list[dict]:
    chunks = {str(chunk.id): chunk for chunk, _ in rows}
    seen_parents: set[tuple[str, int]] = set()
    expanded = []
    for child in ranked_children:
        payload = child["payload"]
        chunk = chunks.get(str(payload.get("chunk_id")))
        if chunk is None:
            continue
        parent_key = (str(chunk.document_id), chunk.parent_index)
        if parent_key in seen_parents:
            continue
        seen_parents.add(parent_key)
        expanded.append({
            **child,
            "payload": {
                **payload,
                "content": chunk.parent_content,
                "matched_child_content": chunk.content,
                "parent_index": chunk.parent_index,
            },
            "retrieval": {**child.get("retrieval", {}), "expanded_to_parent": True},
        })
        if len(expanded) >= limit:
            break
    return expanded


def hybrid_search(db: Session, query: str, limit: int, document_id: str | None = None, document_ids: list[str] | None = None, trace: dict | None = None, vector_weight: float = 1.0, bm25_weight: float = 1.0, use_reranker: bool = True) -> list[dict]:
    if document_id:
        scoped_ids = [uuid.UUID(document_id)]
    elif document_ids is not None:
        if not document_ids:
            return []
        scoped_ids = [uuid.UUID(value) for value in document_ids]
    else:
        raise ValueError("Hybrid search requires an explicit document scope")
    candidate_limit = min(max(limit * 4, 20), 80)
    started = perf_counter()
    vector_results = QdrantClient().search(query=query, limit=candidate_limit, document_id=document_id, document_ids=document_ids)
    vector_ms = round((perf_counter() - started) * 1000, 2)
    started = perf_counter()
    rows = list(db.execute(select(Chunk, Document.filename).join(Document, Document.id == Chunk.document_id).where(Chunk.document_id.in_(scoped_ids), Chunk.is_active.is_(True))).all())
    lexical_results = _bm25(query, rows, candidate_limit)
    lexical_ms = round((perf_counter() - started) * 1000, 2)
    fused: dict[str, dict] = {}
    for source, source_name in ((vector_results, "vector"), (lexical_results, "bm25")):
        for rank, result in enumerate(source, 1):
            chunk_id = str(result.get("payload", {}).get("chunk_id") or result.get("id"))
            item = fused.setdefault(chunk_id, {"point": result, "score": 0.0, "vector_rank": None, "lexical_rank": None})
            item["score"] += (vector_weight if source_name == "vector" else bm25_weight) / (RRF_K + rank)
            if source_name == "vector":
                item["vector_rank"] = rank
                item["point"] = result
            else:
                item["lexical_rank"] = rank
                if item["vector_rank"] is None:
                    item["point"] = result
    ranked = sorted(fused.values(), key=lambda item: item["score"], reverse=True)
    maximum = (vector_weight + bm25_weight) / (RRF_K + 1)
    candidates = [{**item["point"], "score": min(item["score"] / maximum, 1.0), "retrieval": {"method": "hybrid", "vector_rank": item["vector_rank"], "bm25_rank": item["lexical_rank"]}} for item in ranked]
    started = perf_counter()
    reranked_children = _rerank(query, candidates, candidate_limit) if use_reranker else candidates[:candidate_limit]
    rerank_ms = round((perf_counter() - started) * 1000, 2)
    expanded = _expand_parents(rows, reranked_children, limit)
    if trace is not None:
        trace.update({"vector_ms": vector_ms, "bm25_ms": lexical_ms, "rerank_ms": rerank_ms, "vector_count": len(vector_results), "bm25_count": len(lexical_results), "fused_count": len(candidates), "reranked_count": len(reranked_children), "answer_context_count": len(expanded)})
    return expanded
