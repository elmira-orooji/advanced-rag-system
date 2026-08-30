import math
import re
import uuid
from time import perf_counter
from collections import Counter, OrderedDict
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.document import Document
from app.services.qdrant import QdrantClient

TOKEN_PATTERN = re.compile(r"[\w\u0600-\u06ff]+", re.UNICODE)
RRF_K = 60
BM25_CACHE_SCOPES = 16


@dataclass
class _LexicalCorpus:
    signature: tuple[tuple[str, str], ...]
    rows: list[tuple[Chunk, str]]
    document_lengths: list[int]
    average_length: float
    postings: dict[str, list[tuple[int, int]]]


_lexical_cache: OrderedDict[tuple[str, ...], _LexicalCorpus] = OrderedDict()


def _normalize(text: str) -> str:
    mapping = {"\u064a": "\u06cc", "\u0643": "\u06a9", "\u0629": "\u0647", "\u06c0": "\u0647"}
    return text.lower().translate(str.maketrans(mapping))


def _tokens(text: str) -> list[str]:
    return [token for token in TOKEN_PATTERN.findall(_normalize(text)) if len(token) > 1]


def _build_lexical_corpus(signature: tuple[tuple[str, str], ...], rows: list[tuple[Chunk, str]]) -> _LexicalCorpus:
    document_lengths: list[int] = []
    postings: dict[str, list[tuple[int, int]]] = {}
    for index, (chunk, _) in enumerate(rows):
        frequencies = Counter(_tokens(chunk.content))
        document_lengths.append(sum(frequencies.values()))
        for token, frequency in frequencies.items():
            postings.setdefault(token, []).append((index, frequency))
    average_length = sum(document_lengths) / len(document_lengths) if document_lengths else 1.0
    return _LexicalCorpus(signature, rows, document_lengths, average_length or 1.0, postings)


def _bm25(query: str, rows: list[tuple[Chunk, str]], limit: int, corpus: _LexicalCorpus | None = None) -> list[dict]:
    query_tokens = _tokens(query)
    if not query_tokens or not rows:
        return []
    corpus = corpus or _build_lexical_corpus((), rows)
    total = len(rows)
    scores: dict[int, float] = {}
    for token in set(query_tokens):
        posting = corpus.postings.get(token, [])
        if not posting:
            continue
        document_frequency = len(posting)
        inverse_frequency = math.log(1 + (total - document_frequency + 0.5) / (document_frequency + 0.5))
        for index, frequency in posting:
            denominator = frequency + 1.5 * (
                0.25 + 0.75 * corpus.document_lengths[index] / corpus.average_length
            )
            scores[index] = scores.get(index, 0.0) + inverse_frequency * frequency * 2.5 / denominator
    scored = [(score, *rows[index]) for index, score in scores.items() if score > 0]
    scored.sort(key=lambda item: item[0], reverse=True)
    return [{"id": str(chunk.id), "score": score, "payload": {"chunk_id": str(chunk.id), "document_id": str(chunk.document_id), "filename": filename, "chunk_index": chunk.chunk_index, "content": chunk.content}} for score, chunk, filename in scored[:limit]]


def _lexical_corpus(db: Session, scoped_ids: list[uuid.UUID]) -> _LexicalCorpus:
    scope_key = tuple(sorted(str(value) for value in scoped_ids))
    versions = db.execute(
        select(Document.id, Document.updated_at).where(Document.id.in_(scoped_ids))
    ).all()
    signature = tuple(sorted(
        (str(document_id), updated_at.isoformat() if updated_at is not None else "")
        for document_id, updated_at in versions
    ))
    cached = _lexical_cache.get(scope_key)
    if cached is not None and cached.signature == signature:
        _lexical_cache.move_to_end(scope_key)
        return cached

    rows = list(db.execute(
        select(Chunk, Document.filename)
        .join(Document, Document.id == Chunk.document_id)
        .where(Chunk.document_id.in_(scoped_ids), Chunk.is_active.is_(True))
    ).all())
    corpus = _build_lexical_corpus(signature, rows)
    _lexical_cache[scope_key] = corpus
    _lexical_cache.move_to_end(scope_key)
    while len(_lexical_cache) > BM25_CACHE_SCOPES:
        _lexical_cache.popitem(last=False)
    return corpus


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
    chunks = {str(chunk.id): chunk for chunk, _ in rows if chunk.is_active}
    parents: dict[tuple[str, int], list[Chunk]] = {}
    for chunk in chunks.values():
        parents.setdefault((str(chunk.document_id), chunk.parent_index), []).append(chunk)
    # Cached parent_content predates edits and can include disabled siblings.
    parent_texts = {
        key: "\n\n".join(chunk.content for chunk in sorted(children, key=lambda item: item.chunk_index))
        for key, children in parents.items()
    }
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
                "content": parent_texts[parent_key],
                "matched_child_content": chunk.content,
                "parent_index": chunk.parent_index,
            },
            "retrieval": {**child.get("retrieval", {}), "expanded_to_parent": True},
        })
        if len(expanded) >= limit:
            break
    return expanded


def hybrid_search(db: Session, query: str, limit: int, document_id: str | None = None, document_ids: list[str] | None = None, trace: dict | None = None, vector_weight: float = 1.0, bm25_weight: float = 1.0, use_reranker: bool = True) -> list[dict]:
    if vector_weight <= 0 and bm25_weight <= 0:
        raise ValueError("At least one retrieval weight must be greater than zero")
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
    vector_results = QdrantClient().search(query=query, limit=candidate_limit, document_id=document_id, document_ids=document_ids) if vector_weight > 0 else []
    vector_ms = round((perf_counter() - started) * 1000, 2) if vector_weight > 0 else 0.0
    started = perf_counter()
    corpus = _lexical_corpus(db, scoped_ids)
    rows = corpus.rows
    lexical_results = _bm25(query, rows, candidate_limit, corpus) if bm25_weight > 0 else []
    active_chunks = {str(chunk.id): (chunk, filename) for chunk, filename in rows}
    lexical_ms = round((perf_counter() - started) * 1000, 2)
    fused: dict[str, dict] = {}
    for source, source_name in ((vector_results, "vector"), (lexical_results, "bm25")):
        for rank, result in enumerate(source, 1):
            chunk_id = str(result.get("payload", {}).get("chunk_id") or result.get("id"))
            if chunk_id not in active_chunks:
                continue
            chunk, filename = active_chunks[chunk_id]
            # Vector payloads may be stale after an edit or a failed reindex.
            result = {**result, "payload": {
                "chunk_id": chunk_id, "document_id": str(chunk.document_id),
                "filename": filename, "chunk_index": chunk.chunk_index, "content": chunk.content,
            }}
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
