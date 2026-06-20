"""
Step 7.6 — Hypothesis Generator

Given a support cluster and a contradiction cluster of claims about the
same entity pair, ask the LLM to propose biological variables that could
explain the disagreement (e.g. genotype, dosage, population subgroup).
"""
from __future__ import annotations

import json
from dataclasses import dataclass

from medinex.step7_contradiction.llm.base import LLMClient

HYPOTHESIS_SYSTEM_PROMPT = """You are a biomedical research strategist.

You will be given two clusters of claims that contradict each other in
the scientific literature: a "support" cluster and an "opposing" cluster,
both about the same drug/gene/intervention and outcome.

Propose 1-3 hypotheses for biological or methodological variables that
could explain why studies disagree (e.g. genotype, dosage, population,
comorbidity, study design, follow-up duration).

For each hypothesis, also state how it could be tested.

Return a JSON array of objects with keys: hypothesis, rationale, how_to_test
"""


@dataclass
class Hypothesis:
    hypothesis: str
    rationale: str
    how_to_test: str


class HypothesisGenerator:
    def __init__(self, llm: LLMClient):
        self._llm = llm

    def generate(
        self,
        support_claims: list[dict],
        contradiction_claims: list[dict],
    ) -> list[Hypothesis]:
        payload = {
            "support_cluster": [
                {"subject": c["subject"], "relation": c["relation"], "object": c["object"],
                 "population": c.get("population"), "evidence_text": c["evidence_text"]}
                for c in support_claims
            ],
            "contradiction_cluster": [
                {"subject": c["subject"], "relation": c["relation"], "object": c["object"],
                 "population": c.get("population"), "evidence_text": c["evidence_text"]}
                for c in contradiction_claims
            ],
        }
        raw = self._llm.complete_json(
            system=HYPOTHESIS_SYSTEM_PROMPT,
            user=json.dumps(payload, indent=2),
        )
        parsed = json.loads(raw)
        return [
            Hypothesis(
                hypothesis=item["hypothesis"],
                rationale=item.get("rationale", ""),
                how_to_test=item.get("how_to_test", ""),
            )
            for item in parsed
        ]
