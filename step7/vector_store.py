"""
medinex/graphrag/vector_store.py  —  Step 7

Embeds every Disease, Drug, Gene, Symptom, and Paper node into Qdrant.
This is the vector search (retrieval) half of GraphRAG.

At query time the Study Assistant:
  1. Embeds the user's question
  2. Searches this index to find the closest graph nodes (anchors)
  3. Hands those anchor IDs to Neo4j for multi-hop traversal
  4. Passes the resulting subgraph to the LLM as grounded context

Model: pritamdeka/S-PubMedBert-MS-MARCO
  Fine-tuned on biomedical literature — handles queries like
  "dopamine pathway parkinson" or "SNCA mutation" far better than
  generic sentence-transformers.
  768-dim cosine similarity.

Collections:
  medinex_nodes   — Disease · Drug · Gene · Symptom nodes
  medinex_papers  — Paper title + abstract

Install:
  pip install qdrant-client sentence-transformers torch
  docker run -p 6333:6333 qdrant/qdrant   # or use Qdrant Cloud
"""

import os
import sys

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
)
from sentence_transformers import SentenceTransformer

# Allow importing db.py from the Phase 1 folder regardless of CWD
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, "..", "backend", "graph"))

from db import MedinexGraph

# ── Config ───────────────────────────────────────────────────

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
EMBED_MODEL = "pritamdeka/S-PubMedBert-MS-MARCO"
VECTOR_DIM  = 768
BATCH_SIZE  = 64

COL_NODES  = "medinex_nodes"
COL_PAPERS = "medinex_papers"


class MedinexVectorStore:
    """
    Manages Qdrant collections and embedding for Medinex.

    Quick start:
        vs = MedinexVectorStore()
        vs.build_node_index()       # ~2 min for 10k nodes
        vs.build_paper_index()      # ~1 min for 500 papers

        hits = vs.search_nodes("parkinson dopamine", top_k=5)
        hits = vs.search_papers("alpha synuclein aggregation", top_k=5)
    """

    def __init__(self):
        print("[VectorStore] Loading PubMedBERT embedding model...")
        self.model  = SentenceTransformer(EMBED_MODEL)
        self.client = QdrantClient(path="qdrant_db")
        self._ensure_collections()
        print("[VectorStore] Ready.")

    # ── Collection setup ──────────────────────────────────────

    def _ensure_collections(self):
        existing = {c.name for c in self.client.get_collections().collections}
        for name in [COL_NODES, COL_PAPERS]:
            if name not in existing:
                self.client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
                )
                print(f"[VectorStore] Created collection: {name}")

    def _embed(self, texts: list[str]) -> list[list[float]]:
        return self.model.encode(
            texts, batch_size=BATCH_SIZE, show_progress_bar=False,
        ).tolist()

    # ── Build indexes ─────────────────────────────────────────

    def build_node_index(self):
        """
        Fetches all Disease, Drug, Gene, Symptom nodes from Neo4j,
        constructs a text representation for each, embeds in batches,
        and upserts into Qdrant.

        Text format: "<Label>: <name> (<symbol>). <description[:200]>"
        The label prefix makes cross-type searches much better —
        "parkinson" alone matches Disease nodes; "SNCA gene" finds Gene nodes.
        """
        print("[VectorStore] Building node index from Neo4j...")
        with MedinexGraph() as graph:
            rows = graph.run("""
                MATCH (n)
                WHERE n:Disease OR n:Drug OR n:Gene OR n:Symptom
                RETURN
                    id(n)             AS neo_id,
                    labels(n)[0]      AS label,
                    coalesce(n.id, '') AS node_id,
                    coalesce(n.name, '') AS name,
                    coalesce(n.description, '') AS description,
                    coalesce(n.symbol, '')       AS symbol
            """)

        if not rows:
            print("[VectorStore] No nodes found — run seed.py first.")
            return

        texts, payloads = [], []
        for r in rows:
            label  = r["label"]
            name   = r["name"] or r["symbol"]
            symbol = r["symbol"]
            desc   = r["description"][:200] if r["description"] else ""

            text = f"{label}: {name}"
            if symbol and symbol != name:
                text += f" ({symbol})"
            if desc:
                text += f". {desc}"

            texts.append(text)
            payloads.append({
                "neo_id":  r["neo_id"],
                "node_id": r["node_id"],
                "label":   label,
                "name":    name,
                "symbol":  symbol,
            })

        print(f"[VectorStore] Embedding {len(texts)} nodes...")
        self._upsert_batches(COL_NODES, texts, payloads, id_key="node_id")
        print(f"[VectorStore] Node index complete: {len(texts)} vectors.")

    def build_paper_index(self):
        """
        Fetches Paper nodes that have at least a title, builds
        "title. abstract[:500]" text, embeds, and upserts into Qdrant.
        """
        print("[VectorStore] Building paper index from Neo4j...")
        with MedinexGraph() as graph:
            rows = graph.run("""
                MATCH (p:Paper)
                WHERE p.title IS NOT NULL AND p.title <> ''
                RETURN p.pmid AS pmid, p.title AS title,
                       coalesce(p.abstract, '') AS abstract,
                       p.year AS year, p.journal AS journal
            """)

        if not rows:
            print("[VectorStore] No papers with titles found.")
            return

        texts, payloads = [], []
        for r in rows:
            text = r["title"] + ". " + r["abstract"][:500]
            texts.append(text)
            payloads.append({
                "pmid":    r["pmid"],
                "title":   r["title"],
                "year":    r["year"],
                "journal": r["journal"] or "",
            })

        print(f"[VectorStore] Embedding {len(texts)} papers...")
        self._upsert_batches(COL_PAPERS, texts, payloads, id_key="pmid")
        print(f"[VectorStore] Paper index complete: {len(texts)} vectors.")

    def _upsert_batches(self, collection: str, texts: list[str],
                        payloads: list[dict], id_key: str):
        for i in range(0, len(texts), BATCH_SIZE):
            batch_t = texts[i:i + BATCH_SIZE]
            batch_p = payloads[i:i + BATCH_SIZE]
            vectors = self._embed(batch_t)
            self.client.upsert(
                collection_name=collection,
                points=[
                    PointStruct(
                        id=abs(hash(str(p.get(id_key, i + j)))) % (2 ** 63),
                        vector=v,
                        payload=p,
                    )
                    for j, (p, v) in enumerate(zip(batch_p, vectors))
                ],
            )

    # ── Search ────────────────────────────────────────────────

    def search_nodes(
        self,
        query:        str,
        top_k:        int = 5,
        label_filter: str | None = None,
    ) -> list[dict]:
        """
        Semantic search over Disease, Drug, Gene, Symptom nodes.

        label_filter — restrict to one label, e.g. 'Disease' or 'Gene'.
        Returns list of {score, node_id, label, name, symbol}.
        """
        vec = self._embed([query])[0]
        qfilter = None
        if label_filter:
            qfilter = Filter(must=[
                FieldCondition(key="label", match=MatchValue(value=label_filter))
            ])
        hits = self.client.search(
            collection_name=COL_NODES,
            query_vector=vec,
            limit=top_k,
            query_filter=qfilter,
            with_payload=True,
        )
        return [{"score": h.score, **h.payload} for h in hits]

    def search_papers(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Semantic search over paper abstracts.
        Returns list of {score, pmid, title, year, journal}.
        """
        vec = self._embed([query])[0]
        hits = self.client.search(
            collection_name=COL_PAPERS,
            query_vector=vec,
            limit=top_k,
            with_payload=True,
        )
        return [{"score": h.score, **h.payload} for h in hits]

    def stats(self) -> dict:
        return {
            name: self.client.get_collection(name).points_count
            for name in [COL_NODES, COL_PAPERS]
        }


# ── CLI ───────────────────────────────────────────────────────

if __name__ == "__main__":
    vs = MedinexVectorStore()
    vs.build_node_index()
    vs.build_paper_index()
    print("\n[VectorStore] Collection stats:", vs.stats())
    print("\n[VectorStore] Test search: 'parkinson dopamine'")
    for hit in vs.search_nodes("parkinson dopamine", top_k=5):
        print(f"  [{hit['label']:8s}] score={hit['score']:.3f}  {hit['name']}")
