"""
medinex/nlp/pipeline/ner_pipeline.py
──────────────────────────────────────
Steps 1 & 2 of the Medinex NLP Layer.

Step 1 — NER:
  Run scispaCy models over input text.
  Merge results from primary + specialist models, deduplicating by span.

Step 2 — Entity Linking:
  Map each NER span to a UMLS CUI via the scispaCy EntityLinker.
  Apply confidence threshold, pick best candidate, build EntityLink list.
  Spans below threshold are kept but marked unlinked (flagged for review queue).
"""

from __future__ import annotations
import time
import logging
from typing import Optional

from medinex.nlp.models.schemas import ExtractedEntity, EntityLink, NLPResult, ProcessRequest
from medinex.nlp.pipeline.model_loader import get_model_registry

logger = logging.getLogger(__name__)

# Maps scispaCy / rule-based labels → canonical Medinex label set
LABEL_MAP = {
    # General scispaCy labels
    "GENE_OR_GENE_PRODUCT": "GENE",
    "GENE": "GENE",
    "PROTEIN": "GENE",
    # BC5CDR labels
    "CHEMICAL": "CHEMICAL",
    "DISEASE": "DISEASE",
    # BIONLP labels
    "CANCER": "DISEASE",
    "ORGANISM": "SPECIES",
    "CELL_LINE": "CELLTYPE",
    "CELL_TYPE": "CELLTYPE",
    "MUTATION": "VARIANT",
    "SIMPLE_CHEMICAL": "CHEMICAL",
    "AMINO_ACID": "CHEMICAL",
    "TISSUE": "CELLTYPE",
    "ORGAN": "CELLTYPE",
    # Fallback rule-based labels (already canonical)
    "VARIANT": "VARIANT",
    "SPECIES": "SPECIES",
    "CELLTYPE": "CELLTYPE",
}

SUPPORTED_LABELS = {"GENE", "DISEASE", "CHEMICAL", "VARIANT", "SPECIES", "CELLTYPE"}


def _normalise_label(raw_label: str) -> Optional[str]:
    return LABEL_MAP.get(raw_label)


def _extract_links_from_ent(ent) -> tuple[Optional[str], Optional[str], Optional[float], Optional[str], list[EntityLink]]:
    """
    Pull UMLS link data from a scispaCy entity's kb_ents attribute.
    Returns (best_cui, best_name, best_score, ontology, all_links).
    """
    all_links: list[EntityLink] = []

    # kb_ents is a list of (identifier, score) tuples set by the UMLS linker
    if not hasattr(ent._, "kb_ents") or not ent._.kb_ents:
        return None, None, None, None, all_links

    linker = None
    try:
        # Access the linker's kb for canonical names
        from spacy.lang.en import English  # noqa: F401
        nlp_pipe = ent.doc.vocab.lookups  # not the right approach
    except Exception:
        pass

    # Try to get canonical names from the linker knowledge base
    try:
        from scispacy.linking_utils import KnowledgeBase  # noqa: F401
    except Exception:
        pass

    for identifier, score in ent._.kb_ents:
        # Try to get the canonical name from the linker
        canonical = identifier  # fallback: use the identifier itself
        try:
            # The entity linker stores a kb reference on the doc
            if hasattr(ent.doc._, "umls") and ent.doc._.umls:
                pass  # depends on scispaCy version
            # Standard way to get canonical name
            linker_ref = None
            for pipe_name in ent.doc.vocab.lang.split():
                pass
        except Exception:
            pass

        # Try getting canonical name via the linker pipe
        try:
            import spacy
            for nlp_ref in [ent.doc]:
                if hasattr(nlp_ref, "user_data") and "linker" in nlp_ref.user_data:
                    kb = nlp_ref.user_data["linker"].kb
                    if identifier in kb.cui_to_entity:
                        canonical = kb.cui_to_entity[identifier].canonical_name
        except Exception:
            canonical = identifier

        all_links.append(EntityLink(
            identifier=identifier,
            canonical_name=canonical,
            score=score,
            ontology="UMLS",
        ))

    if not all_links:
        return None, None, None, None, all_links

    best = max(all_links, key=lambda x: x.score)
    return best.identifier, best.canonical_name, best.score, "UMLS", all_links


def _run_ner_on_model(text: str, model, model_key: str, threshold: float) -> list[ExtractedEntity]:
    """Run one spaCy model and return extracted entities."""
    entities: list[ExtractedEntity] = []
    try:
        doc = model(text)
    except Exception as e:
        logger.error(f"Model {model_key} inference error: {e}")
        return entities

    for ent in doc.ents:
        label = _normalise_label(ent.label_)
        if label not in SUPPORTED_LABELS:
            continue

        # Step 2 — entity linking
        cui, canonical_name, link_score, ontology, all_links = _extract_links_from_ent(ent)

        # Apply threshold: only set cui if above threshold
        if link_score is not None and link_score < threshold:
            cui = None
            canonical_name = None

        entities.append(ExtractedEntity(
            span=ent.text,
            label=label,
            start_char=ent.start_char,
            end_char=ent.end_char,
            cui=cui,
            canonical_name=canonical_name,
            link_score=link_score,
            ontology=ontology,
            all_links=all_links,
            detected_by=model_key,
        ))

    return entities


def _merge_entities(primary: list[ExtractedEntity], *others: list[ExtractedEntity]) -> list[ExtractedEntity]:
    """
    Merge entity lists from multiple models, preferring linked entities
    when the same character span appears in multiple results.
    Deduplication key: (start_char, end_char).
    """
    merged: dict[tuple[int, int], ExtractedEntity] = {}

    for ent in primary:
        key = (ent.start_char, ent.end_char)
        merged[key] = ent

    for ent_list in others:
        for ent in ent_list:
            key = (ent.start_char, ent.end_char)
            if key not in merged:
                merged[key] = ent
            else:
                existing = merged[key]
                # Prefer the entity that has a CUI link
                if ent.is_linked and not existing.is_linked:
                    merged[key] = ent
                # Prefer higher link score
                elif ent.is_linked and existing.is_linked:
                    if (ent.link_score or 0) > (existing.link_score or 0):
                        merged[key] = ent

    return sorted(merged.values(), key=lambda e: e.start_char)


def process_text(request: ProcessRequest) -> NLPResult:
    """
    Main entry point for Steps 1 & 2.

    Step 1 — NER: runs primary + specialist scispaCy models.
    Step 2 — Entity linking: UMLS CUI resolution via scispaCy linker.

    Returns a fully populated NLPResult ready for Neo4j write.
    """
    start = time.perf_counter()
    reg = get_model_registry()

    result = NLPResult(
        pmid=request.pmid,
        title=request.title,
        source=request.source,
        text_length=len(request.text),
        models_used=list(reg.models_loaded),
    )

    # ── Step 1: NER ──────────────────────────────────────────────────────────
    primary_entities = _run_ner_on_model(
        request.text,
        reg.primary,
        "primary",
        reg.link_threshold,
    )

    bc5cdr_entities: list[ExtractedEntity] = []
    if reg.bc5cdr:
        bc5cdr_entities = _run_ner_on_model(
            request.text,
            reg.bc5cdr,
            "bc5cdr",
            reg.link_threshold,
        )

    bionlp_entities: list[ExtractedEntity] = []
    if reg.bionlp:
        bionlp_entities = _run_ner_on_model(
            request.text,
            reg.bionlp,
            "bionlp",
            reg.link_threshold,
        )

    # Merge and deduplicate
    merged = _merge_entities(primary_entities, bc5cdr_entities, bionlp_entities)

    # ── Step 2 summary stats ─────────────────────────────────────────────────
    result.entities = merged
    result.entity_count = len(merged)
    result.linked_count = sum(1 for e in merged if e.is_linked)
    result.unlinked_count = result.entity_count - result.linked_count
    result.processing_time_ms = (time.perf_counter() - start) * 1000

    logger.info(
        f"[{request.pmid or 'NO_PMID'}] "
        f"entities={result.entity_count} linked={result.linked_count} "
        f"unlinked={result.unlinked_count} time={result.processing_time_ms:.1f}ms"
    )

    return result
