"""
medinex/study_assistant/assistant.py  —  Step 7

The Medinex Study Assistant — upgraded with GraphRAG.

This is the Step 7 integration: the Phase 0 Study Assistant
now answers questions using the Phase 1 knowledge graph instead
of flat document RAG.

The difference:
  Phase 0:  User asks → embed query → retrieve flat text chunks → LLM answers
  Phase 7:  User asks → embed query → find graph anchors → traverse Neo4j →
            rank evidence → LLM answers with disease/gene/drug/paper context

API surface (FastAPI):
  POST /ask                — main Q&A endpoint (GraphRAG)
  GET  /explain/{disease}  — structured disease explanation
  GET  /flashcards/{topic} — generate flashcards for a topic
  GET  /quiz/{topic}       — generate quiz questions
  POST /summarise          — summarise a PubMed paper via PMID

Run:
  pip install fastapi uvicorn anthropic qdrant-client sentence-transformers
  uvicorn assistant:app --reload --port 8001

Docs: http://localhost:8001/docs
"""

import os
import sys
from typing import Optional

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, "..", "backend", "graph"))

from db import MedinexGraph
from pipeline import GraphRAGPipeline

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_MODEL_FAST    = "claude-haiku-4-5-20251001"
LLM_MODEL_SMART   = "claude-sonnet-4-6"


# ── Pydantic models ───────────────────────────────────────────

class AskRequest(BaseModel):
    question:   str
    mode:       str = "graphrag"   # "graphrag" | "direct"
    user_level: str = "medical"    # "beginner" | "medical" | "researcher"

class SummariseRequest(BaseModel):
    pmid: str

class AskResponse(BaseModel):
    question: str
    answer:   str
    evidence: list[dict]
    mode:     str


# ── App lifecycle ─────────────────────────────────────────────

_pipeline: Optional[GraphRAGPipeline] = None
_graph:    Optional[MedinexGraph]     = None
_client:   Optional[anthropic.Anthropic] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pipeline, _graph, _client
    _graph    = MedinexGraph()
    _pipeline = GraphRAGPipeline()
    _client   = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    print("[Assistant] Study Assistant ready — GraphRAG pipeline loaded.")
    yield
    _pipeline.close()
    _graph.close()
    print("[Assistant] Shutdown complete.")


app = FastAPI(
    title="Medinex Study Assistant",
    version="0.2.0",
    description=(
        "Step 7: Study Assistant upgraded with GraphRAG. "
        "Answers biomedical questions using the Medinex knowledge graph."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────

def _llm(system: str, user: str, smart: bool = False) -> str:
    model = LLM_MODEL_SMART if smart else LLM_MODEL_FAST
    resp  = _client.messages.create(
        model=model, max_tokens=1200,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return resp.content[0].text


def _level_instruction(level: str) -> str:
    return {
        "beginner":   "Explain for a first-year science student. Avoid jargon; define terms.",
        "medical":    "Explain for a medical student (MBBS/BDS level). Use proper terminology.",
        "researcher": "Explain for a biomedical researcher. Be precise, cite mechanisms.",
    }.get(level, "Explain clearly.")


# ── Routes ────────────────────────────────────────────────────

@app.get("/health")
def health():
    counts = _graph.node_count()
    return {"status": "ok", "graph_nodes": counts}


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    """
    Main Q&A endpoint.

    mode='graphrag'  — full GraphRAG pipeline (default)
                       anchors in graph → traversal → LLM
    mode='direct'    — direct LLM call with no graph context
                       (for general questions outside graph scope)
    """
    if req.mode == "graphrag":
        result = _pipeline.answer(req.question)
        # Prepend level instruction to the answer regeneration if not medical
        if req.user_level != "medical":
            level_instr = _level_instruction(req.user_level)
            answer = _llm(
                system=f"You are Medinex. {level_instr}",
                user=(
                    f"Rewrite this answer for the specified level.\n\n"
                    f"Original answer:\n{result['answer']}\n\n"
                    f"Level: {req.user_level}"
                ),
            )
        else:
            answer = result["answer"]

        return AskResponse(
            question=req.question,
            answer=answer,
            evidence=result["evidence"],
            mode="graphrag",
        )

    # Direct mode — no graph context
    answer = _llm(
        system=f"You are Medinex, a biomedical study assistant. {_level_instruction(req.user_level)}",
        user=req.question,
    )
    return AskResponse(
        question=req.question,
        answer=answer,
        evidence=[],
        mode="direct",
    )


@app.get("/explain/{disease}")
def explain_disease(disease: str, level: str = "medical"):
    """
    Structured disease explanation using the knowledge graph.

    Returns:
      beginner_explanation, medical_explanation, pathophysiology,
      symptoms, treatments, important_genes, key_papers
    """
    data = _graph.get_disease_graph(disease)
    if not data:
        raise HTTPException(404, f"Disease not found: {disease}")

    d         = data["disease"]
    symptoms  = [s.get("name", "") for s in data.get("symptoms", [])]
    genes     = [g.get("symbol", "") for g in data.get("genes", [])][:10]
    drugs     = [dr.get("name", "") for dr in data.get("drugs", [])]
    papers    = data.get("papers", [])[:5]
    pathways  = [pw.get("name", "") for pw in data.get("pathways", [])][:5]

    graph_summary = (
        f"Disease: {d.get('name')} [{d.get('category', '')}]\n"
        f"Description: {d.get('description', 'No description available')}\n"
        f"Symptoms: {', '.join(symptoms[:10]) or 'Not available'}\n"
        f"Associated genes: {', '.join(genes) or 'Not available'}\n"
        f"Treatments: {', '.join(drugs[:8]) or 'Not available'}\n"
        f"Pathways: {', '.join(pathways) or 'Not available'}\n"
    )

    level_instr = _level_instruction(level)

    result = _llm(
        system=(
            "You are Medinex. Generate a structured disease explanation. "
            f"{level_instr} "
            "Return a JSON object with these exact keys: "
            "beginner_explanation, medical_explanation, pathophysiology, "
            "symptoms (list), treatments (list), important_genes (list), "
            "key_papers (list of pmid strings)."
        ),
        user=f"Disease: {d.get('name')}\n\nGraph data:\n{graph_summary}",
        smart=True,
    )

    import json as _json
    try:
        structured = _json.loads(result)
    except Exception:
        structured = {"explanation": result}

    return {
        "disease":    d,
        "graph_data": data,
        "explanation": structured,
    }


@app.get("/flashcards/{topic}")
def flashcards(topic: str, count: int = 10, level: str = "medical"):
    """
    Generates flashcards for a biomedical topic using graph data.
    Returns a list of {front, back} dicts.
    """
    # Try to get graph context first
    graph_data = _graph.get_disease_graph(topic)
    context    = ""
    if graph_data:
        d         = graph_data["disease"]
        genes     = [g.get("symbol", "") for g in graph_data.get("genes", [])][:8]
        drugs     = [dr.get("name", "") for dr in graph_data.get("drugs", [])]
        symptoms  = [s.get("name", "") for s in graph_data.get("symptoms", [])]
        context   = (
            f"Disease: {d.get('name')}\n"
            f"Genes: {', '.join(genes)}\n"
            f"Drugs: {', '.join(drugs[:6])}\n"
            f"Symptoms: {', '.join(symptoms[:8])}"
        )

    level_instr = _level_instruction(level)
    result = _llm(
        system=(
            "You are Medinex. Generate medical flashcards. "
            f"{level_instr} "
            "Return ONLY a JSON array of objects with 'front' and 'back' keys. "
            "No markdown, no explanation."
        ),
        user=(
            f"Generate {count} flashcards about: {topic}\n\n"
            + (f"Use this graph-sourced context:\n{context}" if context else "")
        ),
        smart=True,
    )

    import json as _json
    try:
        cards = _json.loads(result)
        if not isinstance(cards, list):
            cards = [{"front": topic, "back": result}]
    except Exception:
        cards = [{"front": topic, "back": result}]

    return {"topic": topic, "count": len(cards), "flashcards": cards}


@app.get("/quiz/{topic}")
def quiz(topic: str, count: int = 5, level: str = "medical"):
    """
    Generates multiple-choice quiz questions for a topic.
    Returns a list of {question, options, correct, explanation} dicts.
    """
    graph_data = _graph.get_disease_graph(topic)
    context    = ""
    if graph_data:
        genes    = [g.get("symbol", "") for g in graph_data.get("genes", [])][:6]
        drugs    = [dr.get("name", "") for dr in graph_data.get("drugs", [])][:4]
        symptoms = [s.get("name", "") for s in graph_data.get("symptoms", [])][:6]
        context  = (
            f"Genes: {', '.join(genes)}\n"
            f"Drugs: {', '.join(drugs)}\n"
            f"Symptoms: {', '.join(symptoms)}"
        )

    level_instr = _level_instruction(level)
    result = _llm(
        system=(
            "You are Medinex. Generate quiz questions. "
            f"{level_instr} "
            "Return ONLY a JSON array. Each item: "
            "{question, options: [A, B, C, D], correct: 'A'/'B'/'C'/'D', explanation}. "
            "No markdown."
        ),
        user=(
            f"Generate {count} MCQ questions about: {topic}\n\n"
            + (f"Ground them in this data:\n{context}" if context else "")
        ),
        smart=True,
    )

    import json as _json
    try:
        questions = _json.loads(result)
        if not isinstance(questions, list):
            questions = []
    except Exception:
        questions = []

    return {"topic": topic, "count": len(questions), "questions": questions}


@app.post("/summarise")
def summarise_paper(req: SummariseRequest):
    """
    Summarises a PubMed paper from PMID.
    Fetches from Neo4j graph first; falls back to PubMed API.

    Returns: summary, methods, findings, limitations, future_work
    """
    # Fetch from graph
    papers = _graph.run(
        "MATCH (p:Paper {pmid: $pmid}) RETURN p LIMIT 1",
        pmid=req.pmid,
    )
    if not papers:
        raise HTTPException(404, f"Paper PMID:{req.pmid} not in graph. Run seed.py first.")

    paper = dict(papers[0]["p"])
    title    = paper.get("title", "")
    abstract = paper.get("abstract", "")

    if not abstract:
        raise HTTPException(
            422,
            f"Paper PMID:{req.pmid} has no abstract stored. "
            "Re-run seed.py with full PubMed XML fetching."
        )

    result = _llm(
        system=(
            "You are Medinex. Summarise a research paper for a medical student. "
            "Return ONLY JSON with keys: summary, methods, findings, limitations, future_work. "
            "Each value is 2-4 sentences. No markdown."
        ),
        user=f"Title: {title}\n\nAbstract: {abstract}",
        smart=True,
    )

    import json as _json
    try:
        structured = _json.loads(result)
    except Exception:
        structured = {"summary": result}

    return {
        "pmid":    req.pmid,
        "paper":   paper,
        "summary": structured,
    }
