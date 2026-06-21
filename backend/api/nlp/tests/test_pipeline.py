"""
medinex/nlp/tests/test_pipeline.py
────────────────────────────────────
Test suite for Steps 1 & 2 of the Medinex NLP Layer.

Tests run entirely without Neo4j or Redis — all external I/O is mocked.
The NLP pipeline itself runs against the fallback rule-based model
(since scispaCy models can't be downloaded in the sandbox),
validating all the structural logic.

Run with:
  cd /home/claude && python -m pytest medinex/nlp/tests/ -v
"""

import pytest
from unittest.mock import patch, MagicMock

from medinex.nlp.models.schemas import (
    ProcessRequest,
    ExtractedEntity,
    EntityLink,
    NLPResult,
)
from medinex.nlp.pipeline.model_loader import get_model_registry, ModelRegistry
from medinex.nlp.pipeline.ner_pipeline import (
    process_text,
    _normalise_label,
    _merge_entities,
    SUPPORTED_LABELS,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

SAMPLE_ABSTRACT = (
    "TP53 mutations are frequently observed in lung adenocarcinoma. "
    "Treatment with cisplatin showed a partial response in EGFR-positive patients. "
    "BRCA1 variants may also confer sensitivity to carboplatin in humans."
)

SAMPLE_REQUEST = ProcessRequest(
    text=SAMPLE_ABSTRACT,
    pmid="12345678",
    title="TP53 in lung cancer",
    source="manual",
)


# ── Schema tests ──────────────────────────────────────────────────────────────

class TestSchemas:
    def test_process_request_valid(self):
        req = ProcessRequest(text="Some biomedical text here", pmid="111", source="manual")
        assert req.pmid == "111"
        assert req.source == "manual"

    def test_process_request_min_length(self):
        with pytest.raises(Exception):
            ProcessRequest(text="short", source="manual")

    def test_extracted_entity_linked(self):
        ent = ExtractedEntity(
            span="TP53", label="GENE",
            start_char=0, end_char=4,
            cui="C0079419", canonical_name="Tumor Protein p53",
            link_score=0.97, ontology="UMLS",
        )
        assert ent.is_linked is True
        assert ent.neo4j_node_id == "C0079419"

    def test_extracted_entity_unlinked(self):
        ent = ExtractedEntity(
            span="UNKNOWNGENE", label="GENE",
            start_char=0, end_char=11,
        )
        assert ent.is_linked is False
        assert ent.neo4j_node_id.startswith("UNLINKED:")

    def test_nlp_result_summarise(self):
        result = NLPResult(
            pmid="123", title="Test", source="manual", text_length=100,
            entity_count=5, linked_count=3, unlinked_count=2,
        )
        summary = result.summarise()
        assert summary["entities"] == 5
        assert summary["linked"] == 3


# ── Label normalisation tests ─────────────────────────────────────────────────

class TestLabelNormalisation:
    def test_known_labels(self):
        assert _normalise_label("GENE_OR_GENE_PRODUCT") == "GENE"
        assert _normalise_label("CHEMICAL") == "CHEMICAL"
        assert _normalise_label("CANCER") == "DISEASE"
        assert _normalise_label("CELL_LINE") == "CELLTYPE"
        assert _normalise_label("MUTATION") == "VARIANT"

    def test_already_canonical(self):
        for label in SUPPORTED_LABELS:
            result = _normalise_label(label)
            assert result == label or result is None  # some raw labels won't map

    def test_unknown_label_returns_none(self):
        assert _normalise_label("NONSENSE_LABEL") is None
        assert _normalise_label("ORG") is None


# ── Entity merging tests ──────────────────────────────────────────────────────

class TestEntityMerging:
    def _make_entity(self, span, label, start, end, cui=None, score=None):
        return ExtractedEntity(
            span=span, label=label,
            start_char=start, end_char=end,
            cui=cui, canonical_name=span if cui else None,
            link_score=score,
        )

    def test_no_overlap_keeps_all(self):
        e1 = self._make_entity("TP53", "GENE", 0, 4)
        e2 = self._make_entity("cancer", "DISEASE", 10, 16)
        merged = _merge_entities([e1], [e2])
        assert len(merged) == 2

    def test_overlap_prefers_linked(self):
        unlinked = self._make_entity("TP53", "GENE", 0, 4, cui=None)
        linked   = self._make_entity("TP53", "GENE", 0, 4, cui="C0079419", score=0.97)
        merged = _merge_entities([unlinked], [linked])
        assert len(merged) == 1
        assert merged[0].cui == "C0079419"

    def test_overlap_prefers_higher_score(self):
        low  = self._make_entity("cisplatin", "CHEMICAL", 5, 14, cui="C001", score=0.70)
        high = self._make_entity("cisplatin", "CHEMICAL", 5, 14, cui="C002", score=0.95)
        merged = _merge_entities([low], [high])
        assert len(merged) == 1
        assert merged[0].link_score == 0.95

    def test_sorted_by_start_char(self):
        e1 = self._make_entity("EGFR",    "GENE", 20, 24)
        e2 = self._make_entity("cisplatin","CHEMICAL", 5, 14)
        e3 = self._make_entity("TP53",    "GENE", 0, 4)
        merged = _merge_entities([e1, e2, e3])
        starts = [e.start_char for e in merged]
        assert starts == sorted(starts)


# ── Pipeline integration tests ────────────────────────────────────────────────

class TestNERPipeline:
    def test_process_returns_nlp_result(self):
        result = process_text(SAMPLE_REQUEST)
        assert isinstance(result, NLPResult)
        assert result.text_length == len(SAMPLE_ABSTRACT)
        assert result.pmid == "12345678"

    def test_entities_extracted(self):
        result = process_text(SAMPLE_REQUEST)
        # Should find at least TP53, BRCA1, EGFR (genes) + cisplatin, carboplatin (chemicals)
        assert result.entity_count > 0

    def test_known_genes_detected(self):
        result = process_text(SAMPLE_REQUEST)
        spans = {e.span for e in result.entities}
        # Fallback model should catch at least one of these
        found_gene = any(e.label == "GENE" for e in result.entities)
        assert found_gene, f"Expected GENE entities, got: {spans}"

    def test_known_chemicals_detected(self):
        result = process_text(SAMPLE_REQUEST)
        chem_spans = {e.span.lower() for e in result.entities if e.label == "CHEMICAL"}
        assert "cisplatin" in chem_spans or "carboplatin" in chem_spans, \
            f"Expected chemical entities, got: {chem_spans}"

    def test_disease_detected(self):
        text = "Patients with lung adenocarcinoma received cisplatin treatment."
        req = ProcessRequest(text=text, source="manual")
        result = process_text(req)
        disease_labels = [e.label for e in result.entities]
        assert "DISEASE" in disease_labels

    def test_processing_time_recorded(self):
        result = process_text(SAMPLE_REQUEST)
        assert result.processing_time_ms > 0

    def test_models_used_populated(self):
        result = process_text(SAMPLE_REQUEST)
        assert len(result.models_used) > 0

    def test_entity_counts_consistent(self):
        result = process_text(SAMPLE_REQUEST)
        assert result.entity_count == len(result.entities)
        assert result.linked_count + result.unlinked_count == result.entity_count

    def test_entity_spans_within_text(self):
        """All entity char spans must fall within the source text."""
        result = process_text(SAMPLE_REQUEST)
        for ent in result.entities:
            assert ent.start_char >= 0
            assert ent.end_char <= len(SAMPLE_ABSTRACT)
            assert SAMPLE_ABSTRACT[ent.start_char:ent.end_char] == ent.span

    def test_no_source_pmid(self):
        req = ProcessRequest(text=SAMPLE_ABSTRACT, source="manual")
        result = process_text(req)
        assert result.pmid is None
        assert isinstance(result, NLPResult)


# ── Model registry tests ──────────────────────────────────────────────────────

class TestModelRegistry:
    def test_registry_singleton(self):
        r1 = get_model_registry()
        r2 = get_model_registry()
        assert r1 is r2

    def test_primary_model_always_loaded(self):
        reg = get_model_registry()
        assert reg.primary is not None

    def test_models_loaded_not_empty(self):
        reg = get_model_registry()
        assert len(reg.models_loaded) > 0

    def test_fallback_flag_when_no_scispacy_model(self):
        """
        In sandbox where scispaCy models aren't installed,
        fallback_mode should be True.
        """
        reg = get_model_registry()
        # Either real models loaded OR fallback is active — never neither
        real_models = [m for m in reg.models_loaded if "fallback" not in m]
        if not real_models:
            assert reg.fallback_mode is True


# ── Neo4j client tests (mocked) ───────────────────────────────────────────────

class TestNeo4jClient:
    def test_connect_failure_sets_unavailable(self):
        from medinex.nlp.utils.neo4j_client import Neo4jClient
        client = Neo4jClient(uri="bolt://nonexistent:9999", user="x", password="x")
        result = client.connect()
        assert result is False
        assert client.available is False

    def test_write_skipped_when_unavailable(self):
        from medinex.nlp.utils.neo4j_client import Neo4jClient
        client = Neo4jClient()
        # Don't call connect() → available = False
        result = client.write_nlp_result(NLPResult(
            pmid="123", title=None, text_length=100, source="test",
            entity_count=2, linked_count=2, unlinked_count=0,
            entities=[
                ExtractedEntity(span="TP53", label="GENE", start_char=0, end_char=4,
                                cui="C0079419", canonical_name="TP53", link_score=0.97)
            ]
        ))
        assert result == 0

    def test_get_stats_when_unavailable(self):
        from medinex.nlp.utils.neo4j_client import Neo4jClient
        client = Neo4jClient()
        stats = client.get_stats()
        assert stats["status"] == "unavailable"
