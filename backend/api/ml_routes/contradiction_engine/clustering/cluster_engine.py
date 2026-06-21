"""
Step 7.5 — Contradiction Clustering

Partitions the contradiction graph into clusters using Louvain community
detection (networkx's native implementation — no extra native deps like
igraph/leidenalg required, which keeps this deployable anywhere networkx
runs). Swap `louvain_communities` for `leidenalg` if you need Leiden's
stronger guarantees on graph resolution at very large scale.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import networkx as nx
from networkx.algorithms.community import louvain_communities


@dataclass
class ContradictionEdge:
    claim_a: str
    claim_b: str
    confidence: float


@dataclass
class Cluster:
    cluster_id: str
    claim_ids: set[str] = field(default_factory=set)


class ClusterEngine:
    def __init__(self, resolution: float = 1.0, seed: int = 42):
        self._resolution = resolution
        self._seed = seed

    def build_graph(self, edges: list[ContradictionEdge]) -> nx.Graph:
        g = nx.Graph()
        for e in edges:
            g.add_edge(e.claim_a, e.claim_b, weight=e.confidence)
        return g

    def cluster(self, edges: list[ContradictionEdge]) -> list[Cluster]:
        if not edges:
            return []
        g = self.build_graph(edges)
        communities = louvain_communities(
            g, weight="weight", resolution=self._resolution, seed=self._seed
        )
        return [
            Cluster(cluster_id=f"cluster_{i}", claim_ids=set(community))
            for i, community in enumerate(communities)
        ]

    def opposing_cluster_pairs(
        self, clusters: list[Cluster], edges: list[ContradictionEdge]
    ) -> list[tuple[Cluster, Cluster, int]]:
        """
        For each pair of clusters, count cross-cluster contradiction edges.
        High cross-edge count between two clusters = they represent opposing
        "sides" of a scientific debate (Step 7.4's support_cluster /
        contradiction_cluster split feeding the hypothesis generator).
        """
        membership = {}
        for c in clusters:
            for claim_id in c.claim_ids:
                membership[claim_id] = c.cluster_id

        cross_counts: dict[tuple[str, str], int] = {}
        for e in edges:
            ca, cb = membership.get(e.claim_a), membership.get(e.claim_b)
            if ca is None or cb is None or ca == cb:
                continue
            key = tuple(sorted((ca, cb)))
            cross_counts[key] = cross_counts.get(key, 0) + 1

        by_id = {c.cluster_id: c for c in clusters}
        results = []
        for (id_a, id_b), count in sorted(cross_counts.items(), key=lambda kv: -kv[1]):
            results.append((by_id[id_a], by_id[id_b], count))
        return results
