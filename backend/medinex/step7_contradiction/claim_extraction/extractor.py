"""
Step 7.1 — Claim Extraction Layer

Converts free-text paper content into atomic, structured claims matching
the schema in db/schema.sql. Extraction is LLM-driven (pluggable LLMClient)
with strict JSON-schema validation on the way out, since this output feeds
a database and a graph — malformed claims must be rejected, not coerced.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

from medinex.step7_contradiction.llm.base import LLMClient

EXTRACTION_SYSTEM_PROMPT = """You are a biomedical claim extraction engine.

Given the text of a scientific paper (title + abstract, or a passage),
extract every atomic, checkable claim of the form:

  subject --[relation]--> object, in a population (optional)

Rules:
- "subject" and "object" must be biomedical entities (drug, gene, protein,
  disease, intervention, biomarker) — not vague phrases.
- "relation" must be a normalized verb phrase in UPPER_SNAKE_CASE, e.g.
  IMPROVES, REDUCES, HAS_NO_EFFECT_ON, INCREASES_RISK_OF, ASSOCIATED_WITH.
- "evidence_text" must be a short verbatim span from the input that
  supports the claim.
- "confidence" is your calibrated confidence (0.0-1.0) that the text
  actually asserts this claim (not a hedge, not a cited prior finding
  being merely mentioned).
- Skip claims about study methodology, sample size, or funding.
- If there are no extractable claims, return an empty list.

Return a JSON array of objects with exactly these keys:
subject, relation, object, population, evidence_text, confidence
"""


@dataclass
class ExtractedClaim:
    subject: str
    relation: str
    object: str
    evidence_text: str
    confidence: float
    population: str | None = None

    @staticmethod
    def from_dict(d: dict) -> "ExtractedClaim":
        required = {"subject", "relation", "object", "evidence_text", "confidence"}
        missing = required - d.keys()
        if missing:
            raise ValueError(f"Claim missing required fields: {missing}")
        conf = float(d["confidence"])
        if not (0.0 <= conf <= 1.0):
            raise ValueError(f"confidence out of range: {conf}")
        return ExtractedClaim(
            subject=str(d["subject"]).strip(),
            relation=str(d["relation"]).strip().upper().replace(" ", "_"),
            object=str(d["object"]).strip(),
            evidence_text=str(d["evidence_text"]).strip(),
            confidence=conf,
            population=(str(d["population"]).strip() if d.get("population") else None),
        )


class ClaimExtractor:
    def __init__(self, llm: LLMClient, min_confidence: float = 0.5):
        self._llm = llm
        self._min_confidence = min_confidence

    def extract(self, paper_text: str) -> list[ExtractedClaim]:
        raw = self._llm.complete_json(
            system=EXTRACTION_SYSTEM_PROMPT,
            user=paper_text,
        )
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"LLM did not return valid JSON: {e}\nRaw output: {raw[:500]}")

        if not isinstance(parsed, list):
            raise ValueError(f"Expected a JSON array of claims, got: {type(parsed)}")

        claims: list[ExtractedClaim] = []
        for item in parsed:
            try:
                claim = ExtractedClaim.from_dict(item)
            except (ValueError, TypeError, KeyError):
                # Skip malformed individual claims rather than failing the whole batch
                continue
            if claim.confidence >= self._min_confidence:
                claims.append(claim)
        return claims
