"""
medinex/graph/db.py

Neo4j connection manager and base CRUD operations.
Uses the official neo4j Python driver.

Install: pip install neo4j python-dotenv
"""

import os
from contextlib import contextmanager
from typing import Any

from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# ── Connection ───────────────────────────────────────────────

NEO4J_URI      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "medinex123")


class MedinexGraph:
    """
    Wrapper around the Neo4j driver.
    Usage:
        graph = MedinexGraph()
        graph.create_disease({...})
        graph.close()
    Or as context manager:
        with MedinexGraph() as graph:
            graph.create_disease({...})
    """

    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        self._create_indexes()

    def close(self):
        self.driver.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def run(self, query: str, **params) -> list[dict]:
        with self.driver.session() as session:
            result = session.run(query, **params)
            return [dict(record) for record in result]

    # ── Indexes ──────────────────────────────────────────────

    def _create_indexes(self):
        indexes = [
            "CREATE INDEX disease_id   IF NOT EXISTS FOR (n:Disease)    ON (n.id)",
            "CREATE INDEX disease_cui  IF NOT EXISTS FOR (n:Disease)    ON (n.cui)",
            "CREATE INDEX drug_id      IF NOT EXISTS FOR (n:Drug)       ON (n.id)",
            "CREATE INDEX gene_id      IF NOT EXISTS FOR (n:Gene)       ON (n.id)",
            "CREATE INDEX gene_symbol  IF NOT EXISTS FOR (n:Gene)       ON (n.symbol)",
            "CREATE INDEX protein_id   IF NOT EXISTS FOR (n:Protein)    ON (n.id)",
            "CREATE INDEX symptom_id   IF NOT EXISTS FOR (n:Symptom)    ON (n.id)",
            "CREATE INDEX paper_pmid   IF NOT EXISTS FOR (n:Paper)      ON (n.pmid)",
            "CREATE INDEX researcher_id IF NOT EXISTS FOR (n:Researcher) ON (n.id)",
        ]
        for idx in indexes:
            self.run(idx)

    # ── Upsert helpers ───────────────────────────────────────
    # MERGE = create if not exists, update if exists

    def upsert_disease(self, props: dict) -> dict:
        query = """
        MERGE (d:Disease {id: $id})
        SET d += $props
        RETURN d
        """
        result = self.run(query, id=props["id"], props=props)
        return result[0]["d"] if result else {}

    def upsert_drug(self, props: dict) -> dict:
        query = """
        MERGE (dr:Drug {id: $id})
        SET dr += $props
        RETURN dr
        """
        result = self.run(query, id=props["id"], props=props)
        return result[0]["dr"] if result else {}

    def upsert_gene(self, props: dict) -> dict:
        query = """
        MERGE (g:Gene {id: $id})
        SET g += $props
        RETURN g
        """
        result = self.run(query, id=props["id"], props=props)
        return result[0]["g"] if result else {}

    def upsert_symptom(self, props: dict) -> dict:
        query = """
        MERGE (s:Symptom {id: $id})
        SET s += $props
        RETURN s
        """
        result = self.run(query, id=props["id"], props=props)
        return result[0]["s"] if result else {}

    def upsert_paper(self, props: dict) -> dict:
        query = """
        MERGE (p:Paper {pmid: $pmid})
        SET p += $props
        RETURN p
        """
        result = self.run(query, pmid=props["pmid"], props=props)
        return result[0]["p"] if result else {}

    # ── Relationship creators ────────────────────────────────

    def link_disease_symptom(self, disease_id: str, symptom_id: str, props: dict = {}):
        query = """
        MATCH (d:Disease {id: $disease_id})
        MATCH (s:Symptom {id: $symptom_id})
        MERGE (d)-[r:HAS_SYMPTOM]->(s)
        SET r += $props
        RETURN r
        """
        return self.run(query, disease_id=disease_id, symptom_id=symptom_id, props=props)

    def link_disease_gene(self, disease_id: str, gene_id: str, props: dict = {}):
        query = """
        MATCH (d:Disease {id: $disease_id})
        MATCH (g:Gene {id: $gene_id})
        MERGE (d)-[r:ASSOCIATED_WITH_GENE]->(g)
        SET r += $props
        RETURN r
        """
        return self.run(query, disease_id=disease_id, gene_id=gene_id, props=props)

    def link_drug_disease(self, drug_id: str, disease_id: str, props: dict = {}):
        query = """
        MATCH (dr:Drug {id: $drug_id})
        MATCH (d:Disease {id: $disease_id})
        MERGE (dr)-[r:TREATS]->(d)
        SET r += $props
        RETURN r
        """
        return self.run(query, drug_id=drug_id, disease_id=disease_id, props=props)

    def link_paper_disease(self, pmid: str, disease_id: str):
        query = """
        MATCH (p:Paper {pmid: $pmid})
        MATCH (d:Disease {id: $disease_id})
        MERGE (p)-[:MENTIONS_DISEASE]->(d)
        """
        return self.run(query, pmid=pmid, disease_id=disease_id)

    # ── Query helpers ────────────────────────────────────────

    def get_disease_graph(self, disease_name: str) -> list[dict]:
        """
        Returns the full 2-hop neighbourhood of a disease.
        Powers the Disease Explorer.
        """
        query = """
        MATCH (d:Disease)
        WHERE toLower(d.name) CONTAINS toLower($name)
        OPTIONAL MATCH (d)-[:HAS_SYMPTOM]->(s:Symptom)
        OPTIONAL MATCH (d)-[:ASSOCIATED_WITH_GENE]->(g:Gene)
        OPTIONAL MATCH (dr:Drug)-[:TREATS]->(d)
        OPTIONAL MATCH (p:Paper)-[:MENTIONS_DISEASE]->(d)
        RETURN
            d.name        AS disease,
            d.description AS description,
            collect(DISTINCT s.name)  AS symptoms,
            collect(DISTINCT g.symbol) AS genes,
            collect(DISTINCT dr.name)  AS drugs,
            collect(DISTINCT p.pmid)   AS papers
        LIMIT 1
        """
        return self.run(query, name=disease_name)

    def node_count(self) -> dict:
        """Returns count of each node type — useful for monitoring."""
        counts = {}
        for label in ["Disease", "Drug", "Gene", "Protein", "Symptom", "Paper", "Researcher"]:
            result = self.run(f"MATCH (n:{label}) RETURN count(n) AS c")
            counts[label] = result[0]["c"] if result else 0
        return counts
