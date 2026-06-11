import asyncio
import random
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

try:
    from sklearn.cluster import KMeans
    import numpy as np
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

router = APIRouter()

class MapNode(BaseModel):
    id: str
    title: str
    x: float
    y: float
    cluster: int
    cluster_name: str

class ResearchMapResponse(BaseModel):
    nodes: List[MapNode]

@router.get("/{project_id}/topic-map", response_model=ResearchMapResponse)
async def generate_research_map(project_id: str):
    """
    Step 6: Research Maps - PubMedBERT Embeddings and Clustering.
    In a full implementation, this extracts embeddings for all papers in the project,
    reduces dimensionality to 2D using PCA/UMAP, and clusters them using KMeans.
    """
    await asyncio.sleep(1)
    
    # Mock data to simulate the output of a clustering algorithm
    titles = [
        "LRRK2 kinase activity in Parkinson disease pathogenesis",
        "Identification of SNCA mutations in familial Parkinson disease",
        "GBA variants and Parkinson disease risk",
        "Mitochondrial dysfunction in early-onset PD",
        "Alpha-synuclein aggregation pathways",
        "Clinical trials of LRRK2 inhibitors",
        "Genetic landscape of late-onset Parkinson's",
        "Lysosomal storage disorders and neurodegeneration"
    ]
    
    clusters = ["Genetics", "Pathogenesis", "Therapeutics"]
    
    nodes = []
    
    if HAS_SKLEARN:
        # Simulate generating random embeddings and clustering them
        # just to prove the pipeline works
        X = np.random.rand(len(titles), 50) # 50-dimensional fake embeddings
        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10).fit(X)
        labels = kmeans.labels_
        
        for i, title in enumerate(titles):
            # Generate spread out 2D coordinates for visualization
            cx, cy = (labels[i] * 10), (labels[i] * 10)
            x = cx + random.uniform(-5, 5)
            y = cy + random.uniform(-5, 5)
            
            nodes.append(MapNode(
                id=f"pmid_{1000 + i}",
                title=title,
                x=x,
                y=y,
                cluster=int(labels[i]),
                cluster_name=clusters[int(labels[i])]
            ))
    else:
        # Static fallback if sklearn failed to install
        for i, title in enumerate(titles):
            c_id = i % 3
            nodes.append(MapNode(
                id=f"pmid_{1000 + i}",
                title=title,
                x=random.uniform(0, 100),
                y=random.uniform(0, 100),
                cluster=c_id,
                cluster_name=clusters[c_id]
            ))
            
    return ResearchMapResponse(nodes=nodes)
