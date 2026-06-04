import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Biomedical Knowledge Sources",
    subtitle: "Literature Layer",
    color: "#00d4ff",
    icon: "📚",
    description: "Understand where biomedical knowledge comes from before building AI.",
    resources: [
      { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/", type: "website" },
      { name: "PubMed Central (PMC)", url: "https://pmc.ncbi.nlm.nih.gov/", type: "website" },
    ],
    learn: ["Abstracts", "Full-text papers", "Citations", "MeSH Terms", "Journal Structure"],
    deliverable: "Understand biomedical research literature.",
    flow: null,
  },
  {
    id: 2,
    title: "Collect Biomedical Data",
    subtitle: "NCBI APIs",
    color: "#00ffaa",
    icon: "🔌",
    description: "Build data collection pipelines using NCBI's E-Utilities API.",
    resources: [
      { name: "NCBI E-Utilities Docs", url: "https://www.ncbi.nlm.nih.gov/books/NBK25501/", type: "website" },
    ],
    learn: ["Paper Search Engine", "Metadata Fetching", "Abstract Retrieval", "Citation Retrieval"],
    deliverable: "PubMed → Python → Structured Dataset",
    flow: ["PubMed", "Python", "Structured Dataset"],
  },
  {
    id: 3,
    title: "Clinical Data Infrastructure",
    subtitle: "PhysioNet & MIMIC-IV",
    color: "#ff6b6b",
    icon: "🏥",
    description: "Learn how real hospital data is structured — most founders skip this.",
    resources: [
      { name: "PhysioNet", url: "https://physionet.org/", type: "website" },
      { name: "MIMIC-IV Dataset", url: "https://physionet.org/content/mimiciv/", type: "website" },
    ],
    learn: ["patients", "admissions", "diagnoses_icd", "procedures_icd", "prescriptions", "labevents", "chartevents"],
    deliverable: "Patient → Diagnosis → Treatment → Outcome",
    flow: ["Patient", "Diagnosis", "Treatment", "Outcome"],
  },
  {
    id: 4,
    title: "Biomedical NLP",
    subtitle: "scispaCy · BioBERT · PubMedBERT",
    color: "#a78bfa",
    icon: "🧠",
    description: "Convert biomedical text into structured knowledge using state-of-the-art NLP.",
    resources: [
      { name: "scispaCy", url: "https://github.com/allenai/scispacy", type: "github" },
      { name: "BioBERT", url: "https://github.com/dmis-lab/biobert", type: "github" },
      { name: "PubMedBERT", url: "https://huggingface.co/microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract", type: "huggingface" },
    ],
    learn: ["NER", "Disease/Drug/Gene Recognition", "Relation Extraction", "Biomedical QA", "Biomedical Embeddings", "Semantic Similarity"],
    deliverable: "Paper → Entities → Relations → Embeddings",
    flow: ["Paper", "Entities", "Relations", "Embeddings"],
  },
  {
    id: 5,
    title: "Knowledge Graph Engineering",
    subtitle: "Neo4j",
    color: "#fbbf24",
    icon: "🕸️",
    description: "Connect biomedical concepts into a queryable graph database.",
    resources: [
      { name: "Neo4j Graph Academy", url: "https://graphacademy.neo4j.com/", type: "website" },
      { name: "Neo4j Graph Examples", url: "https://github.com/neo4j-graph-examples", type: "github" },
    ],
    learn: ["Nodes", "Relationships", "Cypher", "Graph Schema"],
    deliverable: "Disease ↔ Gene ↔ Drug ↔ Paper",
    flow: ["Disease", "Gene", "Drug", "Paper"],
    graph: [
      { from: "Disease", rel: "Associated_With", to: "Gene" },
      { from: "Gene", rel: "Targeted_By", to: "Drug" },
      { from: "Drug", rel: "Mentioned_In", to: "Paper" },
    ],
  },
  {
    id: 6,
    title: "Graph Analytics",
    subtitle: "NetworkX",
    color: "#34d399",
    icon: "📊",
    description: "Discover hidden patterns across disease, drug, and gene networks.",
    resources: [
      { name: "NetworkX", url: "https://github.com/networkx/networkx", type: "github" },
    ],
    learn: ["Centrality", "Community Detection", "Network Analysis"],
    deliverable: "Knowledge discovery engine",
    flow: null,
  },
  {
    id: 7,
    title: "Semantic Search",
    subtitle: "FAISS",
    color: "#f97316",
    icon: "🔍",
    description: "Build vector-based search over all biomedical literature.",
    resources: [
      { name: "FAISS", url: "https://github.com/facebookresearch/faiss", type: "github" },
    ],
    learn: ["Vector Search", "Similarity Search", "Retrieval Systems"],
    deliverable: "Research Query → Embedding → FAISS → Relevant Papers",
    flow: ["Research Query", "Embedding", "FAISS", "Relevant Papers"],
  },
  {
    id: 8,
    title: "Retrieval Systems",
    subtitle: "LlamaIndex · LangChain",
    color: "#e879f9",
    icon: "⛓️",
    description: "Build end-to-end retrieval-augmented generation pipelines.",
    resources: [
      { name: "LlamaIndex", url: "https://github.com/run-llama/llama_index", type: "github" },
      { name: "LangChain", url: "https://github.com/langchain-ai/langchain", type: "github" },
    ],
    learn: ["Document Indexing", "Retrieval Pipelines", "Agents", "Tools", "RAG Pipelines"],
    deliverable: "Research Assistant v1",
    flow: null,
  },
  {
    id: 9,
    title: "Graph RAG",
    subtitle: "Microsoft GraphRAG",
    color: "#38bdf8",
    icon: "🧬",
    description: "Multi-hop reasoning across the knowledge graph using LLMs.",
    resources: [
      { name: "Microsoft GraphRAG", url: "https://github.com/microsoft/graphrag", type: "github" },
    ],
    learn: ["Multi-hop Retrieval", "Graph Reasoning", "Knowledge Discovery"],
    deliverable: '"Which genes are associated with Alzheimer\'s through inflammation pathways and are targeted by approved drugs?"',
    flow: null,
  },
  {
    id: 10,
    title: "Medinex Phase 0 Final System",
    subtitle: "Biomedical Intelligence Platform",
    color: "#ff4ecd",
    icon: "🚀",
    description: "The complete integrated stack — from raw data to AI-powered biomedical intelligence.",
    resources: [],
    learn: [
      "Ingest PubMed literature",
      "Understand biomedical entities (diseases, genes, drugs)",
      "Build a biomedical knowledge graph",
      "Integrate PhysioNet & MIMIC-IV clinical data",
      "Perform semantic search",
      "Power an AI biomedical research assistant",
    ],
    deliverable: "MEDINEX Biomedical Intelligence Platform",
    flow: ["PubMed+PMC+PhysioNet+MIMIC-IV", "NCBI APIs", "scispaCy", "BioBERT", "PubMedBERT", "Neo4j", "NetworkX", "FAISS", "LlamaIndex", "LangChain", "GraphRAG", "MEDINEX"],
    isFinal: true,
  },
];

const badgeStyle: Record<string, { bg: string, color: string, label: string }> = {
  github: { bg: "#1a1a2e", color: "#58a6ff", label: "GitHub" },
  website: { bg: "#0d1117", color: "#00d4ff", label: "Website" },
  huggingface: { bg: "#1a1a00", color: "#fbbf24", label: "🤗 HuggingFace" },
};

export default function MedinexDashboard() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleComplete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const step = activeStep !== null ? steps[activeStep] : null;
  const progress = (completedSteps.size / steps.length) * 100;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      color: "#e2e8f0",
      fontFamily: "'DM Mono', 'Fira Code', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated grid background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        zIndex: 0,
      }} />

      {/* Glowing orbs */}
      <div style={{ position: "fixed", top: "-200px", left: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-200px", right: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,78,205,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Back Link */}
        <Link to="/" style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "8px", 
          color: "#94a3b8", 
          textDecoration: "none",
          fontSize: "13px",
          marginBottom: "20px",
          padding: "8px 16px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#94a3b8";
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        >
          <ArrowLeft size={16} /> Back to Operating System
        </Link>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "60px", marginTop: "20px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "6px", color: "#00d4ff", textTransform: "uppercase", marginBottom: "16px", opacity: 0.8 }}>
            PHASE 0 · BIOMEDICAL INTELLIGENCE
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontFamily: "'Space Grotesk', 'DM Mono', sans-serif",
            fontWeight: 800,
            letterSpacing: "-2px",
            margin: 0,
            background: "linear-gradient(135deg, #ffffff 0%, #00d4ff 40%, #ff4ecd 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.1,
          }}>
            MEDINEX
          </h1>
          <p style={{ color: "#64748b", fontSize: "15px", marginTop: "12px", letterSpacing: "1px" }}>
            Build the first true Biomedical Intelligence Layer
          </p>

          {/* Progress bar */}
          <div style={{ marginTop: "32px", maxWidth: "500px", margin: "32px auto 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", color: "#475569" }}>
              <span>PROGRESS</span>
              <span style={{ color: "#00d4ff" }}>{completedSteps.size}/{steps.length} STEPS</span>
            </div>
            <div style={{ height: "4px", background: "#0f172a", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #00d4ff, #ff4ecd)",
                borderRadius: "2px",
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        </div>

        {/* Architecture flow — compact */}
        <div style={{
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(0,212,255,0.15)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "48px",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#475569", marginBottom: "20px" }}>SYSTEM ARCHITECTURE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {["PubMed", "PMC", "PhysioNet", "MIMIC-IV", "NCBI APIs", "scispaCy", "BioBERT", "PubMedBERT", "Neo4j", "NetworkX", "FAISS", "LlamaIndex", "LangChain", "GraphRAG"].map((item, i, arr) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  padding: "6px 12px",
                  background: "rgba(0,212,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                }}>
                  {item}
                </div>
                {i < arr.length - 1 && <span style={{ color: "#1e3a4a", fontSize: "16px" }}>→</span>}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#1e3a4a", fontSize: "16px" }}>→</span>
              <div style={{
                padding: "6px 14px",
                background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(255,78,205,0.15))",
                border: "1px solid rgba(255,78,205,0.4)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#ff4ecd",
                fontWeight: 700,
                letterSpacing: "1px",
              }}>
                MEDINEX
              </div>
            </div>
          </div>
        </div>

        {/* Steps grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px", marginBottom: "48px" }}>
          {steps.map((s, i) => {
            const isComplete = completedSteps.has(s.id);
            const isActive = activeStep === i;
            return (
              <div
                key={s.id}
                onClick={() => setActiveStep(isActive ? null : i)}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, rgba(${hexToRgb(s.color)},0.12), rgba(${hexToRgb(s.color)},0.04))`
                    : "rgba(15,23,42,0.7)",
                  border: `1px solid ${isActive ? s.color + "60" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "16px",
                  padding: "24px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(10px)",
                  position: "relative",
                  overflow: "hidden",
                  gridColumn: s.isFinal ? "1 / -1" : undefined,
                }}
              >
                {/* Step number line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: isComplete ? s.color : "transparent", transition: "background 0.3s" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "10px",
                      background: `rgba(${hexToRgb(s.color)},0.15)`,
                      border: `1px solid ${s.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px",
                    }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: s.color, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "2px" }}>
                        STEP {s.id}
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>{s.title}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleComplete(s.id, e)}
                    style={{
                      width: "28px", height: "28px", borderRadius: "8px",
                      background: isComplete ? s.color : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isComplete ? s.color : "rgba(255,255,255,0.1)"}`,
                      color: isComplete ? "#000" : "#475569",
                      fontSize: "14px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </button>
                </div>

                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "16px", lineHeight: 1.5 }}>
                  {s.subtitle}
                </div>

                <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "16px", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                  {s.description}
                </p>

                {/* Resources */}
                {s.resources.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                    {s.resources.map(r => {
                      const badge = badgeStyle[r.type] || badgeStyle.website;
                      return (
                        <a
                          key={r.name}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            display: "flex", alignItems: "center", gap: "4px",
                            padding: "4px 10px",
                            background: badge.bg,
                            border: `1px solid ${badge.color}30`,
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: badge.color,
                            textDecoration: "none",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: "9px", opacity: 0.6 }}>{badge.label}</span>
                          <span>{r.name}</span>
                          <span style={{ opacity: 0.4 }}>↗</span>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Expandable detail */}
                {isActive && (
                  <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px", animation: "fadeIn 0.2s ease" }}>

                    {/* Graph relationships */}
                    {s.graph && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#475569", marginBottom: "10px" }}>GRAPH SCHEMA</div>
                        {s.graph.map(g => (
                          <div key={g.rel} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "12px" }}>
                            <span style={{ color: "#e2e8f0", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px" }}>{g.from}</span>
                            <span style={{ color: "#475569", fontSize: "10px" }}>─── {g.rel} ───▶</span>
                            <span style={{ color: "#e2e8f0", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px" }}>{g.to}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Learn */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#475569", marginBottom: "10px" }}>LEARN</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {s.learn.map(l => (
                          <span key={l} style={{
                            padding: "3px 10px",
                            background: `rgba(${hexToRgb(s.color)},0.08)`,
                            border: `1px solid ${s.color}20`,
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: "#94a3b8",
                          }}>
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Flow */}
                    {s.flow && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#475569", marginBottom: "10px" }}>PIPELINE</div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                          {s.flow.map((f, idx) => (
                            <div key={f} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{
                                padding: "3px 10px",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "4px",
                                fontSize: "11px",
                                color: "#cbd5e1",
                              }}>{f}</span>
                              {idx < s.flow.length - 1 && <span style={{ color: "#1e3a4a" }}>↓</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deliverable */}
                    <div style={{
                      padding: "12px 16px",
                      background: `rgba(${hexToRgb(s.color)},0.06)`,
                      border: `1px solid ${s.color}25`,
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: s.color,
                    }}>
                      <span style={{ opacity: 0.6, marginRight: "8px", fontSize: "10px", letterSpacing: "2px" }}>DELIVERABLE</span>
                      {s.deliverable}
                    </div>
                  </div>
                )}

                {!isActive && (
                  <div style={{ marginTop: "12px", fontSize: "10px", color: "#334155", letterSpacing: "1px" }}>
                    CLICK TO EXPAND ↓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Phase roadmap footer */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "40px",
        }}>
          {[
            { phase: "Phase 0", label: "Biomedical Intelligence", active: true, items: ["PubMed", "MIMIC-IV", "NLP", "Knowledge Graph", "Semantic Search"] },
            { phase: "Phase 1", label: "Multi-Omics & Genomics", active: false, items: ["Bioinformatics", "Genomics", "Proteomics"] },
            { phase: "Phase 2", label: "Imaging & Drug Discovery", active: false, items: ["MONAI", "SimpleITK", "DeepChem"] },
          ].map(p => (
            <div key={p.phase} style={{
              padding: "20px",
              background: p.active ? "rgba(0,212,255,0.05)" : "rgba(15,23,42,0.5)",
              border: `1px solid ${p.active ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.04)"}`,
              borderRadius: "12px",
              opacity: p.active ? 1 : 0.4,
            }}>
              <div style={{ fontSize: "10px", color: p.active ? "#00d4ff" : "#475569", letterSpacing: "3px", marginBottom: "6px" }}>{p.phase}</div>
              <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600, marginBottom: "12px" }}>{p.label}</div>
              {p.items.map(it => (
                <div key={it} style={{ fontSize: "11px", color: "#475569", marginBottom: "4px" }}>· {it}</div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", fontSize: "11px", color: "#1e293b", letterSpacing: "2px" }}>
          MEDINEX · PHASE 0 · BIOMEDICAL INTELLIGENCE LAYER
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        a:hover { opacity: 0.8; }
        button:hover { opacity: 0.85; transform: scale(1.05); }
        div[style*="cursor: pointer"]:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
      `}</style>
    </div>
  );
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
    : "0,212,255";
}
