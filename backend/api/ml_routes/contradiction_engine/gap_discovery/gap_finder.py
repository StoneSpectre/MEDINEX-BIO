"""
Step 7.7 — Knowledge Gap Discovery

Thin orchestration layer around graph.neo4j_client.Neo4jClient.find_knowledge_gaps.
Meant to run as a weekly batch job (see pipeline.py) across all relevant
entity-kind pairs (Disease x Gene, Drug x Protein, etc).
"""
from __future__ import annotations

from dataclasses import dataclass

from graph.neo4j_client import Neo4jClient

ENTITY_KIND_PAIRS = [
    ("Disease", "Gene"),
    ("Disease", "Drug"),
    ("Gene", "Protein"),
    ("Drug", "Protein"),
]


@dataclass
class KnowledgeGap:
    entity_a: str
    name_a: str
    entity_b: str
    name_b: str
    degree_a: int
    degree_b: int

    @property
    def combined_degree(self) -> int:
        return self.degree_a + self.degree_b


class GapFinder:
    def __init__(self, neo4j: Neo4jClient, min_degree: int = 5):
        self._neo4j = neo4j
        self._min_degree = min_degree

    def find_all_gaps(self, limit_per_pair: int = 50) -> list[KnowledgeGap]:
        gaps: list[KnowledgeGap] = []
        for kind_a, kind_b in ENTITY_KIND_PAIRS:
            rows = self._neo4j.find_knowledge_gaps(
                entity_kind_a=kind_a, entity_kind_b=kind_b,
                min_degree=self._min_degree, limit=limit_per_pair,
            )
            gaps.extend(
                KnowledgeGap(
                    entity_a=r["entity_a"], name_a=r["name_a"],
                    entity_b=r["entity_b"], name_b=r["name_b"],
                    degree_a=r["degree_a"], degree_b=r["degree_b"],
                )
                for r in rows
            )
        return gaps
