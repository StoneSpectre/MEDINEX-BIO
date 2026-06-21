import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from clustering.cluster_engine import ClusterEngine, ContradictionEdge


def test_cluster_splits_two_disconnected_debates():
    """Two unrelated contradiction chains should land in separate clusters."""
    edges = [
        ContradictionEdge("claim_1", "claim_2", 0.9),
        ContradictionEdge("claim_2", "claim_3", 0.85),
        ContradictionEdge("claim_4", "claim_5", 0.95),
    ]
    engine = ClusterEngine()
    clusters = engine.cluster(edges)

    all_claims = {c for cluster in clusters for c in cluster.claim_ids}
    assert all_claims == {"claim_1", "claim_2", "claim_3", "claim_4", "claim_5"}

    cluster_of = {}
    for cluster in clusters:
        for c in cluster.claim_ids:
            cluster_of[c] = cluster.cluster_id

    assert cluster_of["claim_1"] == cluster_of["claim_2"] == cluster_of["claim_3"]
    assert cluster_of["claim_4"] == cluster_of["claim_5"]
    assert cluster_of["claim_1"] != cluster_of["claim_4"]


def test_empty_edges_returns_no_clusters():
    engine = ClusterEngine()
    assert engine.cluster([]) == []


def test_opposing_cluster_pairs_counts_cross_edges():
    edges = [
        ContradictionEdge("a1", "a2", 0.9),   # within future cluster A
        ContradictionEdge("b1", "b2", 0.9),   # within future cluster B
        ContradictionEdge("a1", "b1", 0.8),   # cross-cluster contradiction
        ContradictionEdge("a2", "b2", 0.8),   # cross-cluster contradiction
    ]
    engine = ClusterEngine()
    clusters = engine.cluster(edges)
    pairs = engine.opposing_cluster_pairs(clusters, edges)

    assert len(pairs) >= 1
    top_cluster_a, top_cluster_b, cross_count = pairs[0]
    assert cross_count == 2
    assert top_cluster_a.cluster_id != top_cluster_b.cluster_id
