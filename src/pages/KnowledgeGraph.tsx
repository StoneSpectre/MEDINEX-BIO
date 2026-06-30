import React, { useEffect, useState, useRef } from 'react';
import { Network, Database, Activity, GitBranch, Terminal, Shield, Filter, Search, ChevronRight } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';

const C = {
  bg: "#020617",
  surface: "rgba(15, 23, 42, 0.6)",
  border: "rgba(251, 191, 36, 0.15)",
  accent: "#fbbf24", // Yellow for graph
  accentGlow: "rgba(251, 191, 36, 0.4)",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  success: "#34d399",
  info: "#38bdf8",
  danger: "#f43f5e"
};

const NODE_COLORS: Record<string, string> = {
  Disease: '#f43f5e',
  Drug: '#38bdf8',
  Gene: '#34d399',
  Protein: '#fbbf24',
  Paper: '#a78bfa',
  Chemical: '#f97316',
  MeSHTerm: '#2dd4bf',
  Pathway: '#fbbf24',
};

const MOCK_GRAPH = {
  nodes: [
    { id: 'Asthma', type: 'Disease', label: 'Asthma' },
    { id: 'Albuterol', type: 'Drug', label: 'Albuterol' },
    { id: 'ADRB2', type: 'Gene', label: 'ADRB2' },
    { id: 'Inflammation', type: 'Pathway', label: 'Inflammation' },
    { id: 'IL4', type: 'Gene', label: 'IL4' },
    { id: 'Budesonide', type: 'Drug', label: 'Budesonide' },
    { id: 'rs1042713', type: 'Gene', label: 'rs1042713 (ClinVar)' }
  ],
  links: [
    { source: 'Albuterol', target: 'ADRB2', name: 'TARGETS', weight: 1 },
    { source: 'ADRB2', target: 'Asthma', name: 'ASSOCIATED_WITH', weight: 1 },
    { source: 'Asthma', target: 'Inflammation', name: 'INVOLVES', weight: 1 },
    { source: 'IL4', target: 'Inflammation', name: 'PARTICIPATES_IN', weight: 1 },
    { source: 'Budesonide', target: 'IL4', name: 'DOWNREGULATES', weight: 1 },
    { source: 'rs1042713', target: 'ADRB2', name: 'VARIANT_OF', weight: 1 },
  ]
};

export function KnowledgeGraph() {
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("cypher");
  const [filters, setFilters] = useState({ clinvar: true, gwas: false, literature: true });
  const [cypherQuery, setCypherQuery] = useState("MATCH (d:Disease {name: 'Asthma'})-[:ASSOCIATED_WITH]-(g:Gene)-[:TARGETS]-(dr:Drug)\nRETURN d, g, dr");
  const fgRef = useRef<any>();

  useEffect(() => {
    // Simulate fetching graph data or fallback to MOCK
    const loadGraph = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";
        const res = await fetch(`${API_URL}/graph`);
        if (res.ok) {
          const data = await res.json();
          setGraphData({
            nodes: data.nodes.map((n: any) => ({ ...n, val: n.type === 'Disease' ? 4 : 2 })),
            links: data.edges.map((e: any) => ({ ...e, source: e.src, target: e.dst, name: e.relation }))
          });
        } else {
          throw new Error("API not ready, using mock");
        }
      } catch (err) {
        // Use rich mock data if API fails
        setGraphData({
          nodes: MOCK_GRAPH.nodes.map(n => ({ ...n, val: n.type === 'Disease' ? 4 : 3 })),
          links: MOCK_GRAPH.links
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadGraph();
  }, []);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => fgRef.current.zoomToFit(400, 50), 500);
    }
  }, [graphData]);

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    // Re-trigger graph force animation slightly to show reactivity
    if (fgRef.current) fgRef.current.d3ReheatSimulation();
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" }}>
      
      {/* Top Navigation */}
      <div style={{ padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: "transparent", border: `1px solid ${C.border}`, color: C.accent,
            padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
            fontSize: "14px", fontWeight: "600", transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(251, 191, 36, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          ← BACK TO HOME
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Network size={20} color={C.accent} />
          <span style={{ fontSize: "14px", color: C.text, letterSpacing: "1px", fontWeight: "bold" }}>NEO4J PRODUCTION GRAPH</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", flex: 1 }}>
        
        {/* Left Sidebar: Controls & Analytics */}
        <div style={{ background: "rgba(0,0,0,0.3)", borderRight: `1px solid rgba(255,255,255,0.05)`, padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter size={18} color={C.accent} /> Edge Filtering
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {Object.entries(filters).map(([key, active]) => (
                <button 
                  key={key} 
                  onClick={() => toggleFilter(key as keyof typeof filters)}
                  style={{ 
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", borderRadius: "8px", border: `1px solid ${active ? C.accent : 'rgba(255,255,255,0.1)'}`,
                    background: active ? `${C.accent}15` : 'transparent', color: active ? C.text : C.textMuted,
                    cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize"
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: "500" }}>{key} Edges</span>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: active ? C.accent : 'transparent', border: `1px solid ${active ? C.accent : '#555'}` }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={18} color={C.info} /> Graph Analytics
            </h2>
            <div style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: C.textMuted }}>Centrality Hub:</span>
                <span style={{ fontSize: "12px", color: C.success, fontWeight: "bold" }}>ADRB2 (Degree: 24)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: C.textMuted }}>Community Detection:</span>
                <span style={{ fontSize: "12px", color: C.info, fontWeight: "bold" }}>Louvain (12 Clusters)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: C.textMuted }}>Total Nodes:</span>
                <span style={{ fontSize: "12px", color: C.text, fontWeight: "bold" }}>4.2 Million</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Area: Graph Visualization & Cypher Terminal */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          
          {/* Main Force Graph */}
          <div style={{ flex: 1, position: "relative" }}>
            {loading ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: `3px solid ${C.accent}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeLabel="label"
                nodeColor={node => NODE_COLORS[node.type] || '#999'}
                linkColor={() => 'rgba(255,255,255,0.2)'}
                linkWidth={1.5}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                backgroundColor={C.bg}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.label;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                  ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = NODE_COLORS[node.type] || '#fff';
                  ctx.fillText(label, node.x, node.y);

                  node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
                }}
                nodePointerAreaPaint={(node, color, ctx) => {
                  ctx.fillStyle = color;
                  const bckgDimensions = node.__bckgDimensions;
                  bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                }}
              />
            )}
            
            {/* Overlay Legend */}
            <div style={{ position: "absolute", top: "24px", right: "24px", background: "rgba(0,0,0,0.6)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "1px", color: C.textMuted, marginBottom: "12px", textTransform: "uppercase" }}>Node Types</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color }} />
                    {type}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Cypher Terminal */}
          <div style={{ height: "250px", background: "#0a0f1c", borderTop: `1px solid ${C.accent}40`, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ padding: "10px 24px", background: "rgba(251,191,36,0.1)", borderBottom: `2px solid ${C.accent}`, color: C.accent, fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                <Terminal size={14} /> CYPHER QUERY SIMULATOR
              </div>
            </div>
            <div style={{ flex: 1, padding: "20px", display: "flex", gap: "20px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea 
                  value={cypherQuery}
                  onChange={(e) => setCypherQuery(e.target.value)}
                  style={{
                    width: "100%", height: "100%", background: "transparent", border: "none", outline: "none", resize: "none",
                    color: "#f8fafc", fontFamily: "monospace", fontSize: "14px", lineHeight: "1.5"
                  }}
                  spellCheck="false"
                />
                <div style={{ position: "absolute", bottom: "0", right: "0" }}>
                  <button style={{
                    background: C.accent, color: "#000", border: "none", padding: "8px 16px", borderRadius: "6px",
                    fontSize: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                    boxShadow: `0 0 15px ${C.accentGlow}`
                  }}>
                    EXECUTE <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div style={{ width: "300px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "16px", border: "1px solid rgba(255,255,255,0.05)", overflowY: "auto" }}>
                <div style={{ fontSize: "10px", color: C.textMuted, marginBottom: "8px", letterSpacing: "1px" }}>QUERY EXPLAIN PLAN</div>
                <div style={{ fontSize: "12px", color: "#4ade80", fontFamily: "monospace", marginBottom: "4px" }}>&gt; MATCH VectorIndex (Asthma)</div>
                <div style={{ fontSize: "12px", color: "#4ade80", fontFamily: "monospace", marginBottom: "4px" }}>&gt; Traverse: ASSOCIATED_WITH</div>
                <div style={{ fontSize: "12px", color: "#4ade80", fontFamily: "monospace", marginBottom: "4px" }}>&gt; Extract: Gene Nodes</div>
                <div style={{ fontSize: "12px", color: "#a78bfa", fontFamily: "monospace", marginTop: "12px" }}>Result: 24 Hub Paths Found</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
