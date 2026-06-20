"""
Real Neo4j client for the biomedical claim/contradiction graph.

Uses the official `neo4j` Python driver. All operations are written as
parameterized Cypher (no string interpolation of user data) and run
against the database configured in config.NEO4J.
"""
from __future__ import annotations

from typing import Any, Optional

from neo4j import GraphDatabase, Driver


class Neo4jClient:
    def __init__(self, uri: str, user: str, password: str, database: str = "neo4j"):
        self._driver: Driver = GraphDatabase.driver(uri, auth=(user, password))
        self._database = database

    def close(self) -> None:
        self._driver.close()

    def verify_connectivity(self) -> None:
        self._driver.verify_connectivity()

    def ensure_constraints(self) -> None:
        """Idempotent schema setup — safe to call on every boot."""
        constraints = [
            "CREATE CONSTRAINT paper_id IF NOT EXISTS FOR (p:Paper) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE",
        ]
        with self._driver.session(database=self._database) as session:
            for stmt in constraints:
                session.run(stmt)

    # ---- node creation ----------------------------------------------------

    def upsert_paper_node(self, paper_id: str, title: str) -> None:
        with self._driver.session(database=self._database) as session:
            session.run(
                "MERGE (p:Paper {id: $id}) SET p.title = $title",
                id=paper_id, title=title,
            )

    def upsert_claim_node(self, claim_id: str, subject: str, relation: str, obj: str,
                           confidence: float) -> None:
        with self._driver.session(database=self._database) as session:
            session.run(
                """
                MERGE (c:Claim {id: $id})
                SET c.subject = $subject, c.relation = $relation,
                    c.object = $object, c.confidence = $confidence
                """,
                id=claim_id, subject=subject, relation=relation, object=obj,
                confidence=confidence,
            )

    def upsert_entity_node(self, entity_id: str, name: str, kind: str) -> None:
        """kind: Disease | Gene | Drug | Protein"""
        with self._driver.session(database=self._database) as session:
            session.run(
                f"MERGE (e:Entity:{kind} {{id: $id}}) SET e.name = $name",
                id=entity_id, name=name,
            )

    # ---- edges ----------------------------------------------------

    def link_paper_supports_claim(self, paper_id: str, claim_id: str) -> None:
        with self._driver.session(database=self._database) as session:
            session.run(
                """
                MATCH (p:Paper {id: $paper_id}), (c:Claim {id: $claim_id})
                MERGE (p)-[:SUPPORTS]->(c)
                """,
                paper_id=paper_id, claim_id=claim_id,
            )

    def link_claim_mentions_entity(self, claim_id: str, entity_id: str, role: str) -> None:
        """role: 'subject' | 'object'"""
        with self._driver.session(database=self._database) as session:
            session.run(
                """
                MATCH (c:Claim {id: $claim_id}), (e:Entity {id: $entity_id})
                MERGE (c)-[:MENTIONS {role: $role}]->(e)
                """,
                claim_id=claim_id, entity_id=entity_id, role=role,
            )

    def link_claims_contradict(self, claim_a_id: str, claim_b_id: str, confidence: float) -> None:
        with self._driver.session(database=self._database) as session:
            session.run(
                """
                MATCH (a:Claim {id: $a}), (b:Claim {id: $b})
                MERGE (a)-[r:CONTRADICTS]-(b)
                SET r.confidence = $confidence
                """,
                a=claim_a_id, b=claim_b_id, confidence=confidence,
            )

    # ---- reads ----------------------------------------------------

    def get_contradiction_subgraph(self, entity_id: str, hops: int = 2) -> list[dict[str, Any]]:
        """All claim-contradiction chains within N hops of an entity — feeds clustering."""
        with self._driver.session(database=self._database) as session:
            result = session.run(
                f"""
                MATCH (e:Entity {{id: $entity_id}})<-[:MENTIONS]-(c:Claim)
                MATCH (c)-[r:CONTRADICTS*1..{hops}]-(other:Claim)
                RETURN c.id AS claim_id, other.id AS other_id, r AS rels
                """,
                entity_id=entity_id,
            )
            return [record.data() for record in result]

    def get_all_contradiction_edges(self) -> list[dict[str, Any]]:
        with self._driver.session(database=self._database) as session:
            result = session.run(
                """
                MATCH (a:Claim)-[r:CONTRADICTS]-(b:Claim)
                WHERE a.id < b.id
                RETURN a.id AS claim_a, b.id AS claim_b, r.confidence AS confidence
                """
            )
            return [record.data() for record in result]

    def find_knowledge_gaps(self, entity_kind_a: str, entity_kind_b: str,
                             min_degree: int = 5, limit: int = 50) -> list[dict[str, Any]]:
        """
        Step 7.7: find pairs of well-studied entities (high individual degree)
        with NO direct connecting claim/evidence between them — candidate
        research gaps.
        """
        with self._driver.session(database=self._database) as session:
            result = session.run(
                f"""
                MATCH (a:{entity_kind_a})
                WHERE size((a)<-[:MENTIONS]-()) >= $min_degree
                MATCH (b:{entity_kind_b})
                WHERE size((b)<-[:MENTIONS]-()) >= $min_degree
                  AND a <> b
                  AND NOT EXISTS {{
                      MATCH (a)<-[:MENTIONS {{role:'subject'}}]-(c:Claim)-[:MENTIONS {{role:'object'}}]->(b)
                  }}
                  AND NOT EXISTS {{
                      MATCH (b)<-[:MENTIONS {{role:'subject'}}]-(c:Claim)-[:MENTIONS {{role:'object'}}]->(a)
                  }}
                RETURN a.id AS entity_a, a.name AS name_a,
                       b.id AS entity_b, b.name AS name_b,
                       size((a)<-[:MENTIONS]-()) AS degree_a,
                       size((b)<-[:MENTIONS]-()) AS degree_b
                ORDER BY (degree_a + degree_b) DESC
                LIMIT $limit
                """,
                min_degree=min_degree, limit=limit,
            )
            return [record.data() for record in result]

    def entity_centrality(self, entity_id: str) -> int:
        """Cheap centrality proxy: degree. Swap for GDS PageRank/Betweenness at scale."""
        with self._driver.session(database=self._database) as session:
            result = session.run(
                "MATCH (e:Entity {id: $id}) RETURN size((e)<-[:MENTIONS]-()) AS degree",
                id=entity_id,
            )
            record = result.single()
            return record["degree"] if record else 0
