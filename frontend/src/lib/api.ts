// medinex/frontend/src/lib/api.ts
// Typed API client wrapping all FastAPI endpoints.

import type {
  DiseaseGraph, SearchResult, PathStep, TimelinePoint,
  RelatedDisease, PaperNode, ResearcherNode, CompetingTheory,
  GraphStats, PathwayNode,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Core ──────────────────────────────────────────────────────

export async function getStats(): Promise<GraphStats> {
  return get("/stats");
}

export async function searchNodes(q: string, limit = 20): Promise<{ results: SearchResult[]; count: number }> {
  return get(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export async function getDisease(id: string): Promise<DiseaseGraph> {
  return get(`/disease/${encodeURIComponent(id)}`);
}

export async function getRelated(diseaseId: string, limit = 10): Promise<{ related: RelatedDisease[] }> {
  return get(`/related/${encodeURIComponent(diseaseId)}?limit=${limit}`);
}

export async function getTimeline(diseaseId: string): Promise<{ timeline: TimelinePoint[] }> {
  return get(`/timeline/${encodeURIComponent(diseaseId)}`);
}

export async function getPathways(diseaseId: string): Promise<{ pathways: PathwayNode[] }> {
  return get(`/pathways/${encodeURIComponent(diseaseId)}`);
}

export async function getConnect(fromId: string, toId: string, maxHops = 4): Promise<{ paths: PathStep[] }> {
  return get(`/connect?from_id=${encodeURIComponent(fromId)}&to_id=${encodeURIComponent(toId)}&max_hops=${maxHops}`);
}

// ── Researchers ───────────────────────────────────────────────

export async function getTopResearchers(limit = 20, diseaseId?: string): Promise<{ researchers: ResearcherNode[] }> {
  const d = diseaseId ? `&disease_id=${encodeURIComponent(diseaseId)}` : "";
  return get(`/researchers/top?limit=${limit}${d}`);
}

// ── Citations ─────────────────────────────────────────────────

export async function getCitations(pmid: string): Promise<{
  paper: PaperNode; cited_by: PaperNode[]; cites: PaperNode[];
  in_degree: number; is_landmark: boolean;
}> {
  return get(`/citations/${pmid}`);
}

export async function getLandmarkPapers(topN = 20): Promise<{ papers: PaperNode[] }> {
  return get(`/citations/landmark?top_n=${topN}`);
}

export async function getCompetingTheories(diseaseId?: string, limit = 20): Promise<{ theories: CompetingTheory[] }> {
  const d = diseaseId ? `?disease_id=${encodeURIComponent(diseaseId)}` : `?limit=${limit}`;
  return get(`/citations/competing${d}`);
}

export async function getResearcherInfluence(topN = 20): Promise<{ researchers: ResearcherNode[] }> {
  return get(`/citations/researcher-influence?top_n=${topN}`);
}

export async function getCitationEvolution(diseaseId: string): Promise<{ data: TimelinePoint[] }> {
  return get(`/citations/evolution/${encodeURIComponent(diseaseId)}`);
}

export async function getCitationPath(fromPmid: string, toPmid: string): Promise<{ paths: unknown[] }> {
  return get(`/citations/path?from_pmid=${fromPmid}&to_pmid=${toPmid}`);
}
