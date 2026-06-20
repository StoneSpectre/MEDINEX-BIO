"""
Step 8.1 — Writer Agent

Final node in the agent pipeline. Receives:
  - PlannerOutput (intent, entities)
  - EvidenceDoc list (from EvidenceAgent)
  - SubgraphResult (from GraphAgent, serialized as text)
  - Contradiction context (from GraphAgent.get_contradiction_context)
  - Session memory (prior conversation context)

Produces a structured WriterOutput:
  - summary: 2-3 sentence answer
  - mechanism: mechanistic explanation (if intent=mechanistic)
  - evidence_section: ranked citations with tier labels
  - uncertainty: known unknowns, contradictions, limitations
  - references: paper IDs + titles used
  - hypotheses: any Step 7 hypotheses relevant to the query
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional
import anthropic

from medinex.step8_research_copilot.agents.evidence_agent import EvidenceDoc


@dataclass
class WriterOutput:
    summary: str
    mechanism: str
    evidence_section: str
    uncertainty: str
    hypotheses: str
    references: list[dict]   # [{"paper_id": ..., "title": ..., "tier": ...}]
    raw_response: str = ""   # full LLM output for debugging


_SYSTEM_PROMPT = """
You are the Writer Agent for Medinex, a biomedical research intelligence platform.

You receive structured context from upstream agents and must produce a research-grade
response. Respond ONLY with valid JSON:

{
  "summary": "<2-3 sentence direct answer>",
  "mechanism": "<mechanistic explanation, empty string if not mechanistic>",
  "evidence_section": "<structured evidence summary citing [1], [2], etc.>",
  "uncertainty": "<known contradictions, limitations, open questions>",
  "hypotheses": "<relevant research hypotheses from the knowledge graph, or empty>",
  "references": [{"paper_id": "...", "title": "...", "tier": "..."}]
}

Rules:
- NEVER fabricate citations. Only reference papers provided in EVIDENCE CONTEXT.
- Flag contradictions from CONTRADICTION CONTEXT explicitly in uncertainty.
- For mechanistic queries, trace pathways using GRAPH CONTEXT.
- Match depth to the researcher's likely expertise level.
- Never express more confidence than the evidence supports.
"""


class WriterAgent:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6",
                 max_tokens: int = 2048):
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model
        self._max_tokens = max_tokens

    def write(
        self,
        query: str,
        intent: str,
        evidence_docs: list[EvidenceDoc],
        evidence_context: str,      # from EvidenceAgent.format_for_context()
        graph_context: str,         # from SubgraphResult.to_text_context()
        contradiction_context: list[dict],
        session_memory: str = "",
        hypothesis_context: str = "",
    ) -> WriterOutput:

        contradiction_text = ""
        if contradiction_context:
            lines = ["=== KNOWN CONTRADICTIONS ==="]
            for c in contradiction_context[:5]:
                lines.append(
                    f"  '{c.get('subj')} {c.get('rel')} {c.get('obj')}' "
                    f"CONTRADICTS "
                    f"'{c.get('other_subj')} {c.get('other_rel')} {c.get('other_obj')}' "
                    f"(confidence={c.get('confidence', 0):.2f})"
                )
            contradiction_text = "\n".join(lines)

        user_content = f"""
QUERY: {query}
INTENT: {intent}

{evidence_context}

{graph_context}

{contradiction_text}

{f'RESEARCH HYPOTHESES:\n{hypothesis_context}' if hypothesis_context else ''}

{f'SESSION CONTEXT:\n{session_memory}' if session_memory else ''}

Now write the structured response JSON.
"""
        message = self._client.messages.create(
            model=self._model,
            max_tokens=self._max_tokens,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)

        return WriterOutput(
            summary=parsed.get("summary", ""),
            mechanism=parsed.get("mechanism", ""),
            evidence_section=parsed.get("evidence_section", ""),
            uncertainty=parsed.get("uncertainty", ""),
            hypotheses=parsed.get("hypotheses", ""),
            references=parsed.get("references", []),
            raw_response=raw,
        )
