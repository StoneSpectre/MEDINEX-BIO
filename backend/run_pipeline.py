"""
MEDINEX — PHASE 0: COMPLETE PIPELINE RUNNER
============================================
Runs Steps 1 through 6 end-to-end using bundled sample data.
Generates all output artifacts: JSON, CSV, SQLite DB, Knowledge Graph, Analytics.

Usage:
    cd backend
    python run_pipeline.py
"""

import sys
import json
import os
import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime

# Ensure backend is importable
sys.path.insert(0, str(Path(__file__).parent))

from sample_data import SAMPLE_PAPERS, SAMPLE_SEARCH_RESULTS, SAMPLE_CITATIONS


def banner(step_num, title):
    print("\n" + "=" * 70)
    print(f"  MEDINEX | STEP {step_num} --- {title}")
    print("=" * 70)


# ===========================================
# STEP 1: BIOMEDICAL KNOWLEDGE SOURCES
# ===========================================
def run_step_1():
    banner(1, "BIOMEDICAL KNOWLEDGE SOURCES")
    from literature_explorer import explain_journal_structure, save_paper

    print("  Using bundled sample data (5 real PubMed papers)")

    for paper in SAMPLE_PAPERS:
        print(f"\n  Processing PMID {paper['pmid']}: {paper['title'][:60]}...")
        explain_journal_structure(paper)
        save_paper(paper)

        pmid = paper["pmid"]
        if pmid in SAMPLE_CITATIONS:
            cites = SAMPLE_CITATIONS[pmid]
            print(f"  → Cited by: {len(cites['cited_by'])} papers")
            print(f"  → Related:  {len(cites['related'])} papers")
            print(f"  → References: {len(cites['references'])} papers")

    print(f"\n  ✅ STEP 1 COMPLETE — {len(SAMPLE_PAPERS)} papers analyzed and saved.\n")


# ===========================================
# STEP 2: DATA COLLECTION ENGINE
# ===========================================
def run_step_2():
    banner(2, "DATA COLLECTION ENGINE")
    from data_collector import build_dataset, save_dataset, print_dataset_summary

    print("  Building structured datasets from sample papers")

    topics = {
        "Alzheimer Disease Amyloid": [SAMPLE_PAPERS[0]],
        "Long COVID PASC": [SAMPLE_PAPERS[1]],
        "BRCA1 Breast Cancer": [SAMPLE_PAPERS[2]],
        "Metformin Diabetes": [SAMPLE_PAPERS[3]],
        "CAR-T Immunotherapy": [SAMPLE_PAPERS[4]],
    }

    all_dfs = []
    for topic, papers in topics.items():
        print(f"\n  🔍 Building dataset: '{topic}'")
        df = build_dataset(papers, topic)
        all_dfs.append(df)
        print_dataset_summary(df, topic)
        save_dataset(df, topic)

    if all_dfs:
        combined = pd.concat(all_dfs, ignore_index=True)
        pubmed_dir = Path(__file__).parent / "data" / "pubmed"
        pubmed_dir.mkdir(parents=True, exist_ok=True)
        combined_path = pubmed_dir / "combined_dataset.csv"
        combined.to_csv(combined_path, index=False)
        print(f"\n  ✓ Combined dataset ({len(combined)} papers) → {combined_path}")

    print(f"\n  ✅ STEP 2 COMPLETE — {len(all_dfs)} datasets saved.\n")


# ===========================================
# STEP 3: CLINICAL DATA INFRASTRUCTURE
# ===========================================
def run_step_3():
    banner(3, "CLINICAL DATA INFRASTRUCTURE")
    from clinical_infrastructure import (
        generate_synthetic_db, get_patient_journey, print_patient_journey,
        run_clinical_analytics, print_schema_reference, DB_PATH
    )

    print_schema_reference()

    print("\n  Generating synthetic MIMIC-IV database (50 patients)...")
    db_path = generate_synthetic_db(n_patients=50)
    print(f"  ✓ Database created: {db_path}")

    conn = sqlite3.connect(db_path)

    print("\n  TABLE SIZES:")
    total_rows = 0
    for table in ["patients", "admissions", "diagnoses_icd", "procedures_icd",
                   "prescriptions", "labevents", "chartevents"]:
        count = pd.read_sql(f"SELECT COUNT(*) as n FROM {table}", conn).iloc[0]["n"]
        total_rows += count
        print(f"    {table:20s}: {count:,} rows")
    print(f"\n    {'TOTAL':20s}: {total_rows:,} rows")

    run_clinical_analytics(conn)

    first_patient = pd.read_sql("SELECT subject_id FROM patients LIMIT 1", conn).iloc[0]["subject_id"]
    journey = get_patient_journey(int(first_patient), conn)
    print_patient_journey(journey)

    clinical_dir = Path(__file__).parent / "data" / "clinical"
    clinical_dir.mkdir(parents=True, exist_ok=True)
    print("  Exporting tables to CSV...")
    for table in ["patients", "admissions", "diagnoses_icd"]:
        df = pd.read_sql(f"SELECT * FROM {table}", conn)
        out = clinical_dir / f"{table}.csv"
        df.to_csv(out, index=False)
        print(f"    ✓ {out}")

    conn.close()
    print(f"\n  ✅ STEP 3 COMPLETE — {total_rows:,} rows across 7 tables.\n")
    return db_path


# ===========================================
# STEP 4: BIOMEDICAL NLP
# ===========================================
def run_step_4():
    banner(4, "BIOMEDICAL NLP")
    from biomedical_nlp import NLPPipeline, print_nlp_results

    pipeline = NLPPipeline()

    print("\n  Processing all 5 papers through NER → Relations → Embeddings...")
    results = pipeline.process_corpus(SAMPLE_PAPERS)

    for r in results:
        print_nlp_results(r)

    # Semantic similarity demo
    print("\n  SEMANTIC SEARCH DEMO:")
    queries = [
        "amyloid beta plaques neurodegeneration treatment",
        "BRCA gene mutation cancer risk therapy",
    ]
    for query in queries:
        print(f"\n  Query: \"{query}\"")
        hits = pipeline.embedder.most_similar(query, top_k=2)
        for h in hits:
            score = h.get("similarity_score", 0)
            print(f"    → [{score:.4f}] {h.get('title','')[:60]}...")

    # Save outputs
    pipeline.save_results(results)
    pipeline.save_relations(results)

    total_ents = sum(r["entity_count"] for r in results)
    total_rels = sum(r["relation_count"] for r in results)
    print(f"\n  ✅ STEP 4 COMPLETE — {total_ents} entities, {total_rels} relations extracted.\n")
    return results


# ===========================================
# STEP 5: KNOWLEDGE GRAPH ENGINEERING
# ===========================================
def run_step_5(nlp_results, db_path):
    banner(5, "KNOWLEDGE GRAPH ENGINEERING")
    from knowledge_graph import MedinexGraph, GraphBuilder, print_graph_stats, demo_queries

    graph = MedinexGraph()
    builder = GraphBuilder(graph)

    # Build from NLP results
    builder.ingest_nlp_results(nlp_results, SAMPLE_PAPERS)

    # Build from clinical data
    if db_path and Path(db_path).exists():
        builder.ingest_clinical_data(Path(db_path))

    # Add curated gold-standard facts
    builder.add_curated_biomedical_facts()

    # Print stats
    print_graph_stats(graph)

    # Demo queries
    demo_queries(graph)

    # Export
    graph.save()
    graph.save_graphml()
    graph.save_node_csv()
    graph.save_edge_csv()

    stats = graph.stats()
    print(f"\n  ✅ STEP 5 COMPLETE — {stats['total_nodes']} nodes, {stats['total_edges']} edges.\n")
    return graph


# ===========================================
# STEP 6: GRAPH ANALYTICS
# ===========================================
def run_step_6(graph):
    banner(6, "GRAPH ANALYTICS")
    from graph_analytics import (
        CentralityAnalyzer, CommunityDetector, TopologyAnalyzer,
        DiseaseNetwork, DrugNetwork, GeneNetwork,
        DrugRepurposingEngine, KnowledgeGapDetector, print_section, GRAPH_DIR
    )

    G = graph.G  # the underlying NetworkX MultiDiGraph

    # 6A: Centrality
    print_section("CENTRALITY ANALYSIS")
    ca = CentralityAnalyzer(G)
    cent_df = ca.compute_all()
    print("\n  Top 10 nodes by PageRank:")
    for _, row in cent_df.head(10).iterrows():
        print(f"    {row['name']:<25} [{row['type']:<10}]  PR={row['pagerank']:.5f}  deg={int(row['degree'])}")
    hubs = ca.find_hub_nodes(cent_df, threshold=0.80)
    print(f"\n  Hub nodes (top 20%): {len(hubs)} found")
    ca.save(cent_df)

    # 6B: Communities
    print_section("COMMUNITY DETECTION")
    cd = CommunityDetector(G)
    communities = cd.detect()
    for c in communities:
        print(f"    Community {c['community_id']}: {c['size']} members, density={c['density']:.3f}")
        print(f"      Members: {', '.join(c['members'][:5])}")
    cd.save(communities)

    # 6C: Topology
    print_section("NETWORK TOPOLOGY")
    ta = TopologyAnalyzer(G)
    topo = ta.analyze()
    for k, v in topo.items():
        print(f"    {k:<25} {v}")
    with open(GRAPH_DIR / "topology.json", "w") as f:
        json.dump(topo, f, indent=2, default=str)

    # 6D: Disease Network
    print_section("DISEASE NETWORK")
    dn = DiseaseNetwork(G)
    dn.build()
    pairs = dn.most_similar_pairs(top_k=5)
    for p in pairs:
        print(f"    {p['disease1']:<30} <-> {p['disease2']:<30} sim={p['similarity']}")
    dn.save()

    # 6E: Drug Network
    print_section("DRUG NETWORK")
    drug_net = DrugNetwork(G)
    drug_net.build()
    drug_pairs = drug_net.most_similar_pairs(top_k=5)
    for p in drug_pairs:
        print(f"    {p['drug1']:<20} <-> {p['drug2']:<20} sim={p['similarity']}")
    drug_net.save()

    # 6F: Gene Network
    print_section("GENE NETWORK")
    gene_net = GeneNetwork(G)
    gene_net.build()
    top_genes = gene_net.most_connected_genes(top_k=8)
    for g in top_genes:
        print(f"    {g['gene']:<15} connections={g['connections']} diseases={g['n_diseases']}")
    gene_net.save()

    # 6G: Drug Repurposing
    print_section("DRUG REPURPOSING ENGINE")
    dre = DrugRepurposingEngine(G)
    candidates = dre.find_candidates(min_confidence=0.5)
    print(f"\n  Found {len(candidates)} novel drug-disease candidates")
    for c in candidates[:8]:
        print(f"    {c['drug']:<18} -> {c['disease']:<30} via {c['via_gene']:<10} conf={c['path_confidence']:.3f}")
    if candidates:
        dre.save(candidates)

    # 6H: Knowledge Gaps
    print_section("KNOWLEDGE GAP ANALYSIS")
    kgd = KnowledgeGapDetector(G)
    gaps = kgd.analyze()
    print(f"  Disease coverage: {gaps['coverage_disease']*100:.1f}%")
    print(f"  Gene coverage:   {gaps['coverage_gene']*100:.1f}%")
    print(f"  Untreated diseases ({gaps['n_untreated']}): {', '.join(gaps['untreated_diseases'][:5])}")
    print(f"  Undrugged genes ({gaps['n_undrugged']}):    {', '.join(gaps['undrugged_genes'][:5])}")
    with open(GRAPH_DIR / "knowledge_gaps.json", "w") as f:
        json.dump(gaps, f, indent=2)

    print(f"\n  STEP 6 COMPLETE.")


# ===========================================
# MAIN
# ===========================================
if __name__ == "__main__":
    print("\n" + "#" * 70)
    print("  MEDINEX PHASE 0 --- BIOMEDICAL INTELLIGENCE LAYER")
    print("  Complete Pipeline Execution")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("#" * 70)

    run_step_1()
    run_step_2()
    db_path = run_step_3()
    nlp_results = run_step_4()
    graph = run_step_5(nlp_results, db_path)

    try:
        run_step_6(graph)
    except Exception as e:
        print(f"\n  ⚠ Step 6 encountered an issue: {e}")
        print("  → Steps 1-5 completed successfully. Graph analytics can be run separately.")

    # Final summary
    print("\n" + "#" * 70)
    print("  ✅ MEDINEX PHASE 0 — ALL STEPS COMPLETE")
    print("#" * 70)

    data_dir = Path(__file__).parent / "data"
    print(f"\n  Output directory: {data_dir}")
    print(f"\n  Generated artifacts:")
    for root, dirs, files in os.walk(data_dir):
        level = root.replace(str(data_dir), "").count(os.sep)
        indent = "    " + "  " * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = "    " + "  " * (level + 1)
        for f in sorted(files):
            fpath = os.path.join(root, f)
            size = os.path.getsize(fpath)
            size_str = f"{size:,}" if size < 1024 else f"{size/1024:.1f}K"
            print(f"{subindent}{f} ({size_str})")

    print("\n  🚀 Biomedical Intelligence Layer is LIVE.\n")
