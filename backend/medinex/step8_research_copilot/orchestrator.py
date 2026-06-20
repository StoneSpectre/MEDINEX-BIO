"""
Step 8.1 — Agent Orchestrator

LangGraph-style linear pipeline wiring all five agents:

  Query → Planner → Retrieval → Graph → Evidence → Writer → Response

Each stage is async, and intermediate results flow forward via a shared
OrchestrationContext. The orchestrator also handles entity resolution
(raw entity strings → canonical IDs for Neo4j) and session memory updates.

This is the single entry point for the Research Copilot API endpoint.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Optional

from medinex.step8_research_copilot.agents.planner_agent import PlannerAgent, PlannerOutput
from medinex.step8_research_copilot.agents.retrieval_agent import RetrievalAgent
from medinex.step8_research_copilot.agents.graph_agent import GraphAgent
from medinex.step8_research_copilot.agents.evidence_agent import EvidenceAgent
from medinex.step8_research_copilot.agents.writer_agent import WriterAgent, WriterOutput
from medinex.step8_research_copilot.memory.session_memory import SessionMemory


@dataclass
class OrchestrationContext:
    """Flows through the pipeline; each agent reads its inputs and appends outputs."""
    query: str
    session_id: str
    tenant_id: str
    user_id: str

    # Populated by Planner
    plan: Optional[PlannerOutput] = None

    # Populated by Retrieval
    raw_docs: list = field(default_factory=list)

    # Populated by Evidence Agent
    evidence_docs: list = field(default_factory=list)
    evidence_context: str = ""

    # Populated by Graph Agent
    graph_context: str = ""
    contradiction_context: list = field(default_factory=list)
    hypothesis_context: str = ""

    # Populated by Writer
    response: Optional[WriterOutput] = None

    # Timing (ms per stage for monitoring)
    timings: dict = field(default_factory=dict)


@dataclass
class CopilotResponse:
    """Final response returned to the API layer."""
    session_id: str
    summary: str
    mechanism: str
    evidence_section: str
    uncertainty: str
    hypotheses: str
    references: list[dict]
    latency_ms: int
    stage_timings: dict


def _entity_ids_from_names(entity_names: list[str]) -> list[str]:
    """
    Production: call entity-linker service (UMLS/MeSH normalization from Step 6).
    Stub: return names directly — Neo4j will simply not find them.
    Replace with actual UMLS CUI lookup.
    """
    return entity_names


class CopilotOrchestrator:
    def __init__(
        self,
        planner: PlannerAgent,
        retrieval: RetrievalAgent,
        graph: GraphAgent,
        evidence: EvidenceAgent,
        writer: WriterAgent,
        memory: SessionMemory,
    ):
        self._planner = planner
        self._retrieval = retrieval
        self._graph = graph
        self._evidence = evidence
        self._writer = writer
        self._memory = memory

    async def run(self, query: str, session_id: str,
                  tenant_id: str, user_id: str) -> CopilotResponse:
        start = time.monotonic()
        ctx = OrchestrationContext(
            query=query, session_id=session_id,
            tenant_id=tenant_id, user_id=user_id,
        )

        # ── Stage 1: Plan ─────────────────────────────────────────────────────
        t0 = time.monotonic()
        ctx.plan = self._planner.plan(query)
        ctx.timings["planner_ms"] = int((time.monotonic() - t0) * 1000)

        # ── Stage 2: Load session memory ──────────────────────────────────────
        t0 = time.monotonic()
        session = await self._memory.get_session(session_id)
        session_context = session.to_context_string() if session else ""
        # Accumulate entity IDs from prior turns
        prior_entity_ids = session.entity_ids if session else []
        ctx.timings["memory_ms"] = int((time.monotonic() - t0) * 1000)

        # ── Stage 3: Retrieval + Graph (parallel) ─────────────────────────────
        t0 = time.monotonic()
        entity_ids = _entity_ids_from_names(ctx.plan.entities)
        all_entity_ids = list(dict.fromkeys(prior_entity_ids + entity_ids))

        retrieval_task = self._retrieval.retrieve(query, top_n=30)
        graph_task = asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self._graph.get_subgraph(all_entity_ids, hops=2)
            if ctx.plan.requires_graph else None
        )
        contradiction_task = asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self._graph.get_contradiction_context(all_entity_ids)
            if ctx.plan.requires_contradiction_data else []
        )

        ctx.raw_docs, subgraph, contradictions = await asyncio.gather(
            retrieval_task, graph_task, contradiction_task
        )
        ctx.graph_context = subgraph.to_text_context() if subgraph else ""
        ctx.contradiction_context = contradictions or []
        ctx.timings["retrieval_graph_ms"] = int((time.monotonic() - t0) * 1000)

        # ── Stage 4: Evidence tiering ─────────────────────────────────────────
        t0 = time.monotonic()
        ctx.evidence_docs = self._evidence.rank(ctx.raw_docs, top_n=15)
        ctx.evidence_context = self._evidence.format_for_context(ctx.evidence_docs)
        ctx.timings["evidence_ms"] = int((time.monotonic() - t0) * 1000)

        # ── Stage 5: Write ────────────────────────────────────────────────────
        t0 = time.monotonic()
        ctx.response = self._writer.write(
            query=query,
            intent=ctx.plan.intent,
            evidence_docs=ctx.evidence_docs,
            evidence_context=ctx.evidence_context,
            graph_context=ctx.graph_context,
            contradiction_context=ctx.contradiction_context,
            session_memory=session_context,
            hypothesis_context=ctx.hypothesis_context,
        )
        ctx.timings["writer_ms"] = int((time.monotonic() - t0) * 1000)

        # ── Stage 6: Persist to session memory ────────────────────────────────
        paper_ids = [r.get("paper_id", "") for r in ctx.response.references]
        await self._memory.add_message(session_id, "user", query)
        await self._memory.add_message(
            session_id, "assistant", ctx.response.summary,
            new_entities=entity_ids, new_paper_ids=paper_ids,
        )
        if ctx.plan.entities:
            await self._memory.update_topic(session_id, ctx.plan.entities[0])

        total_ms = int((time.monotonic() - start) * 1000)
        return CopilotResponse(
            session_id=session_id,
            summary=ctx.response.summary,
            mechanism=ctx.response.mechanism,
            evidence_section=ctx.response.evidence_section,
            uncertainty=ctx.response.uncertainty,
            hypotheses=ctx.response.hypotheses,
            references=ctx.response.references,
            latency_ms=total_ms,
            stage_timings=ctx.timings,
        )
