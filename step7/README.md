# Medinex Phase 1 — Steps 7 and 8

## What these steps do

| Step | What it is | Key file |
|------|-----------|---------|
| 7    | Connect knowledge graph to Study Assistant via GraphRAG | `vector_store.py`, `pipeline.py`, `assistant.py` |
| 8    | Proprietary graph asset consolidation and audit | `graph_audit.py` |

---

## Step 7 — GraphRAG + Study Assistant upgrade

### What changes

Phase 0 Study Assistant answered questions using flat RAG on text chunks.

Step 7 upgrades it:

    User asks question
        ↓
    Embed question (PubMedBERT)
        ↓
    Vector search → find closest Disease/Gene/Drug nodes (Qdrant)
        ↓
    Multi-hop Neo4j traversal from anchor nodes
        ↓
    Rank evidence by OpenTargets scores + citation count
        ↓
    Assemble structured context (diseases, genes, drugs, symptoms, papers)
        ↓
    Claude answers using ONLY graph-grounded context
        ↓
    Return answer + evidence trail (traceable citations)

Every answer is now traceable. No black-box LLM guesses.

### Prerequisites

Neo4j running with Phase 1 data seeded (run seed.py first).

Qdrant running:

    docker run -p 6333:6333 qdrant/qdrant

Or Qdrant Cloud: https://cloud.qdrant.io (free tier available)

### Install dependencies

    pip install -r requirements.txt

### Build vector indexes (run once, ~5-10 min)

    python vector_store.py

This embeds all Disease, Drug, Gene, Symptom nodes and Paper abstracts.
Expected output:

    [VectorStore] Loading PubMedBERT embedding model...
    [VectorStore] Building node index from Neo4j...
    [VectorStore] Embedding 9800 nodes...
    [VectorStore] Node index complete: 9800 vectors.
    [VectorStore] Building paper index from Neo4j...
    [VectorStore] Embedding 480 papers...
    [VectorStore] Paper index complete: 480 vectors.
    [VectorStore] Collection stats: {'medinex_nodes': 9800, 'medinex_papers': 480}

### Test the GraphRAG pipeline

    python pipeline.py "What genes are associated with Parkinson's Disease?"

Expected output:

    [GraphRAG] Stage 1: Parsing question...
               intent=disease_info  focus='Parkinson's Disease'
    [GraphRAG] Stage 2: Vector search...
               anchors=['Parkinson Disease', 'LRRK2', 'SNCA']
    [GraphRAG] Stage 3: Graph traversal...
               diseases=1  genes=12  drugs=4  papers=8
    [GraphRAG] Stage 4: Ranking evidence...
    [GraphRAG] Stage 5: Assembling context...
    [GraphRAG] Stage 6: Generating answer...
    [GraphRAG] Done.

### Run the Study Assistant API

    ANTHROPIC_API_KEY=sk-ant-... uvicorn assistant:app --reload --port 8001

Docs: http://localhost:8001/docs

Endpoints:

    POST /ask                    Q&A with GraphRAG
    GET  /explain/{disease}      Structured disease explanation
    GET  /flashcards/{topic}     Generate flashcards
    GET  /quiz/{topic}           Generate MCQ questions
    POST /summarise              Summarise a paper by PMID

### Example API calls

Ask a question (beginner level):

    curl -X POST http://localhost:8001/ask \
      -H "Content-Type: application/json" \
      -d '{"question": "Explain Parkinson Disease", "user_level": "beginner"}'

Generate flashcards:

    curl http://localhost:8001/flashcards/Parkinson%20Disease?count=10&level=medical

Quiz questions:

    curl http://localhost:8001/quiz/Alzheimer%20Disease?count=5

Summarise a paper:

    curl -X POST http://localhost:8001/summarise \
      -H "Content-Type: application/json" \
      -d '{"pmid": "15258601"}'

---

## Step 8 — Graph asset audit

Step 8 is not a new data source. It verifies the knowledge graph is a real,
defensible proprietary asset.

### Run the dashboard

    python graph_audit.py

Expected output:

    ╔══════════════════════════════════════════════════════╗
    ║   Medinex Biomedical Knowledge Graph — Asset Report  ║
    ╚══════════════════════════════════════════════════════╝

    ── Node inventory ───────────────────────────────────────
      Disease       :     137  █
      Gene          :   9,145  ████████████████████████████████████████
      Drug          :   1,552  ███████████████
      Symptom       :     415  ████
      Pathway       :      87  
      Paper         :     480  ████
      Researcher    :   1,240  ████████████
      TOTAL         :  13,056

    ── Relationship inventory ───────────────────────────────
      ASSOCIATED_WITH_GENE        :  12,623
      HAS_SYMPTOM                 :   3,357
      TREATS                      :     592
      INVOLVED_IN                 :   2,100
      MENTIONS_DISEASE            :     960
      AUTHORED_BY                 :   3,720
      CITES                       :   1,890
      TOTAL                       :  25,242

    ── Disease context coverage ─────────────────────────────
      Diseases with full context: 89/137  (65.0%)

    ── Graph fingerprint: a3f7c91b2e4d
       Generated: 2027-03-15T10:22:41Z

### Export a snapshot backup

From Python:

    from db import MedinexGraph
    from graph_audit import GraphAudit

    with MedinexGraph() as graph:
        audit = GraphAudit(graph)
        audit.export_snapshot("medinex_snapshot_2027_03.json")

The snapshot is a full JSON export of all nodes and edges.
Import it to a new Neo4j instance or use it as a checkpoint.

---

## File map

    vector_store.py   — PubMedBERT embeddings + Qdrant index management
    pipeline.py       — GraphRAG pipeline (6 stages)
    assistant.py      — FastAPI Study Assistant with GraphRAG
    graph_audit.py    — Asset audit, coverage scoring, snapshot export
    requirements.txt  — All dependencies for Steps 7 and 8

---

## What you have at the end of Step 8

Your Medinex Biomedical Knowledge Graph is now a proprietary asset:

    13,000+ nodes
    25,000+ edges
    9,000+ genes linked to diseases with evidence scores
    400+ symptoms
    1,500+ drug-disease treatment links
    480+ papers with full abstracts
    1,200+ researcher profiles
    87+ biological pathways
    25,000+ citation relationships

And the Study Assistant answers questions using this graph — with every
claim traceable back to a graph edge or a paper PMID.

This is Phase 2 foundation: the Research Workspace builds on top of this.
