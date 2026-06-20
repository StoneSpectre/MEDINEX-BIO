import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from medinex.step7_contradiction.scoring.opportunity_ranking import score_opportunity, rank_opportunities, ScoringWeights


def test_score_is_normalized_and_bounded():
    opp = score_opportunity(
        subject_entity_id="GENE:APOE", object_entity_id="DISEASE:Alzheimers",
        novelty=1.0, impact_raw=500, impact_max=1000,
        graph_centrality_raw=50, centrality_max=100,
        evidence_support=0.8,
    )
    assert 0.0 <= opp.impact <= 1.0
    assert 0.0 <= opp.graph_centrality <= 1.0
    assert opp.impact == pytest.approx(0.5)
    assert opp.graph_centrality == pytest.approx(0.5)

    weights = ScoringWeights()
    max_possible = weights.novelty + weights.impact + weights.graph_centrality + weights.evidence_support
    assert 0.0 <= opp.score <= max_possible


def test_zero_max_does_not_divide_by_zero():
    opp = score_opportunity(
        subject_entity_id="A", object_entity_id="B",
        novelty=0.5, impact_raw=10, impact_max=0,
        graph_centrality_raw=5, centrality_max=0,
        evidence_support=0.5,
    )
    assert opp.impact == 0.0
    assert opp.graph_centrality == 0.0


def test_rank_opportunities_sorts_descending():
    weights = ScoringWeights()
    low = score_opportunity("A", "B", novelty=0.1, impact_raw=10, impact_max=100,
                             graph_centrality_raw=10, centrality_max=100,
                             evidence_support=0.1, weights=weights)
    high = score_opportunity("C", "D", novelty=0.9, impact_raw=90, impact_max=100,
                              graph_centrality_raw=90, centrality_max=100,
                              evidence_support=0.9, weights=weights)
    ranked = rank_opportunities([low, high])
    assert ranked[0] is high
    assert ranked[1] is low


def test_weights_change_relative_ranking():
    """A claim-pair high on evidence_support but low on novelty should be
    able to outrank the reverse, once evidence_support is weighted higher."""
    evidence_heavy = score_opportunity(
        "A", "B", novelty=0.1, impact_raw=10, impact_max=100,
        graph_centrality_raw=10, centrality_max=100, evidence_support=0.9,
        weights=ScoringWeights(novelty=0.5, evidence_support=3.0),
    )
    novelty_heavy = score_opportunity(
        "C", "D", novelty=0.9, impact_raw=10, impact_max=100,
        graph_centrality_raw=10, centrality_max=100, evidence_support=0.1,
        weights=ScoringWeights(novelty=0.5, evidence_support=3.0),
    )
    assert evidence_heavy.score > novelty_heavy.score
