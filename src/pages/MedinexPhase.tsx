import { useState } from "react";
import { Layout } from "@/components/layout/Layout";

// ─── CODE SNIPPETS ──────────────────────────────────────────────────────────

const codeSnippets = {
  7: {
    tabs: ["Install", "Embed & Index", "FAISS Search", "Qdrant Search", "Hybrid BM25+Vector"],
    code: [
      `# Install dependencies
pip install faiss-cpu sentence-transformers qdrant-client rank_bm25

# For GPU acceleration
pip install faiss-gpu`,

      `from sentence_transformers import SentenceTransformer
import faiss, numpy as np, json

# Load biomedical embedding model
model = SentenceTransformer(
    "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
)

# Load your abstracts
with open("pubmed_abstracts.json") as f:
    abstracts = json.load(f)   # list of {"pmid": ..., "text": ...}

texts = [a["text"] for a in abstracts]

# Generate embeddings in batches (512-dim vectors)
print("Embedding", len(texts), "abstracts...")
embeddings = model.encode(
    texts,
    batch_size=64,
    show_progress_bar=True,
    normalize_embeddings=True,   # required for cosine similarity
)
embeddings = np.array(embeddings, dtype="float32")

# Build FAISS HNSW index (fast ANN, no training needed)
dim = embeddings.shape[1]          # 768
index = faiss.IndexHNSWFlat(dim, 32)
index.hnsw.efConstruction = 200
index.add(embeddings)

# Save index + metadata
faiss.write_index(index, "biomedical.index")
with open("biomedical_meta.json", "w") as f:
    json.dump(abstracts, f)

print(f"Index built: {index.ntotal} vectors @ {dim}d")`,

      `import faiss, json, numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
)
index = faiss.read_index("biomedical.index")
with open("biomedical_meta.json") as f:
    abstracts = json.load(f)

def semantic_search(query: str, top_k: int = 10):
    # Embed query
    q_vec = model.encode(
        [query],
        normalize_embeddings=True
    ).astype("float32")

    # FAISS search → distances + indices
    distances, indices = index.search(q_vec, top_k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        results.append({
            "pmid":  abstracts[idx]["pmid"],
            "text":  abstracts[idx]["text"][:300],
            "score": float(dist),   # cosine similarity (0–1)
        })
    return results

# Example query
hits = semantic_search(
    "APOE4 gene association with late-onset Alzheimer's disease",
    top_k=5
)
for h in hits:
    print(f"[{h['score']:.3f}] PMID {h['pmid']}: {h['text'][:80]}...")`,

      `from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct
)
from sentence_transformers import SentenceTransformer
import uuid, json

client = QdrantClient(":memory:")   # use url="http://localhost:6333" for prod
model  = SentenceTransformer(
    "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
)

COLLECTION = "biomedical_papers"

# Create collection
client.create_collection(
    collection_name=COLLECTION,
    vectors_config=VectorParams(size=768, distance=Distance.COSINE),
)

# Upsert embeddings with payloads
with open("pubmed_abstracts.json") as f:
    abstracts = json.load(f)

embeddings = model.encode(
    [a["text"] for a in abstracts],
    batch_size=64, normalize_embeddings=True
)

points = [
    PointStruct(
        id=str(uuid.uuid4()),
        vector=embeddings[i].tolist(),
        payload={
            "pmid":    a["pmid"],
            "title":   a.get("title", ""),
            "journal": a.get("journal", ""),
            "year":    a.get("year", 0),
        },
    )
    for i, a in enumerate(abstracts)
]
client.upsert(collection_name=COLLECTION, points=points)

# Filtered semantic search
def qdrant_search(query, year_min=2018, top_k=5):
    from qdrant_client.models import Filter, FieldCondition, Range
    q_vec = model.encode([query], normalize_embeddings=True)[0].tolist()
    hits = client.search(
        collection_name=COLLECTION,
        query_vector=q_vec,
        query_filter=Filter(
            must=[FieldCondition(
                key="year",
                range=Range(gte=year_min)
            )]
        ),
        limit=top_k,
        with_payload=True,
    )
    return [{"pmid": h.payload["pmid"], "score": h.score} for h in hits]

results = qdrant_search("tau protein aggregation neurodegeneration")
print(results)`,

      `from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
import faiss, numpy as np, json

# Load data
with open("pubmed_abstracts.json") as f:
    abstracts = json.load(f)
texts  = [a["text"] for a in abstracts]
model  = SentenceTransformer(
    "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
)
index  = faiss.read_index("biomedical.index")

# Build BM25 index (keyword/lexical)
tokenized = [t.lower().split() for t in texts]
bm25 = BM25Okapi(tokenized)

def hybrid_search(query: str, top_k=10, alpha=0.6):
    """
    alpha: weight for semantic score (1-alpha for BM25)
    """
    # 1. Semantic scores (FAISS)
    q_vec = model.encode([query], normalize_embeddings=True).astype("float32")
    sem_dists, sem_idx = index.search(q_vec, top_k * 3)
    sem_scores = {int(i): float(d) for d, i in
                  zip(sem_dists[0], sem_idx[0])}

    # 2. BM25 scores (keyword)
    bm25_scores = bm25.get_scores(query.lower().split())
    top_bm25 = np.argsort(bm25_scores)[::-1][:top_k * 3]
    bm25_map  = {int(i): bm25_scores[i] for i in top_bm25}

    # 3. Normalise & merge
    max_sem  = max(sem_scores.values(),  default=1)
    max_bm25 = max(bm25_map.values(),    default=1)
    all_idx  = set(sem_scores) | set(bm25_map)

    fused = {
        i: alpha * (sem_scores.get(i, 0) / max_sem)
         + (1 - alpha) * (bm25_map.get(i, 0) / max_bm25)
        for i in all_idx
    }
    ranked = sorted(fused, key=fused.get, reverse=True)[:top_k]
    return [{"pmid": abstracts[i]["pmid"], "score": fused[i]} for i in ranked]

hits = hybrid_search("BRCA1 mutation breast cancer risk", alpha=0.6)
for h in hits:
    print(f"[{h['score']:.3f}] {h['pmid']}")`,
    ],
  },

  8: {
    tabs: ["Install", "LlamaIndex RAG", "LangChain RAG", "Agents & Tools", "RAGAS Eval"],
    code: [
      `# Core RAG stack
pip install llama-index llama-index-vector-stores-qdrant
pip install langchain langchain-community langchain-openai
pip install dspy-ai ragas trulens-eval sentence-transformers
pip install openai tiktoken`,

      `from llama_index.core import (
    VectorStoreIndex, SimpleDirectoryReader, Settings
)
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.postprocessor import SimilarityPostprocessor

# Configure biomedical embedding + LLM
Settings.embed_model = HuggingFaceEmbedding(
    model_name="microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
)
Settings.llm = OpenAI(model="gpt-4o", temperature=0)

# Load & chunk documents
documents = SimpleDirectoryReader("./papers/").load_data()
splitter  = SentenceSplitter(chunk_size=512, chunk_overlap=64)

# Build vector index
index = VectorStoreIndex.from_documents(
    documents,
    transformations=[splitter],
    show_progress=True,
)
index.storage_context.persist("./storage")

# Build retrieval query engine
retriever = VectorIndexRetriever(index=index, similarity_top_k=6)
engine    = RetrieverQueryEngine(
    retriever=retriever,
    node_postprocessors=[SimilarityPostprocessor(similarity_cutoff=0.7)],
)

# Query with citations
response = engine.query(
    "What are the known genetic risk factors for Alzheimer's disease?"
)
print(response)
# Show source nodes (citations)
for node in response.source_nodes:
    print(f"  ↳ [{node.score:.3f}] {node.metadata.get('file_name')} "
          f"p.{node.metadata.get('page_label','?')}")`,

      `from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Qdrant
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.prompts import PromptTemplate

# Load biomedical PDFs
loader = DirectoryLoader("./papers/", glob="**/*.pdf", loader_cls=PyPDFLoader)
docs   = loader.load()

# Split into chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=512, chunk_overlap=64,
    separators=["\n\n", "\n", ". ", " "],
)
chunks = splitter.split_documents(docs)

# Create Qdrant vector store
embeddings = HuggingFaceEmbeddings(
    model_name="microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
)
vectorstore = Qdrant.from_documents(
    chunks, embeddings,
    location=":memory:",
    collection_name="medinex_papers",
)

# Biomedical-specific prompt
PROMPT = PromptTemplate(
    input_variables=["summaries", "question"],
    template="""You are a biomedical research assistant. Use ONLY the
provided context. If unsure, say "I don't have enough information."
Always cite your sources.

Context:
{summaries}

Question: {question}
Answer (with citations):""",
)

# Build chain
llm   = ChatOpenAI(model="gpt-4o", temperature=0)
chain = RetrievalQAWithSourcesChain.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectorstore.as_retriever(search_kwargs={"k": 6}),
    chain_type_kwargs={"prompt": PROMPT},
    return_source_documents=True,
)

result = chain.invoke(
    {"question": "How does tau hyperphosphorylation cause neurodegeneration?"}
)
print("Answer:", result["answer"])
print("Sources:", result["sources"])`,

      `from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools import tool
from langchain_community.vectorstores import Qdrant
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import requests

embeddings  = HuggingFaceEmbeddings(
    model_name="microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
)
vectorstore = Qdrant.from_existing_collection(
    embeddings, collection_name="medinex_papers",
    url="http://localhost:6333",
)

@tool
def search_literature(query: str) -> str:
    """Search the indexed biomedical literature for relevant passages."""
    docs = vectorstore.similarity_search(query, k=5)
    return "\n\n".join(
        f"[{d.metadata.get('source','?')}] {d.page_content}" for d in docs
    )

@tool
def pubmed_live_search(query: str) -> str:
    """Search PubMed live for the most recent papers on a topic."""
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    r = requests.get(url, params={
        "db": "pubmed", "term": query,
        "retmax": 5, "retmode": "json",
        "sort": "relevance",
    })
    ids = r.json()["esearchresult"]["idlist"]
    return f"Top PubMed IDs for '{query}': {', '.join(ids)}"

@tool
def drug_target_lookup(gene_name: str) -> str:
    """Look up known drugs targeting a specific gene/protein."""
    # Stub — connect to ChEMBL / OpenTargets API in production
    return f"Known inhibitors of {gene_name}: [ChEMBL lookup pending]"

# Build agent
llm   = ChatOpenAI(model="gpt-4o", temperature=0)
tools = [search_literature, pubmed_live_search, drug_target_lookup]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are MEDINEX, a biomedical AI research assistant. "
               "Use your tools to answer questions with evidence."),
    ("user",   "{input}"),
    MessagesPlaceholder("agent_scratchpad"),
])

agent          = create_openai_tools_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

result = agent_executor.invoke({
    "input": "What approved drugs target APOE4 and what does recent "
             "literature say about their efficacy in Alzheimer's?"
})
print(result["output"])`,

      `from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

# Prepare evaluation dataset
# Each row: question, ground_truth, answer (LLM), contexts (retrieved)
eval_data = {
    "question": [
        "What genes are associated with Alzheimer's disease?",
        "How does amyloid-beta cause neurodegeneration?",
        "What are the BRCA1 mutation risks?",
    ],
    "ground_truth": [
        "APOE4, APP, PSEN1, PSEN2 are key Alzheimer's genes.",
        "Amyloid-beta aggregates into plaques, triggering tau ...",
        "BRCA1 mutations increase breast and ovarian cancer risk ...",
    ],
    "answer": [
        # Your RAG system's answers
        rag_chain.invoke(q)["answer"] for q in eval_data["question"]
    ],
    "contexts": [
        # Retrieved contexts per question
        [d.page_content for d in vectorstore.similarity_search(q, k=4)]
        for q in eval_data["question"]
    ],
}

dataset = Dataset.from_dict(eval_data)

# Run RAGAS evaluation
result = evaluate(
    dataset,
    metrics=[
        faithfulness,       # Is the answer grounded in context?
        answer_relevancy,   # Is the answer relevant to the question?
        context_precision,  # Is retrieved context precise?
        context_recall,     # Does context cover the ground truth?
    ],
)

print(result)
# faithfulness        0.91
# answer_relevancy    0.87
# context_precision   0.83
# context_recall      0.79`,
    ],
  },

  9: {
    tabs: ["Install", "Build Graph Index", "GraphRAG Index", "Multi-hop Query", "Cypher + LLM"],
    code: [
      `# Microsoft GraphRAG
pip install graphrag

# Neo4j GraphRAG Python SDK
pip install neo4j-graphrag

# Supporting tools
pip install neo4j openai tiktoken pandas`,

      `from neo4j import GraphDatabase
from neo4j_graphrag.indexes import create_vector_index
from neo4j_graphrag.embeddings import OpenAIEmbeddings

# Connect to Neo4j
driver = GraphDatabase.driver(
    "bolt://localhost:7687",
    auth=("neo4j", "password")
)

# ── Step 1: Insert entities & relationships ────────────────────────────────
with driver.session() as s:
    # Disease → Gene relationship
    s.run("""
        MERGE (d:Disease {name: $disease})
        MERGE (g:Gene    {name: $gene, hgnc: $hgnc})
        MERGE (d)-[:ASSOCIATED_WITH {evidence: $ev, pmid: $pmid}]->(g)
    """, disease="Alzheimer's Disease", gene="APOE",
         hgnc="HGNC:613", ev="GWAS meta-analysis", pmid="30617256")

    # Gene → Drug relationship
    s.run("""
        MERGE (g:Gene {name: $gene})
        MERGE (dr:Drug {name: $drug, chembl: $chembl})
        MERGE (g)-[:TARGETED_BY {mechanism: $mech}]->(dr)
    """, gene="APOE", drug="Lecanemab", chembl="CHEMBL4523360",
         mech="amyloid-beta clearance")

    # Gene → Pathway
    s.run("""
        MERGE (g:Gene {name: $gene})
        MERGE (p:Pathway {name: $pathway, id: $pid})
        MERGE (g)-[:IN_PATHWAY]->(p)
    """, gene="TREM2", pathway="Neuroinflammation",
         pid="R-HSA-6798695")

# ── Step 2: Create vector index on Paper nodes ─────────────────────────────
embedder = OpenAIEmbeddings(model="text-embedding-3-small")

create_vector_index(
    driver,
    name="paper_embedding_index",
    label="Paper",
    embedding_property="embedding",
    dimensions=1536,
    similarity_fn="cosine",
)
print("Neo4j graph + vector index ready")`,

      `# Microsoft GraphRAG: build community-aware index
# 1. Initialise project
graphrag init --root ./graphrag_biomedical

# 2. Edit graphrag_biomedical/settings.yml:
#    model: gpt-4o
#    input.file_type: text
#    entity_extraction.entity_types: [disease, gene, drug, pathway, protein]

# 3. Place your biomedical text corpus in ./graphrag_biomedical/input/
#    (one .txt per document — abstracts, clinical notes, etc.)

# 4. Run indexing pipeline (extracts entities, relations, communities)
graphrag index --root ./graphrag_biomedical

# Python: load the resulting index for querying
import asyncio
from graphrag.query.context_builder.entity_extraction import EntityVectorStoreKey
from graphrag.query.llm.oai.chat_openai import ChatOpenAI
from graphrag.query.structured_search.local_search.search import LocalSearch
from graphrag.query.structured_search.global_search.search import GlobalSearch

# Local search: deep-dive on specific entity
local_search  = LocalSearch(...)

# Global search: cross-community synthesis
global_search = GlobalSearch(...)

# Run query
result = asyncio.run(
    global_search.asearch(
        "What genes are involved in neuroinflammation pathways "
        "that are also targeted by approved drugs?"
    )
)
print(result.response)`,

      `from neo4j_graphrag.retrievers import (
    VectorRetriever, VectorCypherRetriever
)
from neo4j_graphrag.generation import GraphRAG
from neo4j_graphrag.embeddings import OpenAIEmbeddings
from neo4j_graphrag.llm import OpenAILLM
from neo4j import GraphDatabase

driver   = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j","password"))
embedder = OpenAIEmbeddings(model="text-embedding-3-small")
llm      = OpenAILLM(model_name="gpt-4o", model_params={"temperature": 0})

# ── Multi-hop Cypher Retriever ─────────────────────────────────────────────
# This traverses: Paper → mentions → Gene → ASSOCIATED_WITH → Disease
# and pulls drugs targeting those genes
MULTIHOP_CYPHER = """
MATCH (p:Paper)-[:MENTIONS]->(g:Gene)-[:ASSOCIATED_WITH]->(d:Disease)
WHERE d.name CONTAINS $query_param
WITH g, d, p
OPTIONAL MATCH (g)-[:IN_PATHWAY]->(pw:Pathway)
OPTIONAL MATCH (g)-[:TARGETED_BY]->(dr:Drug)
RETURN
    g.name        AS gene,
    d.name        AS disease,
    collect(DISTINCT pw.name)  AS pathways,
    collect(DISTINCT dr.name)  AS drugs,
    p.title       AS paper,
    p.pmid        AS pmid
ORDER BY gene
LIMIT 20
"""

retriever = VectorCypherRetriever(
    driver=driver,
    index_name="paper_embedding_index",
    embedder=embedder,
    retrieval_query=MULTIHOP_CYPHER,
    result_formatter=lambda r: str(r.data),
)

# ── GraphRAG pipeline ──────────────────────────────────────────────────────
rag = GraphRAG(retriever=retriever, llm=llm)

response = rag.search(
    query_text=(
        "Which genes are associated with Alzheimer's disease through "
        "neuroinflammation pathways and are targeted by approved drugs?"
    ),
    retriever_config={"top_k": 10},
)
print(response.answer)`,

      `from neo4j import GraphDatabase
from openai import OpenAI
import json

driver    = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j","password"))
oai       = OpenAI()

SYSTEM_PROMPT = """You are a biomedical Cypher expert. Given a natural
language question about a biomedical knowledge graph with nodes:
Disease, Gene, Drug, Pathway, Paper, Protein
and relationships:
ASSOCIATED_WITH, TARGETED_BY, IN_PATHWAY, MENTIONS, INTERACTS_WITH
Generate a valid Cypher query to answer the question.
Return ONLY the Cypher query, no explanation."""

def text_to_cypher(question: str) -> str:
    resp = oai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": question},
        ],
        temperature=0,
    )
    return resp.choices[0].message.content.strip()

def run_cypher(cypher: str) -> list:
    with driver.session() as s:
        return [dict(r) for r in s.run(cypher)]

def graph_rag_answer(question: str) -> str:
    # Step 1: Generate Cypher from natural language
    cypher = text_to_cypher(question)
    print("Generated Cypher:\n", cypher)

    # Step 2: Execute against Neo4j
    graph_data = run_cypher(cypher)

    # Step 3: Synthesise answer with LLM
    synthesis = oai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content":
                "You are MEDINEX. Synthesise a clear biomedical answer "
                "from the graph query results provided."},
            {"role": "user", "content":
                f"Question: {question}\n\n"
                f"Graph data: {json.dumps(graph_data, indent=2)}"},
        ],
        temperature=0,
    )
    return synthesis.choices[0].message.content

answer = graph_rag_answer(
    "Which inflammation-pathway genes are linked to Alzheimer's "
    "and have at least one approved drug targeting them?"
)
print(answer)`,
    ],
  },

  10: {
    tabs: ["Full Stack Setup", "Integration Pipeline", "API Server", "Evaluation Suite", "Docker Deploy"],
    code: [
      `# ── MEDINEX Phase 0 — Full Stack Requirements ───────────────────────────
# requirements.txt

# Data ingestion
biopython==1.83
requests==2.31.0
pandas==2.1.4
tqdm==4.66.1

# Biomedical NLP
scispacy==0.5.4
https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_core_sci_lg-0.5.4.tar.gz
transformers==4.40.0
torch==2.2.0

# Knowledge graph
neo4j==5.18.0
py2neo==2021.2.4

# Graph analytics
networkx==3.2.1
python-igraph==0.11.4
pyvis==0.3.2

# Vector search
faiss-cpu==1.8.0
qdrant-client==1.8.0
sentence-transformers==2.7.0

# RAG
llama-index==0.10.35
llama-index-vector-stores-qdrant==0.2.8
langchain==0.1.20
langchain-community==0.0.38
langchain-openai==0.1.7

# Graph RAG
graphrag==0.3.0
neo4j-graphrag==0.3.0

# Evaluation
ragas==0.1.9
trulens-eval==0.28.0

# API
fastapi==0.111.0
uvicorn==0.29.0
pydantic==2.7.0

# Infra
python-dotenv==1.0.1
loguru==0.7.2`,

      `"""
medinex/pipeline.py
Full Phase 0 integration pipeline — runs end-to-end
"""
import asyncio
from loguru import logger
from medinex.ingestion   import fetch_pubmed_batch
from medinex.nlp         import extract_entities_and_relations
from medinex.graph       import build_neo4j_graph
from medinex.analytics   import run_graph_analytics
from medinex.embeddings  import build_vector_index
from medinex.rag         import build_rag_engine

async def run_phase0_pipeline(
    query: str,
    max_papers: int = 1000,
):
    logger.info("── MEDINEX Phase 0 Pipeline ──────────────────────")

    # ── Step 1: Data Ingestion ─────────────────────────────────────────────
    logger.info("Step 1: Fetching PubMed abstracts...")
    papers = await fetch_pubmed_batch(
        query=query, max_results=max_papers
    )
    logger.info(f"  ✓ Fetched {len(papers)} papers")

    # ── Step 2: Biomedical NLP ─────────────────────────────────────────────
    logger.info("Step 2: Running NLP (NER + Relation Extraction)...")
    entities, relations = extract_entities_and_relations(papers)
    logger.info(f"  ✓ {len(entities)} entities, {len(relations)} relations")

    # ── Step 3: Knowledge Graph ────────────────────────────────────────────
    logger.info("Step 3: Building Neo4j knowledge graph...")
    graph_stats = build_neo4j_graph(entities, relations)
    logger.info(f"  ✓ {graph_stats['nodes']} nodes, {graph_stats['edges']} edges")

    # ── Step 4: Graph Analytics ────────────────────────────────────────────
    logger.info("Step 4: Running graph analytics...")
    hub_genes, communities = run_graph_analytics()
    logger.info(f"  ✓ Top hub genes: {hub_genes[:5]}")

    # ── Step 5: Semantic Search Index ─────────────────────────────────────
    logger.info("Step 5: Building FAISS + Qdrant vector indices...")
    index_stats = build_vector_index(papers)
    logger.info(f"  ✓ Indexed {index_stats['count']} vectors @ {index_stats['dim']}d")

    # ── Step 6: RAG Engine ─────────────────────────────────────────────────
    logger.info("Step 6: Initialising RAG engine...")
    rag = build_rag_engine()
    logger.info("  ✓ RAG engine ready")

    logger.info("── Pipeline complete ─────────────────────────────")
    return {"papers": len(papers), "entities": len(entities),
            "relations": len(relations), "rag": rag}

if __name__ == "__main__":
    asyncio.run(run_phase0_pipeline(
        query="Alzheimer's disease neuroinflammation",
        max_papers=500,
    ))`,

      `"""
medinex/api.py — FastAPI server exposing MEDINEX endpoints
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from medinex.rag         import get_rag_engine
from medinex.graph       import query_graph
from medinex.embeddings  import semantic_search
from medinex.analytics   import get_hub_genes, get_communities

app = FastAPI(
    title="MEDINEX Biomedical Intelligence API",
    version="0.1.0",
    description="Phase 0 — RAG + Graph + Semantic Search",
)

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5
    mode: str = "rag"  # "rag" | "graph" | "hybrid" | "semantic"

class QueryResponse(BaseModel):
    answer:   str
    sources:  list[dict]
    metadata: dict

@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    if req.mode == "rag":
        rag = get_rag_engine()
        res = rag.query(req.question)
        return QueryResponse(
            answer=str(res),
            sources=[n.metadata for n in res.source_nodes],
            metadata={"mode": "rag"},
        )
    elif req.mode == "semantic":
        hits = semantic_search(req.question, top_k=req.top_k)
        return QueryResponse(
            answer="Top semantic matches returned.",
            sources=hits,
            metadata={"mode": "semantic"},
        )
    elif req.mode == "graph":
        results = query_graph(req.question)
        return QueryResponse(
            answer=results["synthesis"],
            sources=results["graph_data"],
            metadata={"mode": "graph_rag"},
        )
    raise HTTPException(status_code=400, detail="Unknown mode")

@app.get("/analytics/hubs")
async def hub_genes(top_k: int = 20):
    return {"hub_genes": get_hub_genes(top_k)}

@app.get("/analytics/communities")
async def communities():
    return {"communities": get_communities()}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "MEDINEX Phase 0"}

# Run: uvicorn medinex.api:app --reload --port 8000`,

      `"""
medinex/evaluation.py — RAGAS + BioASQ benchmark suite
"""
from ragas import evaluate
from ragas.metrics import (
    faithfulness, answer_relevancy,
    context_precision, context_recall,
)
from datasets import Dataset
from medinex.rag import get_rag_engine
import json, pandas as pd
from datetime import datetime

# BioASQ-style gold standard (subset)
BIOASQ_GOLD = [
    {
        "question":     "What is the role of APOE4 in Alzheimer's disease?",
        "ground_truth": "APOE4 is the strongest genetic risk factor for late-onset AD, promoting amyloid-beta aggregation and impairing clearance.",
    },
    {
        "question":     "Which pathways are implicated in neuroinflammation?",
        "ground_truth": "NF-κB, TREM2, complement cascade, and microglial activation pathways are central to neuroinflammation.",
    },
    {
        "question":     "What drugs target tau aggregation?",
        "ground_truth": "Methylene blue, TRx0237 (LMTM), and several kinase inhibitors targeting GSK3β and CDK5 have been studied.",
    },
]

def run_evaluation():
    rag = get_rag_engine()

    answers, contexts = [], []
    for item in BIOASQ_GOLD:
        response = rag.query(item["question"])
        answers.append(str(response))
        contexts.append([n.text for n in response.source_nodes])

    dataset = Dataset.from_dict({
        "question":     [i["question"]     for i in BIOASQ_GOLD],
        "ground_truth": [i["ground_truth"] for i in BIOASQ_GOLD],
        "answer":       answers,
        "contexts":     contexts,
    })

    result = evaluate(dataset, metrics=[
        faithfulness, answer_relevancy,
        context_precision, context_recall,
    ])

    df = result.to_pandas()
    report = {
        "timestamp":         datetime.utcnow().isoformat(),
        "faithfulness":      round(df["faithfulness"].mean(), 3),
        "answer_relevancy":  round(df["answer_relevancy"].mean(), 3),
        "context_precision": round(df["context_precision"].mean(), 3),
        "context_recall":    round(df["context_recall"].mean(), 3),
    }
    print(json.dumps(report, indent=2))
    df.to_csv(f"eval_{report['timestamp'][:10]}.csv", index=False)
    return report

if __name__ == "__main__":
    run_evaluation()`,

      `# ── docker-compose.yml — MEDINEX Phase 0 Full Stack ─────────────────────
version: "3.9"

services:

  neo4j:
    image: neo4j:5.18-community
    ports:
      - "7474:7474"   # Neo4j Browser
      - "7687:7687"   # Bolt protocol
    environment:
      NEO4J_AUTH: neo4j/medinex_password
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
    volumes:
      - neo4j_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"   # REST API
      - "6334:6334"   # gRPC
    volumes:
      - qdrant_data:/qdrant/storage

  medinex_api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      NEO4J_URI:      bolt://neo4j:7687
      NEO4J_USER:     neo4j
      NEO4J_PASSWORD: medinex_password
      QDRANT_HOST:    qdrant
      QDRANT_PORT:    6333
      OPENAI_API_KEY: \${OPENAI_API_KEY}
    depends_on:
      - neo4j
      - qdrant
    command: uvicorn medinex.api:app --host 0.0.0.0 --port 8000 --reload

volumes:
  neo4j_data:
  qdrant_data:

# ── Dockerfile ────────────────────────────────────────────────────────────
# FROM python:3.11-slim
# WORKDIR /app
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
# COPY . .
# CMD ["uvicorn", "medinex.api:app", "--host", "0.0.0.0", "--port", "8000"]

# ── Run ──────────────────────────────────────────────────────────────────
# docker-compose up -d
# open http://localhost:8000/docs  → Swagger UI
# open http://localhost:7474       → Neo4j Browser
# open http://localhost:6333/dashboard → Qdrant Dashboard`,
    ],
  },
};

// ─── STEP DATA ───────────────────────────────────────────────────────────────

// ─── STEP TASKS (Steps 7–10) ─────────────────────────────────────────────────

const stepTasks = {
  7: [
    { id: "7-1",  label: "Install FAISS, Qdrant client & Sentence-Transformers", difficulty: "easy",   est: "5 min" },
    { id: "7-2",  label: "Load BiomedBERT embedding model from HuggingFace", difficulty: "easy",   est: "10 min" },
    { id: "7-3",  label: "Generate embeddings for PubMed abstracts in batches", difficulty: "medium", est: "30 min" },
    { id: "7-4",  label: "Build & persist a FAISS HNSW index (768-dim vectors)", difficulty: "medium", est: "20 min" },
    { id: "7-5",  label: "Implement semantic_search() with top-k ANN retrieval", difficulty: "medium", est: "20 min" },
    { id: "7-6",  label: "Create Qdrant collection with metadata payloads", difficulty: "medium", est: "25 min" },
    { id: "7-7",  label: "Add filtered Qdrant search (year range, journal, etc.)", difficulty: "medium", est: "20 min" },
    { id: "7-8",  label: "Build BM25 keyword index with rank_bm25", difficulty: "easy",   est: "15 min" },
    { id: "7-9",  label: "Implement hybrid_search() fusing BM25 + vector scores", difficulty: "hard",   est: "40 min" },
    { id: "7-10", label: "Benchmark retrieval quality: top-5 precision on BioASQ", difficulty: "hard",   est: "1 hr"  },
  ],
  8: [
    { id: "8-1",  label: "Install LlamaIndex, LangChain, DSPy & RAGAS", difficulty: "easy",   est: "5 min"  },
    { id: "8-2",  label: "Configure BiomedBERT as the embedding model in LlamaIndex Settings", difficulty: "easy",   est: "10 min" },
    { id: "8-3",  label: "Load PDF corpus & split into 512-token chunks with overlap", difficulty: "medium", est: "20 min" },
    { id: "8-4",  label: "Build VectorStoreIndex and persist to disk", difficulty: "medium", est: "20 min" },
    { id: "8-5",  label: "Create RetrieverQueryEngine with similarity cutoff postprocessor", difficulty: "medium", est: "25 min" },
    { id: "8-6",  label: "Build LangChain RetrievalQAWithSourcesChain with biomedical prompt", difficulty: "medium", est: "30 min" },
    { id: "8-7",  label: "Implement PubMed live-search tool for LangChain agent", difficulty: "hard",   est: "45 min" },
    { id: "8-8",  label: "Wire up drug target lookup tool (ChEMBL stub → real API)", difficulty: "hard",   est: "1 hr"  },
    { id: "8-9",  label: "Build multi-tool AgentExecutor with MEDINEX system prompt", difficulty: "hard",   est: "1 hr"  },
    { id: "8-10", label: "Run RAGAS evaluation: faithfulness, relevancy, precision, recall", difficulty: "hard",   est: "1 hr"  },
  ],
  9: [
    { id: "9-1",  label: "Install Microsoft GraphRAG & Neo4j GraphRAG Python SDK", difficulty: "easy",   est: "5 min"  },
    { id: "9-2",  label: "Connect Neo4j driver and create vector index on Paper nodes", difficulty: "medium", est: "20 min" },
    { id: "9-3",  label: "Ingest entities/relations: MERGE Disease → Gene → Drug in Neo4j", difficulty: "medium", est: "45 min" },
    { id: "9-4",  label: "Initialise Microsoft GraphRAG project & edit settings.yml", difficulty: "medium", est: "30 min" },
    { id: "9-5",  label: "Run graphrag index pipeline on biomedical text corpus", difficulty: "hard",   est: "2 hr"  },
    { id: "9-6",  label: "Implement VectorCypherRetriever with multi-hop Cypher query", difficulty: "hard",   est: "1 hr"  },
    { id: "9-7",  label: "Wire GraphRAG pipeline: retriever + OpenAI LLM → answer", difficulty: "hard",   est: "45 min" },
    { id: "9-8",  label: "Build text_to_cypher() LLM function with Neo4j schema prompt", difficulty: "hard",   est: "1 hr"  },
    { id: "9-9",  label: "Implement graph_rag_answer(): Cypher → Neo4j → LLM synthesis", difficulty: "hard",   est: "1 hr"  },
    { id: "9-10", label: "Test multi-hop query: genes → inflammation → approved drugs", difficulty: "hard",   est: "30 min" },
  ],
  10: [
    { id: "10-1",  label: "Pin all dependencies in requirements.txt & verify installs", difficulty: "easy",   est: "15 min" },
    { id: "10-2",  label: "Implement fetch_pubmed_batch() async ingestion module", difficulty: "medium", est: "45 min" },
    { id: "10-3",  label: "Implement extract_entities_and_relations() NLP module", difficulty: "hard",   est: "2 hr"  },
    { id: "10-4",  label: "Implement build_neo4j_graph() + run_graph_analytics()", difficulty: "hard",   est: "1.5 hr"},
    { id: "10-5",  label: "Implement build_vector_index() (FAISS + Qdrant)", difficulty: "medium", est: "1 hr"  },
    { id: "10-6",  label: "Implement build_rag_engine() wiring LlamaIndex + LangChain", difficulty: "hard",   est: "1.5 hr"},
    { id: "10-7",  label: "Wire run_phase0_pipeline() end-to-end async orchestrator", difficulty: "hard",   est: "1 hr"  },
    { id: "10-8",  label: "Build FastAPI server with /query, /analytics, /health endpoints", difficulty: "medium", est: "1 hr"  },
    { id: "10-9",  label: "Write RAGAS + BioASQ evaluation suite with CSV export", difficulty: "hard",   est: "1.5 hr"},
    { id: "10-10", label: "Write docker-compose.yml (Neo4j + Qdrant + medinex_api)", difficulty: "medium", est: "45 min" },
    { id: "10-11", label: "Smoke-test full pipeline: PubMed ingest → RAG query end-to-end", difficulty: "hard",   est: "2 hr"  },
    { id: "10-12", label: "Deploy & verify Swagger UI, Neo4j Browser, Qdrant Dashboard", difficulty: "medium", est: "1 hr"  },
  ],
};


const steps = [
  {
    id: 1,
    title: "Biomedical Knowledge Sources",
    subtitle: "Literature Layer",
    color: "#00d4ff",
    icon: "📚",
    description: "Understand where biomedical knowledge comes from before building AI.",
    resources: [
      { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/", type: "website" },
      { name: "PubMed Central (PMC)", url: "https://pmc.ncbi.nlm.nih.gov/", type: "website" },
      { name: "Europe PMC", url: "https://europepmc.org/", type: "website" },
      { name: "Semantic Scholar", url: "https://www.semanticscholar.org/", type: "website" },
    ],
    learn: [
      "Abstracts",
      "Full-text papers",
      "Citations & Reference Lists",
      "MeSH Terms & Controlled Vocabulary",
      "Journal Structure (IMRaD)",
      "Open Access vs Paywalled Content",
      "Preprints (bioRxiv, medRxiv)",
      "Review vs Primary Research",
    ],
    deliverable: "Understand biomedical research literature and data sources.",
    flow: null,
  },
  {
    id: 2,
    title: "Collect Biomedical Data",
    subtitle: "NCBI E-Utilities API",
    color: "#00ffaa",
    icon: "🔌",
    description: "Build automated data collection pipelines using NCBI's E-Utilities API to fetch papers, metadata, and abstracts at scale.",
    resources: [
      { name: "NCBI E-Utilities Docs", url: "https://www.ncbi.nlm.nih.gov/books/NBK25501/", type: "website" },
      { name: "Biopython Entrez", url: "https://biopython.org/docs/latest/api/Bio.Entrez.html", type: "website" },
      { name: "pymed", url: "https://github.com/gijswobben/pymed", type: "github" },
      { name: "requests library", url: "https://github.com/psf/requests", type: "github" },
    ],
    learn: [
      "ESearch — query PubMed for PMIDs",
      "EFetch — retrieve full records",
      "ESummary — fetch metadata",
      "ELink — find related articles",
      "Rate Limiting & API Keys",
      "Parsing XML/JSON responses",
      "Batch fetching large result sets",
      "Abstract Retrieval at scale",
      "Citation Retrieval",
    ],
    deliverable: "PubMed → Python Pipeline → Structured Dataset (JSON/CSV)",
    flow: ["PubMed Query", "ESearch (PMIDs)", "EFetch (Records)", "XML Parsing", "Structured Dataset"],
  },
  {
    id: 3,
    title: "Clinical Data Infrastructure",
    subtitle: "PhysioNet & MIMIC-IV",
    color: "#ff6b6b",
    icon: "🏥",
    description: "Learn how real hospital data is structured and queried — most AI founders skip this critical foundation.",
    resources: [
      { name: "PhysioNet", url: "https://physionet.org/", type: "website" },
      { name: "MIMIC-IV Dataset", url: "https://physionet.org/content/mimiciv/", type: "website" },
      { name: "MIMIC-IV Docs", url: "https://mimic.mit.edu/docs/iv/", type: "website" },
      { name: "MIMIC-Code GitHub", url: "https://github.com/MIT-LCP/mimic-code", type: "github" },
    ],
    learn: [
      "patients — demographics",
      "admissions — hospital stays",
      "diagnoses_icd — ICD-9/ICD-10 codes",
      "procedures_icd — procedure codes",
      "prescriptions — medication orders",
      "labevents — lab results",
      "chartevents — nurse/doctor observations",
      "SQL querying across MIMIC tables",
      "ICD Code Systems (ICD-9 vs ICD-10)",
      "Clinical Data De-identification",
    ],
    deliverable: "Patient → Admission → Diagnosis → Treatment → Outcome pipeline",
    flow: ["Patient Record", "Admission", "Diagnosis (ICD)", "Treatment", "Lab/Chart Events", "Outcome"],
  },
  {
    id: 4,
    title: "Biomedical NLP",
    subtitle: "scispaCy · BioBERT · PubMedBERT",
    color: "#a78bfa",
    icon: "🧠",
    description: "Convert raw biomedical text into structured knowledge using state-of-the-art domain-specific NLP models.",
    resources: [
      { name: "scispaCy", url: "https://github.com/allenai/scispacy", type: "github" },
      { name: "BioBERT", url: "https://github.com/dmis-lab/biobert", type: "github" },
      { name: "PubMedBERT", url: "https://huggingface.co/microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract", type: "huggingface" },
      { name: "BiomedNLP on HuggingFace", url: "https://huggingface.co/microsoft", type: "huggingface" },
      { name: "UMLS Metathesaurus", url: "https://www.nlm.nih.gov/research/umls/", type: "website" },
    ],
    learn: [
      "Named Entity Recognition (NER)",
      "Disease / Drug / Gene Recognition",
      "Chemical & Protein Entity Detection",
      "Relation Extraction",
      "Coreference Resolution",
      "Biomedical QA (BioASQ)",
      "Biomedical Embeddings",
      "Semantic Similarity",
      "Entity Linking to UMLS / MeSH",
      "Fine-tuning BERT on biomedical tasks",
    ],
    deliverable: "Paper → Entities → Relations → Embeddings",
    flow: ["Raw Paper Text", "scispaCy NER", "BioBERT Relations", "PubMedBERT Embeddings", "Structured Knowledge"],
  },
  {
    id: 5,
    title: "Knowledge Graph Engineering",
    subtitle: "Neo4j",
    color: "#fbbf24",
    icon: "🕸️",
    description: "Connect biomedical concepts into a queryable, traversable graph database that powers multi-hop reasoning.",
    resources: [
      { name: "Neo4j Graph Academy", url: "https://graphacademy.neo4j.com/", type: "website" },
      { name: "Neo4j Graph Examples", url: "https://github.com/neo4j-graph-examples", type: "github" },
      { name: "py2neo", url: "https://py2neo.org/", type: "website" },
      { name: "neo4j Python Driver", url: "https://github.com/neo4j/neo4j-python-driver", type: "github" },
    ],
    learn: [
      "Nodes & Properties",
      "Relationships & Directionality",
      "Cypher Query Language",
      "Graph Schema Design",
      "Importing CSV data into Neo4j",
      "MERGE vs CREATE patterns",
      "Indexes & Constraints",
      "Graph Data Modelling",
      "APOC Procedures",
    ],
    deliverable: "Disease ↔ Gene ↔ Drug ↔ Paper knowledge graph in Neo4j",
    flow: ["Extracted Entities", "Node Creation", "Relationship Mapping", "Cypher Indexing", "Queryable Graph"],
    graph: [
      { from: "Disease", rel: "Associated_With", to: "Gene" },
      { from: "Gene", rel: "Targeted_By", to: "Drug" },
      { from: "Drug", rel: "Mentioned_In", to: "Paper" },
    ],
  },
  {
    id: 6,
    title: "Graph Analytics",
    subtitle: "NetworkX · graph-tool · iGraph",
    color: "#34d399",
    icon: "📊",
    description: "Discover hidden patterns, key network hubs, and disease communities across the biomedical knowledge graph using graph algorithms.",
    resources: [
      { name: "NetworkX Docs", url: "https://networkx.org/documentation/stable/", type: "website" },
      { name: "NetworkX GitHub", url: "https://github.com/networkx/networkx", type: "github" },
      { name: "graph-tool", url: "https://graph-tool.skewed.de/", type: "website" },
      { name: "python-igraph", url: "https://igraph.org/python/", type: "website" },
      { name: "pyvis (visualization)", url: "https://github.com/WestHealth/pyvis", type: "github" },
    ],
    learn: [
      "Degree & Betweenness Centrality",
      "PageRank on Biomedical Graphs",
      "Closeness & Eigenvector Centrality",
      "Louvain Community Detection",
      "Girvan–Newman Algorithm",
      "Shortest Path (Dijkstra / BFS)",
      "Link Prediction",
      "Bipartite Graph Projections",
      "Drug Repurposing via Graph Proximity",
      "Hub Gene Identification",
      "Graph Visualization (pyvis / Gephi)",
    ],
    deliverable: "Centrality-ranked disease–gene–drug hub discovery and drug repurposing engine",
    flow: ["Neo4j Graph Export", "NetworkX Load", "Centrality Scoring", "Community Detection", "Drug Repurposing Candidates"],
  },
  {
    id: 7,
    title: "Semantic Search",
    subtitle: "FAISS · Qdrant · Sentence-Transformers",
    color: "#f97316",
    icon: "🔍",
    description: "Build blazing-fast vector search over millions of biomedical abstracts — going beyond keyword matching to true semantic understanding.",
    resources: [
      { name: "FAISS GitHub", url: "https://github.com/facebookresearch/faiss", type: "github" },
      { name: "FAISS Docs", url: "https://faiss.ai/", type: "website" },
      { name: "Qdrant", url: "https://qdrant.tech/", type: "website" },
      { name: "Sentence-Transformers", url: "https://www.sbert.net/", type: "website" },
      { name: "HF: BiomedBERT Embeddings", url: "https://huggingface.co/microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract", type: "huggingface" },
    ],
    learn: [
      "Flat vs IVF vs HNSW Indices",
      "Cosine Similarity vs L2 Distance",
      "Batch Embedding Generation",
      "Index Persistence & Loading",
      "Approximate Nearest Neighbour (ANN)",
      "Hybrid Search (BM25 + Vector)",
      "Qdrant Collections & Payloads",
      "Top-k Retrieval Benchmarking",
      "Embedding Fine-tuning for Biomedical Domain",
      "Re-ranking Retrieved Results",
    ],
    deliverable: "Research Query → BiomedBERT Embedding → FAISS/Qdrant ANN Search → Ranked Relevant Papers",
    flow: ["Research Query", "BiomedBERT Embed", "FAISS / Qdrant Index", "ANN Search", "Top-k Ranked Papers"],
    codeKey: 7,
  },
  {
    id: 8,
    title: "Retrieval-Augmented Generation",
    subtitle: "LlamaIndex · LangChain · DSPy",
    color: "#e879f9",
    icon: "⛓️",
    description: "Build end-to-end RAG pipelines that let an LLM answer biomedical questions grounded in your indexed literature and clinical data — with citations and reduced hallucination.",
    resources: [
      { name: "LlamaIndex GitHub", url: "https://github.com/run-llama/llama_index", type: "github" },
      { name: "LlamaIndex Docs", url: "https://docs.llamaindex.ai/", type: "website" },
      { name: "LangChain GitHub", url: "https://github.com/langchain-ai/langchain", type: "github" },
      { name: "LangChain Docs", url: "https://python.langchain.com/docs/", type: "website" },
      { name: "DSPy GitHub", url: "https://github.com/stanfordnlp/dspy", type: "github" },
    ],
    learn: [
      "Document Loaders & Chunking Strategies",
      "VectorStoreIndex (LlamaIndex)",
      "RetrieverQueryEngine",
      "RetrievalQA Chain (LangChain)",
      "Prompt Templates & Context Injection",
      "Agents & Tool Calling",
      "HyDE (Hypothetical Document Embeddings)",
      "Re-ranking with Cross-Encoders",
      "RAG Evaluation: RAGAS & TruLens",
      "DSPy Signatures & Optimizers",
      "Streaming Responses",
      "Citation-Aware Answer Generation",
    ],
    deliverable: "Biomedical Research Assistant v1 — grounded, citation-aware, hallucination-reduced",
    flow: ["User Query", "Retriever (FAISS/Qdrant)", "Top-k Chunks", "Prompt + Context", "LLM Generation", "Answer + Citations"],
    codeKey: 8,
  },
  {
    id: 9,
    title: "Graph RAG",
    subtitle: "Microsoft GraphRAG · Neo4j GraphRAG",
    color: "#38bdf8",
    icon: "🧬",
    description: "Go beyond flat vector search — enable multi-hop reasoning across the entire biomedical knowledge graph with structured LLM traversal.",
    resources: [
      { name: "Microsoft GraphRAG", url: "https://github.com/microsoft/graphrag", type: "github" },
      { name: "GraphRAG Docs", url: "https://microsoft.github.io/graphrag/", type: "website" },
      { name: "Neo4j GraphRAG Python", url: "https://github.com/neo4j/neo4j-graphrag-python", type: "github" },
      { name: "LlamaIndex KG Index", url: "https://docs.llamaindex.ai/en/stable/examples/index_structs/knowledge_graph/KnowledgeGraphIndex_vs_VectorStoreIndex_vs_CustomIndex_combined.html", type: "website" },
    ],
    learn: [
      "Local vs Global GraphRAG Search Modes",
      "Community Summaries as LLM Context",
      "Entity & Relationship Extraction Pipeline",
      "Cypher-Augmented LLM Generation",
      "Multi-hop Traversal Chains",
      "Graph Community Reports",
      "Hybrid: Vector + Graph Retrieval",
      "Knowledge Graph QA",
      "GraphRAG Evaluation & Benchmarking",
    ],
    deliverable: '"Which genes are associated with Alzheimer\'s through inflammation pathways and are targeted by approved drugs?"',
    flow: ["Natural Language Query", "Entity Extraction", "Graph Traversal (Neo4j Cypher)", "Community Summary", "LLM Synthesis", "Multi-hop Answer"],
    graph: [
      { from: "NL Query", rel: "extracts_entities", to: "Alzheimer's · Inflammation" },
      { from: "Alzheimer's", rel: "Associated_With", to: "Gene (APOE, TREM2)" },
      { from: "Gene", rel: "in_Pathway", to: "Inflammation Pathway" },
      { from: "Gene", rel: "Targeted_By", to: "Approved Drug" },
    ],
    codeKey: 9,
  },
  {
    id: 10,
    title: "Medinex Phase 0 Final System",
    subtitle: "Biomedical Intelligence Platform",
    color: "#ff4ecd",
    icon: "🚀",
    description: "The complete integrated stack — from raw PubMed literature and MIMIC-IV clinical records to a production-grade AI biomedical intelligence engine.",
    resources: [
      { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/", type: "website" },
      { name: "MIMIC-IV", url: "https://physionet.org/content/mimiciv/", type: "website" },
      { name: "PhysioNet", url: "https://physionet.org/", type: "website" },
      { name: "Hugging Face Hub", url: "https://huggingface.co/", type: "huggingface" },
    ],
    learn: [
      "Ingest & parse PubMed / PMC literature at scale",
      "Structure MIMIC-IV clinical records (patients, labs, diagnoses, procedures)",
      "Extract biomedical entities with scispaCy & BioBERT",
      "Build & query a Neo4j knowledge graph (Disease ↔ Gene ↔ Drug ↔ Paper)",
      "Run graph analytics for hub discovery & drug repurposing",
      "Power semantic search with FAISS / Qdrant + BiomedBERT",
      "Deploy a RAG research assistant (LlamaIndex + LangChain)",
      "Enable multi-hop reasoning via Microsoft GraphRAG",
      "Evaluate outputs with RAGAS, TruLens & BioASQ benchmarks",
    ],
    deliverable: "MEDINEX — Biomedical Intelligence Platform (Phase 0 Complete)",
    flow: ["PubMed · PMC · PhysioNet · MIMIC-IV", "NCBI APIs", "scispaCy · BioBERT · PubMedBERT", "Neo4j Knowledge Graph", "NetworkX Analytics", "FAISS · Qdrant", "LlamaIndex · LangChain", "Microsoft GraphRAG", "MEDINEX"],
    isFinal: true,
    codeKey: 10,
  },
  {
    id: 11,
    phase: 1,
    title: "Bioinformatics Pipeline",
    subtitle: "Multi-Omics & Genomics",
    color: "#a78bfa",
    icon: "🧬",
    description: "Build robust bioinformatics pipelines for analysing large-scale multi-omics data.",
    resources: [],
    learn: ["Sequence Analysis", "Variant Calling", "Transcriptomics"],
    deliverable: "Automated Bioinformatics Pipeline",
    flow: ["Raw Data", "Pipeline", "Annotated Variants"],
  },
  {
    id: 12,
    phase: 1,
    title: "Genomics",
    subtitle: "Variant Analysis",
    color: "#a78bfa",
    icon: "🔬",
    description: "Analyse genomic variants and their implications in diseases.",
    resources: [],
    learn: ["GWAS", "Variant Effect Prediction", "Population Genetics"],
    deliverable: "Genomic Variant Database",
    flow: null,
  },
  {
    id: 13,
    phase: 1,
    title: "Proteomics",
    subtitle: "Protein Structures",
    color: "#a78bfa",
    icon: "🧪",
    description: "Integrate protein structure and interaction data into the knowledge graph.",
    resources: [],
    learn: ["AlphaFold", "Protein-Protein Interactions", "Mass Spectrometry"],
    deliverable: "Proteomics Data Layer",
    flow: null,
  },
  {
    id: 21,
    phase: 2,
    title: "Workspace Data Model",
    subtitle: "PostgreSQL Schema",
    color: "#34d399",
    icon: "🗄️",
    description: "Database foundation for projects, collections, notes, folders, and saved papers. Ensuring everything is user-scoped and project-scoped for seamless collaboration.",
    resources: [],
    learn: ["PostgreSQL", "Data Modeling", "Collaboration Schema"],
    deliverable: "Robust Database Architecture",
    flow: ["Schema Design", "Migrations", "Database Provisioning"],
  },
  {
    id: 22,
    phase: 2,
    title: "CRUD API Layer",
    subtitle: "FastAPI Endpoints",
    color: "#34d399",
    icon: "⚡",
    description: "Building the REST API layer for saving papers, creating collections, and managing notes within isolated workspaces.",
    resources: [],
    learn: ["FastAPI", "JWT Auth", "RESTful Design"],
    deliverable: "Workspace API Endpoints",
    flow: ["Endpoints", "Validation", "Auth Middleware"],
  },
  {
    id: 23,
    phase: 2,
    title: "Literature Tracker",
    subtitle: "React Table UI",
    color: "#34d399",
    icon: "📊",
    description: "Interactive data tables for researchers to track reading status, tags, and AI-generated summaries of their saved literature.",
    resources: [],
    learn: ["React Table", "State Management", "UI Design"],
    deliverable: "Literature Tracking Interface",
    flow: ["Table Component", "Filtering/Sorting", "API Integration"],
  },
  {
    id: 24,
    phase: 2,
    title: "Next.js Frontend",
    subtitle: "Workspace Integration",
    color: "#34d399",
    icon: "🖥️",
    description: "Comprehensive frontend workspace with a project sidebar, rich-text note editor, and 'Save to Project' integrations from the Disease Explorer.",
    resources: [],
    learn: ["Next.js/Vite", "React Quill", "Component Architecture"],
    deliverable: "Fully Integrated Workspace UI",
    flow: ["Sidebar", "Note Editor", "Explorer Hooks"],
  },
  {
    id: 25,
    phase: 2,
    title: "AI Literature Review",
    subtitle: "GraphRAG Pipeline",
    color: "#34d399",
    icon: "🧠",
    description: "Connecting the workspace collections to LlamaIndex to synthesize comprehensive literature reviews and generate dynamic citation networks.",
    resources: [],
    learn: ["GraphRAG", "LLM Synthesis", "Citation Mapping"],
    deliverable: "Automated AI Review Generator",
    flow: ["Knowledge Graph", "Prompt Engineering", "Review Draft UI"],
  },
  {
    id: 26,
    phase: 2,
    title: "Research Maps",
    subtitle: "Topic Map Visualization",
    color: "#34d399",
    icon: "🗺️",
    description: "Clustering high-dimensional PubMedBERT embeddings to create interactive 2D thematic maps of a researcher's saved literature.",
    resources: [],
    learn: ["KMeans Clustering", "Dimensionality Reduction", "Recharts"],
    deliverable: "Interactive Topic Maps",
    flow: ["Embeddings", "Clustering", "Scatter Plot UI"],
  },
  {
    id: 27,
    phase: 2,
    title: "Collaboration Layer",
    subtitle: "Team Features",
    color: "#34d399",
    icon: "👥",
    description: "Enabling teamwork through teammate invitations, task assignment dropdowns, inline note comments, and a chronological activity feed.",
    resources: [],
    learn: ["Real-time UI", "Activity Feeds", "Role Management"],
    deliverable: "Multi-user Project Support",
    flow: ["Invites", "Activity Feed", "Comments Sidebar"],
  },
  {
    id: 28,
    phase: 2,
    title: "Final Integration",
    subtitle: "Deployment",
    color: "#34d399",
    icon: "🚀",
    description: "End-to-end integration of the workspace frontend and FastAPI backend, preparing the system for scalable deployment.",
    resources: [],
    learn: ["Docker", "Vercel", "CI/CD"],
    deliverable: "Production-ready Workspace",
    flow: ["Build", "Test", "Deploy"],
    isFinal: true,
  }
];

// ─── BADGE STYLES ─────────────────────────────────────────────────────────────

const badgeStyle = {
  github:      { bg: "#1a1a2e", color: "#58a6ff",  label: "GitHub" },
  website:     { bg: "#0d1117", color: "#00d4ff",  label: "Website" },
  huggingface: { bg: "#1a1a00", color: "#fbbf24",  label: "🤗 HuggingFace" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
    : "0,212,255";
}

// ─── CODE PANEL COMPONENT ────────────────────────────────────────────────────

function CodePanel({ codeKey, stepColor }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied]       = useState(false);
  const data = codeSnippets[codeKey];
  if (!data) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.code[activeTab]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        marginTop: "20px",
        border: `1px solid ${stepColor}25`,
        borderRadius: "12px",
        overflow: "hidden",
        background: "#020817",
      }}
    >
      {/* Tab bar */}
      <div style={{
        display: "flex", overflowX: "auto", gap: "0",
        borderBottom: `1px solid ${stepColor}20`,
        background: "rgba(15,23,42,0.9)",
      }}>
        {data.tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={(e) => { e.stopPropagation(); setActiveTab(i); }}
            style={{
              padding: "9px 16px",
              fontSize: "11px",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
              cursor: "pointer",
              border: "none",
              borderBottom: activeTab === i ? `2px solid ${stepColor}` : "2px solid transparent",
              background: activeTab === i ? `rgba(${hexToRgb(stepColor)},0.08)` : "transparent",
              color: activeTab === i ? stepColor : "#475569",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {tab}
          </button>
        ))}
        {/* Copy button */}
        <button
          onClick={handleCopy}
          style={{
            marginLeft: "auto",
            padding: "9px 16px",
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
            cursor: "pointer",
            border: "none",
            borderBottom: "2px solid transparent",
            background: "transparent",
            color: copied ? "#34d399" : "#334155",
            transition: "color 0.15s",
            flexShrink: 0,
          }}
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>

      {/* Code block */}
      <pre style={{
        margin: 0,
        padding: "20px",
        fontSize: "11.5px",
        lineHeight: 1.7,
        color: "#94a3b8",
        fontFamily: "'DM Mono', 'Fira Code', monospace",
        overflowX: "auto",
        maxHeight: "460px",
        overflowY: "auto",
        background: "transparent",
        whiteSpace: "pre",
      }}>
        <code>{data.code[activeTab]}</code>
      </pre>
    </div>
  );
}

// ─── DIFFICULTY BADGE ─────────────────────────────────────────────────────────

const difficultyStyle = {
  easy:   { color: "#34d399", bg: "rgba(52,211,153,0.1)",  label: "EASY"   },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  label: "MED"    },
  hard:   { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "HARD"   },
};

// ─── TASK PANEL COMPONENT ────────────────────────────────────────────────────

function TaskPanel({ stepId, stepColor, completedTasks, toggleTask }) {
  const tasks = stepTasks[stepId];
  if (!tasks) return null;

  const done  = tasks.filter(t => completedTasks.has(t.id)).length;
  const total = tasks.length;
  const pct   = Math.round((done / total) * 100);

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        marginTop: "20px",
        border: `1px solid ${stepColor}25`,
        borderRadius: "12px",
        overflow: "hidden",
        background: "#020817",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: `1px solid ${stepColor}18`,
        background: "rgba(15,23,42,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", letterSpacing: "3px", color: stepColor }}>TASKS</span>
          <span style={{
            fontSize: "10px",
            padding: "2px 8px",
            background: `rgba(${hexToRgb(stepColor)},0.12)`,
            border: `1px solid ${stepColor}30`,
            borderRadius: "4px",
            color: stepColor,
          }}>{done}/{total}</span>
        </div>
        {/* Mini progress bar */}
        <div style={{ flex: 1, maxWidth: "160px", height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: stepColor,
            borderRadius: "2px",
            transition: "width 0.4s ease",
          }} />
        </div>
        <span style={{ fontSize: "10px", color: pct === 100 ? stepColor : "#475569", fontWeight: pct === 100 ? 700 : 400 }}>
          {pct === 100 ? "✓ COMPLETE" : `${pct}%`}
        </span>
      </div>

      {/* Task list */}
      <div style={{ padding: "8px 0" }}>
        {tasks.map((task, idx) => {
          const isDone = completedTasks.has(task.id);
          const diff   = difficultyStyle[task.difficulty];
          return (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 20px",
                cursor: "pointer",
                background: isDone ? `rgba(${hexToRgb(stepColor)},0.04)` : "transparent",
                borderBottom: idx < tasks.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                transition: "background 0.15s",
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: "18px", height: "18px",
                borderRadius: "5px",
                flexShrink: 0,
                background: isDone ? stepColor : "rgba(255,255,255,0.04)",
                border: `1px solid ${isDone ? stepColor : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", color: isDone ? "#000" : "transparent",
                transition: "all 0.15s",
                fontWeight: 700,
              }}>✓</div>

              {/* Task number */}
              <span style={{ fontSize: "9px", color: "#334155", minWidth: "20px", flexShrink: 0 }}>
                {String(idx + 1).padStart(2, "0")}
              </span>

              {/* Label */}
              <span style={{
                flex: 1,
                fontSize: "12px",
                color: isDone ? "#475569" : "#94a3b8",
                textDecoration: isDone ? "line-through" : "none",
                lineHeight: 1.4,
                transition: "color 0.15s",
              }}>
                {task.label}
              </span>

              {/* Badges */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                <span style={{
                  fontSize: "9px", padding: "2px 6px",
                  background: diff.bg,
                  border: `1px solid ${diff.color}25`,
                  borderRadius: "4px",
                  color: diff.color,
                  letterSpacing: "1px",
                }}>
                  {diff.label}
                </span>
                <span style={{
                  fontSize: "9px", padding: "2px 6px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "4px",
                  color: "#334155",
                  whiteSpace: "nowrap",
                }}>
                  {task.est}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function MedinexDashboard() {
  const defaultSteps = new Set([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    21, 22, 23, 24, 25, 26, 27
  ]);
  const defaultTasks = new Set([
    "7-1", "7-2", "7-3", "7-4", "7-5", "7-6", "7-7", "7-8", "7-9", "7-10",
    "8-1", "8-2", "8-3", "8-4", "8-5", "8-6", "8-7", "8-8", "8-9", "8-10",
    "9-1", "9-2", "9-3", "9-4", "9-5", "9-6", "9-7", "9-8", "9-9", "9-10",
    "10-1", "10-2", "10-3", "10-4", "10-5", "10-6", "10-7", "10-8", "10-9", "10-10", "10-11", "10-12"
  ]);
  const [activeStep, setActiveStep]         = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState(defaultSteps);
  const [completedTasks, setCompletedTasks] = useState(defaultTasks);
  const [activeTab, setActiveTabState]      = useState("tasks"); // "tasks" | "code"
  const [activePhaseTab, setActivePhaseTab] = useState(2); // Default to Phase 2 where our current work is

  const toggleComplete = (id, e) => {
    e.stopPropagation();
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTask = (taskId) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  // Total tasks progress across steps 7-10
  const allTasks      = [7, 8, 9, 10].flatMap(k => stepTasks[k] || []);
  const doneTaskCount = allTasks.filter(t => completedTasks.has(t.id)).length;
  const totalTasks    = allTasks.length;

  const stepProgress  = (completedSteps.size / steps.length) * 100;
  const taskProgress  = totalTasks > 0 ? (doneTaskCount / totalTasks) * 100 : 0;

  return (
    <Layout>
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      color: "#e2e8f0",
      fontFamily: "'DM Mono', 'Fira Code', monospace",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Animated grid background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        zIndex: 0,
      }} />

      {/* Glowing orbs */}
      <div style={{ position: "fixed", top: "-200px", left: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-200px", right: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,78,205,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "6px", color: activePhaseTab === 0 ? "#00d4ff" : activePhaseTab === 1 ? "#a78bfa" : activePhaseTab === 2 ? "#34d399" : "#fbbf24", textTransform: "uppercase", marginBottom: "16px", opacity: 0.8 }}>
            {activePhaseTab === 0 ? "PHASE 0 · BIOMEDICAL INTELLIGENCE" : activePhaseTab === 1 ? "PHASE 1 · MULTI-OMICS & GENOMICS" : activePhaseTab === 2 ? "PHASE 2 · IMAGING & DRUG DISCOVERY" : "PHASE 3 · REGULATORY & DEPLOYMENT"}
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontFamily: "'Space Grotesk', 'DM Mono', sans-serif",
            fontWeight: 800,
            letterSpacing: "-2px",
            margin: 0,
            background: "linear-gradient(135deg, #ffffff 0%, #00d4ff 40%, #ff4ecd 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.1,
          }}>
            MEDINEX
          </h1>
          <p style={{ color: "#64748b", fontSize: "15px", marginTop: "12px", letterSpacing: "1px" }}>
            Build the first true Biomedical Intelligence Layer
          </p>

          {/* Progress bars */}
          <div style={{ marginTop: "32px", maxWidth: "500px", margin: "32px auto 0", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px", color: "#475569" }}>
                <span>STEPS COMPLETED</span>
                <span style={{ color: "#00d4ff" }}>{completedSteps.size}/{steps.length}</span>
              </div>
              <div style={{ height: "4px", background: "#0f172a", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${stepProgress}%`, background: "linear-gradient(90deg, #00d4ff, #ff4ecd)", borderRadius: "2px", transition: "width 0.5s ease" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px", color: "#475569" }}>
                <span>IMPLEMENTATION TASKS (Steps 7–10)</span>
                <span style={{ color: "#f97316" }}>{doneTaskCount}/{totalTasks}</span>
              </div>
              <div style={{ height: "4px", background: "#0f172a", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${taskProgress}%`, background: "linear-gradient(90deg, #f97316, #ff4ecd)", borderRadius: "2px", transition: "width 0.5s ease" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Architecture flow */}
        <div style={{
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(0,212,255,0.15)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "48px",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#475569", marginBottom: "20px" }}>SYSTEM ARCHITECTURE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {["PubMed", "PMC", "PhysioNet", "MIMIC-IV", "NCBI APIs", "scispaCy", "BioBERT", "PubMedBERT", "Neo4j", "NetworkX", "FAISS", "Qdrant", "LlamaIndex", "LangChain", "GraphRAG"].map((item, i, arr) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  padding: "6px 12px",
                  background: "rgba(0,212,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                }}>
                  {item}
                </div>
                {i < arr.length - 1 && <span style={{ color: "#1e3a4a", fontSize: "16px" }}>→</span>}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#1e3a4a", fontSize: "16px" }}>→</span>
              <div style={{
                padding: "6px 14px",
                background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(255,78,205,0.15))",
                border: "1px solid rgba(255,78,205,0.4)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#ff4ecd",
                fontWeight: 700,
                letterSpacing: "1px",
              }}>
                MEDINEX
              </div>
            </div>
          </div>
        </div>

        {/* Steps grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px", marginBottom: "48px" }}>
          {steps.filter(s => (s.phase || 0) === activePhaseTab).map((s, idx) => {
            const i = steps.findIndex(st => st.id === s.id);
            const isComplete  = completedSteps.has(s.id);
            const isActive    = activeStep === i;
            const hasTasks    = !!stepTasks[s.id];
            const tasksDone   = hasTasks ? (stepTasks[s.id] || []).filter(t => completedTasks.has(t.id)).length : 0;
            const tasksTotal  = hasTasks ? (stepTasks[s.id] || []).length : 0;
            const tasksPct    = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

            return (
              <div
                key={s.id}
                onClick={() => setActiveStep(isActive ? null : i)}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, rgba(${hexToRgb(s.color)},0.12), rgba(${hexToRgb(s.color)},0.04))`
                    : "rgba(15,23,42,0.7)",
                  border: `1px solid ${isActive ? s.color + "60" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "16px",
                  padding: "24px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(10px)",
                  position: "relative",
                  overflow: "hidden",
                  gridColumn: s.isFinal ? "1 / -1" : undefined,
                }}
              >
                {/* Completion top-bar */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: isComplete ? s.color : "transparent", transition: "background 0.3s" }} />

                {/* Task progress bar (steps 7-10) */}
                {hasTasks && tasksDone > 0 && (
                  <div style={{ position: "absolute", top: "2px", left: 0, right: 0, height: "2px", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ height: "100%", width: `${tasksPct}%`, background: s.color + "80", transition: "width 0.4s" }} />
                  </div>
                )}

                {/* Card header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "10px",
                      background: `rgba(${hexToRgb(s.color)},0.15)`,
                      border: `1px solid ${s.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px",
                    }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: s.color, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "2px" }}>
                        STEP {s.id}
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>{s.title}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleComplete(s.id, e)}
                    style={{
                      width: "28px", height: "28px", borderRadius: "8px",
                      background: isComplete ? s.color : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isComplete ? s.color : "rgba(255,255,255,0.1)"}`,
                      color: isComplete ? "#000" : "#475569",
                      fontSize: "14px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </button>
                </div>

                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "16px", lineHeight: 1.5 }}>
                  {s.subtitle}
                </div>

                <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                  {s.description}
                </p>

                {/* Task mini-summary for steps 7-10 (collapsed) */}
                {hasTasks && !isActive && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 12px",
                    background: `rgba(${hexToRgb(s.color)},0.05)`,
                    border: `1px solid ${s.color}20`,
                    borderRadius: "8px",
                    marginBottom: "12px",
                  }}>
                    <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${tasksPct}%`, background: s.color, borderRadius: "2px", transition: "width 0.4s" }} />
                    </div>
                    <span style={{ fontSize: "10px", color: tasksDone === tasksTotal && tasksTotal > 0 ? s.color : "#475569", whiteSpace: "nowrap" }}>
                      {tasksDone}/{tasksTotal} tasks
                    </span>
                  </div>
                )}

                {/* Resources */}
                {s.resources.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                    {s.resources.map(r => {
                      const badge = badgeStyle[r.type] || badgeStyle.website;
                      return (
                        <a
                          key={r.name}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            display: "flex", alignItems: "center", gap: "4px",
                            padding: "4px 10px",
                            background: badge.bg,
                            border: `1px solid ${badge.color}30`,
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: badge.color,
                            textDecoration: "none",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: "9px", opacity: 0.6 }}>{badge.label}</span>
                          <span>{r.name}</span>
                          <span style={{ opacity: 0.4 }}>↗</span>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Expandable detail */}
                {isActive && (
                  <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px", animation: "fadeIn 0.2s ease" }}>

                    {/* Graph schema */}
                    {s.graph && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#475569", marginBottom: "10px" }}>GRAPH SCHEMA</div>
                        {s.graph.map(g => (
                          <div key={g.rel} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "12px" }}>
                            <span style={{ color: "#e2e8f0", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px" }}>{g.from}</span>
                            <span style={{ color: "#475569", fontSize: "10px" }}>─── {g.rel} ───▶</span>
                            <span style={{ color: "#e2e8f0", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px" }}>{g.to}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Learn */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#475569", marginBottom: "10px" }}>LEARN</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {s.learn.map(l => (
                          <span key={l} style={{
                            padding: "3px 10px",
                            background: `rgba(${hexToRgb(s.color)},0.08)`,
                            border: `1px solid ${s.color}20`,
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: "#94a3b8",
                          }}>
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Pipeline flow */}
                    {s.flow && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#475569", marginBottom: "10px" }}>PIPELINE</div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                          {s.flow.map((f, idx) => (
                            <div key={f} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{
                                padding: "3px 10px",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "4px",
                                fontSize: "11px",
                                color: "#cbd5e1",
                              }}>{f}</span>
                              {idx < s.flow.length - 1 && <span style={{ color: "#1e3a4a" }}>↓</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deliverable */}
                    <div style={{
                      padding: "12px 16px",
                      background: `rgba(${hexToRgb(s.color)},0.06)`,
                      border: `1px solid ${s.color}25`,
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: s.color,
                      marginBottom: hasTasks ? "0" : "0",
                    }}>
                      <span style={{ opacity: 0.6, marginRight: "8px", fontSize: "10px", letterSpacing: "2px" }}>DELIVERABLE</span>
                      {s.deliverable}
                    </div>

                    {/* ── TASKS + CODE PANEL (Steps 7–10) ── */}
                    {hasTasks && (
                      <div>
                        {/* Tab switcher */}
                        <div style={{
                          display: "flex", gap: "0", marginTop: "20px",
                          border: `1px solid ${s.color}20`,
                          borderRadius: "10px 10px 0 0",
                          overflow: "hidden",
                          background: "rgba(15,23,42,0.9)",
                        }}>
                          {["tasks", "code"].map(tab => (
                            <button
                              key={tab}
                              onClick={e => { e.stopPropagation(); setActiveTabState(tab); }}
                              style={{
                                flex: 1, padding: "10px",
                                fontSize: "11px", letterSpacing: "2px",
                                textTransform: "uppercase",
                                cursor: "pointer", border: "none",
                                background: activeTab === tab ? `rgba(${hexToRgb(s.color)},0.12)` : "transparent",
                                color: activeTab === tab ? s.color : "#475569",
                                borderBottom: activeTab === tab ? `2px solid ${s.color}` : "2px solid transparent",
                                transition: "all 0.15s",
                              }}
                            >
                              {tab === "tasks" ? `✦ Tasks (${stepTasks[s.id].length})` : "⟨/⟩ Code"}
                            </button>
                          ))}
                        </div>

                        {activeTab === "tasks" ? (
                          <TaskPanel
                            stepId={s.id}
                            stepColor={s.color}
                            completedTasks={completedTasks}
                            toggleTask={toggleTask}
                          />
                        ) : (
                          <CodePanel codeKey={s.codeKey} stepColor={s.color} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!isActive && (
                  <div style={{ marginTop: "12px", fontSize: "10px", color: "#334155", letterSpacing: "1px" }}>
                    {hasTasks ? "CLICK TO EXPAND · TASKS + CODE ↓" : s.codeKey ? "CLICK TO EXPAND · CODE INCLUDED ↓" : "CLICK TO EXPAND ↓"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Phase Roadmap */}
        <div style={{
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(255,78,205,0.15)",
          borderRadius: "16px",
          padding: "32px",
          backdropFilter: "blur(10px)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#475569", marginBottom: "16px" }}>PHASE ROADMAP</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px", alignItems: "center" }}>
            {[
              { label: "Phase 0", sub: "Biomedical Intelligence Layer", color: "#00d4ff", active: true },
              { label: "Phase 1", sub: "Multi-Omics & Genomics", color: "#a78bfa", active: true },
              { label: "Phase 2", sub: "Imaging & Drug Discovery", color: "#34d399", active: true },
              { label: "Phase 3", sub: "Regulatory & Deployment", color: "#fbbf24" },
            ].map((p, i) => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div 
                  onClick={() => setActivePhaseTab(i)}
                  style={{
                  padding: "10px 20px",
                  background: p.active || activePhaseTab === i ? `rgba(${hexToRgb(p.color)},0.15)` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${p.active || activePhaseTab === i ? p.color + "50" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "10px",
                  textAlign: "left",
                  opacity: p.active ? 1 : 0.4,
                  cursor: "pointer",
                  boxShadow: activePhaseTab === i ? `0 0 15px ${p.color}40` : "none",
                  transform: activePhaseTab === i ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.2s ease"
                }}>
                  <div style={{ fontSize: "11px", color: p.color, fontWeight: 700, marginBottom: "2px" }}>{p.label}</div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{p.sub}</div>
                </div>
                {i < 3 && <span style={{ color: "#1e3a4a", fontSize: "20px" }}>→</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "24px", fontSize: "11px", color: "#334155", letterSpacing: "1px" }}>
            Phase 1 & 2 are now unlocked. Complete all Phase 2 steps to unlock Phase 3.
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
    </Layout>
  );
}
