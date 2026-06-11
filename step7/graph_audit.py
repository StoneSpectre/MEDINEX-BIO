"""
medinex/graph/graph_audit.py  —  Step 8

Proprietary Knowledge Graph Asset — Consolidation & Audit.

Step 8 is not a new data source. It's the moment you verify that the
Medinex Biomedical Knowledge Graph is a real, defensible asset — one
that took months to build and that nobody can easily replicate.

This module provides:
  1. asset_report()      — full asset summary (nodes, edges, coverage, uniqueness)
  2. coverage_score()    — how many diseases have full context (genes+drugs+symptoms+papers)
  3. graph_fingerprint() — unique signature of the graph (for change tracking)
  4. export_snapshot()   — export graph to JSON for backup / migration
  5. enrichment_gaps()   — which nodes are missing critical properties
  6. top_hubs()          — most connected nodes per type (graph hub analysis)
  7. run_dashboard()     — CLI dashboard print

Run:
    python graph_audit.py
"""

import json
import hashlib
from datetime import datetime
from pathlib import Path

import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, "..", "backend", "graph"))

from db import MedinexGraph


class GraphAudit:
    """
    Audits the Medinex knowledge graph and reports on its value as an asset.
    """

    def __init__(self, graph: MedinexGraph):
        self.graph = graph

    # ── 1. Full asset report ──────────────────────────────────

    def asset_report(self) -> dict:
        """
        Returns a comprehensive summary of the knowledge graph asset.
        Use this to track growth over time and report to stakeholders.
        """
        node_counts = self.graph.node_count()
        edge_counts = self.graph.edge_count()
        total_nodes = sum(node_counts.values())
        total_edges = sum(edge_counts.values())

        # Disease coverage
        coverage = self.coverage_score()

        # Papers with full metadata
        papers_with_abstract = self.graph.run(
            "MATCH (p:Paper) WHERE p.abstract IS NOT NULL AND p.abstract <> '' "
            "RETURN count(p) AS c"
        )
        papers_enriched = papers_with_abstract[0]["c"] if papers_with_abstract else 0

        # Researchers with h_index
        researchers_enriched = self.graph.run(
            "MATCH (r:Researcher) WHERE r.h_index IS NOT NULL RETURN count(r) AS c"
        )
        r_enriched = researchers_enriched[0]["c"] if researchers_enriched else 0

        # CITES edges
        cites = edge_counts.get("CITES", 0)

        # Pathways
        pathways = node_counts.get("Pathway", 0)
        gene_pathway_edges = edge_counts.get("INVOLVED_IN", 0)

        return {
            "generated_at":         datetime.utcnow().isoformat() + "Z",
            "node_counts":          node_counts,
            "edge_counts":          edge_counts,
            "total_nodes":          total_nodes,
            "total_edges":          total_edges,
            "disease_coverage":     coverage,
            "papers_with_abstract": papers_enriched,
            "researchers_enriched": r_enriched,
            "citation_edges":       cites,
            "pathway_nodes":        pathways,
            "gene_pathway_edges":   gene_pathway_edges,
            "graph_fingerprint":    self.graph_fingerprint(),
        }

    # ── 2. Coverage score ─────────────────────────────────────

    def coverage_score(self) -> dict:
        """
        For each disease in the graph, check if it has:
          - at least 1 associated gene
          - at least 1 drug treatment
          - at least 1 symptom
          - at least 1 linked paper

        Returns counts and percentage of diseases with full context.
        """
        diseases = self.graph.run("MATCH (d:Disease) RETURN d.id AS id, d.name AS name")
        total = len(diseases)
        if total == 0:
            return {"total": 0, "fully_covered": 0, "pct": 0.0, "missing_context": []}

        fully_covered = 0
        missing_context = []

        for d in diseases:
            d_id   = d["id"]
            d_name = d["name"]

            genes   = self.graph.run("MATCH (:Disease {id: $id})-[:ASSOCIATED_WITH_GENE]->(:Gene) RETURN count(*) AS c", id=d_id)
            drugs   = self.graph.run("MATCH (:Drug)-[:TREATS]->(:Disease {id: $id}) RETURN count(*) AS c", id=d_id)
            syms    = self.graph.run("MATCH (:Disease {id: $id})-[:HAS_SYMPTOM]->(:Symptom) RETURN count(*) AS c", id=d_id)
            papers  = self.graph.run("MATCH (:Paper)-[:MENTIONS_DISEASE]->(:Disease {id: $id}) RETURN count(*) AS c", id=d_id)

            g = genes[0]["c"]  if genes  else 0
            dr = drugs[0]["c"] if drugs  else 0
            s  = syms[0]["c"]  if syms   else 0
            p  = papers[0]["c"] if papers else 0

            if g > 0 and dr > 0 and s > 0 and p > 0:
                fully_covered += 1
            else:
                missing_context.append({
                    "id":       d_id,
                    "name":     d_name,
                    "genes":    g,
                    "drugs":    dr,
                    "symptoms": s,
                    "papers":   p,
                    "missing":  [
                        k for k, v in [("genes", g), ("drugs", dr), ("symptoms", s), ("papers", p)]
                        if v == 0
                    ],
                })

        return {
            "total":          total,
            "fully_covered":  fully_covered,
            "pct":            round(fully_covered / total * 100, 1),
            "missing_context": missing_context,
        }

    # ── 3. Graph fingerprint ──────────────────────────────────

    def graph_fingerprint(self) -> str:
        """
        Produces a short hash representing the current state of the graph.
        Run after each seeding round to confirm new data was added.
        """
        counts = self.graph.node_count()
        edges  = self.graph.edge_count()
        raw    = json.dumps({"nodes": counts, "edges": edges}, sort_keys=True)
        return hashlib.md5(raw.encode()).hexdigest()[:12]

    # ── 4. Snapshot export ────────────────────────────────────

    def export_snapshot(self, output_path: str = "medinex_snapshot.json"):
        """
        Exports the full graph to a JSON snapshot for backup and migration.
        Large graphs: run with output_path pointing to a disk with sufficient space.
        Exports up to 5000 nodes per type and 50,000 edges per type.

        Format:
          { "meta": {...}, "nodes": {...by label...}, "edges": {...by rel_type...} }
        """
        print(f"[GraphAudit] Exporting snapshot to {output_path}...")

        snapshot = {
            "meta": {
                "exported_at":    datetime.utcnow().isoformat() + "Z",
                "fingerprint":    self.graph_fingerprint(),
                "node_counts":    self.graph.node_count(),
                "edge_counts":    self.graph.edge_count(),
            },
            "nodes": {},
            "edges": {},
        }

        # Export nodes per label
        for label in ["Disease", "Drug", "Gene", "Symptom", "Pathway", "Paper", "Researcher"]:
            rows = self.graph.run(
                f"MATCH (n:{label}) RETURN properties(n) AS props LIMIT 5000"
            )
            snapshot["nodes"][label] = [r["props"] for r in rows]
            print(f"  {label}: {len(snapshot['nodes'][label])} nodes")

        # Export edges per type
        for rel in ["ASSOCIATED_WITH_GENE", "HAS_SYMPTOM", "TREATS", "INVOLVED_IN",
                    "MENTIONS_DISEASE", "AUTHORED_BY", "CITES"]:
            rows = self.graph.run(f"""
                MATCH (a)-[r:{rel}]->(b)
                RETURN
                    coalesce(a.id, a.pmid) AS src_id,
                    coalesce(b.id, b.pmid) AS tgt_id,
                    properties(r)          AS props
                LIMIT 50000
            """)
            snapshot["edges"][rel] = [
                {"src": r["src_id"], "tgt": r["tgt_id"], "props": r["props"]}
                for r in rows
            ]
            print(f"  {rel}: {len(snapshot['edges'][rel])} edges")

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, default=str)

        size_mb = Path(output_path).stat().st_size / 1_048_576
        print(f"[GraphAudit] Snapshot saved — {size_mb:.1f} MB")
        return output_path

    # ── 5. Enrichment gaps ────────────────────────────────────

    def enrichment_gaps(self) -> dict:
        """
        Identifies nodes missing critical properties.
        Use this to prioritise enrichment runs.
        """
        gaps = {}

        checks = [
            ("Disease",    "name",        "MATCH (n:Disease)    WHERE n.name IS NULL OR n.name = '' RETURN count(n) AS c"),
            ("Disease",    "description", "MATCH (n:Disease)    WHERE n.description IS NULL RETURN count(n) AS c"),
            ("Gene",       "symbol",      "MATCH (n:Gene)       WHERE n.symbol IS NULL RETURN count(n) AS c"),
            ("Drug",       "description", "MATCH (n:Drug)       WHERE n.description IS NULL RETURN count(n) AS c"),
            ("Paper",      "title",       "MATCH (n:Paper)      WHERE n.title IS NULL OR n.title = '' RETURN count(n) AS c"),
            ("Paper",      "abstract",    "MATCH (n:Paper)      WHERE n.abstract IS NULL OR n.abstract = '' RETURN count(n) AS c"),
            ("Researcher", "h_index",     "MATCH (n:Researcher) WHERE n.h_index IS NULL RETURN count(n) AS c"),
            ("Researcher", "affiliation", "MATCH (n:Researcher) WHERE n.affiliation IS NULL OR n.affiliation = '' RETURN count(n) AS c"),
        ]

        for label, prop, query in checks:
            result = self.graph.run(query)
            count  = result[0]["c"] if result else 0
            key    = f"{label}.{prop}"
            if count > 0:
                gaps[key] = count

        return gaps

    # ── 6. Top hub nodes ──────────────────────────────────────

    def top_hubs(self, limit: int = 10) -> dict:
        """
        Returns the most connected nodes per type.
        High-degree nodes are the backbone of the knowledge graph.
        """
        hubs = {}

        queries = {
            "disease_by_gene_count": """
                MATCH (d:Disease)-[:ASSOCIATED_WITH_GENE]->(g:Gene)
                RETURN d.name AS name, d.id AS id, count(g) AS degree
                ORDER BY degree DESC LIMIT $limit
            """,
            "gene_by_disease_count": """
                MATCH (d:Disease)-[:ASSOCIATED_WITH_GENE]->(g:Gene)
                RETURN g.symbol AS name, g.id AS id, count(d) AS degree
                ORDER BY degree DESC LIMIT $limit
            """,
            "drug_by_disease_count": """
                MATCH (dr:Drug)-[:TREATS]->(d:Disease)
                RETURN dr.name AS name, dr.id AS id, count(d) AS degree
                ORDER BY degree DESC LIMIT $limit
            """,
            "paper_by_in_degree": """
                MATCH (p:Paper)<-[:CITES]-(c:Paper)
                RETURN p.pmid AS name, p.title AS id, count(c) AS degree
                ORDER BY degree DESC LIMIT $limit
            """,
            "researcher_by_paper_count": """
                MATCH (r:Researcher)<-[:AUTHORED_BY]-(p:Paper)
                RETURN r.name AS name, r.id AS id, count(p) AS degree
                ORDER BY degree DESC LIMIT $limit
            """,
        }

        for key, query in queries.items():
            result = self.graph.run(query, limit=limit)
            hubs[key] = result

        return hubs

    # ── 7. Dashboard ──────────────────────────────────────────

    def run_dashboard(self):
        """Prints a full human-readable asset dashboard to stdout."""

        print("\n╔══════════════════════════════════════════════════════╗")
        print("║   Medinex Biomedical Knowledge Graph — Asset Report  ║")
        print("╚══════════════════════════════════════════════════════╝\n")

        report = self.asset_report()

        # ── Node counts ───────────────────────────────────────
        print("── Node inventory ───────────────────────────────────────")
        for label, count in report["node_counts"].items():
            bar = "█" * min(count // 100, 40)
            print(f"  {label:14s}: {count:>7,}  {bar}")
        print(f"  {'TOTAL':14s}: {report['total_nodes']:>7,}")

        # ── Edge counts ───────────────────────────────────────
        print("\n── Relationship inventory ───────────────────────────────")
        for rel, count in report["edge_counts"].items():
            print(f"  {rel:28s}: {count:>7,}")
        print(f"  {'TOTAL':28s}: {report['total_edges']:>7,}")

        # ── Coverage ──────────────────────────────────────────
        print("\n── Disease context coverage ─────────────────────────────")
        cov = report["disease_coverage"]
        print(f"  Diseases with full context: {cov['fully_covered']}/{cov['total']}  ({cov['pct']}%)")
        if cov["missing_context"]:
            print("  Top diseases missing context:")
            for d in cov["missing_context"][:5]:
                print(f"    {d['name']}: missing {', '.join(d['missing'])}")

        # ── Enrichment ────────────────────────────────────────
        print("\n── Enrichment status ────────────────────────────────────")
        print(f"  Papers with abstracts:   {report['papers_with_abstract']:,}")
        print(f"  Researchers with h_index:{report['researchers_enriched']:,}")
        print(f"  Citation edges (CITES):  {report['citation_edges']:,}")
        print(f"  Pathways:                {report['pathway_nodes']:,}")
        print(f"  Gene-Pathway edges:      {report['gene_pathway_edges']:,}")

        # ── Enrichment gaps ───────────────────────────────────
        gaps = self.enrichment_gaps()
        if gaps:
            print("\n── Enrichment gaps (nodes missing properties) ───────────")
            for key, count in gaps.items():
                print(f"  {key:30s}: {count:,} nodes need enrichment")
        else:
            print("\n── Enrichment gaps: none ✓")

        # ── Hub nodes ─────────────────────────────────────────
        print("\n── Top hub nodes ────────────────────────────────────────")
        hubs = self.top_hubs(limit=5)

        print("  Diseases by gene count:")
        for h in hubs.get("disease_by_gene_count", [])[:3]:
            print(f"    {h['name']}: {h['degree']} genes")

        print("  Genes by disease count (most pleiotropic):")
        for h in hubs.get("gene_by_disease_count", [])[:3]:
            print(f"    {h['name']}: {h['degree']} diseases")

        print("  Most cited papers:")
        for h in hubs.get("paper_by_in_degree", [])[:3]:
            title = str(h.get("id", ""))[:60]
            print(f"    PMID:{h['name']}  {title}  ({h['degree']} citations)")

        # ── Fingerprint ───────────────────────────────────────
        print(f"\n── Graph fingerprint: {report['graph_fingerprint']}")
        print(f"   Generated: {report['generated_at']}")
        print()
        print("  This fingerprint changes when new data is added.")
        print("  Save it after each seeding run to track growth.")
        print()


# ── CLI ───────────────────────────────────────────────────────

def main():
    with MedinexGraph() as graph:
        audit = GraphAudit(graph)

        # Run full dashboard
        audit.run_dashboard()

        # Offer export
        print("── Snapshot export ──────────────────────────────────────")
        print("  Run: audit.export_snapshot('medinex_snapshot.json')")
        print("  This creates a full JSON backup of all nodes and edges.")
        print()


if __name__ == "__main__":
    main()
