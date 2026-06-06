import faiss
import json
import numpy as np
from google import genai
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, Range
from rank_bm25 import BM25Okapi
import uuid
import os

class VectorSearchEngine:
    def __init__(self, data_path="pubmed_abstracts.json"):
        # We will use the output from our existing literature explorer
        # For this prototype, we look for pubmed data in backend/data/pubmed
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.abstracts = []
        
        # Try to load existing data
        if os.path.exists("combined_dataset.csv"):
            import pandas as pd
            df = pd.read_csv("combined_dataset.csv")
            for _, row in df.iterrows():
                self.abstracts.append({
                    "pmid": str(row.get("pmid", str(uuid.uuid4()))),
                    "text": str(row.get("abstract", "")),
                    "title": str(row.get("title", "")),
                    "year": row.get("pub_year", 2024)
                })
        
        self.texts = [a["text"] for a in self.abstracts if isinstance(a.get("text"), str)]
        
        # FAISS
        self.dim = 768
        self.faiss_index = faiss.IndexHNSWFlat(self.dim, 32)
        self.faiss_index.hnsw.efConstruction = 200
        
        # Qdrant
        self.qdrant_client = QdrantClient(":memory:")
        self.collection_name = "biomedical_papers"
        self.qdrant_client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(size=self.dim, distance=Distance.COSINE),
        )
        
        # BM25
        tokenized = [t.lower().split() for t in self.texts if t and t.strip()]
        self.bm25 = BM25Okapi(tokenized) if tokenized and any(len(doc) > 0 for doc in tokenized) else None

    def build_indices(self):
        if not self.texts:
            print("No texts to index.")
            return

        print(f"Embedding {len(self.texts)} abstracts...")
        # Use Gemini instead of SentenceTransformer
        # Split into batches of 100 to avoid API limits
        embeddings = []
        batch_size = 100
        for i in range(0, len(self.texts), batch_size):
            batch = self.texts[i:i+batch_size]
            response = self.client.models.embed_content(model='text-embedding-004', contents=batch)
            embeddings.extend([e.values for e in response.embeddings])
        embeddings = np.array(embeddings, dtype="float32")
        
        # Add to FAISS
        self.faiss_index.add(embeddings)
        print(f"FAISS index built: {self.faiss_index.ntotal} vectors")
        
        # Add to Qdrant
        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embeddings[i].tolist(),
                payload={
                    "pmid": self.abstracts[i].get("pmid"),
                    "title": self.abstracts[i].get("title", ""),
                    "year": self.abstracts[i].get("year", 0),
                },
            )
            for i in range(len(self.texts))
        ]
        self.qdrant_client.upsert(collection_name=self.collection_name, points=points)
        print("Qdrant index built.")

    def semantic_search_faiss(self, query: str, top_k: int = 5):
        if not self.texts: return []
        res = self.client.models.embed_content(model='text-embedding-004', contents=[query])
        q_vec = np.array([res.embeddings[0].values], dtype="float32")
        distances, indices = self.faiss_index.search(q_vec, top_k)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(self.abstracts):
                results.append({
                    "pmid": self.abstracts[idx].get("pmid"),
                    "score": float(dist),
                    "text": self.abstracts[idx].get("text", "")[:200]
                })
        return results

    def hybrid_search(self, query: str, top_k: int = 5, alpha: float = 0.6):
        if not self.texts or not self.bm25: return []
        
        # FAISS
        res = self.client.models.embed_content(model='text-embedding-004', contents=[query])
        q_vec = np.array([res.embeddings[0].values], dtype="float32")
        sem_dists, sem_idx = self.faiss_index.search(q_vec, top_k * 3)
        sem_scores = {int(i): float(d) for d, i in zip(sem_dists[0], sem_idx[0])}
        
        # BM25
        bm25_scores = self.bm25.get_scores(query.lower().split())
        top_bm25 = np.argsort(bm25_scores)[::-1][:top_k * 3]
        bm25_map = {int(i): bm25_scores[i] for i in top_bm25}
        
        max_sem = max(sem_scores.values(), default=1)
        max_bm25 = max(bm25_map.values(), default=1)
        if max_sem == 0: max_sem = 1
        if max_bm25 == 0: max_bm25 = 1
        
        all_idx = set(sem_scores) | set(bm25_map)
        fused = {
            i: alpha * (sem_scores.get(i, 0) / max_sem) + (1 - alpha) * (bm25_map.get(i, 0) / max_bm25)
            for i in all_idx
        }
        
        ranked = sorted(fused, key=fused.get, reverse=True)[:top_k]
        return [{"pmid": self.abstracts[i].get("pmid"), "score": fused[i], "text": self.abstracts[i].get("text", "")[:200]} for i in ranked if i < len(self.abstracts)]

if __name__ == "__main__":
    engine = VectorSearchEngine()
    engine.build_indices()
    hits = engine.hybrid_search("cancer biomarkers")
    print(hits)
