import { useState, useEffect, useRef, useCallback } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:       "#070E1A",
  panel:    "#0C1524",
  panel2:   "#101E30",
  border:   "#1A2E45",
  border2:  "#243B55",
  teal:     "#00C2A8",
  teal2:    "#00897B",
  indigo:   "#5C7CFA",
  amber:    "#F59E0B",
  rose:     "#F43F5E",
  green:    "#10B981",
  text:     "#E8F0FE",
  sub:      "#8BA3C7",
  muted:    "#4A6080",
  navy:     "#0A1628",
};

// ── Event types & weights ─────────────────────────────────────────────────────
const EVENT_TYPES = [
  { type: "read",     weight: 1.0,  label: "Read",     color: T.indigo, icon: "◉", desc: "Opened & scanned" },
  { type: "dwell",    weight: 1.5,  label: "Dwell",    color: T.teal,   icon: "⏱", desc: "Read > 5 minutes" },
  { type: "share",    weight: 1.8,  label: "Share",    color: T.amber,  icon: "↗", desc: "Sent to colleague" },
  { type: "save",     weight: 2.0,  label: "Save",     color: T.green,  icon: "★", desc: "Bookmarked" },
  { type: "cite",     weight: 3.0,  label: "Cite",     color: "#C084FC", icon: "❝", desc: "Used in own work" },
  { type: "downvote", weight: -1.0, label: "Downvote", color: T.rose,   icon: "✕", desc: "Not relevant" },
];

// ── Seed papers ───────────────────────────────────────────────────────────────
const SEED_PAPERS = [
  { id: "p1", title: "CAR-T Cell Therapy in Relapsed B-Cell Lymphoma", year: 2023, source: "Nature Medicine",    field: "Immunotherapy",   embedding: [0.82,0.71,0.15,0.09,0.63,0.44,0.91,0.38] },
  { id: "p2", title: "PD-1/PD-L1 Checkpoint Blockade in NSCLC",        year: 2022, source: "NEJM",              field: "Immunotherapy",   embedding: [0.78,0.65,0.21,0.12,0.58,0.39,0.85,0.42] },
  { id: "p3", title: "BRCA1 Germline Mutations and Breast Cancer Risk",  year: 2023, source: "Cell",             field: "Genomics",        embedding: [0.14,0.22,0.88,0.76,0.11,0.67,0.09,0.55] },
  { id: "p4", title: "mTOR Pathway Inhibition in Pancreatic Cancer",    year: 2022, source: "Cancer Cell",      field: "Oncology",        embedding: [0.45,0.38,0.42,0.29,0.81,0.73,0.35,0.61] },
  { id: "p5", title: "Tumour Microenvironment Remodelling by IL-6",     year: 2024, source: "Immunity",         field: "Immunotherapy",   embedding: [0.79,0.69,0.18,0.11,0.61,0.41,0.88,0.35] },
  { id: "p6", title: "Single-Cell RNA Sequencing of Glioblastoma",      year: 2023, source: "Science",          field: "Genomics",        embedding: [0.21,0.31,0.79,0.71,0.18,0.59,0.14,0.48] },
  { id: "p7", title: "Radiology AI for Lung Nodule Detection",          year: 2022, source: "Radiology",        field: "Radiology",       embedding: [0.08,0.12,0.09,0.15,0.06,0.11,0.07,0.22] },
  { id: "p8", title: "Bispecific Antibodies Targeting CD19/CD3",        year: 2024, source: "Nature Biotech",   field: "Immunotherapy",   embedding: [0.85,0.74,0.13,0.08,0.66,0.47,0.93,0.32] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const uuid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
const now  = () => new Date().toISOString();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function weightedMean(vectors, weights) {
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  let wsum = 0;
  vectors.forEach((v, i) => {
    const w = weights[i];
    wsum += w;
    v.forEach((x, d) => { out[d] += w * x; });
  });
  return out.map(x => x / wsum);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function fieldFromVector(vec) {
  // Map dominant dimension to field label
  const fields = ["Immunotherapy","Immunotherapy","Genomics","Genomics","Oncology","Oncology","Immunotherapy","Immunotherapy"];
  const max = vec.indexOf(Math.max(...vec));
  return fields[max] || "General";
}

// ── Mini components ───────────────────────────────────────────────────────────
function Badge({ label, color = T.teal, small }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: small ? "1px 6px" : "2px 8px",
      fontSize: small ? 10 : 11, fontFamily: "monospace", fontWeight: 700,
      letterSpacing: 0.8, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function Tag({ children, color = T.teal }) {
  return (
    <span style={{
      background: color + "18", color, border: `1px solid ${color}30`,
      borderRadius: 3, padding: "1px 7px", fontSize: 10, fontFamily: "monospace",
    }}>{children}</span>
  );
}

function Bar({ value, max = 3, color = T.teal, animated }) {
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  return (
    <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden", minWidth: 60 }}>
      <div style={{
        width: animated ? `${pct}%` : "0%",
        height: "100%", background: value < 0 ? T.rose : color,
        borderRadius: 2, transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

function Pulse({ color = T.teal }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: color, boxShadow: `0 0 6px ${color}`,
      animation: "pulse 1.4s ease-in-out infinite",
    }} />
  );
}

function Card({ children, accent, style: st }) {
  return (
    <div style={{
      background: T.panel, border: `1px solid ${accent ? T.teal + "44" : T.border}`,
      borderRadius: 10, padding: 20,
      boxShadow: accent ? `0 0 24px ${T.teal}0D` : "none",
      ...st,
    }}>{children}</div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      color: T.teal, fontFamily: "monospace", fontSize: 10, fontWeight: 700,
      letterSpacing: 2, textTransform: "uppercase", marginBottom: 10,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{ width: 16, height: 1, background: T.teal }} />
      {children}
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

// ── Vector visualiser ─────────────────────────────────────────────────────────
function VectorViz({ vector, label, color = T.teal, size = 8 }) {
  // show only `size` dims
  const dims = vector.slice(0, size);
  return (
    <div>
      {label && <div style={{ color: T.sub, fontSize: 11, marginBottom: 6, fontFamily: "monospace" }}>{label}</div>}
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
        {dims.map((v, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{
              width: 20,
              height: Math.max(3, Math.abs(v) * 50),
              background: v < 0 ? T.rose : color,
              borderRadius: "2px 2px 0 0",
              opacity: 0.6 + Math.abs(v) * 0.4,
              transition: "height 0.6s ease",
            }} />
            <span style={{ color: T.muted, fontSize: 8, fontFamily: "monospace" }}>d{i}</span>
          </div>
        ))}
        <span style={{ color: T.muted, fontSize: 11, marginLeft: 4, alignSelf: "center" }}>…+760</span>
      </div>
      <div style={{ marginTop: 6, color: T.muted, fontSize: 10, fontFamily: "monospace" }}>
        [{dims.map(v => v.toFixed(2)).join(", ")}, …]
      </div>
    </div>
  );
}

// ── Architecture diagram ──────────────────────────────────────────────────────
function ArchDiagram() {
  const nodes = [
    { label: "USER",                  color: T.indigo },
    { label: "Interaction API",       color: T.teal },
    { label: "Validation Service",    color: T.teal },
    { label: "Weight Calculator",     color: T.teal },
    { label: "PostgreSQL",            color: T.amber },
    { label: "Redis Cache",           color: T.rose, split: true },
    { label: "Profile Builder",       color: T.green, split: true },
    { label: "768-D User Vector",     color: "#C084FC" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {nodes.map((n, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {n.split ? (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{
                background: T.rose + "18", border: `1px solid ${T.rose}44`,
                borderRadius: 6, padding: "7px 16px",
                color: T.rose, fontSize: 12, fontFamily: "monospace", fontWeight: 600,
              }}>Redis Cache</div>
              <div style={{ color: T.muted, fontSize: 10 }}>╠══╣</div>
              <div style={{
                background: T.green + "18", border: `1px solid ${T.green}44`,
                borderRadius: 6, padding: "7px 16px",
                color: T.green, fontSize: 12, fontFamily: "monospace", fontWeight: 600,
              }}>Profile Builder</div>
            </div>
          ) : (
            <div style={{
              background: n.color + "18", border: `1px solid ${n.color}44`,
              borderRadius: 6, padding: "7px 24px", minWidth: 180, textAlign: "center",
              color: n.color, fontSize: 12, fontFamily: "monospace", fontWeight: 600,
            }}>{n.label}</div>
          )}
          {i < nodes.length - 1 && !n.split && (
            <div style={{ color: T.muted, fontSize: 16, lineHeight: "20px" }}>↓</div>
          )}
          {n.split && <div style={{ color: T.muted, fontSize: 16, lineHeight: "20px" }}>↓</div>}
        </div>
      ))}
    </div>
  );
}

// ── Index strategy visualiser ─────────────────────────────────────────────────
function IndexViz() {
  const [scanned, setScanned] = useState(false);
  const [indexed, setIndexed] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setScanned(true), 600);
    const t2 = setTimeout(() => setIndexed(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {[
        { label: "Without Index", sub: "5M rows → Sequential Scan → 4 seconds", color: T.rose, time: "4000ms", pct: scanned ? 100 : 0, bad: true },
        { label: "With Index",    sub: "Index Lookup → 15ms",                    color: T.green, time: "15ms",   pct: indexed ? 3 : 0,   bad: false },
      ].map(({ label, sub, color, time, pct, bad }) => (
        <div key={label} style={{ background: T.panel2, borderRadius: 8, padding: 14, border: `1px solid ${color}33` }}>
          <div style={{ color, fontSize: 12, fontWeight: 700, marginBottom: 4, fontFamily: "monospace" }}>{label}</div>
          <div style={{ color: T.sub, fontSize: 11, marginBottom: 10 }}>{sub}</div>
          <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
            <div style={{
              height: "100%", background: color, borderRadius: 3,
              width: `${pct}%`, transition: bad ? "width 3.5s linear" : "width 0.08s ease",
            }} />
          </div>
          <div style={{ color, fontSize: 18, fontFamily: "monospace", fontWeight: 700 }}>{time}</div>
        </div>
      ))}
    </div>
  );
}

// ── Interaction logger UI ─────────────────────────────────────────────────────
function InteractionLogger({ onLog }) {
  const [selectedPaper, setSelectedPaper] = useState(SEED_PAPERS[0]);
  const [selectedEvent, setSelectedEvent] = useState(EVENT_TYPES[0]);
  const [dwellSecs, setDwellSecs] = useState(180);
  const [logging, setLogging] = useState(false);
  const [lastLogged, setLastLogged] = useState(null);

  async function handleLog() {
    setLogging(true);
    await sleep(500);
    const interaction = {
      id: uuid(),
      user_id: "researcher-001",
      paper_id: selectedPaper.id,
      paper_title: selectedPaper.title,
      paper_field: selectedPaper.field,
      paper_embedding: selectedPaper.embedding,
      event_type: selectedEvent.type,
      weight: selectedEvent.weight,
      metadata: {
        dwell_seconds: selectedEvent.type === "dwell" ? dwellSecs : null,
        device: "Web",
        source: selectedPaper.source,
        scroll_depth: Math.floor(Math.random() * 40) + 60,
      },
      created_at: now(),
    };
    setLastLogged(interaction);
    setLogging(false);
    onLog(interaction);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Paper select */}
      <div>
        <div style={{ color: T.sub, fontSize: 11, fontFamily: "monospace", marginBottom: 6 }}>SELECT PAPER</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SEED_PAPERS.map(p => (
            <div key={p.id} onClick={() => setSelectedPaper(p)} style={{
              padding: "8px 12px", borderRadius: 6, cursor: "pointer",
              background: selectedPaper.id === p.id ? T.teal + "18" : T.panel2,
              border: `1px solid ${selectedPaper.id === p.id ? T.teal + "55" : T.border}`,
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: T.text, fontSize: 12 }}>{p.title}</span>
                <Tag color={p.field === "Immunotherapy" ? T.teal : p.field === "Genomics" ? T.indigo : p.field === "Radiology" ? T.muted : T.amber}>{p.field}</Tag>
              </div>
              <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{p.source} · {p.year}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Event type */}
      <div>
        <div style={{ color: T.sub, fontSize: 11, fontFamily: "monospace", marginBottom: 6 }}>SELECT EVENT</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {EVENT_TYPES.map(e => (
            <div key={e.type} onClick={() => setSelectedEvent(e)} style={{
              padding: "8px 10px", borderRadius: 6, cursor: "pointer", textAlign: "center",
              background: selectedEvent.type === e.type ? e.color + "22" : T.panel2,
              border: `1px solid ${selectedEvent.type === e.type ? e.color + "66" : T.border}`,
              transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{e.icon}</div>
              <div style={{ color: e.color, fontSize: 11, fontWeight: 700 }}>{e.label}</div>
              <div style={{ color: T.muted, fontSize: 10 }}>w={e.weight > 0 ? "+" : ""}{e.weight}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dwell slider */}
      {selectedEvent.type === "dwell" && (
        <div>
          <div style={{ color: T.sub, fontSize: 11, fontFamily: "monospace", marginBottom: 6 }}>
            DWELL TIME: <span style={{ color: T.teal }}>{dwellSecs}s</span>
          </div>
          <input type="range" min={30} max={900} value={dwellSecs}
            onChange={e => setDwellSecs(+e.target.value)}
            style={{ width: "100%", accentColor: T.teal }} />
        </div>
      )}

      {/* Metadata preview */}
      <div style={{ background: "#050D18", borderRadius: 6, padding: 12, border: `1px solid ${T.border}`, fontFamily: "monospace", fontSize: 11, color: "#93C5FD" }}>
        <div style={{ color: T.muted, marginBottom: 4, fontSize: 10 }}>// REQUEST PAYLOAD</div>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify({
          paper_id: selectedPaper.id,
          event_type: selectedEvent.type,
          metadata: {
            dwell_seconds: selectedEvent.type === "dwell" ? dwellSecs : null,
            device: "Web",
            source: selectedPaper.source,
            scroll_depth: 78,
          }
        }, null, 2)}</pre>
      </div>

      <button onClick={handleLog} disabled={logging} style={{
        background: logging ? T.border : T.teal,
        color: logging ? T.muted : T.navy,
        border: "none", borderRadius: 8, padding: "12px 0",
        fontFamily: "monospace", fontSize: 13, fontWeight: 700,
        cursor: logging ? "default" : "pointer", letterSpacing: 1,
        transition: "all 0.15s",
      }}>
        {logging ? "LOGGING…" : `POST /v1/interactions  →  weight ${selectedEvent.weight > 0 ? "+" : ""}${selectedEvent.weight}`}
      </button>

      {lastLogged && (
        <div style={{ background: T.green + "11", border: `1px solid ${T.green}33`, borderRadius: 6, padding: 10 }}>
          <div style={{ color: T.green, fontSize: 11, fontFamily: "monospace", fontWeight: 700, marginBottom: 4 }}>✓ 201 CREATED</div>
          <div style={{ color: T.sub, fontSize: 11 }}>id: <span style={{ color: T.text, fontFamily: "monospace" }}>{lastLogged.id.slice(0,16)}…</span></div>
          <div style={{ color: T.sub, fontSize: 11 }}>weight: <span style={{ color: T.teal }}>{lastLogged.weight}</span> · event: <span style={{ color: T.amber }}>{lastLogged.event_type}</span></div>
        </div>
      )}
    </div>
  );
}

// ── Interaction log table ─────────────────────────────────────────────────────
function InteractionLog({ interactions }) {
  if (!interactions.length) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontSize: 13 }}>
      No interactions yet — log some above
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {["id","paper","event","weight","metadata","timestamp"].map(h => (
              <th key={h} style={{ color: T.muted, padding: "6px 10px", textAlign: "left", textTransform: "uppercase", fontSize: 10 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...interactions].reverse().map(i => {
            const ev = EVENT_TYPES.find(e => e.type === i.event_type);
            return (
              <tr key={i.id} style={{ borderBottom: `1px solid ${T.border}20` }}>
                <td style={{ padding: "7px 10px", color: T.muted }}>{i.id.slice(0,8)}…</td>
                <td style={{ padding: "7px 10px", color: T.text, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.paper_title}</td>
                <td style={{ padding: "7px 10px" }}><Badge label={i.event_type} color={ev?.color || T.teal} small /></td>
                <td style={{ padding: "7px 10px", color: i.weight < 0 ? T.rose : T.teal, fontWeight: 700 }}>{i.weight > 0 ? "+" : ""}{i.weight}</td>
                <td style={{ padding: "7px 10px", color: T.sub }}>{i.metadata?.dwell_seconds ? `${i.metadata.dwell_seconds}s dwell` : i.metadata?.source || "—"}</td>
                <td style={{ padding: "7px 10px", color: T.muted }}>{new Date(i.created_at).toLocaleTimeString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Profile builder ───────────────────────────────────────────────────────────
function ProfileBuilder({ interactions, onProfile }) {
  const [stage, setStage] = useState("idle"); // idle | fetching | computing | done
  const [profile, setProfile] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [barsReady, setBarsReady] = useState(false);

  const positiveInteractions = interactions.filter(i => i.weight > 0);

  async function buildProfile() {
    if (!positiveInteractions.length) return;
    setStage("fetching");
    setBarsReady(false);
    await sleep(800);
    setStage("computing");
    await sleep(600);

    // Weighted mean of embeddings
    const vectors = positiveInteractions.map(i => i.paper_embedding);
    const weights = positiveInteractions.map(i => i.weight);
    const profileVec = weightedMean(vectors, weights);

    // Field interest breakdown
    const fieldWeights = {};
    positiveInteractions.forEach(i => {
      fieldWeights[i.paper_field] = (fieldWeights[i.paper_field] || 0) + i.weight;
    });
    const totalW = Object.values(fieldWeights).reduce((a, b) => a + b, 0);
    const fieldBreakdown = Object.entries(fieldWeights)
      .map(([field, w]) => ({ field, pct: (w / totalW) * 100 }))
      .sort((a, b) => b.pct - a.pct);

    // Paper affinities
    const affinities = SEED_PAPERS.map(p => ({
      ...p,
      affinity: cosine(profileVec, p.embedding),
    })).sort((a, b) => b.affinity - a.affinity);

    const result = {
      vector: profileVec,
      vector_dim: 768,
      field_breakdown: fieldBreakdown,
      affinities,
      interaction_count: positiveInteractions.length,
      total_weight: totalW,
      dominant_field: fieldBreakdown[0]?.field || "Unknown",
    };

    setStage("done");
    setProfile(result);
    onProfile(result);
    setTimeout(() => setBarsReady(true), 100);

    // Claude analysis
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are Bioquora, a biomedical research intelligence platform.

A researcher has logged these interactions:
${JSON.stringify(positiveInteractions.map(i => ({ paper: i.paper_title, field: i.paper_field, event: i.event_type, weight: i.weight })), null, 2)}

Their profile vector shows dominant interest in: ${result.dominant_field}
Field breakdown: ${result.field_breakdown.map(f => `${f.field}: ${f.pct.toFixed(0)}%`).join(", ")}

Provide a JSON response (no markdown) with exactly this structure:
{
  "research_profile_label": "<3-5 word label for their research identity>",
  "summary": "<2 sentence summary of their research interests based on interaction patterns>",
  "cold_start_status": "<warm|developing|established>",
  "top_interests": ["<interest1>", "<interest2>", "<interest3>"],
  "recommended_next_steps": ["<step1>", "<step2>"],
  "confidence": <0.0-1.0>
}`
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      setAiAnalysis(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch {
      setAiAnalysis({ research_profile_label: "Biomedical Researcher", summary: "Based on interaction patterns.", top_interests: [result.dominant_field], confidence: 0.8 });
    }
    setAiLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Formula */}
      <div style={{ background: T.teal + "0D", border: `1px solid ${T.teal}22`, borderRadius: 8, padding: 14, textAlign: "center" }}>
        <div style={{ color: T.sub, fontSize: 11, marginBottom: 6, fontFamily: "monospace" }}>WEIGHTED MEAN FORMULA</div>
        <div style={{ color: T.teal, fontFamily: "monospace", fontSize: 16, fontWeight: 700 }}>
          Profile = Σ(wᵢ × eᵢ) / Σwᵢ
        </div>
        <div style={{ color: T.muted, fontSize: 11, marginTop: 4 }}>
          wᵢ = interaction weight · eᵢ = paper embedding (768-dim)
        </div>
      </div>

      {/* Input summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {[
          { label: "Interactions", value: positiveInteractions.length, color: T.teal },
          { label: "Total Weight", value: positiveInteractions.reduce((a,b) => a + b.weight, 0).toFixed(1), color: T.indigo },
          { label: "Vector Dim", value: "768", color: "#C084FC" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: T.panel2, borderRadius: 8, padding: 12, textAlign: "center", border: `1px solid ${T.border}` }}>
            <div style={{ color, fontSize: 22, fontFamily: "monospace", fontWeight: 700 }}>{value}</div>
            <div style={{ color: T.muted, fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>

      <button onClick={buildProfile}
        disabled={stage === "fetching" || stage === "computing" || !positiveInteractions.length}
        style={{
          background: !positiveInteractions.length ? T.border : stage === "done" ? T.green + "22" : T.teal,
          color: !positiveInteractions.length ? T.muted : stage === "done" ? T.green : T.navy,
          border: stage === "done" ? `1px solid ${T.green}44` : "none",
          borderRadius: 8, padding: "12px 0", fontFamily: "monospace",
          fontSize: 13, fontWeight: 700, cursor: !positiveInteractions.length ? "not-allowed" : "pointer",
          letterSpacing: 1, transition: "all 0.2s",
        }}>
        {stage === "idle" ? "BUILD USER PROFILE VECTOR"
          : stage === "fetching" ? "FETCHING EMBEDDINGS…"
          : stage === "computing" ? "COMPUTING WEIGHTED MEAN…"
          : "✓ PROFILE BUILT — REBUILD"}
      </button>

      {profile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Vector viz */}
          <Card>
            <SectionLabel>768-Dimensional Profile Vector (first 8 dims shown)</SectionLabel>
            <VectorViz vector={profile.vector} color={T.teal} />
          </Card>

          {/* Field breakdown */}
          <Card>
            <SectionLabel>Research Interest Breakdown</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profile.field_breakdown.map(({ field, pct }) => {
                const color = field === "Immunotherapy" ? T.teal : field === "Genomics" ? T.indigo : field === "Radiology" ? T.muted : T.amber;
                return (
                  <div key={field}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color, fontSize: 12, fontWeight: 600 }}>{field}</span>
                      <span style={{ color: T.muted, fontSize: 11, fontFamily: "monospace" }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: color, borderRadius: 3,
                        width: barsReady ? `${pct}%` : "0%",
                        transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Paper affinities */}
          <Card>
            <SectionLabel>Paper Affinities (cosine sim to profile vector)</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {profile.affinities.slice(0, 5).map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: T.muted, fontFamily: "monospace", fontSize: 10, minWidth: 16 }}>#{i+1}</span>
                  <span style={{ color: T.text, fontSize: 11, flex: 1 }}>{p.title}</span>
                  <div style={{ minWidth: 80, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: T.teal, borderRadius: 2,
                        width: barsReady ? `${p.affinity * 100}%` : "0%",
                        transition: `width ${0.5 + i * 0.1}s ease`,
                      }} />
                    </div>
                    <span style={{ color: T.teal, fontSize: 10, fontFamily: "monospace", minWidth: 32 }}>{p.affinity.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* AI analysis */}
          {aiLoading && (
            <div style={{ textAlign: "center", color: T.muted, fontSize: 12, padding: 16, fontFamily: "monospace" }}>
              <Pulse /> Generating profile analysis…
            </div>
          )}
          {aiAnalysis && !aiLoading && typeof aiAnalysis === "object" && (
            <Card accent>
              <SectionLabel>Claude Profile Analysis</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ color: T.teal, fontSize: 18, fontWeight: 700, fontFamily: "monospace" }}>{aiAnalysis.research_profile_label}</div>
                <Badge label={aiAnalysis.cold_start_status} color={
                  aiAnalysis.cold_start_status === "established" ? T.green :
                  aiAnalysis.cold_start_status === "developing" ? T.amber : T.muted
                } />
                <Badge label={`confidence ${((aiAnalysis.confidence || 0) * 100).toFixed(0)}%`} color={T.indigo} />
              </div>
              <p style={{ color: T.sub, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>{aiAnalysis.summary}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: T.muted, fontSize: 10, fontFamily: "monospace", marginBottom: 6 }}>TOP INTERESTS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(aiAnalysis.top_interests || []).map((t, i) => (
                      <div key={i} style={{ color: T.text, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: T.teal }}>◈</span> {t}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: T.muted, fontSize: 10, fontFamily: "monospace", marginBottom: 6 }}>NEXT STEPS FOR SYSTEM</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(aiAnalysis.recommended_next_steps || []).map((s, i) => (
                      <div key={i} style={{ color: T.text, fontSize: 12, display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <span style={{ color: T.indigo, minWidth: 12 }}>{i+1}.</span> {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Redis cache simulation ────────────────────────────────────────────────────
function RedisView({ profile, interactions }) {
  const cacheEntries = profile ? [
    { key: `user:researcher-001:profile_vector`, type: "BLOB", ttl: "3600s", size: "6.1 KB", desc: "768-dim float32 array" },
    { key: `user:researcher-001:interaction_count`, type: "INT", ttl: "3600s", size: "8 B", value: interactions.filter(i=>i.weight>0).length },
    { key: `user:researcher-001:dominant_field`, type: "STRING", ttl: "3600s", size: "32 B", value: profile.dominant_field },
    { key: `svd_factors`, type: "BLOB", ttl: "90000s", size: "48 MB", desc: "Nightly SVD factors" },
  ] : [];

  return (
    <div style={{ fontFamily: "monospace" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <Pulse color={cacheEntries.length ? T.green : T.muted} />
        <span style={{ color: cacheEntries.length ? T.green : T.muted, fontSize: 12, fontWeight: 700 }}>
          {cacheEntries.length ? `Redis · ${cacheEntries.length} keys` : "Redis · empty — build profile first"}
        </span>
      </div>
      {cacheEntries.length > 0 && (
        <div style={{ background: "#050D18", borderRadius: 6, padding: 14, border: `1px solid ${T.border}` }}>
          {cacheEntries.map((e, i) => (
            <div key={e.key} style={{ borderBottom: i < cacheEntries.length - 1 ? `1px solid ${T.border}20` : "none", paddingBottom: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: T.amber, fontSize: 11 }}>{e.key}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Tag color={T.teal}>{e.type}</Tag>
                  <Tag color={T.rose}>TTL {e.ttl}</Tag>
                </div>
              </div>
              <div style={{ color: T.muted, fontSize: 10, marginTop: 3 }}>
                {e.value !== undefined ? <span style={{ color: T.green }}>"{e.value}"</span> : e.desc}
                {" · "}{e.size}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Cold-start tiers ──────────────────────────────────────────────────────────
function ColdStartView({ interactionCount }) {
  const tiers = [
    { min: 0,  max: 0,  label: "Tier 1 — Cold Start",   color: T.rose,   strategy: "Return globally popular papers weighted by EBM evidence tier", active: interactionCount === 0 },
    { min: 1,  max: 4,  label: "Tier 2 — Warming",      color: T.amber,  strategy: "Content-based only — use query embedding, ignore collaborative filter", active: interactionCount >= 1 && interactionCount <= 4 },
    { min: 5,  max: 19, label: "Tier 3 — Developing",   color: T.indigo, strategy: "Content + collaborative (low weight on collab signal)", active: interactionCount >= 5 && interactionCount <= 19 },
    { min: 20, max: Infinity, label: "Tier 4 — Established", color: T.green, strategy: "Full hybrid: content + collaborative + citation graph + evidence re-rank", active: interactionCount >= 20 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tiers.map(t => (
        <div key={t.label} style={{
          padding: "10px 14px", borderRadius: 8,
          background: t.active ? t.color + "18" : T.panel2,
          border: `1px solid ${t.active ? t.color + "55" : T.border}`,
          transition: "all 0.3s",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: t.active ? t.color : T.muted, fontSize: 12, fontWeight: 700 }}>{t.label}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Tag color={t.color}>{t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`} interactions</Tag>
              {t.active && <Badge label="CURRENT" color={t.color} small />}
            </div>
          </div>
          <div style={{ color: t.active ? T.sub : T.muted, fontSize: 11 }}>{t.strategy}</div>
        </div>
      ))}
    </div>
  );
}

// ── Worker simulation ─────────────────────────────────────────────────────────
function WorkerView({ queue }) {
  return (
    <div style={{ fontFamily: "monospace" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <Pulse color={queue.length ? T.teal : T.muted} />
        <span style={{ color: T.sub, fontSize: 12 }}>Profile Worker · {queue.length} jobs processed</span>
      </div>
      {queue.length === 0 && (
        <div style={{ color: T.muted, fontSize: 12, padding: "20px 0", textAlign: "center" }}>No jobs yet — log interactions to trigger background profile updates</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[...queue].reverse().slice(0, 8).map((job, i) => (
          <div key={job.id} style={{
            background: "#050D18", borderRadius: 4, padding: "6px 10px",
            border: `1px solid ${T.border}20`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <span style={{ color: T.green, fontSize: 10 }}>✓ </span>
              <span style={{ color: T.sub, fontSize: 10 }}>profile_update · user:</span>
              <span style={{ color: T.amber, fontSize: 10 }}> researcher-001</span>
              <span style={{ color: T.muted, fontSize: 10 }}> · triggered by: {job.event_type}</span>
            </div>
            <span style={{ color: T.muted, fontSize: 10 }}>{new Date(job.created_at).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",  label: "Overview" },
  { id: "log",       label: "Log Interaction" },
  { id: "history",   label: "Interaction Log" },
  { id: "profile",   label: "Profile Builder" },
  { id: "redis",     label: "Redis Cache" },
  { id: "coldstart", label: "Cold-Start" },
  { id: "worker",    label: "Background Worker" },
];

export default function BioquoraStep1() {
  const [tab, setTab] = useState("overview");
  const [interactions, setInteractions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [workerQueue, setWorkerQueue] = useState([]);

  function handleLog(interaction) {
    setInteractions(prev => [...prev, interaction]);
    // Simulate background worker job
    setWorkerQueue(prev => [...prev, { id: uuid(), event_type: interaction.event_type, created_at: now() }]);
  }

  const positiveCount = interactions.filter(i => i.weight > 0).length;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100% { opacity: 1; box-shadow: 0 0 6px currentColor; } 50% { opacity: 0.5; box-shadow: 0 0 2px currentColor; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        button:focus-visible { outline: 2px solid ${T.teal}; outline-offset: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, background: T.bg, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.teal, boxShadow: `0 0 8px ${T.teal}` }} />
          <span style={{ fontFamily: "monospace", fontSize: 14, color: T.teal, fontWeight: 700, letterSpacing: 2 }}>Bioquora</span>
        </div>
        <div style={{ width: 1, height: 20, background: T.border }} />
        <span style={{ color: T.muted, fontSize: 12, fontFamily: "monospace" }}>Phase 5 · Step 1 — Interaction Tracking & User Modelling</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Interactions", value: interactions.length, color: T.teal },
            { label: "Profile", value: profile ? "Built" : "None", color: profile ? T.green : T.muted },
            { label: "Cold-Start Tier", value: positiveCount === 0 ? "T1" : positiveCount <= 4 ? "T2" : positiveCount <= 19 ? "T3" : "T4", color: positiveCount === 0 ? T.rose : positiveCount <= 4 ? T.amber : positiveCount <= 19 ? T.indigo : T.green },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ color, fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>{value}</div>
              <div style={{ color: T.muted, fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "0 28px", display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", padding: "12px 16px",
            color: tab === t.id ? T.teal : T.muted,
            borderBottom: `2px solid ${tab === t.id ? T.teal : "transparent"}`,
            fontFamily: "monospace", fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
            cursor: "pointer", whiteSpace: "nowrap", letterSpacing: 0.5,
            transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card>
                <SectionLabel>Objective</SectionLabel>
                <p style={{ color: T.sub, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  Before Bioquora can recommend papers, it must understand what a researcher is interested in — not just from search queries, but from the full behavioural pattern of reading, saving, citing, and ignoring papers. Every interaction becomes a weighted signal that builds a 768-dimensional user profile vector.
                </p>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Reads 12 oncology papers",         color: T.indigo },
                    { label: "Saves 5 immunotherapy papers",      color: T.green },
                    { label: "Cites 2 Nature papers",             color: "#C084FC" },
                    { label: "Spends 15 min on a review paper",   color: T.teal },
                    { label: "Ignores radiology papers",          color: T.rose },
                  ].map(({ label, color }, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ color: T.sub, fontSize: 12 }}>{label}</span>
                      {i === 4 && <span style={{ color: T.teal, fontFamily: "monospace", fontSize: 11, marginLeft: "auto" }}>→ Strong Interest: Cancer Immunotherapy</span>}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionLabel>Event Weights</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {EVENT_TYPES.map(e => (
                    <div key={e.type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, minWidth: 24 }}>{e.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: e.color, fontSize: 12, fontWeight: 600 }}>{e.label}</span>
                          <span style={{ color: e.weight < 0 ? T.rose : T.teal, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>
                            {e.weight > 0 ? "+" : ""}{e.weight}
                          </span>
                        </div>
                        <div style={{ color: T.muted, fontSize: 11 }}>{e.desc}</div>
                        <Bar value={e.weight} max={3} color={e.color} animated />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionLabel>Index Strategy</SectionLabel>
                <IndexViz />
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["user_id", "paper_id", "event_type", "(user_id, paper_id, event_type)"].map(idx => (
                    <Tag key={idx} color={T.amber}>{idx}</Tag>
                  ))}
                </div>
              </Card>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card>
                <SectionLabel>Architecture</SectionLabel>
                <ArchDiagram />
              </Card>

              <Card>
                <SectionLabel>Database Schema — user_paper_interactions</SectionLabel>
                <div style={{ background: "#050D18", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 11, color: "#93C5FD", border: `1px solid ${T.border}` }}>
                  <pre style={{ margin: 0, whiteSpace: "pre" }}>{`CREATE TABLE user_paper_interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  paper_id    UUID NOT NULL REFERENCES papers(id),
  event_type  TEXT NOT NULL CHECK (
                event_type IN (
                  'read','dwell','share','save','cite','downvote'
                )
              ),
  weight      FLOAT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Composite unique index
CREATE UNIQUE INDEX uq_interaction ON
  user_paper_interactions(user_id, paper_id, event_type);

-- RLS: users see only their own rows
ALTER TABLE user_paper_interactions
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON user_paper_interactions
  USING (user_id = current_setting(
    'app.user_id')::UUID);`}</pre>
                </div>
              </Card>

              <Card>
                <SectionLabel>Metadata Example</SectionLabel>
                <div style={{ background: "#050D18", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 11, color: "#93C5FD", border: `1px solid ${T.border}` }}>
                  <pre style={{ margin: 0 }}>{JSON.stringify({
                    dwell_seconds: 421,
                    device: "Android",
                    source: "PubMed Search",
                    scroll_depth: 92,
                    referrer: "google_scholar",
                    session_id: "sess_a3f9c...",
                  }, null, 2)}</pre>
                </div>
                <p style={{ color: T.muted, fontSize: 11, margin: "8px 0 0" }}>Flexible JSONB schema allows richer analytics without schema changes.</p>
              </Card>
            </div>
          </div>
        )}

        {/* LOG INTERACTION */}
        {tab === "log" && (
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <Card>
              <SectionLabel>POST /v1/interactions</SectionLabel>
              <p style={{ color: T.sub, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>
                Select a paper and event type to simulate logging an interaction. Each event is validated, weighted, stored in Postgres, and queues a background profile rebuild.
              </p>
              <InteractionLogger onLog={handleLog} />
            </Card>
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <Card>
            <SectionLabel>Interaction History — {interactions.length} records</SectionLabel>
            <InteractionLog interactions={interactions} />
          </Card>
        )}

        {/* PROFILE BUILDER */}
        {tab === "profile" && (
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <Card>
              <SectionLabel>Profile Builder — 768-D User Vector</SectionLabel>
              <p style={{ color: T.sub, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>
                Computes a weighted mean of all positively-weighted paper embeddings to produce a single 768-dimensional vector representing this researcher's interests.
                {positiveCount === 0 && <span style={{ color: T.amber }}> Log some interactions first.</span>}
              </p>
              <ProfileBuilder interactions={interactions} onProfile={setProfile} />
            </Card>
          </div>
        )}

        {/* REDIS */}
        {tab === "redis" && (
          <Card>
            <SectionLabel>Redis Cache — Profile & System Keys</SectionLabel>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>
              Profile vectors are cached in Redis with a 1-hour TTL. Invalidated on every new interaction event. SVD factor matrices (Step 3) are also cached here.
            </p>
            <RedisView profile={profile} interactions={interactions} />
          </Card>
        )}

        {/* COLD START */}
        {tab === "coldstart" && (
          <Card>
            <SectionLabel>Cold-Start Handling — {positiveCount} positive interactions</SectionLabel>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>
              New users have no interaction history. A tiered fallback strategy activates progressively as data accumulates. Current tier updates in real time as you log interactions.
            </p>
            <ColdStartView interactionCount={positiveCount} />
          </Card>
        )}

        {/* WORKER */}
        {tab === "worker" && (
          <Card>
            <SectionLabel>Background Worker — Async Profile Updates</SectionLabel>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>
              Profile rebuilds are decoupled from API responses. Each logged interaction enqueues a job. The worker fetches paper embeddings, recomputes the weighted mean, and updates Redis — keeping API latency under 50ms.
            </p>
            <WorkerView queue={workerQueue} />
            <div style={{ marginTop: 16, background: "#050D18", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 11, color: "#93C5FD", border: `1px solid ${T.border}` }}>
              <div style={{ color: T.muted, marginBottom: 6, fontSize: 10 }}>// workers/profile_worker.py</div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{`async def profile_update_worker(event: InteractionEvent):
    """
    Triggered by Redis queue on every interaction.
    Runs outside the API request cycle.
    """
    # 1. Fetch all positive interactions for user
    interactions = await repo.get_user_interactions(
        event.user_id, weight_gt=0
    )
    # 2. Retrieve embeddings from Qdrant
    paper_ids = [i.paper_id for i in interactions]
    embeddings = await qdrant.retrieve(
        collection_name="papers",
        ids=paper_ids, with_vectors=True
    )
    # 3. Compute weighted mean (768-D)
    profile_vec = weighted_mean(
        vectors=[e.vector for e in embeddings],
        weights=[i.weight for i in interactions]
    )
    # 4. Cache in Redis (TTL 1h)
    await redis.set(
        f"user:{event.user_id}:profile_vector",
        profile_vec.tobytes(),
        ex=3600
    )`}</pre>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
