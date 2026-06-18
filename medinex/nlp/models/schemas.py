"""
medinex/nlp/models/schemas.py
─────────────────────────────
Pydantic v2 data models for the entire NLP pipeline.
Entity → EntityLink → NLPResult → all API request/response shapes.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# ── Input ────────────────────────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    """POST /nlp/process — single abstract ingestion."""
    text: str = Field(..., min_length=10, description="Abstract or full text to process")
    pmid: Optional[str] = Field(None, description="PubMed ID, if available")
    title: Optional[str] = Field(None, description="Paper title")
    source: str = Field("manual", description="Ingest source: 'manual' | 'pubmed' | 'scheduler'")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "text": (
                "TP53 mutations are frequently observed in lung adenocarcinoma. "
                "Treatment with cisplatin showed partial response in EGFR-positive patients."
            ),
            "pmid": "12345678",
            "title": "TP53 in lung cancer",
            "source": "manual"
        }
    })


class BatchProcessRequest(BaseModel):
    """POST /nlp/process/batch — async batch via Celery."""
    papers: list[ProcessRequest] = Field(..., min_length=1, max_length=100)


# ── Entity models ─────────────────────────────────────────────────────────────

class EntityLink(BaseModel):
    """A single ontology match returned by the UMLS linker."""
    identifier: str = Field(..., description="UMLS CUI or ontology ID, e.g. C0079419")
    canonical_name: str = Field(..., description="Preferred ontology label")
    score: float = Field(..., ge=0.0, le=1.0)
    ontology: str = Field("UMLS", description="Ontology source: UMLS | MeSH | HGNC | RxNorm")


class ExtractedEntity(BaseModel):
    """One recognized biomedical entity with all its ontology links."""
    span: str = Field(..., description="Raw text span as it appears in the source")
    label: str = Field(..., description="Entity type: GENE | DISEASE | CHEMICAL | VARIANT | SPECIES | CELLTYPE")
    start_char: int
    end_char: int
    # Best link above threshold
    cui: Optional[str] = Field(None, description="Primary UMLS CUI (best link)")
    canonical_name: Optional[str] = Field(None, description="Preferred name for CUI")
    link_score: Optional[float] = Field(None, description="Confidence of best link")
    ontology: Optional[str] = Field(None)
    # All candidate links for transparency
    all_links: list[EntityLink] = Field(default_factory=list)
    # Which NER model detected this span
    detected_by: str = Field("primary", description="Model that detected: primary | bc5cdr | bionlp")

    @property
    def is_linked(self) -> bool:
        return self.cui is not None

    @property
    def neo4j_node_id(self) -> str:
        """Stable identifier for Neo4j: CUI if linked, else span-based."""
        if self.cui:
            return self.cui
        return f"UNLINKED:{self.label}:{self.span.upper().replace(' ', '_')}"


# ── Pipeline result ───────────────────────────────────────────────────────────

class NLPResult(BaseModel):
    """Full output of the NLP pipeline for one paper."""
    pmid: Optional[str]
    title: Optional[str]
    source: str
    text_length: int

    # Step 2 outputs
    entities: list[ExtractedEntity] = Field(default_factory=list)
    entity_count: int = 0
    linked_count: int = 0       # entities with CUI ≥ threshold
    unlinked_count: int = 0     # entities below threshold or no match

    # Meta
    models_used: list[str] = Field(default_factory=list)
    processing_time_ms: float = 0.0
    written_to_neo4j: bool = False
    errors: list[str] = Field(default_factory=list)

    def summarise(self) -> dict:
        return {
            "pmid": self.pmid,
            "entities": self.entity_count,
            "linked": self.linked_count,
            "unlinked": self.unlinked_count,
            "written_to_neo4j": self.written_to_neo4j,
        }


# ── API response wrappers ─────────────────────────────────────────────────────

class ProcessResponse(BaseModel):
    success: bool
    result: Optional[NLPResult] = None
    error: Optional[str] = None


class BatchJobResponse(BaseModel):
    """Returned immediately when a batch is queued."""
    job_id: str
    paper_count: int
    status: str = "queued"
    poll_url: str


class BatchJobStatus(BaseModel):
    job_id: str
    status: str          # queued | running | done | failed
    total: int
    completed: int
    failed: int
    results: Optional[list[NLPResult]] = None


# ── Neo4j write models ────────────────────────────────────────────────────────

class Neo4jEntityNode(BaseModel):
    """Shape of the node written to Neo4j for each entity."""
    cui: str
    canonical_name: str
    label: str               # GENE / DISEASE / CHEMICAL …
    source_pmids: list[str]  # papers that mention this entity
    first_seen_pmid: Optional[str] = None
