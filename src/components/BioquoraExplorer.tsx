import { useState, useEffect, useRef, useCallback } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";

const geoUrl = "/data/topo.json";
// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       "#0D0F12",
  surface:  "#161A20",
  surfaceHi:"#1E242D",
  border:   "#252A35",
  teal:     "#1DB891",
  tealDim:  "#14876A",
  tealGlow: "rgba(29,184,145,0.18)",
  red:      "#E05C5C",
  amber:    "#D4A843",
  textPrimary:  "#E8EAF0",
  textSecondary:"#8A8FA8",
  textDim:      "#4A5068",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${T.bg};
    color: ${T.textPrimary};
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${T.surface}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }

  .mono { font-family: 'JetBrains Mono', monospace; }

  /* ── Stats Bar ─────────────────────────────────────────────────── */
  .stats-bar {
    display: flex;
    align-items: center;
    gap: 0;
    background: ${T.surface};
    border-bottom: 1px solid ${T.border};
    padding: 0 24px;
    height: 44px;
    overflow-x: auto;
  }
  .stats-bar-logo {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 600;
    color: ${T.teal};
    letter-spacing: 0.08em;
    padding-right: 20px;
    margin-right: 20px;
    border-right: 1px solid ${T.border};
    white-space: nowrap;
    flex-shrink: 0;
  }
  .stats-bar-logo span { color: ${T.textDim}; }
  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 18px;
    border-right: 1px solid ${T.border};
    white-space: nowrap;
    flex-shrink: 0;
  }
  .stat-item:last-child { border-right: none; }
  .stat-label {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${T.textDim};
  }
  .stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 600;
    color: ${T.textPrimary};
  }
  .stat-value.teal  { color: ${T.teal}; }
  .stat-value.amber { color: ${T.amber}; }
  .stat-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: ${T.teal};
    box-shadow: 0 0 6px ${T.teal};
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }

  /* ── Search Bar ────────────────────────────────────────────────── */
  .search-section {
    padding: 16px 24px 0;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .search-wrap {
    position: relative;
    flex: 1;
    max-width: 520px;
  }
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${T.textDim};
    pointer-events: none;
    font-size: 14px;
  }
  .search-input {
    width: 100%;
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 6px;
    padding: 10px 12px 10px 36px;
    color: ${T.textPrimary};
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search-input::placeholder { color: ${T.textDim}; }
  .search-input:focus {
    border-color: ${T.teal};
    box-shadow: 0 0 0 3px ${T.tealGlow};
  }
  .search-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 6px;
    overflow: hidden;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  .search-dropdown-item {
    padding: 9px 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: background 0.1s;
  }
  .search-dropdown-item:hover { background: ${T.surfaceHi}; }
  .search-dropdown-item.active { background: ${T.tealGlow}; }
  .sdi-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: ${T.teal};
    min-width: 80px;
  }
  .sdi-name {
    font-size: 13px;
    color: ${T.textPrimary};
  }
  .sdi-count {
    margin-left: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: ${T.textDim};
  }
  .search-btn {
    background: ${T.teal};
    color: #000;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    white-space: nowrap;
    letter-spacing: 0.02em;
  }
  .search-btn:hover  { background: #23D4A6; }
  .search-btn:active { transform: scale(0.97); }
  .search-btn:disabled { background: ${T.tealDim}; cursor: not-allowed; opacity: 0.6; }

  .filter-row {
    display: flex;
    gap: 8px;
    padding: 10px 24px 0;
    align-items: center;
    flex-wrap: wrap;
  }
  .filter-label {
    font-size: 11px;
    color: ${T.textDim};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-right: 4px;
  }
  .filter-chip {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: ${T.textSecondary};
    cursor: pointer;
    transition: all 0.12s;
  }
  .filter-chip:hover  { border-color: ${T.teal}; color: ${T.teal}; }
  .filter-chip.active { background: ${T.tealGlow}; border-color: ${T.teal}; color: ${T.teal}; }

  /* ── Map Styling ───────────────────────────────────────────────── */
  .map-geography {
    fill: #1E242D !important;
    stroke: rgba(255, 255, 255, 0.25) !important;
    stroke-width: 0.75px !important;
    outline: none !important;
  }
  .map-geography:hover {
    fill: #252A35 !important;
    stroke: rgba(255, 255, 255, 0.5) !important;
  }

  /* ── Main Layout ───────────────────────────────────────────────── */
  .main-layout {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 16px;
    padding: 16px 24px 24px;
    height: calc(100vh - 44px - 88px);
    min-height: 500px;
  }
  @media (max-width: 900px) {
    .main-layout { grid-template-columns: 1fr; height: auto; }
  }

  /* ── Disease Panel ─────────────────────────────────────────────── */
  .disease-panel {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .panel-header {
    padding: 14px 16px 12px;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .panel-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${T.textDim};
  }
  .panel-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: ${T.teal};
  }
  .panel-body { overflow-y: auto; flex: 1; }

  /* Disease Card */
  .disease-card {
    padding: 14px 16px;
    border-bottom: 1px solid ${T.border};
    cursor: pointer;
    transition: background 0.1s;
  }
  .disease-card:hover { background: ${T.surfaceHi}; }
  .disease-card.selected {
    background: ${T.tealGlow};
    border-left: 2px solid ${T.teal};
    padding-left: 14px;
  }
  .dc-row1 { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .dc-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: ${T.teal};
    margin-bottom: 3px;
  }
  .dc-name { font-size: 13px; font-weight: 500; color: ${T.textPrimary}; line-height: 1.3; }
  .dc-score-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    color: ${T.teal};
    background: ${T.tealGlow};
    border: 1px solid ${T.tealDim};
    border-radius: 3px;
    padding: 2px 7px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .dc-row2 {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    align-items: center;
  }
  .dc-meta {
    font-size: 11px;
    color: ${T.textDim};
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .dc-meta-val { color: ${T.textSecondary}; font-family: 'JetBrains Mono', monospace; }
  .dc-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
  .dc-tag {
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    color: ${T.textDim};
    background: ${T.bg};
    border: 1px solid ${T.border};
    border-radius: 3px;
    padding: 1px 6px;
  }

  /* Gene detail panel */
  .gene-detail {
    padding: 14px 16px;
    background: ${T.bg};
    border-top: 1px solid ${T.border};
    flex-shrink: 0;
  }
  .gene-detail-title {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${T.textDim};
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .gene-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    border-bottom: 1px solid ${T.border};
  }
  .gene-row:last-child { border-bottom: none; }
  .gene-name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    color: ${T.textPrimary};
    min-width: 60px;
  }
  .gene-bar-wrap { flex: 1; height: 4px; background: ${T.border}; border-radius: 2px; overflow: hidden; }
  .gene-bar { height: 100%; background: ${T.teal}; border-radius: 2px; transition: width 0.4s ease; }
  .gene-score {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: ${T.teal};
    min-width: 36px;
    text-align: right;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 10px;
    color: ${T.textDim};
    padding: 40px 24px;
    text-align: center;
  }
  .empty-icon { font-size: 32px; opacity: 0.3; }
  .empty-title { font-size: 13px; color: ${T.textSecondary}; }
  .empty-sub { font-size: 11px; line-height: 1.5; }

  /* Loading shimmer */
  .shimmer {
    background: linear-gradient(90deg, ${T.surface} 25%, ${T.surfaceHi} 50%, ${T.surface} 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 4px;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .shimmer-row { height: 68px; margin-bottom: 1px; }

  /* Error banner */
  .error-banner {
    margin: 12px 24px 0;
    background: rgba(224,92,92,0.08);
    border: 1px solid rgba(224,92,92,0.3);
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 12px;
    color: ${T.red};
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── Graph Canvas ──────────────────────────────────────────────── */
  .graph-panel {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
  .graph-toolbar {
    padding: 10px 14px;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .graph-toolbar-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${T.textDim};
    flex: 1;
  }
  .icon-btn {
    background: none;
    border: 1px solid ${T.border};
    border-radius: 4px;
    color: ${T.textSecondary};
    padding: 4px 8px;
    font-size: 11px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.12s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .icon-btn:hover { border-color: ${T.teal}; color: ${T.teal}; }
  .graph-canvas-wrap { flex: 1; position: relative; overflow: hidden; }
  .graph-canvas-wrap canvas { display: block; }
  .graph-legend {
    position: absolute;
    bottom: 14px;
    left: 14px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    pointer-events: none;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: ${T.textDim};
  }
  .legend-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
  }
  .graph-tooltip {
    position: absolute;
    background: ${T.bg};
    border: 1px solid ${T.border};
    border-radius: 5px;
    padding: 8px 12px;
    pointer-events: none;
    font-size: 11px;
    z-index: 10;
    min-width: 140px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }
  .tooltip-name { font-weight: 600; color: ${T.textPrimary}; margin-bottom: 3px; font-size: 12px; }
  .tooltip-row { display: flex; justify-content: space-between; gap: 12px; color: ${T.textDim}; }
  .tooltip-val { font-family: 'JetBrains Mono', monospace; color: ${T.teal}; }

  .graph-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: ${T.textDim};
    pointer-events: none;
  }
  .graph-empty-icon { font-size: 48px; opacity: 0.12; }
  .graph-empty-text { font-size: 13px; }
`;

// ─── Mock API (replace with real fetch to api.py) ─────────────────────────────
const API_BASE = "http://localhost:8000";

async function fetchStats() {
  try {
    const r = await fetch(`${API_BASE}/stats`);
    return await r.json();
  } catch {
    return { total_diseases: 8342, total_genes: 21419, total_associations: 146820, db_version: "v3.0.0" };
  }
}

async function searchDiseases(query, filters = {}) {
  try {
    const params = new URLSearchParams({ q: query, ...filters });
    const r = await fetch(`${API_BASE}/diseases/search?${params}`);
    return await r.json();
  } catch {
    // Mock data fallback
    const mock = [
      { id:"MONDO:0004975", name:"Alzheimer disease", score:0.98, gene_count:312, association_count:4821, categories:["neurological","neurodegenerative"], top_genes:[{symbol:"APOE",score:0.96},{symbol:"APP",score:0.89},{symbol:"PSEN1",score:0.84},{symbol:"TREM2",score:0.77},{symbol:"CLU",score:0.71}] },
      { id:"MONDO:0007254", name:"Breast carcinoma", score:0.95, gene_count:487, association_count:7234, categories:["cancer","neoplasm"], top_genes:[{symbol:"BRCA1",score:0.99},{symbol:"BRCA2",score:0.97},{symbol:"TP53",score:0.91},{symbol:"PIK3CA",score:0.85},{symbol:"ERBB2",score:0.79}] },
      { id:"MONDO:0011382", name:"Type 2 diabetes mellitus", score:0.92, gene_count:203, association_count:3102, categories:["metabolic","endocrine"], top_genes:[{symbol:"TCF7L2",score:0.94},{symbol:"KCNJ11",score:0.87},{symbol:"PPARG",score:0.81},{symbol:"FTO",score:0.75},{symbol:"SLC30A8",score:0.69}] },
      { id:"MONDO:0005015", name:"Diabetes mellitus", score:0.91, gene_count:178, association_count:2890, categories:["metabolic"], top_genes:[{symbol:"INS",score:0.97},{symbol:"INSR",score:0.88},{symbol:"HNF4A",score:0.80},{symbol:"GCK",score:0.74}] },
      { id:"MONDO:0004979", name:"Asthma", score:0.88, gene_count:156, association_count:1987, categories:["respiratory","immune"], top_genes:[{symbol:"IL13",score:0.93},{symbol:"ORMDL3",score:0.86},{symbol:"GSDMB",score:0.79},{symbol:"IL33",score:0.72}] },
      { id:"MONDO:0005090", name:"Schizophrenia", score:0.86, gene_count:298, association_count:4102, categories:["neurological","psychiatric"], top_genes:[{symbol:"DISC1",score:0.88},{symbol:"NRG1",score:0.84},{symbol:"DTNBP1",score:0.79},{symbol:"COMT",score:0.74}] },
    ].filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.id.toLowerCase().includes(query.toLowerCase()) || query === "");
    return { results: mock.slice(0, 20), total: mock.length };
  }
}

async function fetchDiseaseGraph(diseaseId) {
  try {
    const r = await fetch(`${API_BASE}/diseases/${encodeURIComponent(diseaseId)}/graph`);
    return await r.json();
  } catch {
    // Mock graph
    const genes = ["APOE","APP","PSEN1","TREM2","CLU","BIN1","CR1","ABCA7","PICALM","CD33"];
    const nodes = [
      { id: diseaseId, label: "DISEASE", type: "disease", score: 1.0 },
      ...genes.map((g,i) => ({ id: g, label: g, type: "gene", score: Math.max(0.4, 1 - i * 0.07) }))
    ];
    const edges = genes.map(g => ({ source: diseaseId, target: g, weight: Math.random() * 0.5 + 0.5 }));
    // Gene-gene edges
    for (let i = 0; i < genes.length - 1; i++) {
      if (Math.random() > 0.5) edges.push({ source: genes[i], target: genes[i+1], weight: Math.random() * 0.4 + 0.1 });
    }
    return { nodes, edges };
  }
}

// ─── Component: StatsBar ──────────────────────────────────────────────────────
function StatsBar({ stats }) {
  return (
    <div className="stats-bar">
      <button 
        onClick={() => window.location.href = '/explorer'}
        style={{ 
          background: "transparent", border: "1px solid #252A35", borderRadius: "4px", color: "#1DB891", 
          cursor: "pointer", display: "flex", alignItems: "center", 
          marginRight: "16px", padding: "4px 8px", fontSize: "11px",
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600
        }}
      >
        ← BACK
      </button>
      <div className="stats-bar-logo">MEDI<span>NEX</span> V3</div>
      <div className="stat-item">
        <div className="stat-dot" />
        <span className="stat-label">Status</span>
        <span className="stat-value teal mono">LIVE</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Diseases</span>
        <span className="stat-value mono">{stats?.total_diseases?.toLocaleString() ?? "—"}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Genes</span>
        <span className="stat-value mono">{stats?.total_genes?.toLocaleString() ?? "—"}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Associations</span>
        <span className="stat-value amber mono">{stats?.total_associations?.toLocaleString() ?? "—"}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">DB</span>
        <span className="stat-value mono">{stats?.db_version ?? "—"}</span>
      </div>
    </div>
  );
}

// ─── Component: SearchBar ─────────────────────────────────────────────────────
function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const FILTERS = ["neurological","cancer","metabolic","cardiovascular","immune"];

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    if (v.length > 1) {
      debounceRef.current = setTimeout(async () => {
        const res = await searchDiseases(v);
        setSuggestions((res.results || []).slice(0, 6));
        setShowDrop(true);
      }, 220);
    } else {
      setShowDrop(false);
    }
  };

  const handleSubmit = () => {
    setShowDrop(false);
    onSearch(query, activeFilter ? { category: activeFilter } : {});
  };

  const handleSuggest = (item) => {
    setQuery(item.name);
    setShowDrop(false);
    onSearch(item.name, activeFilter ? { category: activeFilter } : {});
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") setShowDrop(false);
  };

  return (
    <div>
      <div className="search-section">
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search disease name or MONDO ID…"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKey}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            onFocus={() => suggestions.length > 0 && setShowDrop(true)}
            autoComplete="off"
          />
          {showDrop && suggestions.length > 0 && (
            <div className="search-dropdown">
              {suggestions.map(s => (
                <div key={s.id} className="search-dropdown-item" onMouseDown={() => handleSuggest(s)}>
                  <span className="sdi-id">{s.id}</span>
                  <span className="sdi-name">{s.name}</span>
                  <span className="sdi-count">{s.gene_count} genes</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="search-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Querying…" : "Explore"}
        </button>
      </div>
      <div className="filter-row">
        <span className="filter-label">Filter</span>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-chip${activeFilter === f ? " active" : ""}`}
            onClick={() => setActiveFilter(activeFilter === f ? null : f)}
          >{f}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Component: DiseasePanel ──────────────────────────────────────────────────
function DiseasePanel({ diseases, loading, selected, onSelect }) {
  return (
    <div className="disease-panel">
      <div className="panel-header">
        <span className="panel-title">Results</span>
        {diseases.length > 0 && <span className="panel-count">{diseases.length} matches</span>}
      </div>

      <div className="panel-body">
        {loading && [0,1,2,3,4].map(i => (
          <div key={i} className="shimmer shimmer-row" style={{ margin: "1px 0" }} />
        ))}

        {!loading && diseases.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <div className="empty-title">No results yet</div>
            <div className="empty-sub">Search a disease name or MONDO identifier to explore gene associations.</div>
          </div>
        )}

        {!loading && diseases.map(d => (
          <div
            key={d.id}
            className={`disease-card${selected?.id === d.id ? " selected" : ""}`}
            onClick={() => onSelect(d)}
          >
            <div className="dc-id mono">{d.id}</div>
            <div className="dc-row1">
              <div className="dc-name">{d.name}</div>
              <div className="dc-score-badge">{(d.score * 100).toFixed(0)}%</div>
            </div>
            <div className="dc-row2">
              <div className="dc-meta">
                <span>Genes</span>
                <span className="dc-meta-val">{d.gene_count}</span>
              </div>
              <div className="dc-meta">
                <span>Assoc</span>
                <span className="dc-meta-val">{d.association_count?.toLocaleString()}</span>
              </div>
            </div>
            {d.categories?.length > 0 && (
              <div className="dc-tags">
                {d.categories.map(c => <span key={c} className="dc-tag">{c}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {selected?.top_genes?.length > 0 && (
        <div className="gene-detail">
          <div className="gene-detail-title">
            <span>Top Associated Genes</span>
            <span className="mono" style={{ color: T.teal }}>{selected.name.split(" ").slice(0,2).join(" ")}</span>
          </div>
          {selected.top_genes.map(g => (
            <div key={g.symbol} className="gene-row">
              <div className="gene-name">{g.symbol}</div>
              <div className="gene-bar-wrap">
                <div className="gene-bar" style={{ width: `${g.score * 100}%` }} />
              </div>
              <div className="gene-score">{(g.score * 100).toFixed(0)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component: GraphCanvas ───────────────────────────────────────────────────
function GraphCanvas({ diseaseId, diseaseName }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const animRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("network");
  const [mapPos, setMapPos] = useState({ coordinates: [0, 0], zoom: 1 });
  const [graphData, setGraphData] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(null);

  const MOCK_OUTBREAKS = [
    { name: "New York", coordinates: [-74.006, 40.7128], severity: 0.9 },
    { name: "London", coordinates: [-0.1276, 51.5072], severity: 0.6 },
    { name: "Tokyo", coordinates: [139.6503, 35.6762], severity: 0.8 },
    { name: "São Paulo", coordinates: [-46.6333, -23.5505], severity: 0.5 },
    { name: "Sydney", coordinates: [151.2093, -33.8688], severity: 0.3 }
  ];

  // Force simulation
  const simulate = useCallback((nodes, edges, W, H) => {
    nodes.forEach((n, i) => {
      if (!n.x) {
        const angle = (i / nodes.length) * Math.PI * 2;
        const r = n.type === "disease" ? 0 : (80 + Math.random() * 120);
        n.x = W / 2 + Math.cos(angle) * r;
        n.y = H / 2 + Math.sin(angle) * r;
        n.vx = 0; n.vy = 0;
      }
    });

    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

    const tick = () => {
      const k = 0.02;
      const repulsion = 1200;
      const linkDist = 110;
      const centerForce = 0.003;

      nodes.forEach(n => {
        n.vx += (W / 2 - n.x) * centerForce;
        n.vy += (H / 2 - n.y) * centerForce;

        nodes.forEach(m => {
          if (m === n) return;
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          n.vx += (dx / dist) * force * k;
          n.vy += (dy / dist) * force * k;
        });
      });

      edges.forEach(e => {
        const src = nodeMap[e.source], tgt = nodeMap[e.target];
        if (!src || !tgt) return;
        const dx = tgt.x - src.x, dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - linkDist) * 0.04 * (e.weight || 0.5);
        src.vx += (dx / dist) * force;
        src.vy += (dy / dist) * force;
        tgt.vx -= (dx / dist) * force;
        tgt.vy -= (dy / dist) * force;
      });

      nodes.forEach(n => {
        if (draggingRef.current === n.id) return;
        n.vx *= 0.72; n.vy *= 0.72;
        n.x += n.vx; n.y += n.vy;
      });
    };

    return tick;
  }, []);

  const draw = useCallback((canvas, nodes, edges, W, H) => {
    const ctx = canvas.getContext("2d");
    const z = zoomRef.current;
    const pan = panRef.current;
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(z, z);

    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

    edges.forEach(e => {
      const src = nodeMap[e.source], tgt = nodeMap[e.target];
      if (!src || !tgt) return;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = `rgba(37,42,53,${0.4 + (e.weight || 0.5) * 0.6})`;
      ctx.lineWidth = (e.weight || 0.5) * 1.5;
      ctx.stroke();
    });

    nodes.forEach(n => {
      const isDisease = n.type === "disease";
      const r = isDisease ? 18 : 7 + n.score * 8;
      const color = isDisease ? "#1DB891" : `rgba(29,184,145,${0.35 + n.score * 0.65})`;

      if (isDisease || n.score > 0.7) {
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
        grd.addColorStop(0, isDisease ? "rgba(29,184,145,0.22)" : "rgba(29,184,145,0.1)");
        grd.addColorStop(1, "rgba(29,184,145,0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (isDisease) {
        ctx.strokeStyle = "#23D4A6";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.fillStyle = isDisease ? "#E8EAF0" : (n.score > 0.6 ? "#8A8FA8" : "#4A5068");
      ctx.font = isDisease
        ? `600 11px 'JetBrains Mono', monospace`
        : `500 ${9 + n.score * 2}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label.length > 10 ? n.label.slice(0, 10) + "…" : n.label, n.x, n.y + r + 10);
    });

    ctx.restore();
  }, []);

  useEffect(() => {
    if (!diseaseId) return;
    setLoading(true);
    setGraphData(null);
    fetchDiseaseGraph(diseaseId).then(data => {
      setGraphData(data);
      setLoading(false);
    });
  }, [diseaseId]);

  useEffect(() => {
    if (!graphData || !canvasRef.current || !wrapRef.current || viewMode !== "network") return;
    const wrap = wrapRef.current;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    const canvas = canvasRef.current;
    canvas.width = W; canvas.height = H;

    const { nodes, edges } = graphData;
    const tick = simulate(nodes, edges, W, H);

    let frame = 0;
    const loop = () => {
      if (frame < 200) tick();
      frame++;
      draw(canvas, nodes, edges, W, H);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData, simulate, draw, viewMode]);

  const getNodeAt = (cx, cy) => {
    if (!graphData) return null;
    const z = zoomRef.current, pan = panRef.current;
    const wx = (cx - pan.x) / z, wy = (cy - pan.y) / z;
    return graphData.nodes.find(n => {
      const r = n.type === "disease" ? 18 : 7 + n.score * 8;
      const dx = n.x - wx, dy = n.y - wy;
      return Math.sqrt(dx * dx + dy * dy) < r + 4;
    });
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const node = getNodeAt(cx, cy);
    if (node) {
      setTooltip({ x: cx + 14, y: cy - 10, node });
      canvasRef.current.style.cursor = "pointer";
    } else {
      setTooltip(null);
      canvasRef.current.style.cursor = "default";
    }
  };

  const handleWheel = (e) => {
    if (viewMode !== "network") return; // Map view handles its own wheel natively
    e.preventDefault();
    zoomRef.current = Math.max(0.3, Math.min(2.5, zoomRef.current - e.deltaY * 0.001));
    setZoom(zoomRef.current);
  };

  const resetView = () => {
    if (viewMode === "network") {
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
      setZoom(1);
    } else {
      setMapPos({ coordinates: [0, 0], zoom: 1 });
    }
  };

  const zoomIn = () => {
    if (viewMode === "network") {
      zoomRef.current = Math.min(2.5, zoomRef.current + 0.2);
      setZoom(zoomRef.current);
    } else {
      setMapPos(pos => ({ ...pos, zoom: Math.min(pos.zoom * 1.5, 4) }));
    }
  };

  const zoomOut = () => {
    if (viewMode === "network") {
      zoomRef.current = Math.max(0.3, zoomRef.current - 0.2);
      setZoom(zoomRef.current);
    } else {
      setMapPos(pos => ({ ...pos, zoom: Math.max(pos.zoom / 1.5, 1) }));
    }
  };

  return (
    <div className="graph-panel">
      <div className="graph-toolbar">
        <div style={{ display: 'flex', gap: '4px', background: "#161a20", padding: '4px', borderRadius: '6px' }}>
          <button 
            onClick={() => setViewMode("network")}
            style={{ 
              background: viewMode === "network" ? "rgba(29,184,145,0.15)" : "transparent",
              color: viewMode === "network" ? "#23D4A6" : "#8A8FA8",
              border: `1px solid ${viewMode === "network" ? "#23D4A6" : "transparent"}`,
              borderRadius: "4px", padding: "4px 12px", fontSize: "11px", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontWeight: 600, transition: "all 0.2s"
            }}
          >Network View</button>
          <button 
            onClick={() => setViewMode("map")}
            style={{ 
              background: viewMode === "map" ? "rgba(29,184,145,0.15)" : "transparent",
              color: viewMode === "map" ? "#23D4A6" : "#8A8FA8",
              border: `1px solid ${viewMode === "map" ? "#23D4A6" : "transparent"}`,
              borderRadius: "4px", padding: "4px 12px", fontSize: "11px", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontWeight: 600, transition: "all 0.2s"
            }}
          >Predictive Map</button>
        </div>
        {diseaseName && <span style={{ marginLeft: "10px", fontSize: 11, color: "#23D4A6", fontFamily: "'JetBrains Mono', monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{diseaseName}</span>}
        <div style={{ flex: 1 }} />
        <button className="icon-btn" onClick={resetView} title="Reset view">⟳ Reset</button>
        <button className="icon-btn" onClick={zoomIn}>＋</button>
        <button className="icon-btn" onClick={zoomOut}>－</button>
      </div>

      <div className="graph-canvas-wrap" ref={wrapRef}>
        {loading && (
          <div className="graph-empty">
            <div style={{ color: "#23D4A6", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>Loading visualization…</div>
          </div>
        )}
        {!loading && !diseaseId && (
          <div className="graph-empty">
            <div className="graph-empty-icon">⬡</div>
            <div className="graph-empty-text">Select a disease to visualise its spatial telemetry</div>
          </div>
        )}
        
        {/* NETWORK VIEW */}
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          onWheel={handleWheel}
          style={{ display: (loading || !diseaseId || viewMode !== "network") ? "none" : "block", width: "100%", height: "100%" }}
        />
        {viewMode === "network" && tooltip && (
          <div className="graph-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            <div className="tooltip-name">{tooltip.node.label}</div>
            <div className="tooltip-row">
              <span>Type</span>
              <span className="tooltip-val">{tooltip.node.type}</span>
            </div>
            <div className="tooltip-row">
              <span>Score</span>
              <span className="tooltip-val">{(tooltip.node.score * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* MAP VIEW */}
        {!loading && diseaseId && viewMode === "map" && (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c0e12", position: "relative" }}>
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 130 }} style={{ width: "100%", height: "100%" }}>
              <ZoomableGroup 
                zoom={mapPos.zoom} 
                center={mapPos.coordinates as [number, number]} 
                onMoveEnd={(position) => setMapPos(position)}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        style={{
                          default: { fill: "#1E242D", stroke: "#E05C5C", strokeWidth: 0.8, outline: "none" },
                          hover: { fill: "#2A323D", stroke: "#E05C5C", strokeWidth: 1.2, outline: "none" },
                          pressed: { fill: "#1E242D", stroke: "#E05C5C", strokeWidth: 0.8, outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>
                {MOCK_OUTBREAKS.map((marker, i) => (
                  <Marker key={i} coordinates={marker.coordinates as [number, number]}>
                    <circle
                      r={marker.severity * 15}
                      fill={T.red}
                      opacity={0.6}
                      stroke={T.red}
                      strokeWidth={2}
                    >
                      <animate attributeName="r" values={`${marker.severity * 10};${marker.severity * 25};${marker.severity * 10}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle r={marker.severity * 4} fill={T.red} />
                    <text
                      textAnchor="middle"
                      y={-10 - (marker.severity * 5)}
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fill: T.textPrimary }}
                    >
                      {marker.name}
                    </text>
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>
            
            {/* Predictive Telemetry Overlay Panel */}
            <div style={{ position: "absolute", bottom: "24px", left: "24px", background: "rgba(22, 26, 32, 0.85)", border: `1px solid ${T.border}`, padding: "16px", borderRadius: "8px", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: T.red, boxShadow: `0 0 8px ${T.red}` }} />
                <div style={{ fontSize: "11px", color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.1em" }}>DBSCAN Spatial Cluster</div>
              </div>
              <div style={{ color: T.red, fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 600 }}>HIGH RISK SPREAD PREDICTED</div>
              <div style={{ fontSize: "12px", color: T.textPrimary, marginTop: "6px", maxWidth: "250px", lineHeight: 1.5 }}>
                Telemetry indicates active outbreak clusters across 5 major global hubs for <strong style={{color: T.teal}}>{diseaseName}</strong>.
              </div>
            </div>
          </div>
        )}
        <div className="graph-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: T.teal, boxShadow: `0 0 5px ${T.teal}` }} />Disease node</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(29,184,145,0.7)" }} />High-confidence gene</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(29,184,145,0.3)" }} />Supporting gene</div>
        </div>
      </div>
    </div>
  );
}

// ─── Root: BioquoraExplorer ────────────────────────────────────────────────────
export default function BioquoraExplorer() {
  const [stats, setStats] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats().then(setStats);
    // Prime with empty search
    searchDiseases("").then(r => setDiseases(r.results || []));
  }, []);

  const handleSearch = async (query, filters) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const res = await searchDiseases(query, filters);
      setDiseases(res.results || []);
    } catch (e) {
      setError("Query failed — check that api.py is running on :8000");
    }
    setLoading(false);
  };

  return (
    <>
      <style>{css}</style>
      <StatsBar stats={stats} />
      <SearchBar onSearch={handleSearch} loading={loading} />
      {error && (
        <div className="error-banner">⚠ {error}</div>
      )}
      <div className="main-layout">
        <DiseasePanel
          diseases={diseases}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
        />
        <GraphCanvas
          diseaseId={selected?.id}
          diseaseName={selected?.name}
        />
      </div>
    </>
  );
}
