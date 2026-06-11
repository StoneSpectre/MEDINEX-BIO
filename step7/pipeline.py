"""
medinex/graphrag/pipeline.py  —  Step 7

The Medinex GraphRAG pipeline.
This is what upgrades the Phase 0 Study Assistant from a flat RAG chatbot
to a graph-grounded biomedical intelligence system.

Pipeline stages:
  1. PARSE     — extract intent + biomedical entities from question
  2. RETRIEVE  — vector search → find anchor nodes in the graph
  3. TRAVERSE  — multi-hop Neo4j traversal from anchor nodes
  4. RANK      — score subgraph edges by evidence quality
  5. ASSEMBLE  — build structured LLM context from subgraph
  6. GENERATE  — call Claude with graph-grounded context
  7. CITE      — attach traceable evidence trail to the answer

The key advantage over plain RAG: answers are traceable back to specific
graph edges and papers. Every claim has a source. Not black-box LLM guesses.

Install:
  pip install anthropic qdrant-client sentence-transformers
"""

import json
import os
import sys

import anthropic

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, "..", "backend", "graph"))

from db import MedinexGraph
from vector_store import MedinexVectorStore

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
# haiku: fast + cheap for high-frequency RAG calls
LLM_MODEL = "claude-haiku-4-5-20251001"


class GraphRAGPipeline:
    """
    Full GraphRAG pipeline for Medinex.

    Usage:
        with GraphRAGPipeline() as p:
            result = p.answer("What genes are linked to Parkinson's Disease?")
            print(result["answer"])
            for e in result["evidence"]:
                print(e["content"], "→", e["source"])
    """

    def __init__(self):
        self.graph  = MedinexGraph()
        self.vs     = MedinexVectorStore()
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    def close(self):
        self.graph.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # ── Stage 1: Parse ────────────────────────────────────────

    def _parse(self, question: str) -> dict:
        """
        Lightweight LLM call to extract structured intent from the question.
        Uses haiku — fast and cheap, runs before the main answer call.

        Returns:
          intent     — disease_info | gene_info | drug_info | pathway_info |
                       paper_search | treatment_query | comparison
          entities   — list of biomedical terms mentioned
          focus      — single most important entity for vector search anchor
          query_type — factual | exploratory | mechanistic | clinical
        """
        resp = self.client.messages.create(
            model=LLM_MODEL,
            max_tokens=256,
            system=(
                "You are a biomedical query parser. "
                "Extract structured information from questions. "
                "Return ONLY valid JSON, no explanation, no markdown."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Question: {question}\n\n"
                    "Return JSON with:\n"
                    "  intent: one of [disease_info, gene_info, drug_info, "
                    "pathway_info, paper_search, treatment_query, comparison]\n"
                    "  entities: list of biomedical terms\n"
                    "  focus: the single most important entity to anchor search\n"
                    "  query_type: one of [factual, exploratory, mechanistic, clinical]"
                ),
            }],
        )
        try:
            parsed = json.loads(resp.content[0].text)
        except Exception:
            parsed = {
                "intent":     "disease_info",
                "entities":   [question],
                "focus":      question,
                "query_type": "factual",
            }
        parsed["raw_question"] = question
        return parsed

    # ── Stage 2: Retrieve ─────────────────────────────────────

    def _retrieve(self, parsed: dict, top_k: int = 3) -> dict:
        """
        Vector search to find the most relevant graph nodes and papers.
        Searches on both the focus term and up to 2 additional entities
        to improve recall for complex multi-entity questions.
        """
        focus         = parsed.get("focus", parsed["raw_question"])
        node_hits     = self.vs.search_nodes(focus, top_k=top_k)
        paper_hits    = self.vs.search_papers(focus, top_k=top_k)

        # Supplement with per-entity searches (deduped by node_id)
        seen = {h["node_id"] for h in node_hits}
        for entity in parsed.get("entities", [])[:2]:
            for hit in self.vs.search_nodes(entity, top_k=2):
                if hit["node_id"] not in seen:
                    node_hits.append(hit)
                    seen.add(hit["node_id"])

        return {"anchor_nodes": node_hits, "anchor_papers": paper_hits}

    # ── Stage 3: Traverse ─────────────────────────────────────

    def _traverse(self, anchors: dict) -> dict:
        """
        Multi-hop Neo4j traversal from each anchor node.
        Adapts traversal depth and direction to the node label.

        Returns a subgraph dict with separate lists per node type
        and a flat edge list for evidence ranking.
        """
        sg = {
            "diseases": [], "genes":    [], "drugs":   [],
            "symptoms": [], "pathways": [], "papers":  [],
            "edges":    [],
        }

        for anchor in anchors["anchor_nodes"][:3]:
            node_id = anchor.get("node_id")
            label   = anchor.get("label")
            if not node_id:
                continue

            if label == "Disease":
                data = self.graph.get_disease_graph(anchor.get("name", ""))
                if not data:
                    continue
                sg["diseases"].append(data["disease"])
                sg["symptoms"].extend(data.get("symptoms", []))
                sg["drugs"].extend(data.get("drugs", []))
                sg["papers"].extend(data.get("papers", []))
                sg["pathways"].extend(data.get("pathways", []))
                for g in data.get("genes", []):
                    sg["genes"].append(g)
                    sg["edges"].append({
                        "from":   data["disease"].get("name"),
                        "rel":    "ASSOCIATED_WITH_GENE",
                        "to":     g.get("symbol"),
                        "source": "opentargets/hetionet",
                    })

            elif label == "Gene":
                rows = self.graph.run("""
                    MATCH (g:Gene {id: $id})
                    OPTIONAL MATCH (d:Disease)-[r:ASSOCIATED_WITH_GENE]->(g)
                    OPTIONAL MATCH (g)-[:INVOLVED_IN]->(pw:Pathway)
                    RETURN g,
                        collect(DISTINCT {name: d.name, score: r.score})[..8] AS diseases,
                        collect(DISTINCT pw.name)[..5] AS pathways
                    LIMIT 1
                """, id=node_id)
                if not rows:
                    continue
                row = rows[0]
                sg["genes"].append(dict(row["g"]))
                for d in row.get("diseases", []):
                    if d.get("name"):
                        sg["edges"].append({
                            "from":   row["g"].get("symbol"),
                            "rel":    "ASSOCIATED_WITH_GENE",
                            "to":     d["name"],
                            "score":  d.get("score"),
                            "source": "knowledge_graph",
                        })

            elif label == "Drug":
                rows = self.graph.run("""
                    MATCH (dr:Drug {id: $id})
                    OPTIONAL MATCH (dr)-[r:TREATS]->(d:Disease)
                    RETURN dr,
                        collect(DISTINCT {name: d.name, approval: r.approval})[..6] AS treats
                    LIMIT 1
                """, id=node_id)
                if not rows:
                    continue
                row = rows[0]
                sg["drugs"].append(dict(row["dr"]))
                for d in row.get("treats", []):
                    if d.get("name"):
                        sg["edges"].append({
                            "from":   row["dr"].get("name"),
                            "rel":    "TREATS",
                            "to":     d["name"],
                            "approval": d.get("approval"),
                            "source": "drugbank/hetionet",
                        })

        # Add anchor papers directly
        sg["papers"].extend(anchors["anchor_papers"])

        # Deduplicate each list
        sg["genes"]    = _dedup(sg["genes"],    "symbol")
        sg["drugs"]    = _dedup(sg["drugs"],    "name")
        sg["diseases"] = _dedup(sg["diseases"], "name")
        sg["pathways"] = _dedup(sg["pathways"], "name")

        return sg

    # ── Stage 4: Rank evidence ────────────────────────────────

    def _rank_evidence(self, sg: dict) -> list[dict]:
        """
        Converts subgraph edges and papers into a flat, scored evidence list.
        Graph edges with OpenTargets scores get those scores.
        Papers get scores from vector search cosine similarity.
        Sorted descending — top evidence used first in LLM context.
        """
        evidence = []

        for edge in sg.get("edges", []):
            score = float(edge.get("score") or 0.5)
            evidence.append({
                "type":    "graph_edge",
                "content": f"{edge['from']} → {edge['rel']} → {edge['to']}",
                "score":   score,
                "source":  edge.get("source", "knowledge_graph"),
            })

        for paper in sg.get("papers", []):
            pmid  = paper.get("pmid", "")
            title = paper.get("title", "")
            year  = paper.get("year", "")
            score = float(paper.get("score") or 0.3)
            if title:
                evidence.append({
                    "type":    "paper",
                    "content": f"{title} ({year})",
                    "pmid":    pmid,
                    "score":   score,
                    "source":  f"PubMed:{pmid}",
                })

        evidence.sort(key=lambda x: x["score"], reverse=True)
        return evidence[:12]

    # ── Stage 5: Assemble context ─────────────────────────────

    def _assemble_context(self, sg: dict, evidence: list[dict]) -> str:
        """
        Converts the subgraph into a structured text block for the LLM.
        This is what the LLM actually reads — not raw Neo4j objects.
        Keeps it concise: the LLM doesn't need every property, just enough
        to give an accurate, grounded answer.
        """
        lines = []

        if sg["diseases"]:
            lines.append("=== Diseases ===")
            for d in sg["diseases"][:3]:
                line = f"- {d.get('name', '')}"
                if d.get("category"):
                    line += f" [{d['category']}]"
                if d.get("description"):
                    line += f": {d['description'][:150]}"
                lines.append(line)

        if sg["genes"]:
            lines.append("\n=== Associated genes ===")
            for g in sg["genes"][:12]:
                sym  = g.get("symbol", "")
                name = g.get("name", "")
                lines.append(f"- {sym}: {name}" if name else f"- {sym}")

        if sg["drugs"]:
            lines.append("\n=== Drugs / treatments ===")
            for dr in sg["drugs"][:8]:
                name = dr.get("name", "")
                desc = dr.get("description", "")
                lines.append(f"- {name}: {desc[:100]}" if desc else f"- {name}")

        if sg["symptoms"]:
            lines.append("\n=== Symptoms ===")
            names = [s.get("name", "") for s in sg["symptoms"][:12] if s.get("name")]
            lines.append("- " + ", ".join(names))

        if sg["pathways"]:
            lines.append("\n=== Pathways ===")
            for pw in sg["pathways"][:5]:
                lines.append(f"- {pw.get('name', '')}")

        top_papers = [e for e in evidence if e["type"] == "paper"][:4]
        if top_papers:
            lines.append("\n=== Relevant papers ===")
            for p in top_papers:
                lines.append(f"- {p['content']}  [PMID:{p.get('pmid', '')}]")

        top_edges = [e for e in evidence if e["type"] == "graph_edge"][:8]
        if top_edges:
            lines.append("\n=== Key graph relationships ===")
            for e in top_edges:
                lines.append(f"- {e['content']}")

        return "\n".join(lines)

    # ── Stage 6: Generate ─────────────────────────────────────

    def _generate(self, question: str, context: str) -> str:
        """
        Calls Claude with a biomedical system prompt and graph-grounded context.
        The system prompt instructs Claude to stay within the context and
        cite specific gene symbols, drug names, and PMIDs.
        """
        system = (
            "You are Medinex, a biomedical research assistant backed by a "
            "structured biomedical knowledge graph (diseases, genes, drugs, "
            "symptoms, pathways, research papers).\n\n"
            "Rules:\n"
            "1. Answer using ONLY the knowledge graph context provided below.\n"
            "2. Never fabricate gene names, drug names, or citations.\n"
            "3. If the context lacks information, say so explicitly.\n"
            "4. Use HGNC gene symbols (e.g. SNCA, LRRK2, TP53).\n"
            "5. Reference papers by PMID when relevant.\n"
            "6. Structure your answer clearly — use headings for multi-part answers."
        )
        user = (
            f"Question: {question}\n\n"
            f"Knowledge graph context:\n{context}\n\n"
            "Answer based strictly on the context above."
        )
        resp = self.client.messages.create(
            model=LLM_MODEL,
            max_tokens=1200,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return resp.content[0].text

    # ── Main entry point ──────────────────────────────────────

    def answer(self, question: str) -> dict:
        """
        Run the full GraphRAG pipeline.

        Returns:
          question      — original question
          answer        — LLM answer, grounded in graph context
          evidence      — ranked list of graph edges + papers used
          graph_context — raw subgraph (diseases, genes, drugs, papers, ...)
          parsed        — entity extraction result
          anchors       — vector search results used as traversal entry points
        """
        print(f"\n[GraphRAG] ── {question}")

        print("[GraphRAG] Stage 1: Parsing question...")
        parsed = self._parse(question)
        print(f"           intent={parsed.get('intent')}  focus='{parsed.get('focus')}'")

        print("[GraphRAG] Stage 2: Vector search...")
        anchors = self._retrieve(parsed, top_k=3)
        names   = [a.get("name", "") for a in anchors["anchor_nodes"]]
        print(f"           anchors={names}")

        print("[GraphRAG] Stage 3: Graph traversal...")
        sg = self._traverse(anchors)
        print(f"           diseases={len(sg['diseases'])}  genes={len(sg['genes'])}  "
              f"drugs={len(sg['drugs'])}  papers={len(sg['papers'])}")

        print("[GraphRAG] Stage 4: Ranking evidence...")
        evidence = self._rank_evidence(sg)

        print("[GraphRAG] Stage 5: Assembling context...")
        context = self._assemble_context(sg, evidence)

        print("[GraphRAG] Stage 6: Generating answer...")
        answer = self._generate(question, context)

        print("[GraphRAG] Done.\n")

        return {
            "question":      question,
            "answer":        answer,
            "evidence":      evidence,
            "graph_context": sg,
            "parsed":        parsed,
            "anchors":       anchors["anchor_nodes"],
        }


# ── Utility ───────────────────────────────────────────────────

def _dedup(items: list[dict], key: str) -> list[dict]:
    seen, out = set(), []
    for item in items:
        if not isinstance(item, dict):
            continue
        val = item.get(key)
        if val and val not in seen:
            seen.add(val)
            out.append(item)
    return out


# ── CLI ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    q = " ".join(sys.argv[1:]) if len(sys.argv) > 1 \
        else "What genes are associated with Parkinson's Disease and what pathways do they affect?"

    with GraphRAGPipeline() as pipeline:
        result = pipeline.answer(q)

    print("\n" + "=" * 60)
    print("ANSWER")
    print("=" * 60)
    print(result["answer"])

    print("\n" + "=" * 60)
    print("EVIDENCE TRAIL")
    print("=" * 60)
    for e in result["evidence"][:8]:
        src = e.get("source", "")
        print(f"  [{e['type']:10s}] score={e['score']:.3f}  {e['content'][:80]}  ({src})")
