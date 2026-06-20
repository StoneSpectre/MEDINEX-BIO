"""
Step 8.1 — Evidence Agent

Applies Evidence-Based Medicine (EBM) tiering to retrieved documents.
This is the Step 5 logic promoted into a full agent.

Tier hierarchy (descending strength):
  1. Systematic Review / Meta-Analysis
  2. RCT (Randomized Controlled Trial)
  3. Cohort / Case-Control Study
  4. Cross-Sectional Study
  5. Case Report / Case Series
  6. Expert Opinion / Editorial
  7. Preprint / Unreviewed

Each RetrievedDoc is scored, tiered, and returned in ranked order.
The Writer Agent uses tier + confidence as in-context evidence quality signals.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from medinex.step8_research_copilot.agents.retrieval_agent import RetrievedDoc


TIER_LABELS = {
    1: "Systematic Review / Meta-Analysis",
    2: "RCT",
    3: "Cohort / Case-Control",
    4: "Cross-Sectional",
    5: "Case Report / Series",
    6: "Expert Opinion",
    7: "Preprint",
}

# Regex patterns ordered by tier. First match wins.
_TIER_PATTERNS: list[tuple[int, re.Pattern]] = [
    (1, re.compile(r"\b(systematic review|meta-?analysis|cochrane)\b", re.I)),
    (2, re.compile(r"\b(randomized|randomised|rct|placebo.controlled|double.blind)\b", re.I)),
    (3, re.compile(r"\b(cohort|case.control|longitudinal|prospective|retrospective)\b", re.I)),
    (4, re.compile(r"\b(cross.sectional|prevalence study|survey)\b", re.I)),
    (5, re.compile(r"\b(case report|case series|n=1)\b", re.I)),
    (6, re.compile(r"\b(editorial|expert opinion|commentary|review article)\b", re.I)),
    (7, re.compile(r"\b(preprint|biorxiv|medrxiv|not peer.reviewed)\b", re.I)),
]


def _classify_tier(text: str) -> int:
    """Return EBM tier (1=strongest, 7=weakest) from title+abstract text."""
    combined = text.lower()
    for tier, pattern in _TIER_PATTERNS:
        if pattern.search(combined):
            return tier
    return 6  # Default to expert opinion / unknown


@dataclass
class EvidenceDoc:
    paper_id: str
    title: str
    abstract: str
    tier: int
    tier_label: str
    retrieval_score: float   # RRF score from RetrievalAgent
    evidence_score: float    # composite: weights retrieval rank + tier strength
    source: str              # "dense" | "bm25" | "both"


def _evidence_score(rrf_score: float, tier: int) -> float:
    """
    Composite score blending retrieval relevance and evidence quality.
    Tier weight: tier 1 = 1.0, tier 7 = 0.1 (linear decay).
    RRF scores typically range 0.0–0.05; normalize by multiplying by 20.
    """
    tier_weight = 1.0 - (tier - 1) * (0.9 / 6)  # 1.0 → 0.1
    normalized_rrf = min(rrf_score * 20, 1.0)
    # 60% evidence quality, 40% retrieval relevance
    return 0.6 * tier_weight + 0.4 * normalized_rrf


class EvidenceAgent:
    """
    Ranks a list of RetrievedDoc by EBM tier + retrieval score.
    No external calls — pure classification + scoring.
    """

    def rank(self, docs: list[RetrievedDoc], top_n: int = 15) -> list[EvidenceDoc]:
        """
        Classify and rank. Returns top_n EvidenceDocs, strongest evidence first.
        """
        evidence_docs: list[EvidenceDoc] = []
        for doc in docs:
            text = f"{doc.title} {doc.abstract}"
            tier = _classify_tier(text)
            score = _evidence_score(doc.rrf_score, tier)
            evidence_docs.append(EvidenceDoc(
                paper_id=doc.paper_id,
                title=doc.title,
                abstract=doc.abstract,
                tier=tier,
                tier_label=TIER_LABELS[tier],
                retrieval_score=doc.rrf_score,
                evidence_score=score,
                source=doc.source,
            ))

        evidence_docs.sort(key=lambda x: x.evidence_score, reverse=True)
        return evidence_docs[:top_n]

    def format_for_context(self, docs: list[EvidenceDoc]) -> str:
        """
        Serialize ranked evidence for LLM context injection.
        Writer Agent receives this block in its prompt.
        """
        lines = ["=== EVIDENCE CONTEXT (ranked by EBM tier + relevance) ==="]
        for i, doc in enumerate(docs, start=1):
            lines.append(
                f"\n[{i}] [{doc.tier_label}] {doc.title}\n"
                f"    Evidence Score: {doc.evidence_score:.3f} | "
                f"Source: {doc.source}\n"
                f"    {doc.abstract[:300]}{'...' if len(doc.abstract) > 300 else ''}"
            )
        return "\n".join(lines)
