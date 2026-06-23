import { useState, useCallback } from "react";

// ─── Design tokens ───────────────────────────────────────────────────────────
// Dark clinical: #0A0F1E bg, #0D1B2A panels, #00C2A8 teal accent,
// #6B7FD4 indigo-cool, #E2E8F0 primary text, #64748B muted.
// Mono: JetBrains Mono for data; system-ui for prose.

const ACCENT = "#00C2A8";
const ACCENT2 = "#6B7FD4";
const BG = "#0A0F1E";
const PANEL = "#0D1B2A";
const PANEL2 = "#111827";
const BORDER = "#1E293B";
const TEXT = "#E2E8F0";
const MUTED = "#64748B";
const WARN = "#F59E0B";
const ERR = "#EF4444";
const SUCCESS = "#10B981";

const css = (obj) => obj; // identity for inline style objects

// ─── Prompts ──────────────────────────────────────────────────────────────────

const INTENT_PROMPT = (query) => `You are a biomedical NLP expert implementing Step 1.1 of a GraphRAG pipeline.

Analyze this biomedical query and return ONLY valid JSON (no markdown, no explanation):

Query: "${query}"

Return exactly this structure:
{
  "intent": "<one of: mechanistic|diagnostic|therapeutic|comparative|epidemiological|genetic|pathway|drug_discovery>",
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence why>",
  "retrieval_strategy": "<what documents/sources are needed>",
  "entities_hint": ["<list entity types expected>"]
}`;

const NER_PROMPT = (query) => `You are a biomedical NER expert implementing Step 1.2 of a GraphRAG pipeline.

Perform Named Entity Recognition on this query. Return ONLY valid JSON:

Query: "${query}"

Return exactly this structure:
{
  "entities": [
    {
      "text": "<entity text>",
      "type": "<one of: DISEASE|GENE|PROTEIN|DRUG|PATHWAY|ORGANISM|CELL_TYPE|SYMPTOM|CHEMICAL>",
      "start": <char_index>,
      "end": <char_index>,
      "confidence": <0.0-1.0>
    }
  ],
  "token_labels": [
    {"token": "<word>", "label": "<B-TYPE|I-TYPE|O>"}
  ]
}`;

const LINKING_PROMPT = (entities) => `You are a biomedical entity linker implementing Step 1.3 of a GraphRAG pipeline.

For each entity, link it to the correct database identifier. Return ONLY valid JSON:

Entities: ${JSON.stringify(entities)}

Return exactly this structure:
{
  "linked_entities": [
    {
      "text": "<original text>",
      "canonical_name": "<preferred name>",
      "database": "<UMLS|MeSH|SNOMED_CT|HGNC|ChEMBL|UniProt|KEGG>",
      "identifier": "<database_id e.g. UMLS:C0027051>",
      "synonyms": ["<alias1>", "<alias2>"],
      "confidence": <0.0-1.0>
    }
  ]
}`;

const RELATION_PROMPT = (query, entities) => `You are a biomedical relation extractor implementing Step 1.4 of a GraphRAG pipeline.

Extract relations between entities and predict multi-hop reasoning needs. Return ONLY valid JSON:

Query: "${query}"
Entities: ${JSON.stringify(entities)}

Return exactly this structure:
{
  "relations": [
    {
      "subject": "<entity>",
      "relation": "<TREATS|CAUSES|INHIBITS|ACTIVATES|ASSOCIATED_WITH|EXPRESSED_IN|ENCODES|TARGETS|INTERACTS_WITH>",
      "object": "<entity>",
      "confidence": <0.0-1.0>
    }
  ],
  "multi_hop": {
    "required": <true|false>,
    "expected_hops": <integer>,
    "reasoning_chain": ["<step1>", "<step2>", "..."],
    "traversal_pattern": "<graph traversal description>"
  }
}`;

const RETRIEVAL_PROMPT = (query, intent, entities) => `You are a biomedical GraphRAG retrieval engine implementing Step 2 of the pipeline.

Simulate semantic vector retrieval + hybrid BM25 results. Return ONLY valid JSON:

Query: "${query}"
Intent: "${intent}"
Key Entities: ${JSON.stringify(entities.map(e => e.text))}

Return exactly this structure:
{
  "dense_results": [
    {
      "rank": 1,
      "title": "<realistic paper/document title>",
      "source": "<PubMed|ClinicalTrials|DrugBank|OMIM|Reactome>",
      "year": <2018-2024>,
      "relevance_score": <0.0-1.0>,
      "snippet": "<2 sentence relevant excerpt>",
      "doi": "<fake but realistic DOI>"
    }
  ],
  "bm25_results": [
    {
      "rank": 1,
      "title": "<title>",
      "source": "<source>",
      "bm25_score": <0.0-20.0>,
      "exact_match_terms": ["<term1>", "<term2>"]
    }
  ],
  "rrf_fused": [
    {
      "rank": 1,
      "title": "<title>",
      "rrf_score": <0.0-1.0>,
      "source_ranks": {"dense": <int>, "bm25": <int_or_null>}
    }
  ],
  "embedding_dim": 768,
  "corpus_sources": ["<source1>", "<source2>"]
}`;

const GRAPH_PROMPT = (query, linked_entities, relations, hops) => `You are a Neo4j knowledge graph traversal engine implementing Step 3 of the Bioquora GraphRAG pipeline.

Generate realistic Cypher queries and graph traversal results. Return ONLY valid JSON:

Query: "${query}"
Seed Entities: ${JSON.stringify(linked_entities.map(e => e.canonical_name))}
Expected Hops: ${hops}

Return exactly this structure:
{
  "cypher_queries": [
    {
      "description": "<what this query finds>",
      "cypher": "<valid Neo4j Cypher query>",
      "hop_depth": <integer>
    }
  ],
  "traversal_paths": [
    {
      "path": ["<node1>", "<edge>", "<node2>", "<edge>", "..."],
      "path_score": <0.0-1.0>,
      "biological_significance": "<why this path matters>"
    }
  ],
  "discovered_nodes": [
    {
      "name": "<entity name>",
      "type": "<Disease|Drug|Gene|Protein|Pathway|Cell>",
      "degree": <int>,
      "is_seed": <true|false>
    }
  ],
  "embedding_predictions": [
    {
      "algorithm": "<TransE|RotatE|ComplEx>",
      "predicted_relation": {"subject": "<>", "relation": "<>", "object": "<>"},
      "confidence": <0.0-1.0>
    }
  ],
  "graph_stats": {
    "nodes_visited": <int>,
    "edges_traversed": <int>,
    "paths_explored": <int>
  }
}`;

// ─── API call ─────────────────────────────────────────────────────────────────

async function callClaude(prompt, maxTokens = 1200) {
  const apiKey = localStorage.getItem('anthropic_api_key');
  if (!apiKey) throw new Error("Please enter your Anthropic API Key in the top right corner.");
  
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "API Request Failed");
  }

  const data = await res.json();
  const text = data.content?.map((b) => b.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color = ACCENT }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "monospace",
      fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
    }}>{label}</span>
  );
}

function ConfidenceBar({ value, color = ACCENT }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: BORDER, borderRadius: 2 }}>
        <div style={{ width: `${value * 100}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ color: MUTED, fontSize: 11, fontFamily: "monospace", minWidth: 36 }}>{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

function Card({ title, badge, badgeColor, children, accent = false }) {
  return (
    <div style={{
      background: PANEL2, border: `1px solid ${accent ? ACCENT + "44" : BORDER}`,
      borderRadius: 8, padding: 16, marginBottom: 12,
      boxShadow: accent ? `0 0 20px ${ACCENT}11` : "none",
    }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ color: TEXT, fontSize: 12, fontWeight: 600, fontFamily: "monospace", letterSpacing: 0.5 }}>{title}</span>
          {badge && <Badge label={badge} color={badgeColor || ACCENT} />}
        </div>
      )}
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: MUTED, fontSize: 12, fontFamily: "monospace" }}>
      <div style={{
        width: 14, height: 14, border: `2px solid ${BORDER}`, borderTop: `2px solid ${ACCENT}`,
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
      Processing…
    </div>
  );
}

function TokenLabel({ token, label }) {
  const color = label.startsWith("B-") || label.startsWith("I-") ? ACCENT : MUTED;
  const bg = label === "O" ? "transparent" : ACCENT + "15";
  return (
    <span style={{ display: "inline-block", margin: "2px 3px", padding: "2px 6px", borderRadius: 3, background: bg, fontFamily: "monospace", fontSize: 12 }}>
      <span style={{ color: TEXT }}>{token}</span>
      {label !== "O" && <span style={{ color, fontSize: 10, display: "block", textAlign: "center" }}>{label}</span>}
    </span>
  );
}

function PathViz({ path }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, padding: "8px 0" }}>
      {path.map((item, i) => {
        const isEdge = i % 2 === 1;
        return (
          <span key={i} style={{
            padding: isEdge ? "2px 8px" : "4px 10px",
            background: isEdge ? ACCENT2 + "22" : ACCENT + "22",
            color: isEdge ? ACCENT2 : ACCENT,
            border: `1px solid ${isEdge ? ACCENT2 + "44" : ACCENT + "44"}`,
            borderRadius: isEdge ? 3 : 20,
            fontSize: 11, fontFamily: "monospace",
            fontStyle: isEdge ? "italic" : "normal",
          }}>{isEdge ? `→ ${item} →` : item}</span>
        );
      })}
    </div>
  );
}

function CypherBlock({ code }) {
  return (
    <pre style={{
      background: "#050D18", border: `1px solid ${BORDER}`, borderRadius: 6,
      padding: 12, fontSize: 11, fontFamily: "monospace", color: "#93C5FD",
      overflowX: "auto", margin: 0,
      whiteSpace: "pre-wrap", wordBreak: "break-all",
    }}>
      {code.split(/(\([\w:]+\)|\[:\w+\]|MATCH|RETURN|WHERE|WITH|LIMIT)/g).map((part, i) => {
        if (/^MATCH|RETURN|WHERE|WITH|LIMIT$/.test(part)) return <span key={i} style={{ color: "#C084FC" }}>{part}</span>;
        if (/^\(/.test(part)) return <span key={i} style={{ color: "#34D399" }}>{part}</span>;
        if (/^\[:/.test(part)) return <span key={i} style={{ color: WARN }}>{part}</span>;
        return part;
      })}
    </pre>
  );
}

// ─── Step panels ──────────────────────────────────────────────────────────────

function Step1Panel({ data }) {
  const { intent, ner, linking, relations } = data;
  return (
    <div>
      {/* 1.1 Intent */}
      <Card title="1.1 · Intent Classification" badge={intent?.intent} badgeColor={ACCENT} accent>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>Confidence</div>
            <ConfidenceBar value={intent?.confidence || 0} />
          </div>
          <div>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>Retrieval Strategy</div>
            <div style={{ color: TEXT, fontSize: 12 }}>{intent?.retrieval_strategy}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, color: MUTED, fontSize: 12, fontStyle: "italic" }}>{intent?.reasoning}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(intent?.entities_hint || []).map((h, i) => <Badge key={i} label={h} color={ACCENT2} />)}
        </div>
      </Card>

      {/* 1.2 NER */}
      <Card title="1.2 · Biomedical NER — Token Labels">
        <div style={{ marginBottom: 12 }}>
          {(ner?.token_labels || []).map((t, i) => <TokenLabel key={i} token={t.token} label={t.label} />)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(ner?.entities || []).map((e, i) => (
            <div key={i} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 10px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{e.text}</span>
                <Badge label={e.type} color={e.type === "GENE" ? WARN : e.type === "DISEASE" ? ERR : e.type === "DRUG" ? SUCCESS : ACCENT2} />
              </div>
              <ConfidenceBar value={e.confidence} color={ACCENT} />
            </div>
          ))}
        </div>
      </Card>

      {/* 1.3 Entity Linking */}
      <Card title="1.3 · Entity Linking — Database IDs">
        {(linking?.linked_entities || []).map((e, i) => (
          <div key={i} style={{ background: PANEL, borderRadius: 6, padding: 10, marginBottom: 8, border: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: TEXT, fontWeight: 600, fontSize: 13 }}>{e.text}</span>
              <code style={{ color: ACCENT, fontSize: 11, background: ACCENT + "15", padding: "2px 6px", borderRadius: 3 }}>{e.identifier}</code>
            </div>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>
              Canonical: <span style={{ color: TEXT }}>{e.canonical_name}</span> · DB: <span style={{ color: ACCENT2 }}>{e.database}</span>
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>Synonyms: {(e.synonyms || []).join(", ")}</div>
            <ConfidenceBar value={e.confidence} color={SUCCESS} />
          </div>
        ))}
      </Card>

      {/* 1.4 Relations + 1.5 Multi-hop */}
      <Card title="1.4 · Relation Extraction  +  1.5 Multi-Hop Detection">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {(relations?.relations || []).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 10px" }}>
              <span style={{ color: ACCENT, fontSize: 12 }}>{r.subject}</span>
              <span style={{ color: WARN, fontSize: 11, fontFamily: "monospace" }}>—{r.relation}→</span>
              <span style={{ color: ACCENT, fontSize: 12 }}>{r.object}</span>
              <span style={{ color: MUTED, fontSize: 10 }}>{(r.confidence * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        {relations?.multi_hop && (
          <div style={{ background: relations.multi_hop.required ? ACCENT + "11" : PANEL, border: `1px solid ${relations.multi_hop.required ? ACCENT + "33" : BORDER}`, borderRadius: 6, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <Badge label={relations.multi_hop.required ? `${relations.multi_hop.expected_hops}-HOP` : "SINGLE-HOP"} color={relations.multi_hop.required ? WARN : MUTED} />
              <span style={{ color: TEXT, fontSize: 12 }}>{relations.multi_hop.traversal_pattern}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(relations.multi_hop.reasoning_chain || []).map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <span style={{ color: MUTED }}>→</span>}
                  <span style={{ color: TEXT, fontSize: 11, background: PANEL, padding: "3px 8px", borderRadius: 3, border: `1px solid ${BORDER}` }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Step2Panel({ data }) {
  const { retrieval } = data;
  return (
    <div>
      <Card title="2.1–2.2 · Embedding Generation + Corpus" badge={`${retrieval?.embedding_dim}d`} badgeColor={ACCENT2}>
        <div style={{ color: MUTED, fontSize: 12 }}>
          Model: <span style={{ color: TEXT }}>PubMedBERT / BioLinkBERT / MedCPT</span> · Sources: {(retrieval?.corpus_sources || []).join(", ")}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* Dense */}
        <Card title="Dense Retrieval (Semantic)">
          {(retrieval?.dense_results || []).map((r, i) => (
            <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < retrieval.dense_results.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <Badge label={`#${r.rank}`} color={ACCENT} />
                <Badge label={r.source} color={ACCENT2} />
                <span style={{ color: MUTED, fontSize: 10 }}>{r.year}</span>
              </div>
              <div style={{ color: TEXT, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
              <div style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>{r.snippet}</div>
              <ConfidenceBar value={r.relevance_score} />
            </div>
          ))}
        </Card>

        {/* BM25 */}
        <Card title="BM25 (Lexical)">
          {(retrieval?.bm25_results || []).map((r, i) => (
            <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < retrieval.bm25_results.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <Badge label={`#${r.rank}`} color={WARN} />
                <Badge label={r.source} color={ACCENT2} />
              </div>
              <div style={{ color: TEXT, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
              <div style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>BM25 score: <span style={{ color: WARN }}>{r.bm25_score?.toFixed(2)}</span></div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(r.exact_match_terms || []).map((t, j) => <Badge key={j} label={t} color={WARN} />)}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* RRF Fused */}
      <Card title="2.5 · RRF Fusion — Final Ranked Results" accent>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(retrieval?.rrf_fused || []).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: PANEL, borderRadius: 6, padding: "8px 12px", border: `1px solid ${BORDER}` }}>
              <span style={{ color: ACCENT, fontFamily: "monospace", fontSize: 14, fontWeight: 700, minWidth: 24 }}>#{r.rank}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{r.title}</div>
                <div style={{ color: MUTED, fontSize: 11 }}>
                  Dense rank: {r.source_ranks?.dense ?? "—"} · BM25 rank: {r.source_ranks?.bm25 ?? "—"}
                </div>
              </div>
              <div style={{ minWidth: 80 }}>
                <ConfidenceBar value={r.rrf_score} color={ACCENT} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Step3Panel({ data }) {
  const { graph } = data;
  return (
    <div>
      {/* Cypher */}
      <Card title="3.4–3.5 · Cypher Traversal Queries">
        {(graph?.cypher_queries || []).map((q, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Badge label={`${q.hop_depth}-hop`} color={WARN} />
              <span style={{ color: TEXT, fontSize: 12 }}>{q.description}</span>
            </div>
            <CypherBlock code={q.cypher} />
          </div>
        ))}
      </Card>

      {/* Traversal paths */}
      <Card title="3.5 · Graph Traversal Paths" accent>
        {(graph?.traversal_paths || []).map((p, i) => (
          <div key={i} style={{ marginBottom: 12, padding: 10, background: PANEL, borderRadius: 6, border: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <ConfidenceBar value={p.path_score} color={ACCENT} />
            </div>
            <PathViz path={p.path} />
            <div style={{ color: MUTED, fontSize: 11, marginTop: 4, fontStyle: "italic" }}>{p.biological_significance}</div>
          </div>
        ))}
      </Card>

      {/* Discovered nodes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card title="Discovered Graph Nodes">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(graph?.discovered_nodes || []).map((n, i) => (
              <div key={i} style={{
                padding: "6px 10px", borderRadius: 6,
                background: n.is_seed ? ACCENT + "22" : PANEL,
                border: `1px solid ${n.is_seed ? ACCENT + "55" : BORDER}`,
              }}>
                <div style={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{n.name}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  <Badge label={n.type} color={ACCENT2} />
                  <span style={{ color: MUTED, fontSize: 10 }}>deg: {n.degree}</span>
                  {n.is_seed && <Badge label="SEED" color={ACCENT} />}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Graph embeddings */}
        <Card title="3.6 · Graph Embedding Predictions (PyKEEN)">
          {(graph?.embedding_predictions || []).map((p, i) => (
            <div key={i} style={{ marginBottom: 8, padding: 8, background: PANEL, borderRadius: 5, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <Badge label={p.algorithm} color={ACCENT2} />
                <span style={{ color: MUTED, fontSize: 10 }}>predicted edge</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: ACCENT, fontSize: 12 }}>{p.predicted_relation?.subject}</span>
                <span style={{ color: WARN, fontSize: 11, fontFamily: "monospace" }}>—{p.predicted_relation?.relation}→</span>
                <span style={{ color: ACCENT, fontSize: 12 }}>{p.predicted_relation?.object}</span>
              </div>
              <ConfidenceBar value={p.confidence} color={ACCENT2} />
            </div>
          ))}
        </Card>
      </div>

      {/* Stats */}
      {graph?.graph_stats && (
        <Card title="Graph Traversal Statistics">
          <div style={{ display: "flex", gap: 24 }}>
            {Object.entries(graph.graph_stats).map(([k, v]) => (
              <div key={k}>
                <div style={{ color: MUTED, fontSize: 11 }}>{k.replace(/_/g, " ")}</div>
                <div style={{ color: ACCENT, fontSize: 22, fontFamily: "monospace", fontWeight: 700 }}>{v.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const EXAMPLE_QUERIES = [
  "How does Metformin reduce insulin resistance?",
  "Does BRCA1 mutation increase breast cancer risk?",
  "Which approved drugs target genes associated with Alzheimer's disease?",
  "How does aspirin reduce inflammation through COX inhibition?",
  "What is the role of TP53 in apoptosis?",
];

const STEPS = [
  { id: 1, label: "Question Understanding", sub: "Intent · NER · Linking · Relations · Multi-Hop" },
  { id: 2, label: "Semantic Retrieval", sub: "Embedding · Hybrid Search · RRF Fusion" },
  { id: 3, label: "Graph Traversal", sub: "Cypher · Paths · Embeddings · Predictions" },
];

export default function BioquoraPipeline() {
  const [query, setQuery] = useState("");
  const [activeStep, setActiveStep] = useState(null);
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const setStepLoading = (step, val) => setLoading((p) => ({ ...p, [step]: val }));
  const setStepResult = (key, val) => setResults((p) => ({ ...p, [key]: val }));

  const runPipeline = useCallback(async () => {
    if (!query.trim()) return;
    setError(null);
    setResults({});
    setCompletedSteps(new Set());
    setActiveStep(1);

    try {
      // ── Step 1 ──
      setStepLoading(1, true);

      const intent = await callClaude(INTENT_PROMPT(query));
      setStepResult("intent", intent);

      const ner = await callClaude(NER_PROMPT(query));
      setStepResult("ner", ner);

      const linking = await callClaude(LINKING_PROMPT(ner.entities || []));
      setStepResult("linking", linking);

      const relations = await callClaude(RELATION_PROMPT(query, ner.entities || []));
      setStepResult("relations", relations);

      setStepLoading(1, false);
      setCompletedSteps((p) => new Set([...p, 1]));

      // ── Step 2 ──
      setActiveStep(2);
      setStepLoading(2, true);

      const retrieval = await callClaude(RETRIEVAL_PROMPT(query, intent.intent, ner.entities || []), 1500);
      setStepResult("retrieval", retrieval);

      setStepLoading(2, false);
      setCompletedSteps((p) => new Set([...p, 2]));

      // ── Step 3 ──
      setActiveStep(3);
      setStepLoading(3, true);

      const graph = await callClaude(
        GRAPH_PROMPT(query, linking.linked_entities || [], relations.relations || [], relations.multi_hop?.expected_hops || 2),
        1500
      );
      setStepResult("graph", graph);

      setStepLoading(3, false);
      setCompletedSteps((p) => new Set([...p, 3]));
    } catch (e) {
      setError(e.message);
      setStepLoading(1, false);
      setStepLoading(2, false);
      setStepLoading(3, false);
    }
  }, [query]);

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${BG}; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 2px; }
        textarea:focus { outline: none; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
        <span style={{ fontFamily: "monospace", fontSize: 13, color: ACCENT, fontWeight: 700, letterSpacing: 2 }}>Bioquora</span>
        <span style={{ color: MUTED, fontSize: 12 }}>·</span>
        <span style={{ color: MUTED, fontSize: 12, fontFamily: "monospace" }}>GraphRAG Pipeline · Steps 1–3</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Query input */}
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ color: MUTED, fontSize: 11, fontFamily: "monospace", marginBottom: 8, letterSpacing: 1 }}>BIOMEDICAL QUERY</div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a biomedical question…"
            rows={2}
            style={{
              width: "100%", background: "transparent", border: "none", color: TEXT,
              fontSize: 15, resize: "none", fontFamily: "system-ui",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EXAMPLE_QUERIES.map((q, i) => (
                <button key={i} onClick={() => setQuery(q)} style={{
                  background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4,
                  color: MUTED, fontSize: 11, padding: "3px 8px", cursor: "pointer",
                }}>{q.length > 40 ? q.slice(0, 40) + "…" : q}</button>
              ))}
            </div>
            <button onClick={runPipeline} disabled={!query.trim() || Object.values(loading).some(Boolean)} style={{
              background: ACCENT, color: "#000", border: "none", borderRadius: 6,
              padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              opacity: !query.trim() || Object.values(loading).some(Boolean) ? 0.5 : 1,
              fontFamily: "monospace", letterSpacing: 1,
            }}>RUN PIPELINE ▶</button>
          </div>
        </div>

        {error && (
          <div style={{ background: ERR + "15", border: `1px solid ${ERR}44`, borderRadius: 6, padding: 12, marginBottom: 16, color: ERR, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Step tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {STEPS.map((s) => {
            const done = completedSteps.has(s.id);
            const active = activeStep === s.id;
            const isLoading = loading[s.id];
            return (
              <button key={s.id} onClick={() => done && setActiveStep(s.id)} style={{
                flex: 1, background: active ? ACCENT + "15" : PANEL,
                border: "none", borderRight: s.id < 3 ? `1px solid ${BORDER}` : "none",
                padding: "12px 16px", cursor: done ? "pointer" : "default",
                borderTop: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                textAlign: "left",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: done ? ACCENT : active ? ACCENT + "33" : BORDER,
                    color: done ? "#000" : active ? ACCENT : MUTED,
                  }}>{done ? "✓" : isLoading ? "…" : s.id}</span>
                  <span style={{ color: active ? TEXT : MUTED, fontSize: 13, fontWeight: 600 }}>Step {s.id}</span>
                  {isLoading && <Spinner />}
                </div>
                <div style={{ color: active ? ACCENT : MUTED, fontSize: 11, paddingLeft: 28 }}>{s.label}</div>
                <div style={{ color: MUTED, fontSize: 10, paddingLeft: 28 }}>{s.sub}</div>
              </button>
            );
          })}
        </div>

        {/* Step content */}
        {activeStep === 1 && (results.intent || results.ner || results.linking || results.relations) && (
          <Step1Panel data={{ intent: results.intent, ner: results.ner, linking: results.linking, relations: results.relations }} />
        )}
        {activeStep === 2 && results.retrieval && (
          <Step2Panel data={{ retrieval: results.retrieval }} />
        )}
        {activeStep === 3 && results.graph && (
          <Step3Panel data={{ graph: results.graph }} />
        )}

        {/* Empty state */}
        {!Object.values(loading).some(Boolean) && Object.keys(results).length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: MUTED }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⬡</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Enter a biomedical query and run the pipeline</div>
            <div style={{ fontSize: 12 }}>Steps 1→2→3 execute sequentially using live AI inference</div>
          </div>
        )}
      </div>
    </div>
  );
}
