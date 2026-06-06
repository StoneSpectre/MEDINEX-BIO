// ============================================================
// Medinex Phase 1 — Cypher Basics
// Run these in the Neo4j Browser at http://localhost:7474
// Work through them top to bottom. Each block teaches one idea.
// ============================================================


// ── 1. CREATE A NODE ────────────────────────────────────────
// A Disease node with properties
CREATE (d:Disease {
  id: "D008569",
  name: "Parkinson's Disease",
  cui: "C0030567",
  description: "Progressive neurodegenerative disorder"
})
RETURN d;


// ── 2. CREATE MORE NODES ────────────────────────────────────
CREATE (s:Symptom {id: "S001", name: "Tremor"})
CREATE (s2:Symptom {id: "S002", name: "Bradykinesia"})
CREATE (s3:Symptom {id: "S003", name: "Rigidity"})
CREATE (g:Gene {id: "SNCA", name: "Alpha-synuclein", cui: "C1366548"})
CREATE (dr:Drug {id: "DB00336", name: "Levodopa", cui: "C0023637"})
RETURN "Nodes created";


// ── 3. CREATE RELATIONSHIPS ─────────────────────────────────
// Link disease to symptoms
MATCH (d:Disease {name: "Parkinson's Disease"})
MATCH (s:Symptom {name: "Tremor"})
CREATE (d)-[:HAS_SYMPTOM]->(s);

MATCH (d:Disease {name: "Parkinson's Disease"})
MATCH (s:Symptom {name: "Bradykinesia"})
CREATE (d)-[:HAS_SYMPTOM]->(s);

MATCH (d:Disease {name: "Parkinson's Disease"})
MATCH (s:Symptom {name: "Rigidity"})
CREATE (d)-[:HAS_SYMPTOM]->(s);

// Link disease to gene
MATCH (d:Disease {name: "Parkinson's Disease"})
MATCH (g:Gene {name: "Alpha-synuclein"})
CREATE (d)-[:ASSOCIATED_WITH_GENE {evidence: "strong", source: "OMIM"}]->(g);

// Link drug to disease (treatment)
MATCH (dr:Drug {name: "Levodopa"})
MATCH (d:Disease {name: "Parkinson's Disease"})
CREATE (dr)-[:TREATS {mechanism: "dopamine precursor", approval: "FDA"}]->(d);


// ── 4. QUERY THE GRAPH ──────────────────────────────────────
// Find all symptoms of Parkinson's
MATCH (d:Disease {name: "Parkinson's Disease"})-[:HAS_SYMPTOM]->(s:Symptom)
RETURN d.name AS disease, collect(s.name) AS symptoms;

// Find drugs that treat a disease and its symptoms
MATCH (dr:Drug)-[:TREATS]->(d:Disease)-[:HAS_SYMPTOM]->(s:Symptom)
WHERE d.name = "Parkinson's Disease"
RETURN dr.name AS drug, d.name AS disease, collect(s.name) AS symptoms_it_targets;

// Find all nodes connected to Parkinson's (1 hop)
MATCH (d:Disease {name: "Parkinson's Disease"})-[r]-(connected)
RETURN d.name, type(r) AS relationship, labels(connected)[0] AS node_type, connected.name;


// ── 5. GRAPH TRAVERSAL (multi-hop) ──────────────────────────
// Disease → Gene → (what else is that gene linked to?)
MATCH (d:Disease)-[:ASSOCIATED_WITH_GENE]->(g:Gene)<-[:ASSOCIATED_WITH_GENE]-(other:Disease)
WHERE d.name = "Parkinson's Disease"
RETURN d.name, g.name AS shared_gene, other.name AS related_disease;


// ── 6. INDEXES (always add these for performance) ───────────
CREATE INDEX disease_id IF NOT EXISTS FOR (d:Disease) ON (d.id);
CREATE INDEX disease_name IF NOT EXISTS FOR (d:Disease) ON (d.name);
CREATE INDEX disease_cui IF NOT EXISTS FOR (d:Disease) ON (d.cui);
CREATE INDEX gene_id IF NOT EXISTS FOR (g:Gene) ON (g.id);
CREATE INDEX drug_id IF NOT EXISTS FOR (dr:Drug) ON (dr.id);
CREATE INDEX symptom_id IF NOT EXISTS FOR (s:Symptom) ON (s.id);
CREATE INDEX paper_pmid IF NOT EXISTS FOR (p:Paper) ON (p.pmid);


// ── 7. DELETE EVERYTHING (use to reset during dev) ──────────
// MATCH (n) DETACH DELETE n;
// (Uncomment only when you want to wipe the graph)
