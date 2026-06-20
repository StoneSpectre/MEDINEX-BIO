"""
Real asyncpg-based Postgres client for the claim store.

Usage:
    client = PostgresClient(config.POSTGRES.dsn)
    await client.connect()
    claim_id = await client.insert_claim(paper_id, claim)
    await client.close()
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any, Optional

import asyncpg


@dataclass
class Claim:
    paper_id: str
    subject: str
    relation: str
    object: str
    evidence_text: str
    confidence: float
    population: Optional[str] = None
    subject_entity_id: Optional[str] = None
    object_entity_id: Optional[str] = None


class PostgresClient:
    def __init__(self, dsn: str, min_size: int = 1, max_size: int = 10):
        self._dsn = dsn
        self._min_size = min_size
        self._max_size = max_size
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(
            dsn=self._dsn, min_size=self._min_size, max_size=self._max_size
        )

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()

    @property
    def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("PostgresClient.connect() must be called before use")
        return self._pool

    # ---- papers ----------------------------------------------------

    async def insert_paper(
        self, title: str, abstract: str | None = None, doi: str | None = None,
        pubmed_id: str | None = None, full_text: str | None = None,
    ) -> str:
        row = await self.pool.fetchrow(
            """
            INSERT INTO papers (title, abstract, doi, pubmed_id, full_text)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (doi) DO UPDATE SET title = EXCLUDED.title
            RETURNING id
            """,
            title, abstract, doi, pubmed_id, full_text,
        )
        return str(row["id"])

    # ---- claims ------------------------------------------------------

    async def insert_claim(self, claim: Claim) -> str:
        row = await self.pool.fetchrow(
            """
            INSERT INTO claims
                (paper_id, subject, relation, object, population,
                 evidence_text, confidence, subject_entity_id, object_entity_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
            """,
            uuid.UUID(claim.paper_id), claim.subject, claim.relation, claim.object,
            claim.population, claim.evidence_text, claim.confidence,
            claim.subject_entity_id, claim.object_entity_id,
        )
        return str(row["id"])

    async def insert_claims_bulk(self, claims: list[Claim]) -> list[str]:
        ids = []
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                for c in claims:
                    ids.append(await self.insert_claim(c))
        return ids

    async def get_claims_for_paper(self, paper_id: str) -> list[dict[str, Any]]:
        rows = await self.pool.fetch(
            "SELECT * FROM claims WHERE paper_id = $1", uuid.UUID(paper_id)
        )
        return [dict(r) for r in rows]

    async def get_claims_by_subject(self, subject: str, limit: int = 100) -> list[dict[str, Any]]:
        rows = await self.pool.fetch(
            "SELECT * FROM claims WHERE subject ILIKE $1 LIMIT $2", f"%{subject}%", limit
        )
        return [dict(r) for r in rows]

    async def get_claim_pairs_for_nli(self, subject_entity_id: str, object_entity_id: str) -> list[dict]:
        """All claims about the same subject/object pair — candidates for NLI comparison."""
        rows = await self.pool.fetch(
            """
            SELECT * FROM claims
            WHERE subject_entity_id = $1 AND object_entity_id = $2
            ORDER BY created_at
            """,
            subject_entity_id, object_entity_id,
        )
        return [dict(r) for r in rows]

    # ---- contradictions ------------------------------------------------------

    async def insert_contradiction(
        self, claim_a_id: str, claim_b_id: str, nli_label: str, nli_confidence: float
    ) -> str:
        row = await self.pool.fetchrow(
            """
            INSERT INTO contradictions (claim_a_id, claim_b_id, nli_label, nli_confidence)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (claim_a_id, claim_b_id) DO UPDATE
                SET nli_label = EXCLUDED.nli_label, nli_confidence = EXCLUDED.nli_confidence
            RETURNING id
            """,
            uuid.UUID(claim_a_id), uuid.UUID(claim_b_id), nli_label, nli_confidence,
        )
        return str(row["id"])

    async def get_all_contradictions(self) -> list[dict[str, Any]]:
        rows = await self.pool.fetch(
            "SELECT * FROM contradictions WHERE nli_label = 'contradiction'"
        )
        return [dict(r) for r in rows]

    # ---- research opportunities ------------------------------------------------------

    async def insert_research_opportunity(self, opp: dict[str, Any]) -> str:
        row = await self.pool.fetchrow(
            """
            INSERT INTO research_opportunities
                (subject_entity_id, object_entity_id, novelty, impact,
                 graph_centrality, evidence_support, score, rationale)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            """,
            opp["subject_entity_id"], opp["object_entity_id"], opp["novelty"],
            opp["impact"], opp["graph_centrality"], opp["evidence_support"],
            opp["score"], opp.get("rationale"),
        )
        return str(row["id"])
