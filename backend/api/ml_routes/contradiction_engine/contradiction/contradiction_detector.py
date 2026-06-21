"""
Step 7.4 — Contradiction Detection & Graph Construction

For every pair of claims about the same (subject_entity_id, object_entity_id)
pair, run NLI to check whether they agree, are neutral, or contradict.
Persist contradictions to both Postgres (contradictions table, for fast
lookup/joins) and Neo4j (CONTRADICTS edges, for graph traversal/clustering).

This is the O(n^2)-per-entity-pair step the doc flags as needing to scale to
100M+ claims eventually — see the note on batching/blocking below.
"""
from __future__ import annotations

from itertools import combinations

from db.postgres_client import PostgresClient
from graph.neo4j_client import Neo4jClient
from nli.nli_client import NLIClient

CONTRADICTION_CONFIDENCE_THRESHOLD = 0.7


class ContradictionDetector:
    def __init__(self, pg: PostgresClient, neo4j: Neo4jClient, nli: NLIClient):
        self._pg = pg
        self._neo4j = neo4j
        self._nli = nli

    async def detect_for_entity_pair(self, subject_entity_id: str, object_entity_id: str) -> int:
        """
        Run NLI over every claim pair sharing this (subject, object) entity
        pair. Returns the number of contradictions found.

        Blocking note: at 100M+ claims, do NOT do this globally — only run
        it within entity-pair "buckets" like this one (claims already share
        subject/object), which keeps each comparison set small. Buckets can
        be processed in parallel (one worker per entity pair) via a queue.
        """
        claims = await self._pg.get_claim_pairs_for_nli(subject_entity_id, object_entity_id)
        if len(claims) < 2:
            return 0

        found = 0
        for claim_a, claim_b in combinations(claims, 2):
            result = self._nli.infer(
                premise=claim_a["evidence_text"],
                hypothesis=claim_b["evidence_text"],
            )
            if result["label"] != "contradiction":
                continue
            if result["confidence"] < CONTRADICTION_CONFIDENCE_THRESHOLD:
                continue

            await self._pg.insert_contradiction(
                claim_a_id=str(claim_a["id"]),
                claim_b_id=str(claim_b["id"]),
                nli_label=result["label"],
                nli_confidence=result["confidence"],
            )
            self._neo4j.link_claims_contradict(
                claim_a_id=str(claim_a["id"]),
                claim_b_id=str(claim_b["id"]),
                confidence=result["confidence"],
            )
            found += 1
        return found
