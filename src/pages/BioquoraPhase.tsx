import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Play, Activity, Beaker, Map, Database, Search, Cpu, Globe, Share2, Layers } from 'lucide-react';
import './Phase4.css';

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0,0,0";
}

const codeSnippets: Record<number, { tabs: string[]; code: string[] }> = {
  11: {
    tabs: ["ML Inference Engine"],
    code: [
      `from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter()

class HealthInput(BaseModel):
    age: float
    blood_pressure: float
    cholesterol: float

@router.post("/predict/cardiovascular")
def predict_cvd(data: HealthInput):
    risk_score = (data.age * 0.1) + (data.blood_pressure * 0.2) + (data.cholesterol * 0.15)
    return {"risk_probability": round(min(risk_score / 100, 1.0), 4)}`
    ]
  },
  21: {
    tabs: ["Pathway Modal UI"],
    code: [
      `import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"

export function PathwayModal({ isOpen, onClose, pathwayId }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-950 text-slate-200">
        <DialogHeader>Clinical Pathway Explorer</DialogHeader>
        <div className="overflow-y-auto max-h-[70vh]">
          {/* Rich interactive pathway visualization */}
        </div>
      </DialogContent>
    </Dialog>
  )
}`
    ]
  },
  6: {
    tabs: ["PubMed E-utilities", "Neo4j Ingestion"],
    code: [
      `from Bio import Entrez
import time

Entrez.email = "research@bioquora.ai"

def fetch_pubmed_abstracts(query, max_results=100):
    handle = Entrez.esearch(db="pubmed", term=query, retmax=max_results)
    record = Entrez.read(handle)
    handle.close()
    
    id_list = record["IdList"]
    abstracts = []
    
    for pmid in id_list:
        handle = Entrez.efetch(db="pubmed", id=pmid, retmode="xml")
        records = Entrez.read(handle)
        handle.close()
        try:
            abstract = records['PubmedArticle'][0]['MedlineCitation']['Article']['Abstract']['AbstractText'][0]
            abstracts.append({"pmid": pmid, "text": str(abstract)})
        except KeyError:
            continue
        time.sleep(0.34) # Rate limit
    
    return abstracts`,
      `from neo4j import GraphDatabase

class Neo4jIngestor:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def merge_paper(self, pmid, title, abstract):
        query = """
        MERGE (p:Paper {pmid: $pmid})
        SET p.title = $title, p.abstract = $abstract
        RETURN p
        """
        with self.driver.session() as session:
            session.run(query, pmid=pmid, title=title, abstract=abstract)
`
    ]
  },
  7: {
    tabs: ["Qdrant Semantic Search", "Hybrid Retrieval"],
    code: [
      `from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
import uuid

client = QdrantClient(":memory:")
model = SentenceTransformer("microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract")

client.create_collection(
    collection_name="biomedical_papers",
    vectors_config=VectorParams(size=768, distance=Distance.COSINE),
)

def index_paper(text, metadata):
    vector = model.encode([text])[0].tolist()
    client.upsert(
        collection_name="biomedical_papers",
        points=[PointStruct(id=str(uuid.uuid4()), vector=vector, payload=metadata)]
    )`,
      `# Hybrid Search with RRF Fusion
async def retrieve(query: str, top_k=50):
  dense = await qdrant.search(embed(query), top=top_k)
  sparse = bm25_index.search(query, top=top_k)
  return reciprocal_rank_fusion(dense, sparse, k=60)`
    ]
  },
  41: {
    tabs: ["Entity Extraction", "Intent Classification"],
    code: [
      `from transformers import pipeline

ner_pipeline = pipeline("ner", model="d4data/biomedical-ner-all")

text = "Patient presents with severe hypertension and was prescribed Lisinopril."
entities = ner_pipeline(text)

for ent in entities:
    print(f"{ent['word']}: {ent['entity_group']} ({ent['score']:.2f})")`,
      `from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

model_id = "microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForSequenceClassification.from_pretrained(model_id, num_labels=5)

query = "What is the mechanism of action of Aspirin in cardiovascular disease?"
inputs = tokenizer(query, return_tensors="pt")
outputs = model(**inputs)
intent = torch.argmax(outputs.logits).item()
print(f"Detected Intent Class: {intent}")`
    ],
  },
  42: {
    tabs: ["Qdrant Search", "Hybrid BM25+Vector"],
    code: [
      `from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from sentence_transformers import SentenceTransformer

client = QdrantClient(":memory:")
model = SentenceTransformer("microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract")

# Searching Qdrant
query = "novel treatments for alzheimer's"
q_vec = model.encode(query).tolist()

hits = client.search(
    collection_name="biomedical_papers",
    query_vector=q_vec,
    limit=5
)
for h in hits:
    print(h.payload["pmid"], h.score)`,
      `# Hybrid Search with RRF Fusion
async def retrieve(query: str, top_k=50):
  dense = await qdrant.search(embed(query), top=top_k)
  sparse = bm25_index.search(query, top=top_k)
  return reciprocal_rank_fusion(dense, sparse, k=60)`
    ],
  },
  43: {
    tabs: ["Cypher Multi-hop", "PyKEEN Alignment"],
    code: [
      `from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j","password"))

# Cypher: multi-hop from disease to drug candidates
query = """
MATCH (d:Disease {cui: $cui})
  -[:ASSOCIATED_WITH]->(g:Gene)
  -[:TARGETED_BY]->(drug:Drug)
WHERE drug.fda_approved = true
RETURN d, g, drug
LIMIT 100
"""

with driver.session() as session:
    result = session.run(query, cui="C0002395")
    for record in result:
        print(record["drug"]["name"])`,
      `from pykeen.pipeline import pipeline

# Train TransE model on extracted knowledge graph
result = pipeline(
    dataset='Nations', # Placeholder for custom KG dataset
    model='TransE',
    epochs=50,
)

model = result.model
print("Knowledge Graph Embeddings trained.")`
    ],
  },
  44: {
    tabs: ["RAG Engine Prompt", "Citation Linking"],
    code: [
      `from langchain.prompts import PromptTemplate

PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are BIOQUORA, a biomedical AI. Use ONLY the
provided context to answer. Do not hallucinate.

Context:
{context}

Question: {question}
Answer:"""
)

print(PROMPT.format(context="Aspirin inhibits COX-1.", question="How does aspirin work?"))`,
      `def link_citations(generated_text, retrieved_chunks):
    # Simplistic citation linking logic
    cited_text = generated_text
    for i, chunk in enumerate(retrieved_chunks):
        if chunk.keyword in generated_text:
            cited_text = cited_text.replace(chunk.keyword, f"{chunk.keyword} [{i+1}]")
    return cited_text`
    ],
  },
};

const stepTasks: Record<number, {id: string, label: string, difficulty: string, est: string}[]> = {
  11: [
    { id: "11-1", label: "Develop Cardiovascular ML Prediction Model", difficulty: "medium", est: "Completed" },
    { id: "11-2", label: "Develop Renal ML Prediction Model", difficulty: "medium", est: "Completed" },
    { id: "11-3", label: "Develop Hepatic ML Prediction Model", difficulty: "medium", est: "Completed" },
    { id: "11-4", label: "Develop Respiratory ML Prediction Model", difficulty: "medium", est: "Completed" },
    { id: "11-5", label: "Develop Immunology ML Prediction Model", difficulty: "medium", est: "Completed" },
    { id: "11-6", label: "Develop Thyroid ML Prediction Model", difficulty: "medium", est: "Completed" }
  ],
  21: [
    { id: "21-1", label: "Build main Biomedical Workspace UI", difficulty: "medium", est: "Completed" },
    { id: "21-2", label: "Implement diagnostic risk progress bars", difficulty: "easy", est: "Completed" },
    { id: "21-3", label: "Create Clinical Pathway Modal", difficulty: "hard", est: "Completed" },
    { id: "21-4", label: "Implement scrollable content areas", difficulty: "easy", est: "Completed" }
  ],
  6: [
    { id: "6-1", label: "Implement fetch_pubmed_batch() async ingestion module", difficulty: "medium", est: "2h" },
    { id: "6-2", label: "Implement build_neo4j_graph() graph writer layer", difficulty: "hard", est: "3h" },
    { id: "6-3", label: "Set up Celery scheduling for daily updates", difficulty: "medium", est: "1h" },
    { id: "6-4", label: "Add Prometheus operational monitoring", difficulty: "easy", est: "1h" }
  ],
  7: [
    { id: "7-1", label: "Set up Qdrant Vector DB for biomedical embeddings", difficulty: "medium", est: "2h" },
    { id: "7-2", label: "Integrate Sentence-Transformers for semantic encoding", difficulty: "medium", est: "2h" },
    { id: "7-3", label: "Implement Hybrid BM25+Dense retrieval strategy", difficulty: "hard", est: "3h" },
    { id: "7-4", label: "Build FastAPI endpoints for search and analytics", difficulty: "easy", est: "1h" }
  ],
  41: [
    { id: "41-1", label: "Implement query parser", difficulty: "medium", est: "2h" },
    { id: "41-2", label: "Train/Integrate PubMedBERT NER", difficulty: "hard", est: "4h" },
    { id: "41-3", label: "Build entity disambiguation map", difficulty: "hard", est: "3h" }
  ],
  42: [
    { id: "42-1", label: "Set up Qdrant Vector DB", difficulty: "easy", est: "2h" },
    { id: "42-2", label: "Implement Hybrid BM25+Dense", difficulty: "medium", est: "3h" },
    { id: "42-3", label: "RRF Fusion algorithm", difficulty: "hard", est: "2h" }
  ],
  43: [
    { id: "43-1", label: "Neo4j Cypher Multi-hop queries", difficulty: "medium", est: "3h" },
    { id: "43-2", label: "Extract Pathway subgraphs", difficulty: "hard", est: "2h" }
  ],
  44: [
    { id: "44-1", label: "Build joint RAG prompt", difficulty: "medium", est: "1h" },
    { id: "44-2", label: "Implement exact citation engine", difficulty: "hard", est: "4h" }
  ]
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
    deliverable: "Disease Γåö Gene Γåö Drug Γåö Paper knowledge graph in Neo4j",
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
    icon: "⚙️",
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
    icon: "🧩",
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
    title: "Bioquora Phase 0 Final System",
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
      "Build & query a Neo4j knowledge graph (Disease Γåö Gene Γåö Drug Γåö Paper)",
      "Run graph analytics for hub discovery & drug repurposing",
      "Power semantic search with FAISS / Qdrant + BiomedBERT",
      "Deploy a RAG research assistant (LlamaIndex + LangChain)",
      "Enable multi-hop reasoning via Microsoft GraphRAG",
      "Evaluate outputs with RAGAS, TruLens & BioASQ benchmarks",
    ],
    deliverable: "BIOQUORA — Biomedical Intelligence Platform (Phase 0 Complete)",
    flow: ["PubMed · PMC · PhysioNet · MIMIC-IV", "NCBI APIs", "scispaCy · BioBERT · PubMedBERT", "Neo4j Knowledge Graph", "NetworkX Analytics", "FAISS · Qdrant", "LlamaIndex · LangChain", "Microsoft GraphRAG", "BIOQUORA"],
    isFinal: true,
    codeKey: 10,
  },
  {
    id: 11,
    phase: 1,
    title: "Predictive ML Engine",
    subtitle: "Implemented",
    color: "#a78bfa",
    icon: "🧬",
    description: "Fully implemented machine learning models for early risk detection across Cardiovascular, Renal, Hepatic, Respiratory, Immunology, and Thyroid domains.",
    resources: [],
    learn: ["FastAPI Backend", "Ensemble Models", "Clinical Logic"],
    deliverable: "ML Prediction API",
    flow: ["Patient Data", "Rules Engine", "ML Model", "Risk Score"],
    codeKey: 11
  },
  {
    id: 21,
    phase: 2,
    title: "Clinical Workspace & Pathway UI",
    subtitle: "Implemented",
    color: "#34d399",
    icon: "💻",
    description: "Built the comprehensive Bioquora Workspace interface, including diagnostic progress bars and the deep-dive Clinical Pathway Explorer Modal for clinical decision support.",
    resources: [],
    learn: ["React", "TailwindCSS", "Radix UI", "Responsive Design"],
    deliverable: "Frontend Workspace UI",
    flow: ["Dashboard", "Risk Analysis", "Pathway Modal", "Clinical Guidelines"],
    codeKey: 21
  },
  {
    id: 6,
    phase: 3,
    title: "Production Knowledge Graph",
    subtitle: "In Progress",
    color: "#fbbf24",
    icon: "🕸️",
    description: "Automated PubMed ingestion pipeline, multi-database schema, Celery scheduling, graph versioning, and operational monitoring.",
    resources: [],
    learn: ["Microservices", "Celery", "Neo4j", "Prometheus"],
    deliverable: "Production KG",
    flow: ["PubMed", "Celery", "NLP", "Neo4j"],
    codeKey: 6
  },
  {
    id: 7,
    phase: 3,
    title: "Research Intelligence Layer",
    subtitle: "In Progress",
    color: "#fbbf24",
    icon: "🔍",
    description: "Semantic search, vector embedding, graph integration using Qdrant and fast embeddings to query the ingested literature accurately.",
    resources: [],
    learn: ["Qdrant", "FastAPI", "Redis", "Embeddings"],
    deliverable: "Intelligence API",
    flow: ["Query", "Vector", "Graph", "RAG"],
    codeKey: 7
  },
  {
    id: 41,
    phase: 4,
    title: "Biomedical Question Understanding",
    subtitle: "In Progress",
    color: "#00d4c8",
    icon: "🧠",
    description: "Raw clinical or research questions are far noisier than web search queries. Before anything else, BIOQUORA must parse intent, disambiguate entities, and classify question type.",
    resources: [],
    learn: ["Intent classification", "NER with PubMedBERT", "Entity disambiguation", "Multi-hop detection"],
    deliverable: "Parsed Query",
    flow: ["Input", "PubMedBERT", "UMLS/MeSH", "Query Plan"],
    codeKey: 41
  },
  {
    id: 42,
    phase: 4,
    title: "Semantic Vector Search",
    subtitle: "In Progress",
    color: "#00d4c8",
    icon: "🔍",
    description: "Parallel dense retrieval across multi-index Qdrant collections. Hybrid BM25 + dense retrieval with RRF fusion.",
    resources: [],
    learn: ["Dual-encoder setup", "Multi-collection retrieval", "Hybrid BM25 + dense"],
    deliverable: "Top-k Evidence Chunks",
    flow: ["Qdrant", "BioLinkBERT", "BM25", "RRF Fusion"],
    codeKey: 42
  },
  {
    id: 43,
    phase: 4,
    title: "Knowledge Graph Query",
    subtitle: "In Progress",
    color: "#00d4c8",
    icon: "🕸️",
    description: "Vector search returns candidate documents; the knowledge graph returns structural context via Cypher-based traversal.",
    resources: [],
    learn: ["Seed node lookup", "Typed edge traversal", "Pathway subgraph extraction"],
    deliverable: "Biological Subgraph",
    flow: ["Neo4j", "Cypher", "PyKEEN", "KEGG/Reactome"],
    codeKey: 43
  },
  {
    id: 44,
    phase: 4,
    title: "Constrained Generation & Citation",
    subtitle: "In Progress",
    color: "#00d4c8",
    icon: "📝",
    description: "LLM synthesis grounded tightly in the retrieved multi-modal evidence, with strict hallucination constraints and exact sentence-level citations.",
    resources: [],
    learn: ["Joint context formatting", "Chain-of-Verification", "Exact citation generation"],
    deliverable: "Grounded Answer",
    flow: ["Context Assembly", "LLM Generation", "Citation Linking"],
    isFinal: true,
    codeKey: 44
  }
];

export default function BioquoraDashboard() {

  const defaultSteps = new Set([1, 2, 3, 4, 8, 9, 10, 11, 21, 41, 42, 43, 44]);

  const defaultTasks = new Set([11, 21, 41, 42, 43, 44].flatMap(k => stepTasks[k]?.map(t => t.id) || []));

  const [activeStep, setActiveStep]         = useState<number | null>(null);

  const [completedSteps, setCompletedSteps] = useState(defaultSteps);

  const [completedTasks, setCompletedTasks] = useState(defaultTasks);

  const [activeTab, setActiveTabState]      = useState("tasks"); // "tasks" | "code"

  const [activePhaseTab, setActivePhaseTab] = useState(4); // Default to Phase 2 where our current work is

  useEffect(() => {
    const steps = document.querySelectorAll('.step');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    });
    steps.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [activePhaseTab]);



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

  const allTasks = [11, 21, 6, 7, 41, 42, 43, 44].flatMap(k => stepTasks[k] || []);

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

          <div style={{ fontSize: "11px", letterSpacing: "6px", color: activePhaseTab === 0 ? "#00d4ff" : activePhaseTab === 1 ? "#a78bfa" : activePhaseTab === 2 ? "#34d399" : activePhaseTab === 4 ? "#00d4c8" : activePhaseTab === 6 ? "#ff4ecd" : activePhaseTab === 7 ? "#f97316" : "#fbbf24", textTransform: "uppercase", marginBottom: "16px", opacity: 0.8 }}>

            {activePhaseTab === 0 ? "BIOMEDICAL INTELLIGENCE" : activePhaseTab === 1 ? "PREDICTIVE ML ENGINE" : activePhaseTab === 2 ? "CLINICAL WORKSPACE" : activePhaseTab === 3 ? "PRODUCTION KNOWLEDGE GRAPH" : activePhaseTab === 4 ? "KNOWLEDGE GRAPH RAG" : activePhaseTab === 5 ? "RECOMMENDATION ENGINE" : activePhaseTab === 6 ? "DIAGNOSTIC AGENTS" : "PATIENT DIGITAL TWIN"}

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

            BIOQUORA

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

                BIOQUORA

              </div>

            </div>

          </div>

        </div>



        {/* Steps grid */}
        
        {activePhaseTab === 4 && (
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "24px", color: "#00d4c8", marginBottom: "16px" }}>ResearchOS AI Planner DAG Engine</h2>
            <p style={{ color: "#94a3b8", marginBottom: "24px" }}>Test the live execution DAG of our Research Copilot engine running parallel semantic, graph, and dataset agents.</p>
            <a href="/copilot-dag" style={{ display: "inline-block", background: "#00d4c8", color: "#050A12", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>Launch Workflow Simulator</a>
          </div>
        )}
        
        {activePhaseTab === 5 && (
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "24px", color: "#6366f1", marginBottom: "16px" }}>Phase 5: Recommendation Systems</h2>
            <p style={{ color: "#94a3b8", marginBottom: "24px" }}>Explore the Hybrid Fusion engine, Collaborative Filtering, and Citation Graph.</p>
            <a href="/phase5" style={{ display: "inline-block", background: "#6366f1", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>Open Interactive Presentation</a>
          </div>
        )}

        <div className="phase4-container" style={{ marginBottom: "48px" }}>

          <div className="pipeline-visual">

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

                  className={`step`}

                >

                  <div className="step-spine">

                    <div

                      className="step-node"

                      style={{

                        background: `rgba(${hexToRgb(s.color)},0.15)`,

                        border: `1.5px solid ${s.color}`,

                        color: s.color,

                        boxShadow: isActive ? `0 0 24px ${s.color}60` : `0 0 14px ${s.color}33`

                      }}

                    >

                      {String(idx + 1).padStart(2, '0')}

                    </div>

                  </div>



                  <div

                    className="step-card"

                    onClick={() => setActiveStep(isActive ? null : i)}

                    style={{

                      borderColor: isActive ? s.color : "rgba(255,255,255,0.08)",

                      boxShadow: isActive ? `0 8px 40px rgba(0,0,0,0.4), 0 0 20px ${s.color}20` : "none",

                      cursor: "pointer",

                      padding: "0",

                      overflow: "hidden",

                      background: "rgba(15,23,42,0.6)",

                      transition: "all 0.3s ease"

                    }}

                  >

                    <div style={{ position: "relative", padding: "28px 32px", minHeight: "280px" }}>

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

                                    {tab === "tasks" ? `✓ Tasks (${stepTasks[s.id].length})` : "</> Code"}

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

                  </div>

                </div>

              );

            })}

          </div>

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

              { label: "Biomedical Intelligence", sub: "Phase 0", color: "#00d4ff", active: true, phaseId: 0 },

              { label: "Predictive ML Engine", sub: "Phase 1", color: "#a78bfa", active: true, phaseId: 1 },

              { label: "Clinical Workspace", sub: "Phase 2", color: "#34d399", active: true, phaseId: 2 },

              { label: "Production Knowledge Graph", sub: "Phase 3", color: "#fbbf24", active: true, phaseId: 3 },

              { label: "Knowledge Graph RAG", sub: "Phase 4", color: "#00d4c8", active: true, phaseId: 4 },

              { label: "Recommendation Engine", sub: "Phase 5", color: "#6366f1", active: true, phaseId: 5 },

              { label: "Diagnostic Agents", sub: "Phase 6", color: "#ff4ecd", active: true, phaseId: 6 },

              { label: "Patient Digital Twin", sub: "Phase 7", color: "#f97316", active: true, phaseId: 7 },

            ].map((p, i, arr) => (

              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>

                <div 

                  onClick={() => setActivePhaseTab(p.phaseId)}

                  style={{

                  padding: "10px 20px",

                  background: p.active || activePhaseTab === p.phaseId ? `rgba(${hexToRgb(p.color)},0.15)` : "rgba(255,255,255,0.02)",

                  border: `1px solid ${p.active || activePhaseTab === p.phaseId ? p.color + "50" : "rgba(255,255,255,0.06)"}`,

                  borderRadius: "10px",

                  textAlign: "left",

                  opacity: p.active ? 1 : 0.4,

                  cursor: "pointer",

                  boxShadow: activePhaseTab === p.phaseId ? `0 0 15px ${p.color}40` : "none",

                  transform: activePhaseTab === p.phaseId ? "scale(1.05)" : "scale(1)",

                  transition: "all 0.2s ease"

                }}>

                  <div style={{ fontSize: "11px", color: p.color, fontWeight: 700, marginBottom: "2px" }}>{p.label}</div>

                  <div style={{ fontSize: "10px", color: "#64748b" }}>{p.sub}</div>

                </div>

                {i < arr.length - 1 && <span style={{ color: "#1e3a4a", fontSize: "20px" }}>→</span>}

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

