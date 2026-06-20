"""
Step 8.1 — Planner Agent

First node in the LangGraph-style agent orchestrator. Given a raw user query,
the Planner calls the LLM to parse:
  - intent (mechanistic | epidemiological | clinical | comparative | planning)
  - entities (biomedical named entities extracted from the query)
  - requires_graph (does this need Neo4j subgraph traversal?)
  - requires_literature (does this need vector/BM25 retrieval?)
  - requires_contradiction_data (does this touch Step 7 outputs?)

Output is a PlannerOutput that all downstream agents consume.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Literal
import anthropic

IntentType = Literal["mechanistic", "epidemiological", "clinical", "comparative", "planning", "unknown"]


@dataclass
class PlannerOutput:
    intent: IntentType
    entities: list[str]                 # raw strings; entity-linker resolves to IDs downstream
    requires_graph: bool
    requires_literature: bool
    requires_contradiction_data: bool   # True → include Step 7 hypothesis/gap data
    original_query: str
    confidence: float = 1.0
    routing_notes: str = ""


_SYSTEM_PROMPT = """
You are the Planner Agent for Medinex, a biomedical research intelligence platform.
Given a researcher's query, output ONLY valid JSON with these fields:

{
  "intent": "<mechanistic|epidemiological|clinical|comparative|planning|unknown>",
  "entities": ["<entity1>", "<entity2>"],
  "requires_graph": <true|false>,
  "requires_literature": <true|false>,
  "requires_contradiction_data": <true|false>,
  "confidence": <0.0-1.0>,
  "routing_notes": "<brief note on why>"
}

Intent definitions:
- mechanistic: asks how/why a biological process works (pathways, targets, mechanisms)
- epidemiological: asks about prevalence, incidence, risk factors in populations
- clinical: asks about treatments, drugs, clinical trials, patient outcomes
- comparative: compares multiple entities (drugs, genes, diseases)
- planning: asks for research directions, knowledge gaps, future work suggestions

requires_graph = true when traversing entity-entity relationships adds value
requires_contradiction_data = true when query involves scientific disagreements, hypotheses, or gaps
"""


class PlannerAgent:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model

    def plan(self, query: str) -> PlannerOutput:
        """Synchronous call — runs fast (<1s) before the heavier retrieval agents."""
        message = self._client.messages.create(
            model=self._model,
            max_tokens=512,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": query}],
        )
        raw = message.content[0].text.strip()
        # Strip markdown fences if model adds them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
        return PlannerOutput(
            intent=parsed.get("intent", "unknown"),
            entities=parsed.get("entities", []),
            requires_graph=parsed.get("requires_graph", False),
            requires_literature=parsed.get("requires_literature", True),
            requires_contradiction_data=parsed.get("requires_contradiction_data", False),
            original_query=query,
            confidence=parsed.get("confidence", 1.0),
            routing_notes=parsed.get("routing_notes", ""),
        )
