"""
Run once to initialise Qdrant collections for Bioquora.
Requires: pip install qdrant-client
"""
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, HnswConfigDiff, OptimizersConfigDiff
)

client = QdrantClient(url="http://localhost:6333")

# Main paper embeddings — BioLinkBERT 768-dim
client.recreate_collection(
    collection_name="papers",
    vectors_config=VectorParams(size=768, distance=Distance.COSINE),
    hnsw_config=HnswConfigDiff(m=16, ef_construct=200),
    optimizers_config=OptimizersConfigDiff(indexing_threshold=20_000),
)
client.create_payload_index("papers", "mesh_terms",    field_schema="keyword")
client.create_payload_index("papers", "year",          field_schema="integer")
client.create_payload_index("papers", "evidence_tier", field_schema="keyword")
client.create_payload_index("papers", "field",         field_schema="keyword")

# Node2Vec graph embeddings — 128-dim
client.recreate_collection(
    collection_name="paper_graph_embeddings",
    vectors_config=VectorParams(size=128, distance=Distance.COSINE),
    hnsw_config=HnswConfigDiff(m=16, ef_construct=100),
)

print("Qdrant collections created:")
print("  papers                  — 768-dim BioLinkBERT")
print("  paper_graph_embeddings  — 128-dim Node2Vec")
