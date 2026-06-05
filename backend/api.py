from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any

# Import the modular engines we just created
from vector_search import VectorSearchEngine
from rag_engine import RAGEngine
from graph_rag import GraphRAGEngine

app = FastAPI(
    title="MEDINEX Biomedical Intelligence API",
    version="0.1.0",
    description="Phase 7-10 — FAISS Vector Search + RAG + GraphRAG API",
)

# Initialize engines lazily to avoid heavy loading on fast restart
vector_engine = None
rag_engine = None
graph_engine = None

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5
    mode: str = "rag"  # "semantic" | "hybrid" | "rag" | "graph"

class SourceDocument(BaseModel):
    text: Optional[str] = None
    pmid: Optional[str] = None
    score: Optional[float] = None
    metadata: Optional[dict] = None

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceDocument] = []
    metadata: dict

@app.on_event("startup")
async def startup_event():
    print("MEDINEX API Starting up...")
    # Initialize engines
    global vector_engine, rag_engine, graph_engine
    
    # Init Vector Search
    print("Initializing Vector Search Engine...")
    vector_engine = VectorSearchEngine()
    vector_engine.build_indices()
    
    # Init RAG Engine
    print("Initializing RAG Engine...")
    rag_engine = RAGEngine(use_llm=False)  # Set True if OpenAI API key is available
    rag_engine.build_index_from_csv()
    
    # Init GraphRAG Engine
    print("Initializing GraphRAG Engine...")
    graph_engine = GraphRAGEngine()

@app.post("/query", response_model=QueryResponse)
async def query_endpoint(req: QueryRequest):
    if req.mode == "semantic":
        hits = vector_engine.semantic_search_faiss(req.question, top_k=req.top_k)
        sources = [SourceDocument(pmid=h["pmid"], text=h["text"], score=h["score"]) for h in hits]
        return QueryResponse(
            answer=f"Found {len(hits)} semantic matches.",
            sources=sources,
            metadata={"mode": "semantic", "engine": "FAISS"}
        )
        
    elif req.mode == "hybrid":
        hits = vector_engine.hybrid_search(req.question, top_k=req.top_k)
        sources = [SourceDocument(pmid=h["pmid"], text=h["text"], score=h["score"]) for h in hits]
        return QueryResponse(
            answer=f"Found {len(hits)} hybrid (BM25+Vector) matches.",
            sources=sources,
            metadata={"mode": "hybrid", "engine": "FAISS+BM25"}
        )
        
    elif req.mode == "rag":
        res = rag_engine.query(req.question)
        if isinstance(res, str):
            return QueryResponse(answer=res, metadata={"mode": "rag", "error": True})
            
        sources = [SourceDocument(score=s.get("score"), metadata=s.get("metadata"), text=s.get("text")) for s in res.get("sources", [])]
        return QueryResponse(
            answer=res.get("answer", ""),
            sources=sources,
            metadata={"mode": "rag", "engine": "LlamaIndex"}
        )
        
    elif req.mode == "graph":
        res = graph_engine.query(req.question)
        return QueryResponse(
            answer=res.get("answer", ""),
            sources=[],
            metadata={"mode": "graph", "engine": "Neo4j", "cypher": res.get("cypher"), "data": res.get("data")}
        )
        
    else:
        raise HTTPException(status_code=400, detail=f"Unknown mode: {req.mode}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "engines": {
        "vector": vector_engine is not None,
        "rag": rag_engine is not None,
        "graph": graph_engine is not None and graph_engine.connected
    }}
