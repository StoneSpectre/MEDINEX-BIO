"""
medinex/api/api.py  — Step 5: Disease Explorer API

FastAPI graph query layer on top of the Medinex knowledge graph.
Powers the Disease Explorer frontend (Next.js).

Endpoints:
  GET  /health                     — connection + graph stats
  GET  /search?q=:term             — full-text search across all node types
  GET  /disease/:id                — full 2-hop neighbourhood
  GET  /connect?from=:id&to=:id    — shortest path between two nodes
  GET  /researchers/top            — top researchers by h_index
  GET  /citations/:pmid            — citation graph for a paper
  GET  /pathways/:disease_id       — pathways linked to a disease via genes
  GET  /stats                      — graph-wide node/edge counts

Run:
    pip install fastapi uvicorn
    uvicorn api:app --reload --port 8000

Docs auto-generated at: http://localhost:8000/docs
"""

from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .db import MedinexGraph

# ── App lifecycle ─────────────────────────────────────────────

_graph: Optional[MedinexGraph] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _graph
    _graph = MedinexGraph()
    health = _graph.health_check()
    if not health["ok"]:
        raise RuntimeError(f"Neo4j unreachable at startup: {health['error']}")
    print(f"[API] Neo4j connected — {health['version']}")
    yield
    _graph.close()
    print("[API] Neo4j connection closed")


app = FastAPI(
    title="Medinex Disease Explorer API",
    version="0.1.0",
    description="Graph query layer for the Medinex Biomedical Knowledge Graph",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:8080",
        "https://medinex-bio.vercel.app",
        "https://medinex-bio.netlify.app"
    ],   # Dev & Prod servers
    allow_methods=["GET"],
    allow_headers=["*"],
)


def graph() -> MedinexGraph:
    if _graph is None:
        raise HTTPException(503, "Graph not initialised")
    return _graph


# ── Routes ────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Connection check + live node counts."""
    info = graph().health_check()
    if not info["ok"]:
        raise HTTPException(503, info["error"])
    return {
        "status":  "ok",
        "neo4j":   info,
        "counts":  graph().node_count(),
    }


@app.get("/stats")
def stats():
    """Node and edge counts across the whole graph."""
    return {
        "nodes": graph().node_count(),
        "edges": graph().edge_count(),
    }


@app.get("/search")
def search(
    q: str = Query(..., min_length=2, description="Search term"),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Full-text search across Disease, Gene, Drug, Paper, Researcher nodes.
    Returns up to `limit` ranked results.
    """
    results = graph().search_nodes(q, limit=limit)
    return {"query": q, "results": results, "count": len(results)}

@app.get("/graph")
def full_graph(limit: int = Query(150, ge=10, le=2000)):
    """
    Returns a graph sample for the KnowledgeGraph.tsx force-directed graph.
    Format: { nodes: [{id, type, name}], edges: [{src, dst, relation}] }
    """
    edges_res = graph().run(
        """
        MATCH (n)-[r]->(m)
        WHERE type(r) IN ['TREATS', 'ASSOCIATED_WITH_GENE', 'INVOLVED_IN', 'PRESENTS_SYMPTOM', 'INTERACTS_WITH', 'MENTIONS_DISEASE', 'CITES', 'PART_OF_PATHWAY']
        RETURN elementId(n) as src, labels(n)[0] as n_type, n.name as n_name, n.title as n_title, n.id as n_id,
               elementId(m) as dst, labels(m)[0] as m_type, m.name as m_name, m.title as m_title, m.id as m_id,
               type(r) as relation
        LIMIT $limit
        """,
        limit=limit
    )
    
    nodes_map = {}
    edges = []
    
    for e in edges_res:
        src_id = e["src"]
        if src_id not in nodes_map:
            nodes_map[src_id] = {
                "id": src_id, "type": e["n_type"], 
                "label": e["n_name"] or e["n_title"] or e["n_id"], 
                "display_id": e["n_id"]
            }
            
        dst_id = e["dst"]
        if dst_id not in nodes_map:
            nodes_map[dst_id] = {
                "id": dst_id, "type": e["m_type"], 
                "label": e["m_name"] or e["m_title"] or e["m_id"], 
                "display_id": e["m_id"]
            }
            
        edges.append({"src": src_id, "dst": dst_id, "relation": e["relation"]})
        
    return {"nodes": list(nodes_map.values()), "edges": edges}



@app.get("/disease/{disease_id}")
def get_disease(disease_id: str):
    """
    Returns the full 2-hop neighbourhood of a disease:
      - symptoms, genes, drugs, papers, pathways

    `disease_id` can be a MeSH/EFO ID or a partial name string.
    """
    # Try by exact ID first, fall back to name search
    result = graph().run(
        "MATCH (d:Disease {id: $id}) RETURN d.name AS name LIMIT 1",
        id=disease_id,
    )
    if result:
        data = graph().get_disease_graph(result[0]["name"])
    else:
        # Treat as name fragment
        data = graph().get_disease_graph(disease_id)

    if not data:
        raise HTTPException(404, f"Disease not found: {disease_id}")

    return data


@app.get("/connect")
def connect(
    from_id: str = Query(..., description="Source node id"),
    to_id:   str = Query(..., description="Target node id"),
    max_hops: int = Query(4, ge=1, le=6),
):
    """
    Finds the shortest path(s) between any two nodes by id.
    Powers the Disease Explorer 'Connect' feature.
    """
    paths = graph().get_shortest_path(from_id, to_id, max_hops=max_hops)
    if not paths:
        raise HTTPException(
            404,
            f"No path found between {from_id} and {to_id} within {max_hops} hops",
        )
    return {"from_id": from_id, "to_id": to_id, "paths": paths}


@app.get("/researchers/top")
def top_researchers(
    limit: int = Query(20, ge=1, le=100),
    disease_id: Optional[str] = Query(None, description="Filter by disease"),
):
    """
    Top researchers by h_index.
    Optionally filter to researchers who have published on a specific disease.
    """
    if disease_id:
        results = graph().run(
            """
            MATCH (r:Researcher)<-[:AUTHORED_BY]-(p:Paper)-[:MENTIONS_DISEASE]->(d:Disease {id: $disease_id})
            RETURN r.id AS id, r.name AS name, r.affiliation AS affiliation,
                   r.h_index AS h_index, r.paper_count AS paper_count,
                   count(p) AS papers_on_disease
            ORDER BY r.h_index DESC NULLS LAST
            LIMIT $limit
            """,
            disease_id=disease_id, limit=limit,
        )
    else:
        results = graph().run(
            """
            MATCH (r:Researcher)
            RETURN r.id AS id, r.name AS name, r.affiliation AS affiliation,
                   r.h_index AS h_index, r.paper_count AS paper_count
            ORDER BY r.h_index DESC NULLS LAST
            LIMIT $limit
            """,
            limit=limit,
        )
    return {"researchers": results, "count": len(results)}


@app.get("/citations/{pmid}")
def citations(
    pmid: str,
    depth: int = Query(2, ge=1, le=4, description="Citation depth to traverse"),
):
    """
    Returns the citation subgraph for a paper:
      - papers that cite this paper
      - papers this paper cites
      - citation depth traversal up to `depth` hops
    """
    # Check paper exists
    paper = graph().run("MATCH (p:Paper {pmid: $pmid}) RETURN p LIMIT 1", pmid=pmid)
    if not paper:
        raise HTTPException(404, f"Paper {pmid} not found")

    cited_by = graph().run(
        "MATCH (citing:Paper)-[:CITES]->(p:Paper {pmid: $pmid}) "
        "RETURN citing.pmid AS pmid, citing.title AS title, citing.year AS year "
        "ORDER BY citing.year DESC LIMIT 50",
        pmid=pmid,
    )
    cites = graph().run(
        "MATCH (p:Paper {pmid: $pmid})-[:CITES]->(cited:Paper) "
        "RETURN cited.pmid AS pmid, cited.title AS title, cited.year AS year "
        "ORDER BY cited.year DESC LIMIT 50",
        pmid=pmid,
    )

    # Landmark detection: papers cited by many papers in our graph
    # (simple in-degree proxy for influence)
    landmark_threshold = 3
    landmark = graph().run(
        """
        MATCH (p:Paper {pmid: $pmid})<-[:CITES]-(c:Paper)
        WITH p, count(c) AS in_degree
        RETURN in_degree >= $threshold AS is_landmark, in_degree
        """,
        pmid=pmid, threshold=landmark_threshold,
    )
    is_landmark = landmark[0]["is_landmark"] if landmark else False
    in_degree   = landmark[0]["in_degree"]   if landmark else 0

    return {
        "pmid":        pmid,
        "paper":       paper[0]["p"],
        "cited_by":    cited_by,
        "cites":       cites,
        "in_degree":   in_degree,
        "is_landmark": is_landmark,
    }


@app.get("/pathways/{disease_id}")
def pathways(disease_id: str):
    """
    Returns pathways connected to a disease via its associated genes.
    Disease → Gene → Pathway chain.
    """
    results = graph().run(
        """
        MATCH (d:Disease {id: $disease_id})-[:ASSOCIATED_WITH_GENE]->(g:Gene)-[:INVOLVED_IN]->(pw:Pathway)
        RETURN pw.id AS pathway_id, pw.name AS pathway_name, pw.source AS source,
               collect(DISTINCT g.symbol) AS genes, count(DISTINCT g) AS gene_count
        ORDER BY gene_count DESC
        LIMIT 50
        """,
        disease_id=disease_id,
    )
    if not results:
        # Try name search
        disease = graph().run(
            "MATCH (d:Disease) WHERE toLower(d.name) CONTAINS toLower($name) RETURN d.id AS id LIMIT 1",
            name=disease_id,
        )
        if disease:
            return pathways(disease[0]["id"])

    return {"disease_id": disease_id, "pathways": results, "count": len(results)}


@app.get("/related/{disease_id}")
def related_diseases(
    disease_id: str,
    limit: int = Query(10, ge=1, le=50),
):
    """
    Find diseases related to a given disease by shared genes.
    Returns ranked by number of shared genes.
    """
    results = graph().run(
        """
        MATCH (d:Disease {id: $disease_id})-[:ASSOCIATED_WITH_GENE]->(g:Gene)
              <-[:ASSOCIATED_WITH_GENE]-(other:Disease)
        WHERE other.id <> $disease_id
        RETURN other.id AS id, other.name AS name, other.category AS category,
               count(DISTINCT g) AS shared_genes,
               collect(DISTINCT g.symbol)[..5] AS top_shared_genes
        ORDER BY shared_genes DESC
        LIMIT $limit
        """,
        disease_id=disease_id, limit=limit,
    )
    return {"disease_id": disease_id, "related": results}


@app.get("/timeline/{disease_id}")
def research_timeline(disease_id: str):
    """
    Returns papers mentioning this disease grouped by year.
    Powers the 'Research evolution over time' chart.
    """
    results = graph().run(
        """
        MATCH (p:Paper)-[:MENTIONS_DISEASE]->(d:Disease {id: $disease_id})
        WHERE p.year IS NOT NULL
        RETURN p.year AS year, count(p) AS paper_count,
               collect(p.pmid)[..3] AS sample_pmids
        ORDER BY year
        """,
        disease_id=disease_id,
    )
    return {"disease_id": disease_id, "timeline": results}
