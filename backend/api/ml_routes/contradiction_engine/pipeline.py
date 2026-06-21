"""
Step 7 — full pipeline orchestration.

Paper Store -> Claim Extraction -> Claim Graph -> NLI Engine ->
Contradiction Graph -> Cluster Engine -> Hypothesis Engine -> Gap Discovery

Run as:
    python pipeline.py path/to/paper.txt

Requires real env vars set (see config.py / .env.example): POSTGRES_DSN,
NEO4J_URI/USER/PASSWORD, ANTHROPIC_API_KEY, and the NLI service running
(uvicorn nli.nli_service:app).
"""
from __future__ import annotations

import asyncio
import sys

import config
from db.postgres_client import PostgresClient, Claim
from graph.neo4j_client import Neo4jClient
from llm.anthropic_client import AnthropicLLMClient
from claim_extraction.extractor import ClaimExtractor
from nli.nli_client import NLIClient
from contradiction.contradiction_detector import ContradictionDetector
from clustering.cluster_engine import ClusterEngine, ContradictionEdge
from hypothesis.hypothesis_generator import HypothesisGenerator
from gap_discovery.gap_finder import GapFinder
from scoring.opportunity_ranking import score_opportunity, rank_opportunities, ScoringWeights


async def ingest_paper(paper_path: str, title: str, doi: str | None = None) -> None:
    """Steps 7.1-7.2: extract claims from one paper, store + graph them."""
    with open(paper_path, "r", encoding="utf-8") as f:
        paper_text = f.read()

    pg = PostgresClient(config.POSTGRES.dsn)
    await pg.connect()
    neo4j = Neo4jClient(config.NEO4J.uri, config.NEO4J.user, config.NEO4J.password,
                         config.NEO4J.database)
    neo4j.ensure_constraints()
    llm = AnthropicLLMClient(config.LLM.anthropic_api_key, config.LLM.anthropic_model)
    extractor = ClaimExtractor(llm)

    try:
        paper_id = await pg.insert_paper(title=title, abstract=paper_text[:2000], doi=doi)
        neo4j.upsert_paper_node(paper_id, title)

        extracted = extractor.extract(paper_text)
        print(f"Extracted {len(extracted)} claims from '{title}'")

        for ec in extracted:
            claim = Claim(
                paper_id=paper_id, subject=ec.subject, relation=ec.relation,
                object=ec.object, evidence_text=ec.evidence_text,
                confidence=ec.confidence, population=ec.population,
            )
            claim_id = await pg.insert_claim(claim)
            neo4j.upsert_claim_node(claim_id, ec.subject, ec.relation, ec.object, ec.confidence)
            neo4j.link_paper_supports_claim(paper_id, claim_id)
            # Entity nodes/MENTIONS edges would be created here by the
            # entity-linking pass from Step 5/6, mapping ec.subject/object
            # strings to canonical entity IDs (UMLS/MeSH/etc).
    finally:
        await pg.close()
        neo4j.close()


async def detect_contradictions_for_pair(subject_entity_id: str, object_entity_id: str) -> int:
    """Step 7.3-7.4: NLI over one entity-pair bucket."""
    pg = PostgresClient(config.POSTGRES.dsn)
    await pg.connect()
    neo4j = Neo4jClient(config.NEO4J.uri, config.NEO4J.user, config.NEO4J.password,
                         config.NEO4J.database)
    nli = NLIClient(base_url=f"http://{config.NLI.service_host}:{config.NLI.service_port}")
    detector = ContradictionDetector(pg, neo4j, nli)
    try:
        return await detector.detect_for_entity_pair(subject_entity_id, object_entity_id)
    finally:
        await pg.close()
        neo4j.close()
        nli.close()


def cluster_and_hypothesize() -> None:
    """Step 7.5-7.6: pull the full contradiction graph, cluster it, generate hypotheses."""
    neo4j = Neo4jClient(config.NEO4J.uri, config.NEO4J.user, config.NEO4J.password,
                         config.NEO4J.database)
    llm = AnthropicLLMClient(config.LLM.anthropic_api_key, config.LLM.anthropic_model)
    generator = HypothesisGenerator(llm)
    cluster_engine = ClusterEngine()

    try:
        raw_edges = neo4j.get_all_contradiction_edges()
        edges = [
            ContradictionEdge(e["claim_a"], e["claim_b"], e["confidence"])
            for e in raw_edges
        ]
        clusters = cluster_engine.cluster(edges)
        print(f"Found {len(clusters)} clusters across {len(edges)} contradiction edges")

        opposing_pairs = cluster_engine.opposing_cluster_pairs(clusters, edges)
        for cluster_a, cluster_b, cross_edges in opposing_pairs[:5]:
            print(
                f"  {cluster_a.cluster_id} <-> {cluster_b.cluster_id}: "
                f"{cross_edges} cross-contradictions "
                f"({len(cluster_a.claim_ids)} vs {len(cluster_b.claim_ids)} claims)"
            )
            # In production: pull full claim rows for each cluster from
            # Postgres and pass to generator.generate(support, contradiction)
    finally:
        neo4j.close()


def discover_gaps_and_rank() -> None:
    """Step 7.7-7.8: weekly batch — gap discovery + opportunity ranking."""
    neo4j = Neo4jClient(config.NEO4J.uri, config.NEO4J.user, config.NEO4J.password,
                         config.NEO4J.database)
    finder = GapFinder(neo4j)
    try:
        gaps = finder.find_all_gaps()
        print(f"Found {len(gaps)} candidate knowledge gaps")

        max_degree = max((g.combined_degree for g in gaps), default=1)
        scored = [
            score_opportunity(
                subject_entity_id=g.entity_a, object_entity_id=g.entity_b,
                novelty=1.0,  # no existing claims connecting them, by construction
                impact_raw=g.combined_degree, impact_max=max_degree,
                graph_centrality_raw=g.combined_degree, centrality_max=max_degree,
                evidence_support=0.5,  # placeholder until evidence-density scoring lands
                weights=ScoringWeights(),
            )
            for g in gaps
        ]
        ranked = rank_opportunities(scored)
        for opp in ranked[:10]:
            print(f"  {opp.subject_entity_id} <-> {opp.object_entity_id}: score={opp.score:.3f}")
    finally:
        neo4j.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pipeline.py <paper_text_path> <paper_title>")
        sys.exit(1)
    asyncio.run(ingest_paper(sys.argv[1], sys.argv[2]))
