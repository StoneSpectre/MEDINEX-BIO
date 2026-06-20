"""
Step 8.1 — Graph Agent

Queries the Neo4j biomedical knowledge graph built in Steps 6 & 7.
Given a list of entity IDs (resolved by the Planner), the Graph Agent:
  1. Finds all directly connected entities within N hops
  2. Returns the subgraph (nodes + edges) for context injection
  3. Optionally finds shortest paths between two entities

This is the GraphRAG component: the subgraph is serialized to text and
injected into the Writer Agent's context alongside retrieved documents.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional
from neo4j import GraphDatabase, Driver


@dataclass
class GraphNode:
    id: str
    kind: str          # Disease | Gene | Drug | Protein | Claim | Paper
    name: str
    properties: dict


@dataclass
class GraphEdge:
    source_id: str
    target_id: str
    relation: str      # CAUSES | TREATS | INHIBITS | SUPPORTS | CONTRADICTS | MENTIONS …
    properties: dict


@dataclass
class SubgraphResult:
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    paths: list[list[str]]   # each path is [node_id, edge_type, node_id, ...]
    entity_ids_queried: list[str]

    def to_text_context(self) -> str:
        """
        Serialize subgraph into plain text for LLM context injection.
        Writer Agent receives this as part of its prompt.
        """
        lines = ["=== KNOWLEDGE GRAPH CONTEXT ==="]
        for node in self.nodes:
            lines.append(f"[{node.kind}] {node.name} (id={node.id})")
        lines.append("")
        for edge in self.edges:
            src = next((n.name for n in self.nodes if n.id == edge.source_id), edge.source_id)
            tgt = next((n.name for n in self.nodes if n.id == edge.target_id), edge.target_id)
            lines.append(f"  {src} --[{edge.relation}]--> {tgt}")
        if self.paths:
            lines.append("\nKey paths:")
            for path in self.paths[:5]:
                lines.append("  " + " -> ".join(path))
        return "\n".join(lines)


class GraphAgent:
    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_password: str,
                 neo4j_database: str = "neo4j"):
        self._driver: Driver = GraphDatabase.driver(
            neo4j_uri, auth=(neo4j_user, neo4j_password)
        )
        self._database = neo4j_database

    def close(self) -> None:
        self._driver.close()

    def get_subgraph(self, entity_ids: list[str], hops: int = 2,
                     max_nodes: int = 100) -> SubgraphResult:
        """
        Expand N hops from each seed entity. Merges into one subgraph.
        hops=2 is the production default: captures direct and indirect relationships
        without exploding context size.
        """
        if not entity_ids:
            return SubgraphResult(nodes=[], edges=[], paths=[], entity_ids_queried=[])

        with self._driver.session(database=self._database) as session:
            result = session.run(
                f"""
                MATCH (seed:Entity)
                WHERE seed.id IN $ids
                CALL apoc.path.subgraphAll(seed, {{
                    maxLevel: {hops},
                    limit: {max_nodes}
                }})
                YIELD nodes, relationships
                RETURN nodes, relationships
                """,
                ids=entity_ids,
            )
            # APOC not always available — fall back to manual Cypher
            raw = [record.data() for record in result]

        if not raw:
            return self._manual_subgraph(entity_ids, hops, max_nodes)

        nodes: dict[str, GraphNode] = {}
        edges: list[GraphEdge] = []
        for row in raw:
            for n in (row.get("nodes") or []):
                nid = str(n.get("id", ""))
                nodes[nid] = GraphNode(
                    id=nid,
                    kind=list(n.labels)[0] if hasattr(n, "labels") else "Entity",
                    name=n.get("name", nid),
                    properties=dict(n),
                )
            for r in (row.get("relationships") or []):
                edges.append(GraphEdge(
                    source_id=str(r.start_node.get("id", "")),
                    target_id=str(r.end_node.get("id", "")),
                    relation=r.type,
                    properties=dict(r),
                ))
        return SubgraphResult(
            nodes=list(nodes.values()),
            edges=edges,
            paths=[],
            entity_ids_queried=entity_ids,
        )

    def _manual_subgraph(self, entity_ids: list[str], hops: int,
                          max_nodes: int) -> SubgraphResult:
        """Fallback subgraph expansion without APOC."""
        hop_cypher = "-[r]->(neighbor)" if hops == 1 else "-[r*1..2]->(neighbor)"
        with self._driver.session(database=self._database) as session:
            result = session.run(
                f"""
                MATCH (seed)
                WHERE seed.id IN $ids
                MATCH (seed){hop_cypher}
                RETURN seed, r, neighbor
                LIMIT {max_nodes}
                """,
                ids=entity_ids,
            )
            rows = [record.data() for record in result]

        nodes: dict[str, GraphNode] = {}
        edges: list[GraphEdge] = []
        for row in rows:
            for key in ("seed", "neighbor"):
                n = row.get(key)
                if n and isinstance(n, dict):
                    nid = str(n.get("id", ""))
                    nodes[nid] = GraphNode(
                        id=nid, kind="Entity",
                        name=n.get("name", nid), properties=n
                    )
            r = row.get("r")
            if r and isinstance(r, dict):
                edges.append(GraphEdge(
                    source_id=str(row.get("seed", {}).get("id", "")),
                    target_id=str(row.get("neighbor", {}).get("id", "")),
                    relation=str(r.get("type", "RELATED")),
                    properties=r,
                ))
        return SubgraphResult(
            nodes=list(nodes.values()),
            edges=edges,
            paths=[],
            entity_ids_queried=entity_ids,
        )

    def shortest_path(self, entity_id_a: str, entity_id_b: str,
                      max_hops: int = 5) -> list[str]:
        """
        Return node names along the shortest path between two entities.
        Used for mechanistic queries ("how does APOE connect to Amyloid?").
        """
        with self._driver.session(database=self._database) as session:
            result = session.run(
                """
                MATCH (a:Entity {id: $a}), (b:Entity {id: $b}),
                      path = shortestPath((a)-[*1..%d]-(b))
                RETURN [n IN nodes(path) | coalesce(n.name, n.id)] AS names
                """ % max_hops,
                a=entity_id_a, b=entity_id_b,
            )
            record = result.single()
            return record["names"] if record else []

    def get_contradiction_context(self, entity_ids: list[str]) -> list[dict]:
        """
        Pull contradiction edges (from Step 7) for a set of entities.
        Feeds the Writer Agent with known scientific disagreements.
        """
        with self._driver.session(database=self._database) as session:
            result = session.run(
                """
                MATCH (e:Entity)<-[:MENTIONS]-(c:Claim)-[r:CONTRADICTS]-(other:Claim)
                WHERE e.id IN $ids
                RETURN c.subject AS subj, c.relation AS rel, c.object AS obj,
                       other.subject AS other_subj, other.relation AS other_rel,
                       other.object AS other_obj,
                       r.confidence AS confidence
                LIMIT 20
                """,
                ids=entity_ids,
            )
            return [record.data() for record in result]
