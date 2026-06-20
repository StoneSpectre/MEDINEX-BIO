"""
Step 8.1 — Retrieval Agent

Dual-mode retrieval combining:
  1. Dense vector search via Qdrant (semantic similarity)
  2. BM25 lexical search via Postgres full-text search (exact term matching)

Results are reciprocal-rank-fused (RRF) for a final ranked list.
The hybrid approach is deliberately chosen: biomedical queries often contain
exact gene names / drug names that semantic search under-weights.

Interface consumed by downstream Evidence Agent (Step 5 evidence tiering logic).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import ScoredPoint
import asyncpg


@dataclass
class RetrievedDoc:
    paper_id: str
    title: str
    abstract: str
    dense_rank: Optional[int]   # rank in Qdrant results (1-based), None if not in dense
    bm25_rank: Optional[int]    # rank in BM25 results (1-based), None if not in BM25
    rrf_score: float            # reciprocal-rank fusion score (higher = better)
    source: str                 # "dense" | "bm25" | "both"


def _rrf_score(rank: Optional[int], k: int = 60) -> float:
    """Standard RRF formula: 1 / (k + rank). k=60 is the common default."""
    if rank is None:
        return 0.0
    return 1.0 / (k + rank)


def _fuse(dense_hits: list[dict], bm25_hits: list[dict]) -> list[RetrievedDoc]:
    """
    Reciprocal Rank Fusion over two ranked lists.
    Each item is {'paper_id', 'title', 'abstract'}.
    """
    scores: dict[str, dict] = {}

    for rank, hit in enumerate(dense_hits, start=1):
        pid = hit["paper_id"]
        scores.setdefault(pid, {"meta": hit, "dense_rank": None, "bm25_rank": None})
        scores[pid]["dense_rank"] = rank

    for rank, hit in enumerate(bm25_hits, start=1):
        pid = hit["paper_id"]
        scores.setdefault(pid, {"meta": hit, "dense_rank": None, "bm25_rank": None})
        scores[pid]["bm25_rank"] = rank

    results = []
    for pid, data in scores.items():
        dr = data["dense_rank"]
        br = data["bm25_rank"]
        rrf = _rrf_score(dr) + _rrf_score(br)
        if dr is not None and br is not None:
            source = "both"
        elif dr is not None:
            source = "dense"
        else:
            source = "bm25"
        results.append(RetrievedDoc(
            paper_id=pid,
            title=data["meta"].get("title", ""),
            abstract=data["meta"].get("abstract", ""),
            dense_rank=dr,
            bm25_rank=br,
            rrf_score=rrf,
            source=source,
        ))

    results.sort(key=lambda x: x.rrf_score, reverse=True)
    return results


class RetrievalAgent:
    """
    Requires:
      - Qdrant running with papers embedded as 768-dim vectors
        (e.g., PubMedBERT embeddings, loaded by a separate ingestion job)
      - Postgres with the papers table from Step 7's schema.sql
        (full-text index added below in ensure_indexes)
    """

    def __init__(
        self,
        qdrant_host: str,
        qdrant_port: int,
        qdrant_collection: str,
        postgres_dsn: str,
        top_k: int = 50,
    ):
        self._qdrant = QdrantClient(host=qdrant_host, port=qdrant_port)
        self._collection = qdrant_collection
        self._postgres_dsn = postgres_dsn
        self._top_k = top_k
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(self._postgres_dsn, min_size=2, max_size=10)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    async def ensure_fts_index(self) -> None:
        """Add GIN full-text index to papers table if not present. Run once at startup."""
        async with self._pool.acquire() as conn:
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_papers_fts
                ON papers
                USING GIN(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'')))
            """)

    def _embed_query(self, query: str) -> list[float]:
        """
        Placeholder: in production, call a PubMedBERT embedding service.
        Swap this implementation for your actual embedding endpoint.
        Returns a zero vector (correct shape) so the class is importable without GPU.
        """
        vector_size = 768  # matches QDRANT_VECTOR_SIZE
        return [0.0] * vector_size

    def _dense_search(self, query_vector: list[float]) -> list[dict]:
        results: list[ScoredPoint] = self._qdrant.search(
            collection_name=self._collection,
            query_vector=query_vector,
            limit=self._top_k,
            with_payload=True,
        )
        return [
            {
                "paper_id": str(r.payload.get("paper_id", r.id)),
                "title": r.payload.get("title", ""),
                "abstract": r.payload.get("abstract", ""),
            }
            for r in results
        ]

    async def _bm25_search(self, query: str) -> list[dict]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id::text AS paper_id, title, abstract,
                       ts_rank_cd(
                           to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'')),
                           plainto_tsquery('english', $1)
                       ) AS rank
                FROM papers
                WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,''))
                      @@ plainto_tsquery('english', $1)
                ORDER BY rank DESC
                LIMIT $2
                """,
                query,
                self._top_k,
            )
        return [dict(r) for r in rows]

    async def retrieve(self, query: str, top_n: int = 20) -> list[RetrievedDoc]:
        """
        Main entry point. Returns top_n fused results.
        Dense search is synchronous (Qdrant client); BM25 is async (asyncpg).
        """
        query_vector = self._embed_query(query)
        dense_hits = self._dense_search(query_vector)
        bm25_hits = await self._bm25_search(query)
        fused = _fuse(dense_hits, bm25_hits)
        return fused[:top_n]
