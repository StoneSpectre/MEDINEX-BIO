"""
medinex/nlp/pipeline/model_loader.py
──────────────────────────────────────
Loads scispaCy NER models with graceful fallback.

Production (your local machine / server):
  pip install en_core_sci_lg en_ner_bc5cdr_md en_ner_bionlp13cg_md
  → All three models load, full UMLS entity linking enabled.

Sandbox / CI (models not available):
  → Falls back to a rule-based biomedical tokenizer so the rest of the
    pipeline can still be tested structurally.

The loader is a singleton — call get_model_registry() anywhere.
"""

from __future__ import annotations
import os
import logging
from dataclasses import dataclass, field
from typing import Optional

import spacy
from spacy.language import Language

logger = logging.getLogger(__name__)

# Model names pulled from env with sensible defaults
MODEL_PRIMARY = os.getenv("NLP_MODEL_PRIMARY", "en_core_sci_lg")
MODEL_BC5CDR  = os.getenv("NLP_MODEL_BC5CDR",  "en_ner_bc5cdr_md")
MODEL_BIONLP  = os.getenv("NLP_MODEL_BIONLP",  "en_ner_bionlp13cg_md")
LINK_THRESHOLD = float(os.getenv("ENTITY_LINK_THRESHOLD", "0.85"))


@dataclass
class ModelRegistry:
    """Holds all loaded NLP models and linker state."""
    primary: Optional[Language] = None       # en_core_sci_lg  — general biomedical NER
    bc5cdr:  Optional[Language] = None       # en_ner_bc5cdr_md — chemicals + diseases
    bionlp:  Optional[Language] = None       # en_ner_bionlp13cg_md — cancer genetics
    linker_available: bool = False
    link_threshold: float = LINK_THRESHOLD
    models_loaded: list[str] = field(default_factory=list)
    fallback_mode: bool = False


def _try_load(model_name: str, disable: list[str] | None = None) -> Optional[Language]:
    """Load a spaCy model by name, returning None if unavailable."""
    try:
        kwargs = {"disable": disable} if disable else {}
        nlp = spacy.load(model_name, **kwargs)
        logger.info(f"✓ Loaded model: {model_name}")
        return nlp
    except OSError:
        logger.warning(f"✗ Model not found: {model_name}  (run pip install to add it)")
        return None


def _add_umls_linker(nlp: Language, threshold: float) -> bool:
    """
    Attach the scispaCy UMLS entity linker to a pipeline.
    Returns True if successfully added.
    """
    try:
        from scispacy.linking import EntityLinker  # noqa: F401
        if "scispacy_linker" not in nlp.pipe_names:
            nlp.add_pipe(
                "scispacy_linker",
                config={
                    "resolve_abbreviations": True,
                    "linker_name": "umls",
                    "threshold": threshold,
                    "filter_for_definitions": False,
                    "max_entities_per_mention": 3,
                },
            )
        logger.info(f"✓ UMLS linker attached (threshold={threshold})")
        return True
    except Exception as e:
        logger.warning(f"✗ UMLS linker unavailable: {e}")
        return False


def _build_fallback_model() -> Language:
    """
    Minimal rule-based pipeline for environments where scispaCy models
    can't be downloaded. Recognises common biomedical terms via patterns
    so the pipeline structure can still be tested end-to-end.
    """
    from spacy.lang.en import English
    from spacy.pipeline import EntityRuler

    nlp = English()
    ruler = nlp.add_pipe("entity_ruler")

    # Hand-curated patterns covering common entity types
    patterns = [
        # Genes / proteins
        {"label": "GENE", "pattern": [{"TEXT": {"REGEX": r"^(TP53|BRCA[12]|EGFR|KRAS|PTEN|MYC|ALK|ROS1|BRAF|PIK3CA|VEGF|HER2|ERBB2|CDK[0-9]+|MDM2|AKT[123]|mTOR|STAT[0-9])$"}}]},
        {"label": "GENE", "pattern": [{"TEXT": {"REGEX": r"^[A-Z][A-Z0-9]{1,6}$"}}]},   # broad all-caps gene heuristic
        # Diseases
        {"label": "DISEASE", "pattern": [{"LOWER": {"IN": ["cancer", "carcinoma", "adenocarcinoma", "melanoma", "lymphoma", "leukemia", "glioma", "sarcoma"]}}]},
        {"label": "DISEASE", "pattern": [{"LOWER": "lung"}, {"LOWER": {"IN": ["cancer", "adenocarcinoma", "carcinoma"]}}]},
        {"label": "DISEASE", "pattern": [{"LOWER": "breast"}, {"LOWER": {"IN": ["cancer", "carcinoma"]}}]},
        {"label": "DISEASE", "pattern": [{"LOWER": "colorectal"}, {"LOWER": {"IN": ["cancer", "carcinoma"]}}]},
        {"label": "DISEASE", "pattern": [{"LOWER": "alzheimer"}, {"LOWER": "'s", "OP": "?"}, {"LOWER": "disease", "OP": "?"}]},
        {"label": "DISEASE", "pattern": [{"LOWER": "parkinson"}, {"LOWER": "'s", "OP": "?"}, {"LOWER": "disease", "OP": "?"}]},
        {"label": "DISEASE", "pattern": [{"LOWER": "diabetes"}]},
        {"label": "DISEASE", "pattern": [{"LOWER": "hypertension"}]},
        {"label": "DISEASE", "pattern": [{"LOWER": "asthma"}]},
        # Chemicals / drugs
        {"label": "CHEMICAL", "pattern": [{"LOWER": {"IN": ["cisplatin", "carboplatin", "paclitaxel", "docetaxel", "doxorubicin", "methotrexate", "imatinib", "erlotinib", "gefitinib", "osimertinib", "pembrolizumab", "nivolumab", "bevacizumab", "trastuzumab"]}}]},
        # Variants
        {"label": "VARIANT", "pattern": [{"TEXT": {"REGEX": r"^[A-Z]\d+[A-Z]$"}}]},  # e.g. V600E
        {"label": "VARIANT", "pattern": [{"TEXT": {"REGEX": r"^p\.[A-Z][a-z]{2}\d+[A-Z][a-z]{2}$"}}]},  # e.g. p.Val600Glu
        # Species
        {"label": "SPECIES", "pattern": [{"LOWER": {"IN": ["mouse", "mice", "rat", "rats", "human", "humans"]}}]},
    ]
    ruler.add_patterns(patterns)
    logger.warning("⚠ Fallback rule-based model active. Install scispaCy models for production NER.")
    return nlp


_registry: Optional[ModelRegistry] = None


def get_model_registry() -> ModelRegistry:
    """
    Singleton loader. First call loads all models; subsequent calls return
    the cached registry.
    """
    global _registry
    if _registry is not None:
        return _registry

    reg = ModelRegistry()

    # ── Try primary model ────────────────────────────────────────────────────
    reg.primary = _try_load(MODEL_PRIMARY)
    if reg.primary:
        reg.models_loaded.append(MODEL_PRIMARY)
        reg.linker_available = _add_umls_linker(reg.primary, reg.link_threshold)

    # ── Try specialist models (no linker — they run separately for their labels)
    reg.bc5cdr = _try_load(MODEL_BC5CDR, disable=["parser"])
    if reg.bc5cdr:
        reg.models_loaded.append(MODEL_BC5CDR)

    reg.bionlp = _try_load(MODEL_BIONLP, disable=["parser"])
    if reg.bionlp:
        reg.models_loaded.append(MODEL_BIONLP)

    # ── Fallback if nothing loaded ────────────────────────────────────────────
    if not reg.primary:
        reg.primary = _build_fallback_model()
        reg.models_loaded.append("fallback_rule_based")
        reg.fallback_mode = True

    _registry = reg
    logger.info(f"ModelRegistry ready. Models: {reg.models_loaded} | Linker: {reg.linker_available} | Fallback: {reg.fallback_mode}")
    return _registry
