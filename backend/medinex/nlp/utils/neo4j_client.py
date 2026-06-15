"""
medinex/nlp/utils/neo4j_client.py
───────────────────────────────────
Thin wrapper around the Neo4j Python driver.
Handles connection pooling, retries, and all KG write operations
for Steps 1-2 entity node upserts.
"""

from __future__ import annotations
import os
import logging
from contextlib import contextmanager
from typing import Optional

from neo4j import GraphDatabase, Driver
from neo4j.exceptions import ServiceUnavailable, AuthError

from medinex.nlp.models.schemas import ExtractedEntity, NLPResult

logger = logging.getLogger(__name__)


# ── Cypher queries ────────────────────────────────────────────────────────────

# Upsert a Paper node
UPSERT_PAPER = """
MERGE (p:Paper {pmid: $pmid})
ON CREATE SET
    p.title       = $title,
    p.source      = $source,
    p.created_at  = datetime(),
    p.text_length = $text_length
ON MATCH SET
    p.title       = coalesce($title, p.title),
    p.updated_at  = datetime()
RETURN p
"""

# Upsert a biomedical entity node (keyed by CUI)
UPSERT_ENTITY = """
MERGE (e:{label} {{cui: $cui}})
ON CREATE SET
    e.canonical_name = $canonical_name,
    e.ontology       = $ontology,
    e.created_at     = datetime()
ON MATCH SET
    e.updated_at     = datetime()
RETURN e
"""

# Link Paper → Entity with span provenance
LINK_PAPER_ENTITY = """
MATCH (p:Paper {{pmid: $pmid}})
MATCH (e:{label} {{cui: $cui}})
MERGE (p)-[r:MENTIONS]->(e)
ON CREATE SET
    r.spans        = [$span],
    r.link_score   = $link_score,
    r.detected_by  = $detected_by,
    r.created_at   = datetime()
ON MATCH SET
    r.spans        = CASE WHEN NOT $span IN r.spans THEN r.spans + [$span] ELSE r.spans END,
    r.updated_at   = datetime()
RETURN r
"""

# Stats query for /admin/kg-stats
KG_STATS = """
MATCH (p:Paper) WITH count(p) AS papers
MATCH (e) WHERE NOT e:Paper WITH papers, count(e) AS entities
MATCH ()-[r:MENTIONS]->() WITH papers, entities, count(r) AS mentions
RETURN papers, entities, mentions
"""

SET_LAST_RUN = """
MERGE (s:SystemState {id: 'singleton'})
SET s.last_scheduler_run = $iso_time
"""

GET_LAST_RUN = """
MATCH (s:SystemState {id: 'singleton'})
RETURN s.last_scheduler_run AS last_run
"""


class Neo4jClient:
    """
    Connection-pooled Neo4j client.
    Use as a singleton (one per process) injected via FastAPI dependency.
    """

    def __init__(
        self,
        uri: str | None = None,
        user: str | None = None,
        password: str | None = None,
    ):
        self._uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self._user = user or os.getenv("NEO4J_USER", "neo4j")
        self._password = password or os.getenv("NEO4J_PASSWORD", "password")
        self._driver: Optional[Driver] = None
        self._available = False

    def connect(self) -> bool:
        """Attempt to connect. Returns True on success, False if unavailable."""
        try:
            self._driver = GraphDatabase.driver(
                self._uri,
                auth=(self._user, self._password),
                max_connection_pool_size=10,
            )
            self._driver.verify_connectivity()
            self._available = True
            self._ensure_constraints()
            logger.info(f"Neo4j connected: {self._uri}")
            return True
        except (ServiceUnavailable, AuthError, Exception) as e:
            logger.warning(f"Neo4j unavailable ({e}). KG writes will be skipped.")
            self._available = False
            return False

    def close(self):
        if self._driver:
            self._driver.close()

    @property
    def available(self) -> bool:
        return self._available

    @contextmanager
    def session(self):
        if not self._available or not self._driver:
            raise RuntimeError("Neo4j not connected")
        with self._driver.session() as s:
            yield s

    # ── Schema ────────────────────────────────────────────────────────────────

    def _ensure_constraints(self):
        """Idempotent — creates uniqueness constraints if they don't exist."""
        constraints = [
            "CREATE CONSTRAINT paper_pmid IF NOT EXISTS FOR (p:Paper) REQUIRE p.pmid IS UNIQUE",
            "CREATE CONSTRAINT gene_cui   IF NOT EXISTS FOR (g:GENE)    REQUIRE g.cui IS UNIQUE",
            "CREATE CONSTRAINT disease_cui IF NOT EXISTS FOR (d:DISEASE) REQUIRE d.cui IS UNIQUE",
            "CREATE CONSTRAINT chem_cui   IF NOT EXISTS FOR (c:CHEMICAL) REQUIRE c.cui IS UNIQUE",
            "CREATE CONSTRAINT variant_cui IF NOT EXISTS FOR (v:VARIANT) REQUIRE v.cui IS UNIQUE",
            "CREATE CONSTRAINT species_cui IF NOT EXISTS FOR (s:SPECIES) REQUIRE s.cui IS UNIQUE",
            "CREATE CONSTRAINT cell_cui   IF NOT EXISTS FOR (c:CELLTYPE) REQUIRE c.cui IS UNIQUE",
        ]
        with self.session() as s:
            for cypher in constraints:
                try:
                    s.run(cypher)
                except Exception as e:
                    logger.debug(f"Constraint already exists or error: {e}")

    # ── Write operations ──────────────────────────────────────────────────────

    def upsert_paper(self, pmid: str, title: str | None, source: str, text_length: int):
        with self.session() as s:
            s.run(UPSERT_PAPER, pmid=pmid, title=title, source=source, text_length=text_length)

    def upsert_entity(self, entity: ExtractedEntity) -> bool:
        """
        Write entity node to Neo4j.
        Returns True if written, False if skipped (no CUI or below threshold).
        """
        if not entity.is_linked:
            return False
        label = entity.label  # e.g. GENE, DISEASE
        query = UPSERT_ENTITY.format(label=label)
        with self.session() as s:
            s.run(
                query,
                cui=entity.cui,
                canonical_name=entity.canonical_name,
                ontology=entity.ontology or "UMLS",
            )
        return True

    def link_paper_to_entity(self, pmid: str, entity: ExtractedEntity):
        """Create MENTIONS edge between Paper and Entity nodes."""
        if not entity.is_linked:
            return
        query = LINK_PAPER_ENTITY.format(label=entity.label)
        with self.session() as s:
            s.run(
                query,
                pmid=pmid,
                cui=entity.cui,
                span=entity.span,
                link_score=entity.link_score,
                detected_by=entity.detected_by,
            )

    def write_nlp_result(self, result: NLPResult) -> int:
        """
        Full write of an NLPResult to Neo4j.
        Creates Paper node + all linked Entity nodes + MENTIONS edges.
        Returns count of entity nodes written.
        """
        if not self._available:
            return 0

        pmid = result.pmid or f"NO_PMID_{hash(result.text_length)}"
        self.upsert_paper(pmid, result.title, result.source, result.text_length)

        written = 0
        for entity in result.entities:
            if entity.is_linked:
                self.upsert_entity(entity)
                self.link_paper_to_entity(pmid, entity)
                written += 1

        return written

    # ── Admin ─────────────────────────────────────────────────────────────────

    def set_last_run_time(self, iso_time: str):
        if not self._available:
            return
        with self.session() as s:
            s.run(SET_LAST_RUN, iso_time=iso_time)

    def get_stats(self) -> dict:
        if not self._available:
            return {"status": "unavailable"}
        with self.session() as s:
            row = s.run(KG_STATS).single()
            try:
                run_row = s.run(GET_LAST_RUN).single()
                last_run = run_row["last_run"] if run_row else None
            except Exception:
                last_run = None
                
            return {
                "status": "connected",
                "papers": row["papers"] if row else 0,
                "entities": row["entities"] if row else 0,
                "mentions": row["mentions"] if row else 0,
                "last_scheduler_run": last_run,
                "uri": self._uri,
            }
