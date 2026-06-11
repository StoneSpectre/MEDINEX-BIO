"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── Color tokens — maps node label → teal/amber/violet/slate family
const NODE_COLOR = {
  Disease:    { fill: "#1BC99A", dim: "#0a4a3a", text: "#e0fdf4" },
  Gene:       { fill: "#F59E0B", dim: "#4a2e00", text: "#fef3c7" },
  Drug:       { fill: "#A78BFA", dim: "#2e1a4a", text: "#ede9fe" },
  Symptom:    { fill: "#60A5FA", dim: "#1a2e4a", text: "#dbeafe" },
  Pathway:    { fill: "#F472B6", dim: "#4a1a2e", text: "#fce7f3" },
  Paper:      { fill: "#94A3B8", dim: "#1e2a38", text: "#e2e8f0" },
  Researcher: { fill: "#FB923C", dim: "#4a1e0a", text: "#fed7aa" },
};

const EDGE_COLOR = {
  ASSOCIATED_WITH_GENE: "#1BC99A",
  HAS_SYMPTOM:          "#60A5FA",
  TREATS:               "#A78BFA",
  INVOLVED_IN:          "#F472B6",
  MENTIONS_DISEASE:     "#94A3B8",
  AUTHORED_BY:          "#FB923C",
  CITES:                "#F59E0B",
};

// ── Mock data (replace with real /ask + /explain API responses) ──
const MOCK_STATS = {
  nodes:    13056,
  edges:    25242,
  diseases: 137,
  genes:    9145,
  drugs:    1552,
  papers:   480,
  coverage: 65,
  fingerprint: "a3f7c91b2e4d",
};

const MOCK_DISEASE_DATA = {
  "Parkinson Disease": {
    disease: {
      name: "Parkinson Disease",
      category: "Neurodegenerative",
      description:
        "A progressive neurodegenerative disorder affecting dopaminergic neurons in the substantia nigra, leading to motor and non-motor symptoms.",
    },
    genes:    [
      { symbol: "SNCA", name: "Synuclein Alpha", score: 0.94 },
      { symbol: "LRRK2", name: "Leucine-rich repeat kinase 2", score: 0.91 },
      { symbol: "PINK1", name: "PTEN-induced kinase 1", score: 0.87 },
      { symbol: "PARK7", name: "Parkinsonism associated deglycase", score: 0.83 },
      { symbol: "GBA", name: "Glucocerebrosidase", score: 0.81 },
      { symbol: "UCHL1", name: "Ubiquitin C-terminal hydrolase L1", score: 0.76 },
    ],
    drugs:    [
      { name: "Levodopa",        description: "Dopamine precursor, primary PD therapy" },
      { name: "Carbidopa",       description: "Peripheral decarboxylase inhibitor" },
      { name: "Pramipexole",     description: "Dopamine agonist" },
      { name: "Ropinirole",      description: "Non-ergot dopamine agonist" },
      { name: "Rasagiline",      description: "MAO-B inhibitor, neuroprotective" },
    ],
    symptoms: [
      { name: "Resting tremor" },
      { name: "Bradykinesia" },
      { name: "Rigidity" },
      { name: "Postural instability" },
      { name: "Micrographia" },
      { name: "Hypomimia" },
    ],
    papers:   [
      { pmid: "15258601", title: "Identification of SNCA mutations in familial Parkinson disease", year: 2004 },
      { pmid: "16710414", title: "LRRK2 kinase activity in Parkinson disease pathogenesis", year: 2006 },
      { pmid: "19915575", title: "GBA variants and Parkinson disease risk", year: 2009 },
    ],
    pathways: [
      { name: "Dopamine synthesis pathway" },
      { name: "Mitochondrial quality control" },
      { name: "Ubiquitin-proteasome system" },
    ],
  },
  "Alzheimer Disease": {
    disease: {
      name: "Alzheimer Disease",
      category: "Neurodegenerative",
      description:
        "Progressive neurodegenerative disease characterised by amyloid-β plaques, neurofibrillary tau tangles, and synaptic loss leading to dementia.",
    },
    genes: [
      { symbol: "APP",   name: "Amyloid precursor protein", score: 0.96 },
      { symbol: "PSEN1", name: "Presenilin-1", score: 0.93 },
      { symbol: "PSEN2", name: "Presenilin-2", score: 0.89 },
      { symbol: "APOE",  name: "Apolipoprotein E", score: 0.88 },
      { symbol: "TREM2", name: "Triggering receptor on myeloid cells 2", score: 0.82 },
    ],
    drugs: [
      { name: "Donepezil",    description: "AChE inhibitor, symptomatic relief" },
      { name: "Memantine",    description: "NMDA receptor antagonist" },
      { name: "Rivastigmine", description: "AChE + BuChE inhibitor" },
      { name: "Lecanemab",    description: "Anti-amyloid-β monoclonal antibody" },
    ],
    symptoms: [
      { name: "Memory loss" },
      { name: "Disorientation" },
      { name: "Language impairment" },
      { name: "Behavioral changes" },
      { name: "Apraxia" },
    ],
    papers: [
      { pmid: "1363810",  title: "APP mutations causing familial Alzheimer disease", year: 1992 },
      { pmid: "7580000",  title: "PSEN1 and early-onset familial Alzheimer disease", year: 1995 },
      { pmid: "31806058", title: "TREM2 variants increase Alzheimer risk via microglial dysfunction", year: 2019 },
    ],
    pathways: [
      { name: "Amyloid-beta processing" },
      { name: "Tau phosphorylation cascade" },
      { name: "Neuroinflammation" },
    ],
  },
  "Type 2 Diabetes": {
    disease: {
      name: "Type 2 Diabetes",
      category: "Metabolic",
      description:
        "Metabolic disorder characterised by chronic hyperglycaemia due to insulin resistance and progressive β-cell dysfunction.",
    },
    genes: [
      { symbol: "TCF7L2", name: "Transcription factor 7-like 2", score: 0.92 },
      { symbol: "KCNJ11", name: "Potassium inwardly-rectifying channel 11", score: 0.88 },
      { symbol: "PPARG",  name: "Peroxisome proliferator-activated receptor γ", score: 0.85 },
      { symbol: "SLC30A8",name: "Zinc transporter 8", score: 0.79 },
      { symbol: "HNF1A",  name: "Hepatocyte nuclear factor 1A", score: 0.75 },
    ],
    drugs: [
      { name: "Metformin",    description: "Biguanide, first-line therapy" },
      { name: "Glipizide",    description: "Second-generation sulfonylurea" },
      { name: "Sitagliptin",  description: "DPP-4 inhibitor" },
      { name: "Empagliflozin",description: "SGLT2 inhibitor, cardioprotective" },
      { name: "Semaglutide",  description: "GLP-1 receptor agonist" },
    ],
    symptoms: [
      { name: "Polyuria" },
      { name: "Polydipsia" },
      { name: "Fatigue" },
      { name: "Blurred vision" },
      { name: "Slow wound healing" },
    ],
    papers: [
      { pmid: "17293876", title: "TCF7L2 variants and type 2 diabetes susceptibility", year: 2007 },
      { pmid: "23831609", title: "SGLT2 inhibitors and cardiovascular outcomes in T2DM", year: 2013 },
    ],
    pathways: [
      { name: "Insulin signalling pathway" },
      { name: "β-cell apoptosis" },
      { name: "Gluconeogenesis" },
    ],
  },
};

const SUGGESTIONS = Object.keys(MOCK_DISEASE_DATA);

// ── Force-directed graph layout (simple Verlet) ────────────────
function buildGraphNodes(diseaseData) {
  if (!diseaseData) return { nodes: [], links: [] };

  const { disease, genes = [], drugs = [], symptoms = [], papers = [] } = diseaseData;
  const cx = 380, cy = 240;
  const nodes = [];
  const links = [];

  nodes.push({ id: disease.name, label: "Disease", x: cx, y: cy, r: 22, fixed: true });

  const place = (arr, label, radius, startAngle, spread, rNode) => {
    arr.forEach((item, i) => {
      const angle = startAngle + (i / Math.max(arr.length - 1, 1)) * spread;
      const jitter = (Math.random() - 0.5) * 30;
      nodes.push({
        id:    item.symbol || item.name || item.pmid,
        label,
        x:     cx + (radius + jitter) * Math.cos(angle),
        y:     cy + (radius + jitter) * Math.sin(angle),
        r:     rNode,
        data:  item,
      });
      links.push({ source: disease.name, target: item.symbol || item.name || item.pmid, type: label });
    });
  };

  place(genes.slice(0, 7),    "Gene",    160, -Math.PI * 0.8, Math.PI * 0.6, 12);
  place(drugs.slice(0, 5),    "Drug",    160,  Math.PI * 0.1, Math.PI * 0.6, 11);
  place(symptoms.slice(0, 5), "Symptom", 160,  Math.PI * 0.85, Math.PI * 0.4, 9);
  place(papers.slice(0, 3),   "Paper",   220, -Math.PI * 0.2, Math.PI * 0.4, 9);

  return { nodes, links };
}


// ════════════════════════════════════════════════════════════════
// StatsBar — top horizontal strip with key graph metrics
// ════════════════════════════════════════════════════════════════
function StatsBar({ stats, loading }) {
  const metrics = [
    { label: "Total nodes",  value: stats.nodes.toLocaleString(),   icon: "ti-topology-star-3" },
    { label: "Total edges",  value: stats.edges.toLocaleString(),   icon: "ti-arrows-transfer-down" },
    { label: "Diseases",     value: stats.diseases,                 icon: "ti-virus" },
    { label: "Genes",        value: stats.genes.toLocaleString(),   icon: "ti-dna" },
    { label: "Drugs",        value: stats.drugs.toLocaleString(),   icon: "ti-pill" },
    { label: "Papers",       value: stats.papers,                   icon: "ti-file-text" },
    { label: "Coverage",     value: `${stats.coverage}%`,           icon: "ti-chart-donut" },
  ];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      overflowX: "auto", padding: "0 0",
    }}>
      {/* Brand slug */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 20px",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#1BC99A",
          boxShadow: "0 0 6px #1BC99A66",
          display: "inline-block", flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 12,
          fontWeight: 500, color: "var(--color-text-primary)",
          letterSpacing: "0.08em",
        }}>
          MEDINEX
        </span>
      </div>

      {/* Metrics */}
      {metrics.map(m => (
        <div key={m.label} style={{
          display: "flex", flexDirection: "column",
          padding: "8px 18px",
          borderRight: "0.5px solid var(--color-border-tertiary)",
          flexShrink: 0,
          opacity: loading ? 0.4 : 1,
          transition: "opacity 0.3s",
        }}>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 2 }}>
            <i className={`ti ${m.icon}`} aria-hidden="true" style={{ fontSize: 11, marginRight: 4 }} />
            {m.label}
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 14,
            fontWeight: 500, color: "#1BC99A",
          }}>
            {loading ? "—" : m.value}
          </span>
        </div>
      ))}

      {/* Fingerprint */}
      <div style={{ padding: "8px 18px", flexShrink: 0, marginLeft: "auto" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>fingerprint </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--color-text-tertiary)",
        }}>
          {stats.fingerprint}
        </span>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// SearchBar — semantic disease search with suggestions
// ════════════════════════════════════════════════════════════════
function SearchBar({ onSearch, loading }) {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]             = useState(false);
  const inputRef                    = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length > 1) {
      setSuggestions(
        SUGGESTIONS.filter(s => s.toLowerCase().includes(val.toLowerCase()))
      );
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const commit = (val) => {
    setQuery(val);
    setOpen(false);
    onSearch(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) commit(query.trim());
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div style={{ position: "relative", padding: "14px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: "var(--border-radius-md)",
        padding: "0 12px",
        transition: "border-color 0.15s",
      }}>
        <i className="ti ti-search" aria-hidden="true"
           style={{ fontSize: 15, color: "#1BC99A", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search disease, gene, or drug..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search the knowledge graph"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: 14, padding: "9px 0",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-sans)",
          }}
        />
        {loading && (
          <span style={{
            fontSize: 11, fontFamily: "var(--font-mono)",
            color: "#1BC99A", animation: "pulse 1s infinite",
          }}>
            traversing graph…
          </span>
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            aria-label="Clear search"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 0, color: "var(--color-text-tertiary)",
              fontSize: 14, lineHeight: 1,
            }}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Suggestion dropdown */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% - 2px)", left: 20, right: 20,
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-md)",
          zIndex: 50, overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s}
              onClick={() => commit(s)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 14px", background: "transparent",
                border: "none", borderBottom: i < suggestions.length - 1
                  ? "0.5px solid var(--color-border-tertiary)" : "none",
                cursor: "pointer", fontSize: 13,
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <i className="ti ti-stethoscope" aria-hidden="true"
                 style={{ fontSize: 13, marginRight: 8, color: "#1BC99A" }} />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Quick-access pills */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => commit(s)}
            style={{
              fontSize: 11, padding: "3px 10px",
              background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 20, cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-sans)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#1BC99A";
              e.currentTarget.style.color = "#1BC99A";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--color-border-tertiary)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// DiseasePanel — structured breakdown left column
// ════════════════════════════════════════════════════════════════
function DiseasePanel({ data, selectedNode, onNodeSelect }) {
  if (!data) {
    return (
      <div style={{
        padding: "40px 20px", textAlign: "center",
        color: "var(--color-text-tertiary)", fontSize: 13,
      }}>
        <i className="ti ti-topology-star-3" aria-hidden="true"
           style={{ fontSize: 40, display: "block", marginBottom: 12, color: "var(--color-border-secondary)" }} />
        Search a disease to explore its knowledge graph
      </div>
    );
  }

  const { disease, genes = [], drugs = [], symptoms = [], papers = [], pathways = [] } = data;

  const Section = ({ icon, title, items, renderItem, color }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 8,
        paddingBottom: 5,
        borderBottom: "0.5px solid var(--color-border-tertiary)",
      }}>
        <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: 13, color }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
          {title} ({items.length})
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {items.map((item, i) => renderItem(item, i))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>

      {/* Disease header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
          <span style={{
            background: "#1BC99A22", color: "#1BC99A",
            fontSize: 11, padding: "2px 8px", borderRadius: 12,
            fontFamily: "var(--font-mono)", border: "0.5px solid #1BC99A55",
            flexShrink: 0, marginTop: 2,
          }}>
            {disease.category}
          </span>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 500,
            color: "var(--color-text-primary)", lineHeight: 1.3,
          }}>
            {disease.name}
          </h2>
        </div>
        <p style={{
          margin: 0, fontSize: 12, lineHeight: 1.65,
          color: "var(--color-text-secondary)",
        }}>
          {disease.description}
        </p>
      </div>

      {/* Genes */}
      <Section icon="ti-dna" title="ASSOCIATED GENES" items={genes} color="#F59E0B"
        renderItem={(g, i) => {
          const isSelected = selectedNode === g.symbol;
          return (
            <button
              key={g.symbol}
              onClick={() => onNodeSelect(isSelected ? null : g.symbol)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 8px",
                background: isSelected ? "#F59E0B15" : "transparent",
                border: isSelected ? "0.5px solid #F59E0B55" : "0.5px solid transparent",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer", textAlign: "left", width: "100%",
                transition: "all 0.12s",
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 12,
                color: "#F59E0B", fontWeight: 500, minWidth: 56,
              }}>
                {g.symbol}
              </span>
              <span style={{
                fontSize: 11, color: "var(--color-text-secondary)",
                flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {g.name}
              </span>
              {g.score && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  color: g.score > 0.85 ? "#1BC99A" : "var(--color-text-tertiary)",
                }}>
                  {g.score.toFixed(2)}
                </span>
              )}
            </button>
          );
        }}
      />

      {/* Drugs */}
      <Section icon="ti-pill" title="TREATMENTS" items={drugs} color="#A78BFA"
        renderItem={(d, i) => (
          <div key={d.name} style={{
            padding: "5px 8px",
            borderLeft: "2px solid #A78BFA55",
            marginBottom: 2,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {d.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 1 }}>
              {d.description}
            </div>
          </div>
        )}
      />

      {/* Symptoms */}
      <Section icon="ti-activity" title="SYMPTOMS" items={symptoms} color="#60A5FA"
        renderItem={(s, i) => (
          <span key={s.name} style={{
            display: "inline-block", marginRight: 4, marginBottom: 4,
            padding: "2px 9px", fontSize: 11,
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            color: "var(--color-text-secondary)",
          }}>
            {s.name}
          </span>
        )}
      />

      {/* Pathways */}
      {pathways.length > 0 && (
        <Section icon="ti-route" title="PATHWAYS" items={pathways} color="#F472B6"
          renderItem={(p, i) => (
            <div key={p.name} style={{
              fontSize: 11, color: "var(--color-text-secondary)",
              padding: "3px 0", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#F472B6", flexShrink: 0 }} />
              {p.name}
            </div>
          )}
        />
      )}

      {/* Papers */}
      <Section icon="ti-file-text" title="KEY PAPERS" items={papers} color="#94A3B8"
        renderItem={(p, i) => (
          <div key={p.pmid} style={{
            padding: "5px 8px", marginBottom: 2,
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-tertiary)",
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-primary)", lineHeight: 1.45, marginBottom: 3 }}>
              {p.title}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: "#94A3B8",
              }}>
                PMID:{p.pmid}
              </span>
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{p.year}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// GraphCanvas — force-directed graph rendered on <canvas>
// ════════════════════════════════════════════════════════════════
function GraphCanvas({ data, selectedNode, onNodeSelect }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef({ nodes: [], links: [], dragging: null, tick: 0, animFrame: null });
  const [hovered, setHovered] = useState(null);

  const W = 760, H = 480;

  // Build simulation nodes
  useEffect(() => {
    const { nodes, links } = buildGraphNodes(data);
    // Assign velocities
    nodes.forEach(n => { n.vx = 0; n.vy = 0; });
    stateRef.current.nodes = nodes;
    stateRef.current.links = links;
    stateRef.current.tick  = 0;
  }, [data]);

  // Simulation + render loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const s      = stateRef.current;

    const ALPHA_DECAY = 0.015;
    const REPULSION   = 3200;
    const LINK_DIST   = 140;
    const LINK_STR    = 0.04;
    const CENTER_STR  = 0.012;
    const DAMPING     = 0.82;
    const CX = W / 2, CY = H / 2;

    function step() {
      const nodes = s.nodes;
      const links = s.links;
      const alpha = Math.max(0, 1 - s.tick * ALPHA_DECAY);
      s.tick++;

      if (alpha > 0.002) {
        // Repulsion (n²; fine for ≤30 nodes)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const ni = nodes[i], nj = nodes[j];
            const dx = nj.x - ni.x, dy = nj.y - ni.y;
            const d2 = dx * dx + dy * dy + 1;
            const f  = REPULSION / d2 * alpha;
            ni.vx -= dx * f; ni.vy -= dy * f;
            nj.vx += dx * f; nj.vy += dy * f;
          }
        }

        // Link attraction
        for (const lk of links) {
          const src = nodes.find(n => n.id === lk.source);
          const tgt = nodes.find(n => n.id === lk.target);
          if (!src || !tgt) continue;
          const dx = tgt.x - src.x, dy = tgt.y - src.y;
          const d  = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const f  = (d - LINK_DIST) * LINK_STR * alpha;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          if (!src.fixed) { src.vx += fx; src.vy += fy; }
          if (!tgt.fixed) { tgt.vx -= fx; tgt.vy -= fy; }
        }

        // Center gravity
        for (const n of nodes) {
          if (n.fixed) continue;
          n.vx += (CX - n.x) * CENTER_STR * alpha;
          n.vy += (CY - n.y) * CENTER_STR * alpha;
          n.vx *= DAMPING; n.vy *= DAMPING;
          n.x  += n.vx;    n.y  += n.vy;
          n.x = Math.max(n.r + 4, Math.min(W - n.r - 4, n.x));
          n.y = Math.max(n.r + 4, Math.min(H - n.r - 4, n.y));
        }
      }

      draw(ctx, s.nodes, s.links, alpha);
      s.animFrame = requestAnimationFrame(step);
    }

    s.animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(s.animFrame);
  }, [data]);

  function draw(ctx, nodes, links, alpha) {
    ctx.clearRect(0, 0, W, H);

    // Draw links
    for (const lk of links) {
      const src = nodes.find(n => n.id === lk.source);
      const tgt = nodes.find(n => n.id === lk.target);
      if (!src || !tgt) continue;
      const col = NODE_COLOR[lk.type]?.fill || "#8891A8";
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = col + "55";
      ctx.lineWidth   = 1;
      ctx.stroke();
    }

    // Draw nodes
    for (const n of nodes) {
      const col = NODE_COLOR[n.label]?.fill || "#8891A8";
      const isSelected = n.id === selectedNode;
      const isHovered  = n.id === hovered;

      // Glow ring for selected
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2);
        ctx.fillStyle = col + "25";
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle   = isSelected ? col : (col + "22");
      ctx.strokeStyle = col;
      ctx.lineWidth   = isSelected ? 2 : 1;
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle  = isSelected || isHovered ? col : (col + "CC");
      ctx.font       = `${n.label === "Disease" ? 600 : 400} ${n.label === "Disease" ? 12 : 10}px monospace`;
      ctx.textAlign  = "center";
      ctx.textBaseline = "middle";
      const label    = n.id.length > 12 ? n.id.slice(0, 10) + "…" : n.id;
      ctx.fillText(label, n.x, n.y + (n.label === "Disease" ? 0 : 0));
    }
  }

  // Mouse interaction
  const getNodeAt = useCallback((mx, my) => {
    const s = stateRef.current;
    for (let i = s.nodes.length - 1; i >= 0; i--) {
      const n  = s.nodes[i];
      const dx = mx - n.x, dy = my - n.y;
      if (dx * dx + dy * dy <= (n.r + 6) * (n.r + 6)) return n;
    }
    return null;
  }, []);

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseMove = (e) => {
    const { x, y } = getCanvasPos(e);
    const s = stateRef.current;
    if (s.dragging) {
      s.dragging.x  = x;
      s.dragging.y  = y;
      s.dragging.vx = 0;
      s.dragging.vy = 0;
      return;
    }
    const n = getNodeAt(x, y);
    setHovered(n ? n.id : null);
    canvasRef.current.style.cursor = n ? "pointer" : "default";
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCanvasPos(e);
    const n = getNodeAt(x, y);
    if (n) { stateRef.current.dragging = n; n.fixed = true; }
  };

  const handleMouseUp = (e) => {
    const { x, y } = getCanvasPos(e);
    const s = stateRef.current;
    if (s.dragging) {
      const wasClick = Math.abs(s.dragging.x - x) < 4 && Math.abs(s.dragging.y - y) < 4;
      if (wasClick) onNodeSelect(s.dragging.id === selectedNode ? null : s.dragging.id);
      if (s.dragging.label !== "Disease") s.dragging.fixed = false;
      s.dragging = null;
    }
  };

  // Legend data
  const legendTypes = ["Disease", "Gene", "Drug", "Symptom", "Paper"];

  if (!data) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: "var(--color-text-tertiary)",
        flexDirection: "column", gap: 12,
      }}>
        <i className="ti ti-topology-star" aria-hidden="true" style={{ fontSize: 48, opacity: 0.2 }} />
        <span style={{ fontSize: 13 }}>Graph will render here</span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        role="img"
        aria-label={`Force-directed knowledge graph for ${data?.disease?.name}`}
        style={{ width: "100%", height: "100%", display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { stateRef.current.dragging = null; setHovered(null); }}
      />

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 12, left: 12,
        display: "flex", gap: 10, flexWrap: "wrap",
      }}>
        {legendTypes.map(t => (
          <span key={t} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, color: "var(--color-text-secondary)",
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 10, padding: "2px 8px",
            fontFamily: "var(--font-mono)",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: NODE_COLOR[t]?.fill,
              display: "inline-block",
            }} />
            {t}
          </span>
        ))}
      </div>

      {/* Node detail tooltip */}
      {selectedNode && (() => {
        const n = stateRef.current.nodes.find(nd => nd.id === selectedNode);
        if (!n || !n.data) return null;
        const col = NODE_COLOR[n.label]?.fill || "#8891A8";
        return (
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: "var(--color-background-primary)",
            border: `0.5px solid ${col}88`,
            borderRadius: "var(--border-radius-md)",
            padding: "10px 14px", maxWidth: 200,
          }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 12,
              color: col, fontWeight: 500, marginBottom: 4,
            }}>
              {n.id}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {n.label === "Gene" && n.data.name}
              {n.label === "Drug" && n.data.description}
              {n.label === "Paper" && n.data.title?.slice(0, 80) + "…"}
              {n.label === "Symptom" && n.data.name}
            </div>
            {n.label === "Gene" && n.data.score && (
              <div style={{
                marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 10,
                color: "var(--color-text-tertiary)",
              }}>
                evidence score: {n.data.score.toFixed(2)}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
// Root — assembles all four components
// ════════════════════════════════════════════════════════════════
export default function MedinexExplorer() {
  const [diseaseData, setDiseaseData] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [stats] = useState(MOCK_STATS);

  const handleSearch = async (query) => {
    setLoading(true);
    setSelectedNode(null);
    try {
      const res = await fetch(`http://localhost:8001/explain/${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        setDiseaseData({ ...json.graph_data, disease: json.disease, ...json.explanation });
      } else {
        throw new Error("API not ok");
      }
    } catch (e) {
      console.warn("Backend not reachable, falling back to mock data.", e);
      // Fallback to mock data so the graph renders
      await new Promise(r => setTimeout(r, 600));
      const result = MOCK_DISEASE_DATA[query] || null;
      setDiseaseData(result);
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", minHeight: 600,
      fontFamily: "var(--font-sans)",
      background: "var(--color-background-tertiary)",
      fontSize: 13,
    }}>
      <h2 className="sr-only">Medinex Knowledge Graph Explorer — search diseases to view graph context</h2>

      {/* StatsBar */}
      <StatsBar stats={stats} loading={loading} />

      {/* SearchBar */}
      <SearchBar onSearch={handleSearch} loading={loading} />

      {/* Main two-column layout */}
      <div style={{
        flex: 1, display: "flex", overflow: "hidden",
        minHeight: 0,
      }}>

        {/* Disease panel — left 38% */}
        <div style={{
          width: "38%", flexShrink: 0,
          borderRight: "0.5px solid var(--color-border-tertiary)",
          overflowY: "auto",
          opacity: loading ? 0.5 : 1,
          transition: "opacity 0.3s",
        }}>
          <DiseasePanel
            data={diseaseData}
            selectedNode={selectedNode}
            onNodeSelect={setSelectedNode}
          />
        </div>

        {/* Graph canvas — right 62% */}
        <div style={{
          flex: 1, position: "relative",
          opacity: loading ? 0.3 : 1,
          transition: "opacity 0.3s",
        }}>
          <GraphCanvas
            data={diseaseData}
            selectedNode={selectedNode}
            onNodeSelect={setSelectedNode}
          />
        </div>
      </div>

      <style>{`
        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0,0,0,0); border: 0;
        }
      `}</style>
    </div>
  );
}
