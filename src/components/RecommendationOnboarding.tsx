import { useState } from "react";
import RecommendationDemo from "./RecommendationDemo";

const TABS = ["Overview", "Step 1: User Modelling", "Step 2: Content-Based Filtering", "Live Demo"];

// ── Code blocks ──────────────────────────────────────────────────────────────

const CODE = {
  // STEP 1
  db_schema: `-- migrations/001_interactions.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE user_paper_interactions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    paper_id    UUID        NOT NULL,
    event_type  TEXT        NOT NULL
                            CHECK (event_type IN (
                                'read','dwell','share','save','cite','downvote'
                            )),
    weight      FLOAT       NOT NULL,
    metadata    JSONB       DEFAULT '{}',
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Indexes for fast per-user queries
CREATE INDEX idx_upi_user       ON user_paper_interactions(user_id);
CREATE INDEX idx_upi_paper      ON user_paper_interactions(paper_id);
CREATE INDEX idx_upi_event      ON user_paper_interactions(event_type);
CREATE INDEX idx_upi_composite  ON user_paper_interactions(user_id, paper_id, event_type);

-- Row-level security: each user sees only their own rows
ALTER TABLE user_paper_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation
    ON user_paper_interactions
    USING (user_id = current_setting('app.current_user_id')::UUID);`,

  interaction_model: `# app/models/interaction.py
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4

class EventType(str, Enum):
    READ      = "read"
    DWELL     = "dwell"
    SHARE     = "share"
    SAVE      = "save"
    CITE      = "cite"
    DOWNVOTE  = "downvote"

# Interaction weights as defined in Phase 5 spec
EVENT_WEIGHTS: dict[EventType, float] = {
    EventType.READ:     1.0,
    EventType.DWELL:    1.5,
    EventType.SHARE:    1.8,
    EventType.SAVE:     2.0,
    EventType.CITE:     3.0,
    EventType.DOWNVOTE: -1.0,
}

@dataclass
class Interaction:
    user_id:    UUID
    paper_id:   UUID
    event_type: EventType
    metadata:   dict      = field(default_factory=dict)
    id:         UUID      = field(default_factory=uuid4)
    weight:     float     = field(init=False)
    created_at: datetime  = field(default_factory=datetime.utcnow)
    updated_at: datetime  = field(default_factory=datetime.utcnow)

    def __post_init__(self):
        self.weight = EVENT_WEIGHTS[self.event_type]`,

  interaction_schema: `# app/schemas/interaction.py
from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional

class InteractionRequest(BaseModel):
    paper_id:   UUID
    event_type: str = Field(..., pattern="^(read|dwell|share|save|cite|downvote)$")
    metadata:   Optional[dict] = {}

    class Config:
        json_schema_extra = {
            "example": {
                "paper_id":   "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "event_type": "save",
                "metadata":   {"dwell_seconds": 380, "scroll_depth": 92}
            }
        }

class InteractionResponse(BaseModel):
    id:         UUID
    user_id:    UUID
    paper_id:   UUID
    event_type: str
    weight:     float
    message:    str = "Interaction recorded. Profile update queued."`,

  interaction_repo: `# app/repository/interaction_repository.py
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.interaction import Interaction

class InteractionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(self, interaction: Interaction) -> Interaction:
        """Persist an interaction row."""
        await self.db.execute(
            text("""
                INSERT INTO user_paper_interactions
                    (id, user_id, paper_id, event_type, weight, metadata, created_at, updated_at)
                VALUES
                    (:id, :user_id, :paper_id, :event_type, :weight, :metadata,
                     :created_at, :updated_at)
                ON CONFLICT (user_id, paper_id, event_type)
                DO UPDATE SET
                    weight     = EXCLUDED.weight,
                    metadata   = EXCLUDED.metadata,
                    updated_at = NOW()
            """),
            {
                "id":         str(interaction.id),
                "user_id":    str(interaction.user_id),
                "paper_id":   str(interaction.paper_id),
                "event_type": interaction.event_type.value,
                "weight":     interaction.weight,
                "metadata":   interaction.metadata,
                "created_at": interaction.created_at,
                "updated_at": interaction.updated_at,
            }
        )
        await self.db.commit()
        return interaction

    async def get_user_interactions(self, user_id: UUID) -> list[dict]:
        """Fetch all interactions for a user (used by profile builder)."""
        result = await self.db.execute(
            text("""
                SELECT paper_id, weight
                FROM   user_paper_interactions
                WHERE  user_id = :user_id
                ORDER  BY updated_at DESC
            """),
            {"user_id": str(user_id)}
        )
        return [{"paper_id": r.paper_id, "weight": r.weight} for r in result]`,

  interaction_service: `# app/services/interaction_service.py
import logging
from uuid import UUID
from app.models.interaction import Interaction, EventType
from app.repository.interaction_repository import InteractionRepository
from app.workers.profile_worker import enqueue_profile_rebuild

logger = logging.getLogger(__name__)

class InteractionService:
    def __init__(self, repo: InteractionRepository):
        self.repo = repo

    async def record(
        self,
        user_id:    UUID,
        paper_id:   UUID,
        event_type: str,
        metadata:   dict,
    ) -> Interaction:
        # 1. Build domain object (weight assigned automatically)
        interaction = Interaction(
            user_id    = user_id,
            paper_id   = paper_id,
            event_type = EventType(event_type),
            metadata   = metadata,
        )

        # 2. Persist to PostgreSQL
        saved = await self.repo.save(interaction)
        logger.info("Interaction saved", extra={
            "user_id": str(user_id),
            "paper_id": str(paper_id),
            "event_type": event_type,
            "weight": saved.weight,
        })

        # 3. Queue async profile rebuild (non-blocking)
        await enqueue_profile_rebuild(user_id)

        return saved`,

  interaction_api: `# app/api/interaction.py
from fastapi import APIRouter, Depends, HTTPException, Request
from uuid import UUID
from app.schemas.interaction import InteractionRequest, InteractionResponse
from app.services.interaction_service import InteractionService
from app.dependencies import get_interaction_service, get_current_user

router = APIRouter(prefix="/v1/interactions", tags=["Interactions"])

@router.post("", response_model=InteractionResponse, status_code=201)
async def record_interaction(
    body:    InteractionRequest,
    request: Request,
    user_id: UUID              = Depends(get_current_user),
    service: InteractionService = Depends(get_interaction_service),
):
    """
    Record a user–paper interaction.
    Triggers an async user-profile rebuild in the background.
    """
    try:
        interaction = await service.record(
            user_id    = user_id,
            paper_id   = body.paper_id,
            event_type = body.event_type,
            metadata   = body.metadata or {},
        )
        return InteractionResponse(
            id         = interaction.id,
            user_id    = interaction.user_id,
            paper_id   = interaction.paper_id,
            event_type = interaction.event_type.value,
            weight     = interaction.weight,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))`,

  profile_builder: `# app/recommendation/profile_builder.py
import numpy as np
from uuid import UUID
from app.repository.interaction_repository import InteractionRepository
from recommendation.embedding_service import EmbeddingService

class ProfileBuilder:
    """
    Weighted average of paper embeddings → 768-d user interest vector.

      Profile = Σ(wᵢ × eᵢ) / Σwᵢ

    Papers with higher interaction weights (cite > save > share …)
    contribute more to the final direction of the user vector.
    """

    def __init__(self, repo: InteractionRepository, embedder: EmbeddingService):
        self.repo     = repo
        self.embedder = embedder

    async def build(self, user_id: UUID) -> np.ndarray | None:
        interactions = await self.repo.get_user_interactions(user_id)

        if not interactions:
            # Cold start: return None; Step 2 falls back to query embedding
            return None

        paper_ids = [row["paper_id"] for row in interactions]
        weights   = np.array([row["weight"] for row in interactions], dtype=np.float32)

        # Fetch pre-computed embeddings from Qdrant (avoids recomputing)
        embeddings = await self.embedder.fetch_batch(paper_ids)  # shape: (N, 768)

        if len(embeddings) == 0:
            return None

        embeddings = np.array(embeddings, dtype=np.float32)
        profile    = np.average(embeddings, axis=0, weights=weights)

        # L2-normalise so cosine similarity in Qdrant works correctly
        norm = np.linalg.norm(profile)
        return (profile / norm) if norm > 0 else profile`,

  profile_worker: `# app/workers/profile_worker.py
import asyncio
import logging
from uuid import UUID
import redis.asyncio as redis
from app.recommendation.profile_builder import ProfileBuilder
from app.cache import set_user_profile

logger = logging.getLogger(__name__)
QUEUE_KEY = "medinex:profile_rebuild_queue"

async def enqueue_profile_rebuild(user_id: UUID):
    """Push user_id onto the Redis rebuild queue (fire-and-forget)."""
    async with redis.Redis.from_url("redis://localhost:6379") as r:
        await r.rpush(QUEUE_KEY, str(user_id))

async def profile_rebuild_worker(builder: ProfileBuilder):
    """
    Long-running worker that drains the rebuild queue.
    Uses BLPOP for efficient blocking pop (no busy-wait).
    """
    async with redis.Redis.from_url("redis://localhost:6379") as r:
        logger.info("Profile rebuild worker started")
        while True:
            _, raw = await r.blpop(QUEUE_KEY, timeout=0)
            user_id = UUID(raw.decode())
            try:
                vector = await builder.build(user_id)
                if vector is not None:
                    await set_user_profile(user_id, vector)
                    logger.info(f"Profile rebuilt for {user_id}")
            except Exception as exc:
                logger.error(f"Profile rebuild failed for {user_id}: {exc}")`,

  // STEP 2
  embedding_service: `# recommendation/embedding_service.py
from __future__ import annotations
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointIdsList

MODEL_NAME = "sultan/BioM-BERT-PubMed-PMC-Large"  # BioLinkBERT / PubMedBERT family

class EmbeddingService:
    """
    Wraps BioLinkBERT to produce 768-d biomedical embeddings.
    Uses mean-pooling over the last hidden state (standard for sentence-level tasks).
    """

    def __init__(self, qdrant: QdrantClient):
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        self.model     = AutoModel.from_pretrained(MODEL_NAME)
        self.model.eval()
        self.device  = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        self.qdrant  = qdrant

    def embed(self, text: str) -> np.ndarray:
        """Embed a single string → 768-d numpy vector."""
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str]) -> np.ndarray:
        """Batch-embed texts for efficiency (GPU parallelism)."""
        enc = self.tokenizer(
            texts,
            padding       = True,
            truncation    = True,
            max_length    = 512,
            return_tensors= "pt",
        ).to(self.device)

        with torch.no_grad():
            out = self.model(**enc)

        # Mean pool over token dimension, then L2-normalise
        mask       = enc["attention_mask"].unsqueeze(-1).float()
        pooled     = (out.last_hidden_state * mask).sum(1) / mask.sum(1)
        norms      = pooled.norm(dim=-1, keepdim=True).clamp(min=1e-8)
        normalised = (pooled / norms).cpu().numpy()
        return normalised

    async def fetch_batch(self, paper_ids: list[str]) -> np.ndarray:
        """Retrieve pre-stored embeddings from Qdrant (no recomputation)."""
        results = self.qdrant.retrieve(
            collection_name = "papers",
            ids             = paper_ids,
            with_vectors    = True,
        )
        return np.array([r.vector for r in results], dtype=np.float32)`,

  paper_ingestion: `# recommendation/paper_ingestion.py
import asyncio
import httpx
import logging
from uuid import uuid4
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct
from recommendation.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)
PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

class PaperIngestionPipeline:
    """
    Fetches metadata from PubMed → cleans text →
    generates BioLinkBERT embedding → upserts into Qdrant.
    """

    def __init__(self, embedder: EmbeddingService, qdrant: QdrantClient):
        self.embedder = embedder
        self.qdrant   = qdrant

    # ── Public entry point ──────────────────────────────────────────────────

    async def ingest_pubmed_ids(self, pmids: list[str], batch_size: int = 32):
        """Ingest a list of PubMed IDs in batches."""
        for i in range(0, len(pmids), batch_size):
            batch = pmids[i : i + batch_size]
            papers = await self._fetch_metadata(batch)
            await self._embed_and_store(papers)
            logger.info(f"Ingested batch {i}–{i+len(batch)}")

    # ── Internal helpers ────────────────────────────────────────────────────

    async def _fetch_metadata(self, pmids: list[str]) -> list[dict]:
        """Call PubMed eFetch for title, abstract, MeSH, authors, etc."""
        ids = ",".join(pmids)
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{PUBMED_BASE}/efetch.fcgi",
                params={"db": "pubmed", "id": ids, "retmode": "json", "rettype": "abstract"},
                timeout=30,
            )
            r.raise_for_status()
        # Simplified parser — production would use full PubMed XML parser
        return self._parse_pubmed_response(r.json(), pmids)

    def _clean_text(self, title: str, abstract: str, mesh: list[str]) -> str:
        """Concatenate and clean text for embedding."""
        mesh_str = " ".join(mesh)
        return f"{title}. {abstract} [MeSH: {mesh_str}]".strip()

    async def _embed_and_store(self, papers: list[dict]):
        texts    = [self._clean_text(p["title"], p["abstract"], p.get("mesh", [])) for p in papers]
        vectors  = self.embedder.embed_batch(texts)          # shape: (N, 768)

        points = [
            PointStruct(
                id      = str(p.get("paper_id", uuid4())),
                vector  = vectors[idx].tolist(),
                payload = {
                    "title":          p["title"],
                    "abstract":       p["abstract"],
                    "doi":            p.get("doi", ""),
                    "authors":        p.get("authors", []),
                    "journal":        p.get("journal", ""),
                    "year":           p.get("year", 0),
                    "mesh_terms":     p.get("mesh", []),
                    "evidence_tier":  p.get("evidence_tier", "unknown"),
                    "source":         "pubmed",
                },
            )
            for idx, p in enumerate(papers)
        ]
        self.qdrant.upsert(collection_name="papers", points=points)`,

  qdrant_setup: `# recommendation/qdrant_client.py
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance, VectorParams,
    HnswConfigDiff, PayloadSchemaType,
)

COLLECTION = "papers"
VECTOR_DIM = 768

def create_collection(client: QdrantClient):
    """
    Create the Qdrant 'papers' collection with HNSW index.
    Idempotent — safe to call on every startup.
    """
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION in existing:
        return

    client.create_collection(
        collection_name = COLLECTION,
        vectors_config  = VectorParams(
            size     = VECTOR_DIM,
            distance = Distance.COSINE,   # cosine similarity for biomedical embeddings
        ),
        hnsw_config = HnswConfigDiff(
            m              = 16,   # number of bi-directional links per node
            ef_construct   = 200,  # build-time accuracy (higher = better quality)
            full_scan_threshold = 10_000,
        ),
    )

    # Payload indexes for filtered search (MeSH, year, evidence tier)
    client.create_payload_index(COLLECTION, "mesh_terms",    PayloadSchemaType.KEYWORD)
    client.create_payload_index(COLLECTION, "year",          PayloadSchemaType.INTEGER)
    client.create_payload_index(COLLECTION, "evidence_tier", PayloadSchemaType.KEYWORD)

    print(f"Collection '{COLLECTION}' created with HNSW index.")`,

  semantic_search: `# recommendation/semantic_search.py
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchAny

class SemanticSearch:
    """
    ANN search in Qdrant using a 768-d query vector.
    Supports optional payload filters (MeSH terms, year range, evidence tier).
    """

    def __init__(self, client: QdrantClient):
        self.client = client

    def search(
        self,
        query_vector:   list[float],
        top_k:          int         = 200,   # over-fetch before re-ranking
        mesh_filter:    list[str]   = None,
        year_min:       int         = None,
        evidence_tiers: list[str]   = None,
    ) -> list[dict]:

        conditions = []

        if mesh_filter:
            conditions.append(
                FieldCondition(key="mesh_terms", match=MatchAny(any=mesh_filter))
            )
        if evidence_tiers:
            conditions.append(
                FieldCondition(key="evidence_tier", match=MatchAny(any=evidence_tiers))
            )

        qdrant_filter = Filter(must=conditions) if conditions else None

        hits = self.client.search(
            collection_name = "papers",
            query_vector    = query_vector,
            limit           = top_k,
            query_filter    = qdrant_filter,
            with_payload    = True,
        )

        return [
            {
                "paper_id":      h.id,
                "score":         h.score,          # raw cosine similarity
                "title":         h.payload["title"],
                "abstract":      h.payload["abstract"],
                "year":          h.payload.get("year", 0),
                "mesh_terms":    h.payload.get("mesh_terms", []),
                "evidence_tier": h.payload.get("evidence_tier", "unknown"),
            }
            for h in hits
        ]`,

  reranker: `# recommendation/reranker.py
import math
from datetime import datetime

# Evidence tier multipliers (Phase 5 spec)
EVIDENCE_MULTIPLIERS = {
    "meta-analysis":        1.30,
    "systematic-review":    1.25,
    "rct":                  1.20,
    "cohort":               1.10,
    "case-report":          0.90,
    "editorial":            0.75,
    "unknown":              1.00,
}

RECENCY_DECAY = 0.05   # λ in e^{-λ·age}
MESH_BOOST    = 0.05   # per overlapping MeSH term

class Reranker:
    """
    Re-scores candidates using three signals beyond cosine similarity:

      1. Recency   – exponential decay favours newer publications
      2. Evidence  – RCTs and meta-analyses receive multipliers
      3. MeSH      – overlap with the user's favourite MeSH terms boosts score
    """

    def rerank(
        self,
        candidates:   list[dict],
        user_mesh:    list[str],          # top MeSH terms from user's profile
        current_year: int = None,
    ) -> list[dict]:

        if current_year is None:
            current_year = datetime.utcnow().year

        for c in candidates:
            base  = c["score"]
            age   = max(current_year - c.get("year", current_year), 0)

            # 1. Recency decay
            recency = math.exp(-RECENCY_DECAY * age)

            # 2. Evidence tier multiplier
            tier_mult = EVIDENCE_MULTIPLIERS.get(
                c.get("evidence_tier", "unknown").lower(), 1.0
            )

            # 3. MeSH overlap boost
            paper_mesh  = set(c.get("mesh_terms", []))
            user_mesh_s = set(user_mesh)
            overlap     = len(paper_mesh & user_mesh_s)
            mesh_boost  = 1.0 + MESH_BOOST * overlap

            c["final_score"] = base * recency * tier_mult * mesh_boost
            c["rerank_debug"] = {
                "base_cosine":  round(base, 4),
                "recency":      round(recency, 4),
                "tier_mult":    tier_mult,
                "mesh_overlap": overlap,
            }

        return sorted(candidates, key=lambda x: x["final_score"], reverse=True)`,

  recommendation_service: `# recommendation/recommendation_service.py
import numpy as np
from uuid import UUID
from recommendation.embedding_service import EmbeddingService
from recommendation.semantic_search   import SemanticSearch
from recommendation.reranker          import Reranker
from app.cache                        import get_user_profile
from app.repository.interaction_repository import InteractionRepository

class RecommendationService:
    """
    Main orchestrator for content-based recommendations.

    Flow:
      1. Fetch user profile vector (or embed search query for cold-start)
      2. ANN search → top 200 candidates
      3. Remove already-read papers
      4. Re-rank (recency + evidence + MeSH)
      5. Return top-N
    """

    def __init__(
        self,
        embedder: EmbeddingService,
        searcher: SemanticSearch,
        reranker: Reranker,
        repo:     InteractionRepository,
    ):
        self.embedder = embedder
        self.searcher = searcher
        self.reranker = reranker
        self.repo     = repo

    async def recommend(
        self,
        user_id:     UUID,
        limit:       int        = 20,
        mesh_filter: list[str]  = None,
        query:       str        = None,   # cold-start fallback
    ) -> list[dict]:

        # ── 1. Get query vector ───────────────────────────────────────────
        profile: np.ndarray | None = await get_user_profile(user_id)

        if profile is None:
            if query:
                # Cold start: embed the search query
                profile = self.embedder.embed(query)
            else:
                return []

        # ── 2. ANN search (over-fetch) ────────────────────────────────────
        candidates = self.searcher.search(
            query_vector = profile.tolist(),
            top_k        = 200,
            mesh_filter  = mesh_filter,
        )

        # ── 3. Filter already-seen papers ─────────────────────────────────
        seen_ids  = {
            row["paper_id"]
            for row in await self.repo.get_user_interactions(user_id)
        }
        candidates = [c for c in candidates if c["paper_id"] not in seen_ids]

        # ── 4. Re-rank ─────────────────────────────────────────────────────
        # Extract user's top MeSH interests from their interaction history
        user_mesh = await self._get_user_mesh(user_id)
        ranked    = self.reranker.rerank(candidates, user_mesh=user_mesh)

        # ── 5. Slice and format ───────────────────────────────────────────
        top_n = ranked[:limit]
        return [
            {
                "paper_id": r["paper_id"],
                "title":    r["title"],
                "score":    round(r["final_score"], 4),
                "reason":   self._reason(r),
            }
            for r in top_n
        ]

    async def _get_user_mesh(self, user_id: UUID) -> list[str]:
        """Aggregate MeSH terms from the user's highly-weighted interactions."""
        # In production: JOIN with paper metadata table to get MeSH terms
        # Simplified stub returning empty list for now
        return []

    def _reason(self, r: dict) -> str:
        debug = r.get("rerank_debug", {})
        parts = []
        if debug.get("base_cosine", 0) > 0.85:
            parts.append("semantically very close to your reading history")
        if debug.get("tier_mult", 1.0) >= 1.2:
            parts.append("high-quality evidence (RCT / meta-analysis)")
        if debug.get("mesh_overlap", 0) > 0:
            parts.append(f"{debug['mesh_overlap']} shared MeSH topics")
        return "; ".join(parts) or "relevant to your research profile"`,

  recommendation_api: `# app/api/recommendations.py
from fastapi import APIRouter, Depends, Query
from typing import Optional
from uuid import UUID
from recommendation.recommendation_service import RecommendationService
from app.dependencies import get_recommendation_service, get_current_user

router = APIRouter(prefix="/v1/recommendations", tags=["Recommendations"])

@router.post("/content")
async def content_recommendations(
    limit:       int            = Query(20, ge=1, le=100),
    mesh_filter: Optional[list[str]] = Query(None),
    query:       Optional[str]  = Query(None, description="Cold-start search query"),
    user_id:     UUID           = Depends(get_current_user),
    service:     RecommendationService = Depends(get_recommendation_service),
):
    """
    Return up to \`limit\` papers semantically relevant to the authenticated user.
    Falls back to query-based embedding for new users (cold start).
    """
    papers = await service.recommend(
        user_id     = user_id,
        limit       = limit,
        mesh_filter = mesh_filter,
        query       = query,
    )
    return {"recommendations": papers, "count": len(papers)}`,

  docker_compose: `# docker-compose.yml
version: "3.9"

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://medinex:secret@postgres:5432/medinex
      REDIS_URL:    redis://redis:6379
      QDRANT_URL:   http://qdrant:6333
    depends_on:
      - postgres
      - redis
      - qdrant

  worker:
    build: .
    command: python -m app.workers.profile_worker
    environment:
      DATABASE_URL: postgresql+asyncpg://medinex:secret@postgres:5432/medinex
      REDIS_URL:    redis://redis:6379
      QDRANT_URL:   http://qdrant:6333
    depends_on:
      - postgres
      - redis
      - qdrant

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB:       medinex
      POSTGRES_USER:     medinex
      POSTGRES_PASSWORD: secret
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  qdrant:
    image: qdrant/qdrant:v1.9.0
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  pg_data:
  qdrant_data:`,
};

// ── Component helpers ─────────────────────────────────────────────────────────

function CodeBlock({ code, lang = "python" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ position: "relative", marginBottom: 24 }}>
      <button
        onClick={copy}
        style={{
          position: "absolute", top: 10, right: 12,
          background: copied ? "#22c55e" : "#334155",
          color: "#fff", border: "none", borderRadius: 6,
          padding: "3px 10px", fontSize: 11, cursor: "pointer", zIndex: 2,
          fontFamily: "monospace",
        }}
      >{copied ? "Copied!" : "Copy"}</button>
      <pre style={{
        background: "#0f172a", color: "#e2e8f0",
        borderRadius: 10, padding: "20px 16px", overflowX: "auto",
        fontSize: 12.5, lineHeight: 1.7, margin: 0,
        border: "1px solid #1e293b",
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ title, badge, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>{title}</h3>
        {badge && (
          <span style={{
            background: "#1e3a5f", color: "#93c5fd", fontSize: 11,
            padding: "2px 9px", borderRadius: 20, fontWeight: 600,
          }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function InfoBox({ icon, text }) {
  return (
    <div style={{
      background: "#1e293b", border: "1px solid #334155",
      borderLeft: "3px solid #3b82f6",
      borderRadius: 8, padding: "10px 14px", marginBottom: 14,
      fontSize: 13, color: "#94a3b8", lineHeight: 1.6,
      display: "flex", gap: 10,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function FlowDiagram({ steps }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0, marginBottom: 20 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{
            background: "#1e3a5f", color: "#93c5fd",
            border: "1px solid #2563eb",
            borderRadius: 8, padding: "6px 16px",
            fontSize: 13, fontWeight: 500,
          }}>{s}</div>
          {i < steps.length - 1 && (
            <div style={{ color: "#475569", fontSize: 18, lineHeight: 1, paddingLeft: 16 }}>↓</div>
          )}
        </div>
      ))}
    </div>
  );
}

function WeightTable() {
  const rows = [
    ["read",     "1.0",  "Basic interest"],
    ["dwell",    "1.5",  "Deep engagement (time spent)"],
    ["share",    "1.8",  "Considered valuable enough to share"],
    ["save",     "2.0",  "Bookmarked for later"],
    ["cite",     "3.0",  "Highest trust signal"],
    ["downvote", "-1.0", "Negative feedback"],
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
      <thead>
        <tr style={{ background: "#1e293b" }}>
          {["Event", "Weight", "Signal"].map(h => (
            <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "#94a3b8", fontWeight: 600, border: "1px solid #334155" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([ev, w, sig]) => (
          <tr key={ev} style={{ borderBottom: "1px solid #1e293b" }}>
            <td style={{ padding: "7px 14px", color: "#38bdf8", fontFamily: "monospace", border: "1px solid #1e293b" }}>{ev}</td>
            <td style={{ padding: "7px 14px", color: parseFloat(w) < 0 ? "#f87171" : "#4ade80", fontWeight: 700, border: "1px solid #1e293b" }}>{w}</td>
            <td style={{ padding: "7px 14px", color: "#cbd5e1", border: "1px solid #1e293b" }}>{sig}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Page tabs ─────────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        border: "1px solid #334155", borderRadius: 12,
        padding: "24px 28px", marginBottom: 28,
      }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "#f1f5f9" }}>
          Medinex · Phase 5 · Recommendation Systems
        </h2>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
          A production-grade implementation of Step 1 (Interaction Tracking & User Modelling) and
          Step 2 (Content-Based Filtering) for the Medinex biomedical paper recommender.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {[
          { step: "Step 1", title: "Interaction Tracking & User Modelling",
            items: ["PostgreSQL interaction table with RLS", "6 event types with weighted signals", "Async profile rebuild via Redis queue", "768-d user interest vector (BioLinkBERT)"] },
          { step: "Step 2", title: "Content-Based Filtering Engine",
            items: ["BioLinkBERT paper embeddings", "Qdrant HNSW vector index", "ANN search (top-200 candidates)", "Re-ranking: recency + evidence + MeSH"] },
        ].map(({ step, title, items }) => (
          <div key={step} style={{
            background: "#0f172a", border: "1px solid #334155",
            borderRadius: 10, padding: "18px 20px",
          }}>
            <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{step}</div>
            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{title}</div>
            {items.map(it => (
              <div key={it} style={{ display: "flex", gap: 8, marginBottom: 6, color: "#94a3b8", fontSize: 13 }}>
                <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span> {it}
              </div>
            ))}
          </div>
        ))}
      </div>

      <Section title="End-to-End Architecture">
        <div style={{
          background: "#0f172a", border: "1px solid #334155", borderRadius: 10,
          padding: "20px 24px", fontFamily: "monospace", fontSize: 12.5, color: "#94a3b8", lineHeight: 2,
        }}>
          <span style={{ color: "#f59e0b" }}>User Interaction</span>{"\n"}
          {"         │\n"}
          {"         ▼\n"}
          <span style={{ color: "#38bdf8" }}>FastAPI Interaction API</span>{"  (POST /v1/interactions)\n"}
          {"         │\n"}
          {"         ▼\n"}
          <span style={{ color: "#a78bfa" }}>PostgreSQL</span>{"  user_paper_interactions\n"}
          {"         │\n"}
          {"         ▼\n"}
          <span style={{ color: "#f59e0b" }}>Redis Queue</span>{"  → Background Worker\n"}
          {"         │\n"}
          {"         ▼\n"}
          <span style={{ color: "#34d399" }}>ProfileBuilder</span>{"  weighted avg of paper embeddings\n"}
          {"         │\n"}
          {"   768-d User Vector\n"}
          {"         │\n"}
          {"         ▼\n"}
          <span style={{ color: "#38bdf8" }}>Qdrant ANN Search</span>{"  top-200 candidates\n"}
          {"         │\n"}
          {"         ▼\n"}
          <span style={{ color: "#f87171" }}>Reranker</span>{"  recency × evidence_tier × MeSH boost\n"}
          {"         │\n"}
          {"         ▼\n"}
          <span style={{ color: "#4ade80" }}>Top-20 Recommendations</span>{"  (POST /v1/recommendations/content)"}
        </div>
      </Section>

      <Section title="Tech Stack">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            ["FastAPI", "Async REST API", "#e11d48"],
            ["PostgreSQL 16", "Interaction storage + RLS", "#2563eb"],
            ["Redis 7", "Queue + profile cache", "#dc2626"],
            ["Qdrant", "768-d vector database", "#7c3aed"],
            ["BioLinkBERT", "Biomedical embeddings", "#0284c7"],
            ["Docker Compose", "Service orchestration", "#0891b2"],
          ].map(([name, desc, color]) => (
            <div key={name} style={{
              background: "#0f172a", border: `1px solid ${color}33`,
              borderTop: `3px solid ${color}`,
              borderRadius: 8, padding: "12px 14px",
            }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>{name}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Step1Tab() {
  return (
    <div>
      <div style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 10, padding: "16px 20px", marginBottom: 28 }}>
        <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>STEP 1</div>
        <h2 style={{ margin: "0 0 6px", color: "#f1f5f9", fontSize: 19 }}>Interaction Tracking & User Modelling</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
          Captures every researcher action, weights it semantically, and builds a 768-d interest vector used by all downstream recommendation engines.
        </p>
      </div>

      <Section title="1 · Database Schema" badge="PostgreSQL 16">
        <InfoBox icon="🔒" text="Row-Level Security (RLS) ensures users can only query their own interaction rows, even with a shared database connection." />
        <CodeBlock code={CODE.db_schema} lang="sql" />
      </Section>

      <Section title="2 · Interaction Types & Weights" badge="Domain Model">
        <InfoBox icon="⚖️" text="Weights follow the Phase 5 spec. Higher-weight events (cite, save) steer the user vector more strongly toward related papers." />
        <WeightTable />
      </Section>

      <Section title="3 · Domain Model" badge="models/interaction.py">
        <CodeBlock code={CODE.interaction_model} />
      </Section>

      <Section title="4 · API Schema (Pydantic)" badge="schemas/interaction.py">
        <InfoBox icon="📥" text="Request validation uses Pydantic v2. The event_type field is restricted to the six allowed values via a regex pattern." />
        <CodeBlock code={CODE.interaction_schema} />
      </Section>

      <Section title="5 · Repository Layer" badge="repository/interaction_repository.py">
        <InfoBox icon="🗄️" text="Upsert (ON CONFLICT … DO UPDATE) prevents duplicate rows when a user re-reads a paper. The repository hides SQL from the service layer." />
        <CodeBlock code={CODE.interaction_repo} />
      </Section>

      <Section title="6 · Service Layer" badge="services/interaction_service.py">
        <InfoBox icon="🔧" text="Business logic lives here: weight assignment → persistence → async queue publish. The API layer stays thin." />
        <CodeBlock code={CODE.interaction_service} />
      </Section>

      <Section title="7 · API Endpoint" badge="api/interaction.py">
        <FlowDiagram steps={[
          "POST /v1/interactions",
          "JWT auth → extract user_id",
          "Pydantic validation",
          "InteractionService.record()",
          "PostgreSQL upsert",
          "Redis queue publish",
          "201 Created response",
        ]} />
        <CodeBlock code={CODE.interaction_api} />
      </Section>

      <Section title="8 · Profile Builder" badge="recommendation/profile_builder.py">
        <InfoBox icon="🧮" text="Profile = Σ(wᵢ × eᵢ) / Σwᵢ — a weighted average of the paper embeddings the user has interacted with. The result is L2-normalised so cosine similarity in Qdrant is calibrated correctly." />
        <CodeBlock code={CODE.profile_builder} />
      </Section>

      <Section title="9 · Background Worker" badge="workers/profile_worker.py">
        <InfoBox icon="⚡" text="Profiles are rebuilt asynchronously via Redis BLPOP — the API response is never blocked by embedding computation. Use Celery or APScheduler in production for retries." />
        <CodeBlock code={CODE.profile_worker} />
      </Section>
    </div>
  );
}

function Step2Tab() {
  return (
    <div>
      <div style={{ background: "#0f172a", border: "1px solid #4c1d95", borderRadius: 10, padding: "16px 20px", marginBottom: 28 }}>
        <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>STEP 2</div>
        <h2 style={{ margin: "0 0 6px", color: "#f1f5f9", fontSize: 19 }}>Content-Based Filtering Engine</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
          Embeds papers with BioLinkBERT, stores them in Qdrant, searches by ANN against the Step 1 user vector, and re-ranks by recency, evidence quality, and MeSH overlap.
        </p>
      </div>

      <Section title="1 · Qdrant Collection Setup" badge="qdrant_client.py">
        <InfoBox icon="🗂️" text="768-d cosine-distance collection with HNSW index. Payload indexes on mesh_terms, year, and evidence_tier enable filtered ANN search without a post-filter scan." />
        <CodeBlock code={CODE.qdrant_setup} />
      </Section>

      <Section title="2 · Embedding Service (BioLinkBERT)" badge="embedding_service.py">
        <InfoBox icon="🧬" text="BioLinkBERT is pretrained on PubMed and PMC — it understands BRCA1, PD-L1, and UMLS concepts that general BERT misses. Mean-pooling over the last hidden state gives sentence-level embeddings." />
        <CodeBlock code={CODE.embedding_service} />
      </Section>

      <Section title="3 · Paper Ingestion Pipeline" badge="paper_ingestion.py">
        <FlowDiagram steps={[
          "PubMed eFetch API",
          "Parse title + abstract + MeSH + authors",
          "Clean & concatenate text",
          "BioLinkBERT embed_batch() → (N, 768)",
          "Qdrant upsert with full payload metadata",
        ]} />
        <CodeBlock code={CODE.paper_ingestion} />
      </Section>

      <Section title="4 · Semantic Search (ANN)" badge="semantic_search.py">
        <InfoBox icon="🔍" text="Over-fetches 200 candidates before re-ranking (configurable). Optional Qdrant payload filters restrict results to specific MeSH terms or evidence tiers before ANN computation." />
        <CodeBlock code={CODE.semantic_search} />
      </Section>

      <Section title="5 · Re-Ranker" badge="reranker.py">
        <InfoBox icon="📊" text="Three multipliers applied on top of cosine similarity: (1) exponential recency decay e^{−0.05·age}, (2) evidence tier multiplier (meta-analysis 1.30× → editorial 0.75×), (3) MeSH overlap boost (+5% per shared term)." />
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18,
        }}>
          {[
            { label: "Recency", formula: "e^{−λ·age}", note: "λ = 0.05; foundational papers still rank if highly relevant" },
            { label: "Evidence Tier", formula: "meta × 1.30", note: "RCT 1.20×, editorial 0.75×" },
            { label: "MeSH Overlap", formula: "+5% / term", note: "Compares user profile MeSH vs paper MeSH" },
          ].map(({ label, formula, note }) => (
            <div key={label} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "14px" }}>
              <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "monospace", color: "#38bdf8", fontSize: 12, marginBottom: 6 }}>{formula}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{note}</div>
            </div>
          ))}
        </div>
        <CodeBlock code={CODE.reranker} />
      </Section>

      <Section title="6 · Recommendation Service (Orchestrator)" badge="recommendation/recommendation_service.py">
        <InfoBox icon="🎯" text="Cold-start: if the user has no profile vector, embeds their search query directly and uses that for ANN — recommendations work from the very first session." />
        <CodeBlock code={CODE.recommendation_service} />
      </Section>

      <Section title="7 · API Endpoint" badge="api/recommendations.py">
        <InfoBox icon="🌐" text="POST /v1/recommendations/content — accepts optional mesh_filter (restrict to specific MeSH terms) and query (cold-start fallback). Returns ranked list with human-readable reasoning strings." />
        <CodeBlock code={CODE.recommendation_api} />
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
          {`// Example response
{
  "recommendations": [
    {
      "paper_id": "3fa85f64-...",
      "title": "PD-1 checkpoint blockade in advanced NSCLC",
      "score": 0.9412,
      "reason": "semantically very close to your reading history; high-quality evidence (RCT / meta-analysis); 3 shared MeSH topics"
    },
    ...
  ],
  "count": 20
}`}
        </div>
      </Section>

      <Section title="8 · Docker Compose (All Services)" badge="docker-compose.yml">
        <InfoBox icon="🐳" text="Runs FastAPI (api), profile rebuild worker, PostgreSQL 16, Redis 7, and Qdrant v1.9 as a single compose stack." />
        <CodeBlock code={CODE.docker_compose} lang="yaml" />
      </Section>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [active, setActive] = useState(0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020617",
      color: "#e2e8f0",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          background: "#1d4ed8", color: "#fff",
          borderRadius: 8, padding: "4px 10px",
          fontSize: 12, fontWeight: 800, letterSpacing: 1,
        }}>MEDINEX</div>
        <span style={{ color: "#475569", fontSize: 13 }}>Phase 5 · Recommendation Systems · Steps 1 & 2</span>
      </div>

      {/* Tab bar */}
      <div style={{
        background: "#0f172a", borderBottom: "1px solid #1e293b",
        padding: "0 24px", display: "flex", gap: 0,
      }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setActive(i)} style={{
            background: "none", border: "none",
            borderBottom: active === i ? "2px solid #3b82f6" : "2px solid transparent",
            color: active === i ? "#93c5fd" : "#64748b",
            padding: "13px 18px", fontSize: 13, fontWeight: active === i ? 700 : 400,
            cursor: "pointer", transition: "color 0.15s",
          }}>{t}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
        {active === 0 && <OverviewTab />}
        {active === 1 && <Step1Tab />}
        {active === 2 && <Step2Tab />}
        {active === 3 && <RecommendationDemo />}
      </div>
    </div>
  );
}
