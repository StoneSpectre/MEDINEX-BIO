import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import pytest

from medinex.step7_contradiction.llm.base import LLMClient
from medinex.step7_contradiction.claim_extraction.extractor import ClaimExtractor, ExtractedClaim


class FakeLLMClient(LLMClient):
    """Returns a canned response instead of calling a real API — lets us
    test the extractor's validation/filtering logic in isolation."""
    def __init__(self, canned_response: str):
        self._canned = canned_response

    def complete_json(self, system: str, user: str, max_tokens: int = 1024) -> str:
        return self._canned


def test_extract_filters_low_confidence_claims():
    raw = json.dumps([
        {"subject": "Metformin", "relation": "improves", "object": "Insulin Sensitivity",
         "population": "Obese Diabetic Adults", "evidence_text": "Metformin improves...",
         "confidence": 0.95},
        {"subject": "Drug X", "relation": "reduces", "object": "Symptom Y",
         "evidence_text": "weak hedge", "confidence": 0.2},
    ])
    extractor = ClaimExtractor(FakeLLMClient(raw), min_confidence=0.5)
    claims = extractor.extract("some paper text")

    assert len(claims) == 1
    assert claims[0].subject == "Metformin"
    assert claims[0].relation == "IMPROVES"  # normalized to upper snake case
    assert claims[0].population == "Obese Diabetic Adults"


def test_extract_skips_malformed_claims_without_failing_batch():
    raw = json.dumps([
        {"subject": "A", "relation": "x", "object": "B"},  # missing evidence_text/confidence
        {"subject": "C", "relation": "improves", "object": "D",
         "evidence_text": "C improves D", "confidence": 0.8},
    ])
    extractor = ClaimExtractor(FakeLLMClient(raw))
    claims = extractor.extract("text")
    assert len(claims) == 1
    assert claims[0].subject == "C"


def test_extract_raises_on_invalid_json():
    extractor = ClaimExtractor(FakeLLMClient("not json at all"))
    with pytest.raises(ValueError, match="valid JSON"):
        extractor.extract("text")


def test_extract_raises_when_not_a_list():
    extractor = ClaimExtractor(FakeLLMClient(json.dumps({"oops": "not a list"})))
    with pytest.raises(ValueError, match="JSON array"):
        extractor.extract("text")


def test_extracted_claim_rejects_out_of_range_confidence():
    with pytest.raises(ValueError, match="confidence out of range"):
        ExtractedClaim.from_dict({
            "subject": "A", "relation": "x", "object": "B",
            "evidence_text": "...", "confidence": 1.5,
        })
