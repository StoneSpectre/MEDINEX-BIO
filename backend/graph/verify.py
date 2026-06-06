"""
medinex/graph/verify.py

Runs a set of sanity checks on the Medinex knowledge graph
after seeding. Prints a clear pass/fail report.

Run: python verify.py
"""

from db import MedinexGraph


def verify():
    print("\n=== Medinex Knowledge Graph Verification ===\n")

    with MedinexGraph() as graph:

        # 1. Node counts
        print("── Node counts ──────────────────────────────")
        counts = graph.node_count()
        all_ok = True
        minimums = {
            "Disease":    5,
            "Gene":       10,
            "Drug":       5,
            "Symptom":    5,
            "Paper":      0,   # may be 0 if PubMed fetch skipped
        }
        for label, count in counts.items():
            minimum = minimums.get(label, 0)
            status  = "✓" if count >= minimum else "✗"
            if count < minimum:
                all_ok = False
            print(f"  {status} {label:12s}: {count:,}  (min: {minimum})")

        # 2. Edge counts
        print("\n── Relationship counts ──────────────────────")
        edge_types = [
            ("HAS_SYMPTOM",          "Disease",  "Symptom"),
            ("ASSOCIATED_WITH_GENE", "Disease",  "Gene"),
            ("TREATS",               "Drug",     "Disease"),
            ("MENTIONS_DISEASE",     "Paper",    "Disease"),
        ]
        for rel, src, tgt in edge_types:
            result = graph.run(
                f"MATCH (:{src})-[r:{rel}]->(:{tgt}) RETURN count(r) AS c"
            )
            count = result[0]["c"] if result else 0
            status = "✓" if count > 0 else "○"
            print(f"  {status} {src}-[{rel}]->{tgt}: {count:,}")

        # 3. Disease Explorer test
        print("\n── Disease Explorer test (Parkinson) ────────")
        result = graph.get_disease_graph("Parkinson")
        if result:
            r = result[0]
            print(f"  Disease:  {r.get('disease')}")
            print(f"  Symptoms: {r.get('symptoms', [])[:5]}")
            print(f"  Genes:    {r.get('genes', [])[:5]}")
            print(f"  Drugs:    {r.get('drugs', [])[:5]}")
            print(f"  Papers:   {len(r.get('papers', []))} linked")
        else:
            print("  ✗ No results — check seeding ran correctly")
            all_ok = False

        # 4. Graph traversal test (multi-hop)
        print("\n── Multi-hop traversal test ─────────────────")
        result = graph.run("""
            MATCH (d:Disease)-[:ASSOCIATED_WITH_GENE]->(g:Gene)
            RETURN d.name AS disease, count(g) AS gene_count
            ORDER BY gene_count DESC
            LIMIT 5
        """)
        if result:
            for row in result:
                print(f"  {row['disease']}: {row['gene_count']} genes")
        else:
            print("  ○ No disease-gene edges yet")

        # 5. Summary
        print("\n── Summary ──────────────────────────────────")
        if all_ok:
            print("  ✓ Graph looks healthy. Ready for Phase 1 product build.")
        else:
            print("  ✗ Some checks failed. Re-run seed.py or check Neo4j connection.")

        print()


if __name__ == "__main__":
    verify()
