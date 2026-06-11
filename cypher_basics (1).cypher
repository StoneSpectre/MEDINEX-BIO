// ============================================================
// Medinex Phase 1 — Cypher Reference
// Steps 2–6 edition
//
// Run these blocks in the Neo4j Browser at http://localhost:7474
// Work top to bottom. Each section teaches one capability.
// ============================================================


// ── SECTION 1: CREATE NODES ─────────────────────────────────

CREATE (d:Disease {
  id: "MESH:D010300",
  name: "Parkinson's Disease",
  cui: "C0030567",
  category: "Neurological",
  description: "Progressive neurodegenerative disorder affecting dopaminergic neurons"
})
RETURN d;

CREATE (s:Symptom  {id: "S001", name: "Tremor"})
CREATE (s2:Symptom {id: "S002", name: "Bradykinesia"})
CREATE (s3:Symptom {id: "S003", name: "Rigidity"})
CREATE (g:Gene     {id: "ENSG00000145335", symbol: "SNCA", name: "Alpha-synuclein"})
CREATE (dr:Drug    {id: "DB00336", name: "Levodopa"})
CREATE (p:Pathway  {id: "hsa05012", name: "Parkinson disease", source: "kegg"})
CREATE (paper:Paper {pmid: "12345678", title: "SNCA in Parkinson's", year: 2022})
CREATE (r:Researcher {id: "john_doe", name: "John Doe", affiliation: "MIT"})
RETURN "Nodes created";


// ── SECTION 2: CREATE RELATIONSHIPS ─────────────────────────

MATCH (d:Disease {id: "MESH:D010300"}), (s:Symptom {id: "S001"})
MERGE (d)-[:HAS_SYMPTOM {source: "hetionet", frequency: "very common"}]->(s);

MATCH (d:Disease {id: "MESH:D010300"}), (g:Gene {id: "ENSG00000145335"})
MERGE (d)-[:ASSOCIATED_WITH_GENE {score: 0.95, source: "opentargets", evidence: "GWAS"}]->(g);

MATCH (dr:Drug {id: "DB00336"}), (d:Disease {id: "MESH:D010300"})
MERGE (dr)-[:TREATS {mechanism: "dopamine precursor", approval: "FDA"}]->(d);

MATCH (g:Gene {id: "ENSG00000145335"}), (p:Pathway {id: "hsa05012"})
MERGE (g)-[:INVOLVED_IN {source: "kegg"}]->(p);

MATCH (paper:Paper {pmid: "12345678"}), (d:Disease {id: "MESH:D010300"})
MERGE (paper)-[:MENTIONS_DISEASE {relevance: 0.9, section: "title"}]->(d);

MATCH (paper:Paper {pmid: "12345678"}), (r:Researcher {id: "john_doe"})
MERGE (paper)-[:AUTHORED_BY {position: 1, is_corresponding: true}]->(r);


// ── SECTION 3: BASIC QUERIES ─────────────────────────────────

// All symptoms of a disease
MATCH (d:Disease {name: "Parkinson's Disease"})-[:HAS_SYMPTOM]->(s:Symptom)
RETURN d.name AS disease, collect(s.name) AS symptoms;

// Drugs treating a disease + that disease's symptoms
MATCH (dr:Drug)-[:TREATS]->(d:Disease)-[:HAS_SYMPTOM]->(s:Symptom)
WHERE d.id = "MESH:D010300"
RETURN dr.name AS drug, d.name AS disease, collect(s.name) AS symptoms;

// Everything connected to Parkinson's (1 hop)
MATCH (d:Disease {id: "MESH:D010300"})-[r]-(connected)
RETURN d.name, type(r) AS rel, labels(connected)[0] AS type, connected.name
LIMIT 50;


// ── SECTION 4: MULTI-HOP TRAVERSAL ───────────────────────────

// Diseases sharing a gene with Parkinson's
MATCH (d:Disease {id: "MESH:D010300"})-[:ASSOCIATED_WITH_GENE]->(g:Gene)
      <-[:ASSOCIATED_WITH_GENE]-(other:Disease)
WHERE other.id <> "MESH:D010300"
RETURN other.name AS related_disease, g.symbol AS shared_gene,
       count(*) AS shared_gene_count
ORDER BY shared_gene_count DESC
LIMIT 20;

// Disease → Gene → Pathway chain
MATCH (d:Disease)-[:ASSOCIATED_WITH_GENE]->(g:Gene)-[:INVOLVED_IN]->(pw:Pathway)
WHERE d.id = "MESH:D010300"
RETURN d.name, g.symbol, pw.name
LIMIT 30;

// Drug → Disease → Gene (what genes do drugs indirectly target?)
MATCH (dr:Drug)-[:TREATS]->(d:Disease)-[:ASSOCIATED_WITH_GENE]->(g:Gene)
RETURN dr.name AS drug, d.name AS disease, collect(DISTINCT g.symbol)[..5] AS genes
ORDER BY size(collect(DISTINCT g.symbol)) DESC
LIMIT 10;


// ── SECTION 5: SHORTEST PATH ─────────────────────────────────
// Requires two nodes to already exist with connected paths.
// Powers the Disease Explorer "Connect" feature.

// Shortest path between any two nodes
MATCH path = shortestPath(
    (a {id: "MESH:D010300"})-[*1..6]-(b {id: "DB00336"})
)
RETURN
    [node IN nodes(path) | coalesce(node.name, node.pmid, node.id)] AS node_names,
    [node IN nodes(path) | labels(node)[0]]                          AS labels,
    [rel  IN relationships(path) | type(rel)]                        AS rels,
    length(path) AS hops;

// All shortest paths (returns multiple if equally short)
MATCH path = allShortestPaths(
    (a:Disease {id: "MESH:D010300"})-[*]-(b:Drug {id: "DB00336"})
)
RETURN path LIMIT 5;

// Paths of exactly 3 hops between two diseases
MATCH path = (d1:Disease)-[*3]-(d2:Disease)
WHERE d1.id = "MESH:D010300" AND d1 <> d2
RETURN [n IN nodes(path) | n.name] AS chain
LIMIT 10;


// ── SECTION 6: FULL-TEXT SEARCH INDEXES ──────────────────────
// NEW in Step 5 — essential for Disease Explorer search bar.
// Run ONCE to create indexes; then use CALL db.index.fulltext.queryNodes()

// Create full-text indexes
CREATE FULLTEXT INDEX disease_fulltext IF NOT EXISTS
FOR (n:Disease) ON EACH [n.name, n.description];

CREATE FULLTEXT INDEX gene_fulltext IF NOT EXISTS
FOR (n:Gene) ON EACH [n.name, n.symbol, n.description];

CREATE FULLTEXT INDEX drug_fulltext IF NOT EXISTS
FOR (n:Drug) ON EACH [n.name, n.description];

CREATE FULLTEXT INDEX paper_fulltext IF NOT EXISTS
FOR (n:Paper) ON EACH [n.title, n.abstract];

// Use full-text search (fuzzy match)
CALL db.index.fulltext.queryNodes("disease_fulltext", "parkinson~")
YIELD node, score
RETURN node.name AS disease, node.id AS id, score
ORDER BY score DESC
LIMIT 10;

// Search across multiple node types (union)
CALL db.index.fulltext.queryNodes("disease_fulltext", "diabetes")
YIELD node AS n, score
RETURN labels(n)[0] AS type, n.name AS name, n.id AS id, score
UNION ALL
CALL db.index.fulltext.queryNodes("drug_fulltext", "diabetes")
YIELD node AS n, score
RETURN labels(n)[0] AS type, n.name AS name, n.id AS id, score
ORDER BY score DESC
LIMIT 20;


// ── SECTION 7: APOC PROCEDURES ───────────────────────────────
// APOC (Awesome Procedures On Cypher) — install separately:
//   https://neo4j.com/labs/apoc/
// In Neo4j Desktop: Plugins tab → APOC → Install
// In headless: copy apoc jar to $NEO4J_HOME/plugins/

// apoc.path.spanningTree — explore neighbourhood up to N hops
// (more flexible than shortestPath for discovery)
MATCH (d:Disease {id: "MESH:D010300"})
CALL apoc.path.spanningTree(d, {
    relationshipFilter: "HAS_SYMPTOM>|ASSOCIATED_WITH_GENE>|TREATS<",
    minLevel: 1,
    maxLevel: 2
})
YIELD path
RETURN path LIMIT 50;

// apoc.export.json — export a disease subgraph to JSON
// (useful for the Disease Explorer API to cache pre-computed subgraphs)
MATCH (d:Disease {id: "MESH:D010300"})-[r]-(n)
WITH collect(d) + collect(n) AS nodes, collect(r) AS rels
CALL apoc.export.json.data(nodes, rels, null, {stream: true})
YIELD data
RETURN data;

// apoc.merge.node — upsert with dynamic label (useful in seeder)
CALL apoc.merge.node(["Disease"], {id: "MESH:D010300"}, {name: "Parkinson Disease"})
YIELD node RETURN node;

// apoc.periodic.iterate — batch Cypher over large datasets
// Example: set disease categories in bulk
CALL apoc.periodic.iterate(
    "MATCH (d:Disease) WHERE d.category IS NULL RETURN d",
    "SET d.category = 'Unclassified'",
    {batchSize: 200}
)
YIELD batches, total, errorMessages
RETURN batches, total;


// ── SECTION 8: CITATION INTELLIGENCE ─────────────────────────
// New in Step 6 — powers the Citation Intelligence layer.

// Most cited papers in graph (by number of CITES edges pointing to them)
MATCH (p:Paper)<-[:CITES]-(citing:Paper)
RETURN p.title AS paper, p.year AS year, count(citing) AS citation_count
ORDER BY citation_count DESC
LIMIT 20;

// Citation path between two papers (how is paper A connected to paper B?)
MATCH path = shortestPath(
    (a:Paper {pmid: "11111111"})-[:CITES*1..5]->(b:Paper {pmid: "22222222"})
)
RETURN [n IN nodes(path) | n.title] AS titles, length(path) AS depth;

// Research evolution over time: papers per year per disease
MATCH (p:Paper)-[:MENTIONS_DISEASE]->(d:Disease)
WHERE p.year IS NOT NULL
RETURN d.name AS disease, p.year AS year, count(p) AS paper_count
ORDER BY d.name, year
LIMIT 50;

// Influential researchers — ordered by h_index
MATCH (r:Researcher)<-[:AUTHORED_BY]-(p:Paper)
RETURN r.name AS researcher, r.affiliation AS institution,
       r.h_index AS h_index, count(p) AS papers_in_graph
ORDER BY r.h_index DESC NULLS LAST
LIMIT 20;

// Researcher collaboration network (who co-authored a paper together?)
MATCH (r1:Researcher)<-[:AUTHORED_BY]-(p:Paper)-[:AUTHORED_BY]->(r2:Researcher)
WHERE id(r1) < id(r2)
RETURN r1.name, r2.name, count(p) AS shared_papers
ORDER BY shared_papers DESC
LIMIT 20;

// Competing theories: papers on same disease but different gene focus
MATCH (p1:Paper)-[:MENTIONS_DISEASE]->(d:Disease)<-[:MENTIONS_DISEASE]-(p2:Paper)
MATCH (p1)-[:MENTIONS_GENE]->(g1:Gene)
MATCH (p2)-[:MENTIONS_GENE]->(g2:Gene)
WHERE g1.id <> g2.id AND p1.pmid < p2.pmid
RETURN d.name AS disease, g1.symbol AS gene_A, g2.symbol AS gene_B,
       count(*) AS paper_pairs
ORDER BY paper_pairs DESC
LIMIT 10;


// ── SECTION 9: PAGERANK ON CITATION GRAPH ────────────────────
// Requires GDS (Graph Data Science) plugin:
//   Neo4j Desktop: Plugins tab → Graph Data Science Library
// Identifies landmark / high-influence papers.

// Step 1: Project a named graph of Paper nodes + CITES edges
CALL gds.graph.project(
    "citation_graph",
    "Paper",
    "CITES"
)
YIELD graphName, nodeCount, relationshipCount;

// Step 2: Run PageRank
CALL gds.pageRank.write(
    "citation_graph",
    {
        maxIterations:    20,
        dampingFactor:    0.85,
        writeProperty:    "pagerank"
    }
)
YIELD nodePropertiesWritten, ranIterations;

// Step 3: Query top papers by PageRank
MATCH (p:Paper)
WHERE p.pagerank IS NOT NULL
RETURN p.title, p.year, p.pagerank AS score
ORDER BY score DESC
LIMIT 20;

// Step 4: Clean up projected graph when done
CALL gds.graph.drop("citation_graph") YIELD graphName;


// ── SECTION 10: DISEASE EXPLORER QUERY TEMPLATES ─────────────
// These are the exact queries the FastAPI backend will run.
// Test them here before wiring into the API.

// GET /disease/:name — full neighbourhood
MATCH (d:Disease)
WHERE toLower(d.name) CONTAINS toLower("parkinson")
MATCH (d)
OPTIONAL MATCH (d)-[:HAS_SYMPTOM]->(s:Symptom)
OPTIONAL MATCH (d)-[:ASSOCIATED_WITH_GENE]->(g:Gene)
OPTIONAL MATCH (dr:Drug)-[:TREATS]->(d)
OPTIONAL MATCH (p:Paper)-[:MENTIONS_DISEASE]->(d)
OPTIONAL MATCH (d)-[:ASSOCIATED_WITH_GENE]->(:Gene)-[:INVOLVED_IN]->(pw:Pathway)
RETURN
    d                             AS disease,
    collect(DISTINCT s)           AS symptoms,
    collect(DISTINCT g)[..20]     AS genes,
    collect(DISTINCT dr)          AS drugs,
    collect(DISTINCT p)[..10]     AS papers,
    collect(DISTINCT pw)          AS pathways
LIMIT 1;

// GET /search?q=:term — full-text search
CALL db.index.fulltext.queryNodes("disease_fulltext", $term + "~")
YIELD node, score
RETURN labels(node)[0] AS type, node.name AS name, node.id AS id, score
ORDER BY score DESC
LIMIT 20;

// GET /connect?from=:id&to=:id — shortest path
MATCH path = shortestPath(
    (a {id: $from_id})-[*1..6]-(b {id: $to_id})
)
RETURN
    [n IN nodes(path) | coalesce(n.name, n.pmid, n.id)] AS names,
    [n IN nodes(path) | labels(n)[0]]                    AS types,
    [r IN relationships(path) | type(r)]                 AS rels,
    length(path) AS hops
LIMIT 3;


// ── SECTION 11: INDEX REFERENCE ──────────────────────────────

// Standard range indexes
CREATE INDEX disease_id      IF NOT EXISTS FOR (n:Disease)    ON (n.id);
CREATE INDEX disease_name    IF NOT EXISTS FOR (n:Disease)    ON (n.name);
CREATE INDEX disease_cui     IF NOT EXISTS FOR (n:Disease)    ON (n.cui);
CREATE INDEX drug_id         IF NOT EXISTS FOR (n:Drug)       ON (n.id);
CREATE INDEX gene_id         IF NOT EXISTS FOR (n:Gene)       ON (n.id);
CREATE INDEX gene_symbol     IF NOT EXISTS FOR (n:Gene)       ON (n.symbol);
CREATE INDEX protein_id      IF NOT EXISTS FOR (n:Protein)    ON (n.id);
CREATE INDEX symptom_id      IF NOT EXISTS FOR (n:Symptom)    ON (n.id);
CREATE INDEX pathway_id      IF NOT EXISTS FOR (n:Pathway)    ON (n.id);
CREATE INDEX paper_pmid      IF NOT EXISTS FOR (n:Paper)      ON (n.pmid);
CREATE INDEX paper_year      IF NOT EXISTS FOR (n:Paper)      ON (n.year);
CREATE INDEX researcher_id   IF NOT EXISTS FOR (n:Researcher) ON (n.id);

// Check all indexes
SHOW INDEXES YIELD name, type, state, labelsOrTypes, properties;


// ── SECTION 12: RESET (DEV ONLY) ─────────────────────────────
// Uncomment ONLY when you want to wipe everything and re-seed.

// MATCH (n) DETACH DELETE n;
