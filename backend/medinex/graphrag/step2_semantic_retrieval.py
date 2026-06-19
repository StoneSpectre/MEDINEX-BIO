"""
Medinex GraphRAG — Step 2: Semantic Vector Retrieval
====================================================
Sub-steps:
  2.1  Embedding Generation   (PubMedBERT / BioLinkBERT → 768-dim vector)
  2.2  Corpus Chunking        (sliding-window document splitting)
  2.3  Qdrant Index           (vector store upsert + metadata)
  2.4  Hybrid Retrieval       (dense cosine + BM25 lexical)
  2.5  RRF Fusion             (Reciprocal Rank Fusion of both result lists)

Dependencies:
    pip install transformers torch qdrant-client rank-bm25 numpy
"""

from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple, Optional
import math, hashlib, json, re  # noqa: F401 (re used in EmbeddingGenerator.embed)
from collections import defaultdict


# ─────────────────────────────────────────────────────────────
# Data Classes
# ─────────────────────────────────────────────────────────────

@dataclass
class DocumentChunk:
    chunk_id: str
    doc_id: str
    text: str
    embedding: Optional[List[float]] = None
    metadata: Dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class RetrievedResult:
    chunk_id: str
    title: str
    text: str
    score: float
    year: int
    source: str        # pubmed | clinicaltrials | drugbank | omim
    doi: str = ""
    rank: int = 0


@dataclass
class HybridResult:
    chunk_id: str
    title: str
    rrf_score: float
    dense_rank: Optional[int]
    bm25_rank: Optional[int]
    sources: List[str]  # ["dense"] | ["bm25"] | ["dense","bm25"]
    rank: int = 0


@dataclass
class Step2Result:
    query: str
    query_embedding_dims: int
    embedding_model: str
    dense_results: List[RetrievedResult]
    bm25_results: List[RetrievedResult]
    rrf_results: List[HybridResult]
    total_candidates: int

    def to_dict(self) -> dict:
        return asdict(self)


# ─────────────────────────────────────────────────────────────
# 2.1  Embedding Generator
# ─────────────────────────────────────────────────────────────

class EmbeddingGenerator:
    """
    Production implementation:

    from transformers import AutoTokenizer, AutoModel
    import torch

    class EmbeddingGenerator:
        def __init__(self, model_name="microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract"):
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModel.from_pretrained(model_name)
            self.model.eval()

        def embed(self, text: str) -> List[float]:
            inputs = self.tokenizer(text, return_tensors="pt",
                                    truncation=True, max_length=512,
                                    padding=True)
            with torch.no_grad():
                outputs = self.model(**inputs)
            # Mean pooling over token embeddings
            embeddings = outputs.last_hidden_state.mean(dim=1)
            return embeddings[0].tolist()

    Alternative models:
      - sultan/BioM-ELECTRA-Large-SQuAD2
      - kamalkraj/bioelectra-base-discriminator-pubmed
      - michiyasunaga/BioLinkBERT-large
      - ncats/EHR-SeALS (for clinical notes)
    """

    MODEL_NAME = "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract"
    DIMS = 768

    def __init__(self):
        self._word_cache = {}

    def embed(self, text: str) -> List[float]:
        """
        Stub embedding for offline testing without a real PubMedBERT model.
        """
        import random
        words = re.findall(r"[a-z0-9]+", text.lower())
        if not words:
            words = ["empty"]

        vec = [0.0] * self.DIMS
        for w in words:
            if w not in self._word_cache:
                h = int(hashlib.md5(w.encode()).hexdigest(), 16)
                rng = random.Random(h)
                self._word_cache[w] = [rng.gauss(0, 1) for _ in range(self.DIMS)]
            
            word_vec = self._word_cache[w]
            for i in range(self.DIMS):
                vec[i] += word_vec[i]

        norm = math.sqrt(sum(v**2 for v in vec)) or 1.0
        return [round(v / norm, 6) for v in vec]

    def cosine_similarity(self, a: List[float], b: List[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x**2 for x in a))
        norm_b = math.sqrt(sum(y**2 for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)


# ─────────────────────────────────────────────────────────────
# 2.2  Corpus Chunker
# ─────────────────────────────────────────────────────────────

class CorpusChunker:
    """
    Splits biomedical documents into overlapping chunks for embedding.
    Production sources: PubMed, ClinicalTrials.gov, DrugBank, OMIM.

    Production ingestion:
      import requests
      # PubMed via E-utilities API
      url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={pmid}&rettype=abstract"
      text = requests.get(url).text
    """

    def __init__(self, chunk_size: int = 400, overlap: int = 80):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, doc_id: str, text: str, metadata: dict = None) -> List[DocumentChunk]:
        words = text.split()
        chunks = []
        step = self.chunk_size - self.overlap
        for i, start in enumerate(range(0, len(words), step)):
            chunk_words = words[start: start + self.chunk_size]
            if not chunk_words:
                break
            chunk_text = " ".join(chunk_words)
            chunk_id = f"{doc_id}::chunk{i}"
            chunks.append(DocumentChunk(
                chunk_id=chunk_id,
                doc_id=doc_id,
                text=chunk_text,
                metadata={**(metadata or {}), "chunk_index": i},
            ))
        return chunks


# ─────────────────────────────────────────────────────────────
# 2.3  Qdrant Vector Store (interface + in-memory stub)
# ─────────────────────────────────────────────────────────────

class QdrantStore:
    """
    Production implementation:

    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct

    class QdrantStore:
        def __init__(self, url="http://localhost:6333", collection="medinex_bio"):
            self.client = QdrantClient(url=url)
            self.collection = collection
            self._ensure_collection()

        def _ensure_collection(self):
            try:
                self.client.get_collection(self.collection)
            except Exception:
                self.client.create_collection(
                    self.collection,
                    vectors_config=VectorParams(size=768, distance=Distance.COSINE),
                )

        def upsert(self, chunks: List[DocumentChunk]):
            points = [
                PointStruct(id=abs(hash(c.chunk_id)) % (2**31),
                            vector=c.embedding,
                            payload={**c.metadata, "text": c.text, "chunk_id": c.chunk_id})
                for c in chunks if c.embedding
            ]
            self.client.upsert(collection_name=self.collection, points=points)

        def search(self, query_vector, top_k=10):
            return self.client.search(
                collection_name=self.collection,
                query_vector=query_vector,
                limit=top_k,
                with_payload=True,
            )
    """

    def __init__(self):
        self._store: Dict[str, DocumentChunk] = {}

    def upsert(self, chunks: List[DocumentChunk]):
        for c in chunks:
            self._store[c.chunk_id] = c

    def search(self, query_vec: List[float], embedder: EmbeddingGenerator,
               top_k: int = 10) -> List[Tuple[DocumentChunk, float]]:
        scored = []
        for chunk in self._store.values():
            if chunk.embedding:
                sim = embedder.cosine_similarity(query_vec, chunk.embedding)
                scored.append((chunk, sim))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]


# ─────────────────────────────────────────────────────────────
# 2.4  BM25 Retriever
# ─────────────────────────────────────────────────────────────

class BM25Retriever:
    """
    Uses rank-bm25 library in production:
    from rank_bm25 import BM25Okapi
    tokenized = [doc.split() for doc in corpus]
    bm25 = BM25Okapi(tokenized)
    scores = bm25.get_scores(query.split())
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self._corpus: List[DocumentChunk] = []
        self._idf: Dict[str, float] = {}
        self._avg_dl: float = 0.0

    def index(self, chunks: List[DocumentChunk]):
        self._corpus = chunks
        all_words = [c.text.lower().split() for c in chunks]
        total_words = sum(len(w) for w in all_words)
        self._avg_dl = total_words / len(all_words) if all_words else 1.0
        df: Dict[str, int] = defaultdict(int)
        for words in all_words:
            for w in set(words):
                df[w] += 1
        N = len(chunks)
        self._idf = {
            w: math.log((N - f + 0.5) / (f + 0.5) + 1)
            for w, f in df.items()
        }

    def search(self, query: str, top_k: int = 10) -> List[Tuple[DocumentChunk, float]]:
        q_terms = query.lower().split()
        scored = []
        for chunk in self._corpus:
            words = chunk.text.lower().split()
            dl = len(words)
            tf_map: Dict[str, int] = defaultdict(int)
            for w in words:
                tf_map[w] += 1
            score = 0.0
            for term in q_terms:
                if term not in tf_map:
                    continue
                tf = tf_map[term]
                idf = self._idf.get(term, 0.0)
                score += idf * (tf * (self.k1 + 1)) / (
                    tf + self.k1 * (1 - self.b + self.b * dl / self._avg_dl)
                )
            if score > 0:
                scored.append((chunk, round(score, 3)))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]


# ─────────────────────────────────────────────────────────────
# 2.5  RRF Fusion
# ─────────────────────────────────────────────────────────────

class RRFFusion:
    """
    Reciprocal Rank Fusion: score(d) = Σ 1 / (k + rank_i(d))
    Default k=60 from the original Cormack et al. 2009 paper.
    """

    def __init__(self, k: int = 60):
        self.k = k

    def fuse(self,
             dense_results: List[Tuple[DocumentChunk, float]],
             bm25_results:  List[Tuple[DocumentChunk, float]],
             top_k: int = 10) -> List[HybridResult]:

        rrf_scores: Dict[str, float] = defaultdict(float)
        dense_rank_map: Dict[str, int] = {}
        bm25_rank_map:  Dict[str, int] = {}
        chunk_map: Dict[str, DocumentChunk] = {}

        for rank, (chunk, _) in enumerate(dense_results, 1):
            rrf_scores[chunk.chunk_id] += 1.0 / (self.k + rank)
            dense_rank_map[chunk.chunk_id] = rank
            chunk_map[chunk.chunk_id] = chunk

        for rank, (chunk, _) in enumerate(bm25_results, 1):
            rrf_scores[chunk.chunk_id] += 1.0 / (self.k + rank)
            bm25_rank_map[chunk.chunk_id] = rank
            chunk_map[chunk.chunk_id] = chunk

        sorted_ids = sorted(rrf_scores, key=rrf_scores.__getitem__, reverse=True)

        results = []
        for final_rank, cid in enumerate(sorted_ids[:top_k], 1):
            chunk = chunk_map[cid]
            in_dense = cid in dense_rank_map
            in_bm25  = cid in bm25_rank_map
            sources  = (["dense"] if in_dense else []) + (["bm25"] if in_bm25 else [])
            results.append(HybridResult(
                chunk_id=cid,
                title=chunk.metadata.get("title", chunk.text[:80] + "…"),
                rrf_score=round(rrf_scores[cid], 6),
                dense_rank=dense_rank_map.get(cid),
                bm25_rank=bm25_rank_map.get(cid),
                sources=sources,
                rank=final_rank,
            ))
        return results


# ─────────────────────────────────────────────────────────────
# Stub Corpus (replaces live PubMed / DB fetch in production)
# ─────────────────────────────────────────────────────────────

STUB_CORPUS = [
    {"id":"pmid:38901234","title":"Metformin activates AMP-activated protein kinase in hepatocytes","year":2024,"source":"pubmed","text":"Metformin treatment in primary hepatocytes led to significant AMPK phosphorylation and subsequent inhibition of mTORC1, reducing hepatic glucose production via suppression of the gluconeogenic program."},
    {"id":"pmid:37812456","title":"Mechanisms of metformin action on glucose metabolism and insulin resistance","year":2023,"source":"pubmed","text":"This review covers the pleiotropic mechanisms of metformin, including mitochondrial complex I inhibition, AMPK activation, and insulin sensitization at the level of hepatic and peripheral tissues."},
    {"id":"pmid:37654321","title":"AMPK-mediated phosphorylation of insulin signaling nodes","year":2023,"source":"pubmed","text":"AMPK directly phosphorylates IRS1 and modulates PI3K-AKT signaling, providing a molecular link between cellular energy status and insulin sensitivity."},
    {"id":"pmid:38112233","title":"Metformin and insulin resistance: a systematic clinical review","year":2024,"source":"pubmed","text":"Meta-analysis of 42 RCTs confirms that metformin reduces fasting insulin, HOMA-IR index, and HbA1c in patients with insulin resistance and type 2 diabetes mellitus."},
    {"id":"pmid:36987654","title":"PARP inhibitors in BRCA-mutated breast cancer: systematic review","year":2024,"source":"pubmed","text":"PARP inhibitors including olaparib, niraparib, and rucaparib demonstrate significant efficacy in BRCA1/2-mutated breast cancer through synthetic lethality mechanisms."},
    {"id":"pmid:37345678","title":"BRCA1 mutation carriers: drug sensitivity analysis","year":2024,"source":"pubmed","text":"BRCA1-deficient cells show heightened sensitivity to platinum agents and PARP inhibitors, with olaparib achieving the highest therapeutic index in BRCA1-mutant models."},
    {"id":"pmid:38765432","title":"EGFR signaling crosstalk with PI3K-AKT-mTOR axis","year":2024,"source":"pubmed","text":"Activated EGFR recruits the p85 subunit of PI3K to phosphorylated Y1068, generating PIP3 and triggering AKT phosphorylation at T308 and S473, with subsequent mTORC1 activation."},
    {"id":"pmid:37234567","title":"Genome-wide association study of Alzheimer's disease: 2024 update","year":2024,"source":"pubmed","text":"The largest GWAS of Alzheimer's disease to date identifies 83 genomic loci, implicating genes in amyloid processing (APP, PSEN1), immune response (TREM2, CLU), and lipid metabolism (APOE)."},
]


def build_stub_corpus(embedder: EmbeddingGenerator,
                      chunker: CorpusChunker,
                      store: QdrantStore,
                      bm25: BM25Retriever):
    """Index the stub corpus into Qdrant and BM25."""
    all_chunks: List[DocumentChunk] = []
    for doc in STUB_CORPUS:
        chunks = chunker.chunk(doc["id"], doc["text"], metadata={
            "title": doc["title"],
            "year":  doc["year"],
            "source":doc["source"],
            "doi":   doc.get("doi", ""),
        })
        for c in chunks:
            c.embedding = embedder.embed(c.text)
        all_chunks.extend(chunks)
    store.upsert(all_chunks)
    bm25.index(all_chunks)
    return all_chunks


# ─────────────────────────────────────────────────────────────
# Orchestrator
# ─────────────────────────────────────────────────────────────

class SemanticRetrieval:
    def __init__(self, top_k: int = 5):
        self.top_k    = top_k
        self.embedder = EmbeddingGenerator()
        self.chunker  = CorpusChunker()
        self.store    = QdrantStore()
        self.bm25     = BM25Retriever()
        self.rrf      = RRFFusion()
        self._indexed = False

    def _ensure_index(self):
        if not self._indexed:
            build_stub_corpus(self.embedder, self.chunker, self.store, self.bm25)
            self._indexed = True

    def run(self, query: str, step1_result: dict = None) -> dict:
        self._ensure_index()

        print("  [2.1] Generating query embedding…")
        q_vec = self.embedder.embed(query)

        print("  [2.2] Dense retrieval from Qdrant…")
        dense_raw = self.store.search(q_vec, self.embedder, top_k=self.top_k)
        dense_results = [
            RetrievedResult(
                chunk_id=c.chunk_id,
                title=c.metadata.get("title", ""),
                text=c.text[:200],
                score=round(s, 4),
                year=c.metadata.get("year", 0),
                source=c.metadata.get("source", ""),
                doi=c.metadata.get("doi", ""),
                rank=i+1,
            )
            for i, (c, s) in enumerate(dense_raw)
        ]

        print("  [2.3] BM25 lexical retrieval…")
        bm25_raw = self.bm25.search(query, top_k=self.top_k)
        bm25_results = [
            RetrievedResult(
                chunk_id=c.chunk_id,
                title=c.metadata.get("title", ""),
                text=c.text[:200],
                score=round(s, 4),
                year=c.metadata.get("year", 0),
                source=c.metadata.get("source", ""),
                doi=c.metadata.get("doi", ""),
                rank=i+1,
            )
            for i, (c, s) in enumerate(bm25_raw)
        ]

        print("  [2.4] RRF Fusion…")
        rrf_results = self.rrf.fuse(dense_raw, bm25_raw, top_k=self.top_k)

        result = Step2Result(
            query=query,
            query_embedding_dims=EmbeddingGenerator.DIMS,
            embedding_model=EmbeddingGenerator.MODEL_NAME,
            dense_results=dense_results,
            bm25_results=bm25_results,
            rrf_results=rrf_results,
            total_candidates=len(self.store._store),
        )
        return result.to_dict()


# ─────────────────────────────────────────────────────────────
# Quick test
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sr = SemanticRetrieval()
    for q in ["How does Metformin reduce insulin resistance?",
              "Which drugs target BRCA1 mutation in breast cancer?"]:
        res = sr.run(q)
        print(json.dumps(res, indent=2))
        print()
