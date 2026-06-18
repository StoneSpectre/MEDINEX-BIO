import re

with open("medinex_head_utf8.tsx", "r", encoding="utf-8") as f:
    content = f.read()

component_split = content.find("export default function MedinexDashboard()")
component_code = content[component_split:]

new_data = """import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

function hexToRgb(hex: string) {
  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
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

Entrez.email = "research@medinex.ai"

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
        query = \"\"\"
        MERGE (p:Paper {pmid: $pmid})
        SET p.title = $title, p.abstract = $abstract
        RETURN p
        \"\"\"
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
query = \"\"\"
MATCH (d:Disease {cui: $cui})
  -[:ASSOCIATED_WITH]->(g:Gene)
  -[:TARGETED_BY]->(drug:Drug)
WHERE drug.fda_approved = true
RETURN d, g, drug
LIMIT 100
\"\"\"

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
    template=\"\"\"You are MEDINEX, a biomedical AI. Use ONLY the
provided context to answer. Do not hallucinate.

Context:
{context}

Question: {question}
Answer:\"\"\"
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
    description: "Built the comprehensive Medinex Workspace interface, including diagnostic progress bars and the deep-dive Clinical Pathway Explorer Modal for clinical decision support.",
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
    description: "Raw clinical or research questions are far noisier than web search queries. Before anything else, MEDINEX must parse intent, disambiguate entities, and classify question type.",
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

"""

component_code = re.sub(r'const defaultSteps = new Set\(\[.*?\]\);', 'const defaultSteps = new Set([11, 21]);', component_code, flags=re.DOTALL)
component_code = re.sub(r'const defaultTasks = new Set\(\[.*?\]\);', 'const defaultTasks = new Set(["11-1", "11-2", "11-3", "11-4", "11-5", "11-6", "21-1", "21-2", "21-3", "21-4"]);', component_code, flags=re.DOTALL)

component_code = component_code.replace('const [activePhaseTab, setActivePhaseTab] = useState(2);', 'const [activePhaseTab, setActivePhaseTab] = useState(4);')

component_code = re.sub(r'const allTasks\s*=\s*\[.*?\].flatMap\(k => stepTasks\[k\] \|\| \[\]\);', 'const allTasks = [11, 21, 6, 7, 41, 42, 43, 44].flatMap(k => stepTasks[k] || []);', component_code, flags=re.DOTALL)

with open("src/pages/MedinexPhase.tsx", "w", encoding="utf-8") as f:
    f.write(new_data + component_code)

print("Rewrote MedinexPhase.tsx to keep original tabs but only show what we actually built.")
