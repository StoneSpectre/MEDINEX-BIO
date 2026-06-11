# Medinex — Phase 1 Steps 1–6

## File map

| File | Step | Purpose |
|------|------|---------|
| `setup_neo4j.sh`           | 2 | Install Neo4j on Ubuntu |
| `cypher_basics.cypher`     | 2–6 | Cypher reference — CRUD, traversal, APOC, GDS, full-text |
| `schema.py`                | 3 | Node + edge property schemas (all 8 types) |
| `db.py`                    | 3–6 | Neo4j driver wrapper — CRUD, bulk writes, health check |
| `seed.py`                  | 3–4 | Ingest from Hetionet, OpenTargets, PubMed, S2, KEGG |
| `verify.py`                | 3–6 | Graph sanity checks — nodes, edges, orphans, quality |
| `api.py`                   | 5 | FastAPI Disease Explorer query layer |
| `citation_intelligence.py` | 6 | PageRank, landmark papers, competing theories |
| `.env.example`             | — | Config template |
| `requirements.txt`         | — | Python dependencies |

---

## Step 2 — Neo4j setup

```bash
chmod +x setup_neo4j.sh && ./setup_neo4j.sh
sudo systemctl status neo4j
# Open http://localhost:7474  Login: neo4j / neo4j → change to medinex123
```

Optional plugins (needed for Steps 5–6):
- **APOC**: Neo4j Desktop → Plugins → APOC → Install
- **GDS** (Graph Data Science): Neo4j Desktop → Plugins → GDS → Install

---

## Step 3 — Seed the knowledge graph

```bash
pip install -r requirements.txt
cp .env.example .env           # set NEO4J_PASSWORD
# Edit seed.py — set PUBMED_EMAIL to your email
python seed.py
python verify.py
```

Expected after Step 3:
- ~137 Disease nodes, ~9,000 Gene, ~1,500 Drug, ~400 Symptom, ~12,000+ edges

---

## Step 4 — Add Paper + Researcher nodes

`seed.py` now runs Step 4 automatically in the same pass:
- Full PubMed metadata (title, abstract, year, authors)
- Researcher nodes with AUTHORED_BY edges
- Semantic Scholar h_index enrichment
- KEGG Pathway nodes + INVOLVED_IN edges

```bash
# Step 4 runs as part of seed.py — no separate script needed
python seed.py
python verify.py
```

Set `S2_API_KEY` in `.env` to raise Semantic Scholar rate limits.

---

## Step 5 — Disease Explorer API

```bash
uvicorn api:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

Key endpoints:

| Endpoint | What it does |
|----------|-------------|
| `GET /health` | Connection check + node counts |
| `GET /search?q=parkinson` | Full-text search |
| `GET /disease/MESH:D010300` | Full neighbourhood: symptoms, genes, drugs, papers, pathways |
| `GET /connect?from_id=X&to_id=Y` | Shortest path between any two nodes |
| `GET /researchers/top` | Top researchers by h_index |
| `GET /citations/12345678` | Citation graph for a paper |
| `GET /pathways/MESH:D010300` | Pathways linked via genes |
| `GET /related/MESH:D010300` | Diseases sharing genes |
| `GET /timeline/MESH:D010300` | Papers per year chart data |

---

## Step 6 — Citation Intelligence

```bash
python citation_intelligence.py
```

Requires Neo4j GDS plugin for PageRank. Falls back to in-degree ranking if not installed.

Features:
- `run_pagerank()` — writes PageRank score to every Paper node
- `detect_landmark_papers()` — top influential papers
- `find_competing_theories()` — gene-level mechanistic debates per disease
- `find_citation_path()` — how knowledge flowed from paper A → paper B
- `research_evolution()` — papers per year per disease
- `researcher_influence()` — h_index + graph centrality
- `collaboration_network()` — co-authorship pairs

---

## What you have at the end of Step 6

| Layer | What's built |
|-------|-------------|
| **Graph** | ~137 Disease, ~9K Gene, ~1.5K Drug, ~400 Symptom, ~N Pathway, ~M Paper, ~K Researcher |
| **Edges** | HAS_SYMPTOM, ASSOCIATED_WITH_GENE, TREATS, MENTIONS_DISEASE, AUTHORED_BY, CITES, INVOLVED_IN |
| **Search** | Full-text indexes on Disease, Gene, Drug, Paper |
| **API** | 9 REST endpoints powering the Disease Explorer |
| **Citation layer** | PageRank, landmark detection, competing theories, researcher influence |

---

## Next: Step 7 — Graph-enhanced Study Assistant

Replace flat RAG with Graph RAG:
- A query for "Parkinson's" now returns graph context: pathway + gene + drug chain
- Richer, grounded answers instead of flat document retrieval
