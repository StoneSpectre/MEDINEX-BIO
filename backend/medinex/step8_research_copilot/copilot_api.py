"""
Step 8 — Research Copilot FastAPI Gateway

Endpoints:
  POST /copilot/ask          — main Q&A endpoint
  POST /copilot/session      — create session
  GET  /copilot/session/{id} — session history
  POST /workspace/projects   — create project
  GET  /workspace/projects   — list projects
  POST /workspace/papers     — save paper to project
  POST /lit-review/build     — trigger literature review generation

All endpoints require a JWT (validated by Step 10 AuthService middleware).
Tenant scoping is extracted from the JWT and injected into all DB calls.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Annotated, Optional
import asyncpg
from fastapi import FastAPI, Depends, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel



from api.core.config import settings

from medinex.step8_research_copilot.agents.planner_agent import PlannerAgent
from medinex.step8_research_copilot.agents.retrieval_agent import RetrievalAgent
from medinex.step8_research_copilot.agents.graph_agent import GraphAgent
from medinex.step8_research_copilot.agents.evidence_agent import EvidenceAgent
from medinex.step8_research_copilot.agents.writer_agent import WriterAgent
from medinex.step8_research_copilot.orchestrator import CopilotOrchestrator
from medinex.step8_research_copilot.memory.session_memory import SessionMemory
from medinex.step8_research_copilot.workspace.workspace_service import WorkspaceService


# ── App state (initialized at startup) ───────────────────────────────────────
class AppState:
    pool: asyncpg.Pool
    orchestrator: CopilotOrchestrator
    memory: SessionMemory
    workspace: WorkspaceService


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    import os
    postgres_dsn = os.getenv("POSTGRES_DSN", "postgresql://user:pass@localhost:5432/medinex")
    app_state.pool = await asyncpg.create_pool(postgres_dsn, min_size=1, max_size=10)
    app_state.memory = SessionMemory(os.getenv("REDIS_URL", "redis://localhost:6379"), ttl_seconds=3600)

    retrieval = RetrievalAgent(
        qdrant_host=os.getenv("QDRANT_HOST", "localhost"), qdrant_port=int(os.getenv("QDRANT_PORT", "6333")),
        qdrant_collection=os.getenv("QDRANT_COLLECTION", "medinex_docs"), postgres_dsn=postgres_dsn,
    )
    await retrieval.connect()

    app_state.orchestrator = CopilotOrchestrator(
        planner=PlannerAgent(api_key=os.getenv("ANTHROPIC_API_KEY", ""), model=os.getenv("ANTHROPIC_MODEL", "claude-3-opus-20240229")),
        retrieval=retrieval,
        graph=GraphAgent(os.getenv("NEO4J_URI", "bolt://localhost:7687"), os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password"), "neo4j"),
        evidence=EvidenceAgent(),
        writer=WriterAgent(api_key=os.getenv("ANTHROPIC_API_KEY", ""), model=os.getenv("ANTHROPIC_MODEL", "claude-3-opus-20240229"),
                           max_tokens=4000),
        memory=app_state.memory,
    )

    app_state.workspace = WorkspaceService(app_state.pool)
    await app_state.workspace.ensure_schema()

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    await app_state.pool.close()
    await app_state.memory.close()


from fastapi import APIRouter
router = APIRouter(lifespan=lifespan)


# ── JWT dependency stub (Step 10 provides full implementation) ────────────────
def _get_current_user(authorization: str = Header(...)) -> dict:
    """
    Stub: in production, validate JWT and return {user_id, tenant_id, role}.
    Step 10's AuthService.validate_token() replaces this.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return {"user_id": "stub-user", "tenant_id": "stub-tenant", "role": "researcher"}


CurrentUser = Annotated[dict, Depends(_get_current_user)]


# ── Request / Response models ─────────────────────────────────────────────────
class AskRequest(BaseModel):
    query: str
    session_id: str


class AskResponse(BaseModel):
    session_id: str
    summary: str
    mechanism: str
    evidence_section: str
    uncertainty: str
    hypotheses: str
    references: list[dict]
    latency_ms: int
    stage_timings: dict


class CreateSessionResponse(BaseModel):
    session_id: str


class CreateProjectRequest(BaseModel):
    title: str
    description: str = ""


class SavePaperRequest(BaseModel):
    project_id: str
    paper_id: str
    collection_name: str = ""
    annotation: str = ""


class LitReviewRequest(BaseModel):
    topic: str
    project_id: Optional[str] = None
    target_papers: int = 200
    n_sections: int = 6


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/copilot/session", response_model=CreateSessionResponse)
async def create_session(user: CurrentUser):
    session = await app_state.memory.create_session(user_id=user["user_id"])
    return CreateSessionResponse(session_id=session.session_id)


@router.post("/copilot/ask", response_model=AskResponse)
async def ask(body: AskRequest, user: CurrentUser):
    """Main Research Copilot endpoint. Runs the full 5-agent pipeline."""
    response = await app_state.orchestrator.run(
        query=body.query,
        session_id=body.session_id,
        tenant_id=user["tenant_id"],
        user_id=user["user_id"],
    )
    return AskResponse(
        session_id=response.session_id,
        summary=response.summary,
        mechanism=response.mechanism,
        evidence_section=response.evidence_section,
        uncertainty=response.uncertainty,
        hypotheses=response.hypotheses,
        references=response.references,
        latency_ms=response.latency_ms,
        stage_timings=response.stage_timings,
    )


@router.get("/copilot/session/{session_id}")
async def get_session(session_id: str, user: CurrentUser):
    session = await app_state.memory.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "current_topic": session.current_topic,
        "entity_ids": session.entity_ids,
        "message_count": len(session.messages),
        "messages": [{"role": m.role, "content": m.content[:200]}
                     for m in session.messages[-10:]],
    }


@router.post("/workspace/projects")
async def create_project(body: CreateProjectRequest, user: CurrentUser):
    project = await app_state.workspace.create_project(
        tenant_id=user["tenant_id"], user_id=user["user_id"],
        title=body.title, description=body.description,
    )
    return {"project_id": project.id, "title": project.title}


@router.get("/workspace/projects")
async def list_projects(user: CurrentUser):
    projects = await app_state.workspace.list_projects(
        tenant_id=user["tenant_id"], user_id=user["user_id"]
    )
    return {"projects": [{"id": p.id, "title": p.title, "status": p.status}
                          for p in projects]}


@router.post("/workspace/papers")
async def save_paper(body: SavePaperRequest, user: CurrentUser):
    saved_id = await app_state.workspace.save_paper(
        project_id=body.project_id, paper_id=body.paper_id,
        collection_name=body.collection_name, annotation=body.annotation,
    )
    return {"saved_id": saved_id}


@router.post("/lit-review/build")
async def build_literature_review(body: LitReviewRequest, user: CurrentUser,
                                   background_tasks: BackgroundTasks):
    """
    Triggers async lit review generation. Returns job ID immediately.
    Step 10's task queue (Redis + worker) processes this asynchronously.
    Poll /lit-review/status/{job_id} for completion.
    """
    import uuid
    job_id = str(uuid.uuid4())
    # In production: enqueue to Redis queue (Step 10 worker picks up)
    # background_tasks.add_task(run_lit_review_job, job_id, body, user)
    return {
        "job_id": job_id,
        "status": "queued",
        "message": f"Literature review for '{body.topic}' queued. Poll /lit-review/status/{job_id}",
    }


@router.get("/health")
async def health():
    return {"status": "ok", "service": "copilot"}
