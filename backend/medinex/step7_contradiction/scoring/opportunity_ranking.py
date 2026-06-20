"""
Step 7.8 — Research Opportunity Ranking

Implements the doc's:
    score = novelty + impact + graph_centrality + evidence_support

with two real fixes a production system needs:
  1. Each component is normalized to [0, 1] before summing (otherwise raw
     degree counts would dominate a 0-1 novelty score).
  2. Weights are configurable instead of implicitly 1.0 each, since in
     practice impact and evidence_support should usually outweigh raw
     novelty.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScoringWeights:
    novelty: float = 1.0
    impact: float = 1.5
    graph_centrality: float = 1.0
    evidence_support: float = 1.5


@dataclass
class ScoredOpportunity:
    subject_entity_id: str
    object_entity_id: str
    novelty: float
    impact: float
    graph_centrality: float
    evidence_support: float
    score: float


def _normalize(value: float, max_value: float) -> float:
    if max_value <= 0:
        return 0.0
    return max(0.0, min(1.0, value / max_value))


def score_opportunity(
    subject_entity_id: str,
    object_entity_id: str,
    novelty: float,            # 0-1, e.g. 1 - (existing claim count / corpus max)
    impact_raw: float,         # unbounded, e.g. disease burden / citation count proxy
    graph_centrality_raw: int, # unbounded, e.g. combined node degree
    evidence_support: float,   # 0-1, e.g. fraction of nearby claims with high confidence
    impact_max: float,
    centrality_max: float,
    weights: ScoringWeights = ScoringWeights(),
) -> ScoredOpportunity:
    impact_n = _normalize(impact_raw, impact_max)
    centrality_n = _normalize(graph_centrality_raw, centrality_max)
    novelty_n = max(0.0, min(1.0, novelty))
    evidence_n = max(0.0, min(1.0, evidence_support))

    score = (
        weights.novelty * novelty_n
        + weights.impact * impact_n
        + weights.graph_centrality * centrality_n
        + weights.evidence_support * evidence_n
    )

    return ScoredOpportunity(
        subject_entity_id=subject_entity_id,
        object_entity_id=object_entity_id,
        novelty=novelty_n,
        impact=impact_n,
        graph_centrality=centrality_n,
        evidence_support=evidence_n,
        score=score,
    )


def rank_opportunities(opportunities: list[ScoredOpportunity]) -> list[ScoredOpportunity]:
    return sorted(opportunities, key=lambda o: o.score, reverse=True)
