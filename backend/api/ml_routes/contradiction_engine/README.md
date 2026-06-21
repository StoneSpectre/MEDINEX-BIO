# Step 7 — Contradiction Intelligence Engine

Implements the architecture from your doc: Paper Store → Claim Extraction →
Claim Graph → NLI Engine → Contradiction Graph → Cluster Engine → Hypothesis
Engine → Gap Discovery Engine.

## What's actually real here

- **Postgres layer** (`db/`): real `asyncpg` pool, parameterized queries,
  schema with indexes and foreign keys (`db/schema.sql`).
- **Neo4j layer** (`graph/`): real `neo4j` driver, idempotent constraints,
  Cypher for graph construction, contradiction subgraph traversal, and the
  knowledge-gap query (entities with high individual connectivity but no
  direct connecting claim — see `find_knowledge_gaps`).
- **LLM layer** (`llm/`): pluggable interface; the included implementation
  calls the real Anthropic API for claim extraction and hypothesis
  generation. JSON output is schema-validated, not trusted blindly.
- **NLI service** (`nli/`): a real FastAPI microservice wrapping a
  HuggingFace biomedical NLI checkpoint, with label-set normalization
  (since different MNLI fine-tunes order entailment/neutral/contradiction
  differently).
- **Clustering, gap discovery, scoring** (`clustering/`, `gap_discovery/`,
  `scoring/`): pure logic, fully unit-tested, no external infra needed —
  **12/12 tests pass in this sandbox right now** (`pytest tests/`).

## What needs your infra to actually run

- `db/postgres_client.py`, `graph/neo4j_client.py`, `nli/nli_service.py`,
  and `llm/anthropic_client.py` are correct, idiomatic code against the
  official SDKs — but they need real connection strings/credentials and
  weren't executed against live services in this sandbox (no network
  access to arbitrary Postgres/Neo4j hosts or the HuggingFace hub here).
  I verified them by static syntax check + clean import with the real
  SDKs installed.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in real POSTGRES_DSN, NEO4J_*, ANTHROPIC_API_KEY

# Option A: point .env at your existing managed Postgres/Neo4j
# Option B: spin up local instances for development
docker compose up -d
psql $POSTGRES_DSN -f db/schema.sql

# Start the NLI microservice (separate process/container)
uvicorn nli.nli_service:app --host 0.0.0.0 --port 8081

# Run the pipeline
python pipeline.py path/to/paper.txt "Paper Title"
```

## Scaling note (100M+ claims)

Contradiction detection is the one part of this that's naturally O(n²).
`contradiction_detector.py` only ever compares claims within an
**entity-pair bucket** (same subject_entity_id + object_entity_id) — never
globally. Each bucket is small (tens to low hundreds of claims, not
millions), and buckets are independent, so this parallelizes trivially
across a worker queue keyed by entity pair. The `idx_claims_subj_obj`
index in `schema.sql` is what makes bucket lookups fast at scale.

## Next

Step 8 (Research Copilot) builds on top of this — its Graph Agent and
Evidence Agent both query the Neo4j/Postgres layers built here.
