import { useState, useEffect, useCallback, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:      "#060B14",
  surface: "#0A1220",
  card:    "#0E1929",
  border:  "#162435",
  border2: "#1E3450",
  teal:    "#00BFA8",
  teal2:   "#007A6E",
  violet:  "#7C6FCD",
  amber:   "#F0A500",
  rose:    "#E8445A",
  green:   "#18C77A",
  sky:     "#38B6FF",
  text:    "#DCE8F8",
  sub:     "#6E90B0",
  muted:   "#3A566A",
  navy:    "#060B14",
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pct = v => `${(v * 100).toFixed(1)}%`;

// ── Seed data ─────────────────────────────────────────────────────────────────
const CANDIDATE_PAPERS = [
  { id:"A", title:"CAR-T Cell Therapy in Relapsed B-Cell Lymphoma",       year:2024, journal:"Nature Medicine",   impact:87.2, citations:412, evidence:"meta_analysis",   field:"Immunotherapy",  mesh:["CAR-T","Lymphoma","B-Cell"],         content:0.94, collab:0.87, graph:0.79 },
  { id:"B", title:"PD-1/PD-L1 Checkpoint Blockade Mechanisms in NSCLC",  year:2023, journal:"NEJM",              impact:96.2, citations:889, evidence:"rct",             field:"Immunotherapy",  mesh:["PD-1","PD-L1","Checkpoint"],         content:0.88, collab:0.91, graph:0.85 },
  { id:"C", title:"BRCA1 Germline Mutations and Breast Cancer Risk",       year:2023, journal:"Cell",             impact:66.9, citations:234, evidence:"cohort",          field:"Genomics",       mesh:["BRCA1","Breast Cancer","Mutations"],  content:0.31, collab:0.44, graph:0.61 },
  { id:"D", title:"mTOR Pathway Inhibition in Pancreatic Adenocarcinoma", year:2022, journal:"Cancer Cell",      impact:50.3, citations:178, evidence:"rct",             field:"Oncology",       mesh:["mTOR","Pancreatic","Signaling"],      content:0.72, collab:0.68, graph:0.55 },
  { id:"E", title:"Tumour Microenvironment IL-6 Remodelling",             year:2024, journal:"Immunity",         impact:43.5, citations:96,  evidence:"basic_science",   field:"Immunotherapy",  mesh:["IL-6","TME","Cytokines"],             content:0.83, collab:0.61, graph:0.74 },
  { id:"F", title:"Single-Cell RNA-Seq of Glioblastoma Heterogeneity",    year:2023, journal:"Science",          impact:56.9, citations:301, evidence:"cohort",          field:"Genomics",       mesh:["scRNA-seq","GBM","Heterogeneity"],    content:0.29, collab:0.38, graph:0.42 },
  { id:"G", title:"Bispecific Antibodies Targeting CD19/CD3 in ALL",      year:2024, journal:"Nature Biotech",   impact:68.9, citations:143, evidence:"rct",             field:"Immunotherapy",  mesh:["Bispecific","CD19","CD3"],            content:0.89, collab:0.79, graph:0.81 },
  { id:"H", title:"Spatial Transcriptomics in Pancreatic Ductal Cancer",  year:2024, journal:"Nature Methods",   impact:48.0, citations:67,  evidence:"basic_science",   field:"Genomics",       mesh:["Spatial","Transcriptomics","PDAC"],   content:0.55, collab:0.49, graph:0.58 },
];

const EVIDENCE_MULT = { meta_analysis:1.30, systematic_review:1.25, rct:1.20, cohort:1.05, basic_science:0.95, case_report:0.80 };
const EVIDENCE_COLOR = { meta_analysis:C.teal, rct:C.green, cohort:C.sky, basic_science:C.amber, case_report:C.muted };
const FIELD_COLOR = { Immunotherapy:C.teal, Genomics:C.violet, Oncology:C.amber, Radiology:C.muted };

// ── Mini UI primitives ────────────────────────────────────────────────────────
function Badge({ label, color = C.teal, sm }) {
  return <span style={{ background: color+"22", color, border:`1px solid ${color}44`, borderRadius:4, padding: sm?"1px 6px":"2px 9px", fontSize:sm?10:11, fontFamily:"monospace", fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}
function Mono({ children, color = C.teal }) {
  return <span style={{ fontFamily:"monospace", color, fontSize:12 }}>{children}</span>;
}
function SLabel({ children }) {
  return <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
    <div style={{ width:3, height:14, background:C.teal, borderRadius:2 }} />
    <span style={{ color:C.teal, fontFamily:"monospace", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>{children}</span>
    <div style={{ flex:1, height:1, background:C.border }} />
  </div>;
}
function Card({ children, accent, style: st={} }) {
  return <div style={{ background:C.card, border:`1px solid ${accent?C.teal+"44":C.border}`, borderRadius:10, padding:18, boxShadow: accent?`0 0 28px ${C.teal}09`:"none", ...st }}>{children}</div>;
}
function ProgressBar({ value, color = C.teal, height=4, animate=true }) {
  const [w, setW] = useState(0);
  useEffect(() => { if(animate) { const t = setTimeout(()=>setW(value*100),80); return()=>clearTimeout(t); } else setW(value*100); },[value,animate]);
  return <div style={{ height, background:C.border, borderRadius:2, overflow:"hidden" }}>
    <div style={{ height:"100%", width:`${w}%`, background: value<0?C.rose:color, borderRadius:2, transition:"width 0.8s cubic-bezier(.4,0,.2,1)" }} />
  </div>;
}
function Spinner({ size=14 }) {
  return <div style={{ width:size, height:size, border:`2px solid ${C.border}`, borderTop:`2px solid ${C.teal}`, borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />;
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(prompt, maxTok=900) {
  const apiKey = localStorage.getItem('anthropic_api_key');
  if (!apiKey) throw new Error("Please enter your Anthropic API Key in the top right corner.");
  
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({ model:"claude-3-5-sonnet-20240620", max_tokens:maxTok, messages:[{role:"user",content:prompt}] })
  });
  
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error?.message || "API Request Failed");
  }

  const d = await r.json();
  const t = d.content?.map(b=>b.text||"").join("") || "{}";
  return JSON.parse(t.replace(/```json|```/g,"").trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5 LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function minMax(vals) {
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return vals.map(v => hi===lo ? 1 : (v-lo)/(hi-lo));
}

function computeStep5(userMaturity="active") {
  const weights = userMaturity==="new"
    ? {c:0.80, cf:0.00, g:0.20}
    : userMaturity==="active"
    ? {c:0.55, cf:0.25, g:0.20}
    : {c:0.35, cf:0.35, g:0.30};

  const papers = CANDIDATE_PAPERS.map(p => {
    // Normalize scores to [0,1]
    const normC  = p.content;
    const normCF = p.collab;
    const normG  = p.graph;
    // Weighted hybrid
    const hybrid = weights.c*normC + weights.cf*normCF + weights.g*normG;
    // Evidence multiplier
    const mult = EVIDENCE_MULT[p.evidence] || 1.0;
    const final = hybrid * mult;
    // RRF ranks
    return { ...p, normC, normCF, normG, hybrid, mult, final };
  });

  // Sort by each engine for RRF
  const byContent = [...papers].sort((a,b)=>b.normC-a.normC);
  const byCollab  = [...papers].sort((a,b)=>b.normCF-a.normCF);
  const byGraph   = [...papers].sort((a,b)=>b.normG-a.normG);
  const K = 60;
  const rrfScores = {};
  papers.forEach(p => {
    const rc = byContent.findIndex(x=>x.id===p.id)+1;
    const rk = byCollab.findIndex(x=>x.id===p.id)+1;
    const rg = byGraph.findIndex(x=>x.id===p.id)+1;
    rrfScores[p.id] = weights.c/(K+rc) + weights.cf/(K+rk) + weights.g/(K+rg);
  });

  // Novelty: penalise already-seen (simulate 2 seen)
  const seenIds = new Set(["C","F"]);
  const novScores = {};
  papers.forEach(p => {
    novScores[p.id] = seenIds.has(p.id) ? 0.4 : 1.0;
  });

  // Freshness decay
  const freshScores = {};
  papers.forEach(p => {
    const age = 2025 - p.year;
    freshScores[p.id] = Math.exp(-0.05 * age);
  });

  // Diversity: cluster by field, cap per field at 2
  const fieldCount = {};
  const diverse = [];
  [...papers].sort((a,b)=>b.final-a.final).forEach(p => {
    fieldCount[p.field] = (fieldCount[p.field]||0)+1;
    if(fieldCount[p.field]<=2) diverse.push(p);
  });

  // Confidence: how much engines agree
  const confScores = {};
  papers.forEach(p => {
    const scores = [p.normC, p.normCF, p.normG];
    const mean = scores.reduce((a,b)=>a+b,0)/3;
    const variance = scores.reduce((a,b)=>a+(b-mean)**2,0)/3;
    confScores[p.id] = clamp(1 - variance*4, 0.45, 0.98);
  });

  // Final ranked with all signals
  const ranked = papers.map(p => ({
    ...p,
    rrf: rrfScores[p.id],
    novelty: novScores[p.id],
    freshness: freshScores[p.id],
    confidence: confScores[p.id],
    finalScore: rrfScores[p.id] * novScores[p.id] * freshScores[p.id] * p.mult * 800,
    isDiverse: diverse.some(d=>d.id===p.id),
  })).sort((a,b)=>b.finalScore-a.finalScore);

  return { ranked, weights };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5 UI
// ═══════════════════════════════════════════════════════════════════════════

function Step5({ onDone }) {
  const [tab, setTab] = useState("overview");
  const [maturity, setMaturity] = useState("active");
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [explanations, setExplanations] = useState({});
  const [expLoading, setExpLoading] = useState(false);
  const [stage, setStage] = useState(0);

  const STAGE_LABELS = ["Aggregating candidates","Normalising scores","Dynamic weights","RRF fusion","Novelty & freshness","Diversity engine","Confidence calibration","Explanations"];

  async function runFusion() {
    setRunning(true);
    setResults(null);
    setExplanations({});
    setStage(0);
    for(let i=0;i<7;i++){ await sleep(320); setStage(i+1); }
    const r = computeStep5(maturity);
    setResults(r);
    setRunning(false);
  }

  async function generateExplanations() {
    if(!results) return;
    setExpLoading(true);
    try {
      const top5 = results.ranked.slice(0,5);
      const exps = await callClaude(`You are Medinex, a biomedical research intelligence platform.

Generate explanations for why each paper was recommended. Return ONLY valid JSON:

User maturity: ${maturity}
Top 5 papers: ${JSON.stringify(top5.map(p=>({id:p.id,title:p.title,evidence:p.evidence,field:p.field,content_score:p.normC,collab_score:p.normCF,graph_score:p.normG})))}

Return exactly:
{
  "explanations": {
    "A": {"reasons":["<reason1>","<reason2>"],"top_signal":"content|collaborative|graph","one_line":"<max 12 words>"},
    "B": {"reasons":["..."],"top_signal":"...","one_line":"..."},
    "C": {"reasons":["..."],"top_signal":"...","one_line":"..."},
    "D": {"reasons":["..."],"top_signal":"...","one_line":"..."},
    "E": {"reasons":["..."],"top_signal":"...","one_line":"..."}
  }
}`, 1000);
      setExplanations(exps.explanations || {});
    } catch(e) {}
    setExpLoading(false);
  }

  const s5tabs = ["overview","candidates","fusion","diversity","explainability","api"];

  return (
    <div>
      {/* Step header */}
      <div style={{ background:C.surface, borderRadius:12, padding:"18px 22px", marginBottom:18, border:`1px solid ${C.border2}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
          <div style={{ background:C.teal+"22", border:`1px solid ${C.teal}44`, borderRadius:8, padding:"4px 14px", fontFamily:"monospace", fontWeight:700, color:C.teal, fontSize:13 }}>STEP 5</div>
          <span style={{ color:C.text, fontSize:18, fontWeight:700 }}>Hybrid Fusion Recommendation Engine</span>
        </div>
        <p style={{ color:C.sub, fontSize:13, margin:0, lineHeight:1.6 }}>
          Orchestrates outputs from Steps 2–4 into one ranked, diverse, explainable recommendation slate. Combines content intelligence, collaborative signals, and citation graph knowledge through RRF + evidence re-ranking + diversity + novelty.
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:20, overflowX:"auto" }}>
        {s5tabs.map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{ background:"none", border:"none", padding:"10px 16px", color: tab===t?C.teal:C.muted, borderBottom:`2px solid ${tab===t?C.teal:"transparent"}`, fontFamily:"monospace", fontSize:11, fontWeight:tab===t?700:400, cursor:"pointer", whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:1 }}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==="overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Card>
            <SLabel>System Architecture</SLabel>
            {[
              { label:"User Profile (Step 1)", color:C.violet },
              { label:"─ Content Engine (Step 2)", color:C.teal, indent:1 },
              { label:"─ Collaborative (Step 3)", color:C.sky, indent:1 },
              { label:"─ Citation Graph (Step 4)", color:C.amber, indent:1 },
              { label:"Candidate Aggregation", color:C.sub },
              { label:"Score Normalisation", color:C.sub },
              { label:"Dynamic Weight Engine", color:C.green },
              { label:"Reciprocal Rank Fusion", color:C.teal, accent:true },
              { label:"Learning-to-Rank", color:C.violet },
              { label:"Diversity · Novelty · Freshness", color:C.amber },
              { label:"Confidence Calibration", color:C.sky },
              { label:"Explainability Generator", color:C.rose },
              { label:"Final Recommendation API", color:C.text, accent:true },
            ].map((item,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", paddingLeft: (item.indent||0)*20, borderBottom: item.accent?`1px dashed ${C.border}`:"none" }}>
                {i>0 && i<13 && !item.indent && <span style={{ color:C.muted, fontSize:14 }}>↓</span>}
                {item.indent && <span style={{ color:C.muted }}>⌐</span>}
                <div style={{ flex:1, padding:"4px 10px", borderRadius:5, background: item.accent?item.color+"18":"transparent", border: item.accent?`1px solid ${item.color}33`:"none" }}>
                  <span style={{ color:item.color, fontFamily:"monospace", fontSize:12 }}>{item.label}</span>
                </div>
              </div>
            ))}
          </Card>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Card>
              <SLabel>Dynamic Weight Engine</SLabel>
              <p style={{ color:C.sub, fontSize:12, margin:"0 0 12px" }}>Weights shift as the user accumulates interactions. New users rely on content; experienced users benefit from collaborative and graph signals.</p>
              {[
                { label:"New User", w:{c:0.80,cf:0.00,g:0.20} },
                { label:"Active User", w:{c:0.55,cf:0.25,g:0.20} },
                { label:"Senior Researcher", w:{c:0.35,cf:0.35,g:0.30} },
              ].map(({ label, w }) => (
                <div key={label} style={{ marginBottom:12 }}>
                  <div style={{ color:C.text, fontSize:12, fontWeight:600, marginBottom:6 }}>{label}</div>
                  {[{k:"Content",v:w.c,col:C.teal},{k:"Collaborative",v:w.cf,col:C.sky},{k:"Graph",v:w.g,col:C.amber}].map(({k,v,col})=>(
                    <div key={k} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ color:C.muted, fontSize:10, minWidth:90, fontFamily:"monospace" }}>{k}</span>
                      <div style={{ flex:1, height:5, background:C.border, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${v*100}%`, background:col, borderRadius:2 }} />
                      </div>
                      <span style={{ color:col, fontFamily:"monospace", fontSize:11, minWidth:32 }}>{(v*100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ))}
            </Card>

            <Card>
              <SLabel>RRF Formula</SLabel>
              <div style={{ background:"#040A12", borderRadius:8, padding:14, textAlign:"center", border:`1px solid ${C.teal}22` }}>
                <div style={{ color:C.teal, fontFamily:"monospace", fontSize:15, fontWeight:700, marginBottom:6 }}>RRF(d) = Σᵢ wᵢ / (k + rᵢ(d))</div>
                <div style={{ color:C.muted, fontSize:11 }}>k = 60 · rᵢ(d) = rank from engine i · wᵢ = engine weight</div>
              </div>
              <div style={{ marginTop:10, color:C.sub, fontSize:12 }}>Robust to score-scale differences. Rewards papers that rank highly across multiple engines consistently.</div>
            </Card>

            <Card>
              <SLabel>Evidence Tier Multipliers</SLabel>
              {Object.entries(EVIDENCE_MULT).map(([tier,mult]) => (
                <div key={tier} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${C.border}20` }}>
                  <Badge label={tier.replace("_"," ")} color={EVIDENCE_COLOR[tier]||C.muted} sm />
                  <span style={{ color:C.teal, fontFamily:"monospace", fontWeight:700 }}>×{mult.toFixed(2)}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* CANDIDATES */}
      {tab==="candidates" && (
        <Card>
          <SLabel>Candidate Pool — {CANDIDATE_PAPERS.length} papers from 3 engines</SLabel>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"monospace", fontSize:11 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                  {["Paper","Field","Evidence","Content","Collaborative","Graph","Year"].map(h=>(
                    <th key={h} style={{ color:C.muted, padding:"7px 10px", textAlign:"left", fontSize:10, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CANDIDATE_PAPERS.map(p=>(
                  <tr key={p.id} style={{ borderBottom:`1px solid ${C.border}20` }}>
                    <td style={{ padding:"8px 10px", color:C.text, maxWidth:220, fontSize:11 }}>
                      <div style={{ fontWeight:600, marginBottom:2 }}>{p.title}</div>
                      <div style={{ color:C.muted, fontSize:10 }}>{p.journal} · {p.citations} citations</div>
                    </td>
                    <td style={{ padding:"8px 10px" }}><Badge label={p.field} color={FIELD_COLOR[p.field]||C.sub} sm /></td>
                    <td style={{ padding:"8px 10px" }}><Badge label={p.evidence.replace("_"," ")} color={EVIDENCE_COLOR[p.evidence]||C.muted} sm /></td>
                    {["content","collab","graph"].map((k,i)=>{
                      const v = [p.content,p.collab,p.graph][i];
                      const col = [C.teal,C.sky,C.amber][i];
                      return <td key={k} style={{ padding:"8px 10px", minWidth:80 }}>
                        <div style={{ color:col, fontWeight:700, marginBottom:2 }}>{(v*100).toFixed(0)}%</div>
                        <ProgressBar value={v} color={col} height={3} />
                      </td>;
                    })}
                    <td style={{ padding:"8px 10px", color:C.sub }}>{p.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* FUSION */}
      {tab==="fusion" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SLabel>Run Hybrid Fusion Engine</SLabel>
            <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
              <span style={{ color:C.sub, fontSize:12 }}>User maturity:</span>
              {["new","active","senior"].map(m=>(
                <button key={m} onClick={()=>setMaturity(m)} style={{ background: maturity===m?C.teal+"22":"transparent", border:`1px solid ${maturity===m?C.teal:C.border}`, borderRadius:6, padding:"5px 14px", color: maturity===m?C.teal:C.muted, fontFamily:"monospace", fontSize:11, cursor:"pointer" }}>{m}</button>
              ))}
              <button onClick={runFusion} disabled={running} style={{ marginLeft:"auto", background: running?C.border:C.teal, color: running?C.muted:C.navy, border:"none", borderRadius:8, padding:"9px 22px", fontFamily:"monospace", fontSize:12, fontWeight:700, cursor: running?"default":"pointer", letterSpacing:1 }}>
                {running?"RUNNING…":"▶  RUN PIPELINE"}
              </button>
            </div>

            {running && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {STAGE_LABELS.map((s,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", opacity: stage>i?1:stage===i?1:0.3 }}>
                    {stage>i ? <span style={{ color:C.green, fontSize:12 }}>✓</span> : stage===i ? <Spinner size={12}/> : <span style={{ color:C.muted, fontSize:12 }}>○</span>}
                    <span style={{ color: stage>i?C.text:stage===i?C.teal:C.muted, fontSize:12, fontFamily:"monospace" }}>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {results && (
            <Card accent>
              <SLabel>Fusion Results — ranked by final score</SLabel>
              <div style={{ color:C.sub, fontSize:11, marginBottom:12, fontFamily:"monospace" }}>
                Weights: content={((results.weights.c)*100).toFixed(0)}% · collab={((results.weights.cf)*100).toFixed(0)}% · graph={((results.weights.g)*100).toFixed(0)}%
              </div>
              {results.ranked.map((p,i)=>{
                const dominantSignal = [["content",p.normC],["collab",p.normCF],["graph",p.normG]].sort((a,b)=>b[1]-a[1])[0][0];
                const sigColor = {content:C.teal,collab:C.sky,graph:C.amber}[dominantSignal];
                return (
                  <div key={p.id} style={{ background: i===0?C.teal+"09":C.surface, borderRadius:8, padding:"10px 14px", marginBottom:8, border:`1px solid ${i===0?C.teal+"33":C.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <span style={{ color: i<3?C.teal:C.muted, fontFamily:"monospace", fontSize:14, fontWeight:700, minWidth:22 }}>#{i+1}</span>
                      <span style={{ color:C.text, fontSize:12, fontWeight:600, flex:1 }}>{p.title}</span>
                      <Badge label={dominantSignal} color={sigColor} sm />
                      {!p.isDiverse && <Badge label="filtered" color={C.rose} sm />}
                    </div>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                      {[
                        {k:"Content",v:p.normC,c:C.teal},{k:"Collab",v:p.normCF,c:C.sky},{k:"Graph",v:p.normG,c:C.amber},
                        {k:"RRF",v:p.rrf*800,c:C.violet},{k:"Freshness",v:p.freshness,c:C.green},{k:"Novelty",v:p.novelty,c:C.rose},
                        {k:"Evidence ×",v:p.mult,c:C.amber},{k:"Confidence",v:p.confidence,c:C.sky},
                      ].map(({k,v,c})=>(
                        <div key={k} style={{ minWidth:70 }}>
                          <div style={{ color:C.muted, fontSize:9, fontFamily:"monospace", marginBottom:2 }}>{k}</div>
                          <div style={{ color:c, fontFamily:"monospace", fontSize:12, fontWeight:700 }}>{v.toFixed(2)}</div>
                        </div>
                      ))}
                      <div style={{ marginLeft:"auto", textAlign:"right" }}>
                        <div style={{ color:C.muted, fontSize:9 }}>FINAL SCORE</div>
                        <div style={{ color:C.teal, fontFamily:"monospace", fontSize:16, fontWeight:700 }}>{p.finalScore.toFixed(3)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}

      {/* DIVERSITY */}
      {tab==="diversity" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Card>
            <SLabel>Without Diversity Engine</SLabel>
            <p style={{ color:C.sub, fontSize:12, margin:"0 0 12px" }}>Pure score ranking surfaces too many papers from the same field.</p>
            {["Immunotherapy","Immunotherapy","Immunotherapy","Immunotherapy","Immunotherapy"].map((f,i)=>(
              <div key={i} style={{ padding:"7px 12px", borderRadius:5, background: C.rose+"11", border:`1px solid ${C.rose}22`, marginBottom:5, display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ color:C.rose, fontFamily:"monospace", fontSize:11 }}>#{i+1}</span>
                <Badge label={f} color={C.teal} sm />
                <span style={{ color:C.muted, fontSize:11 }}>Immunotherapy paper #{i+1}</span>
              </div>
            ))}
            <div style={{ color:C.rose, fontSize:11, marginTop:8 }}>⚠ 5/5 papers from same field — echo chamber</div>
          </Card>
          <Card>
            <SLabel>With Diversity Engine — capped 2 per field</SLabel>
            <p style={{ color:C.sub, fontSize:12, margin:"0 0 12px" }}>Cluster by research field. Cap each cluster at 2 results. Fill remaining slots from next-highest-scoring clusters.</p>
            {[
              { field:"Immunotherapy", count:2, color:C.teal },
              { field:"Genomics",      count:2, color:C.violet },
              { field:"Oncology",      count:1, color:C.amber },
            ].map(({field,count,color})=>(
              <div key={field} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <Badge label={field} color={color} sm />
                  <span style={{ color:C.muted, fontSize:10, fontFamily:"monospace" }}>{count} papers</span>
                </div>
                {Array(count).fill(0).map((_,i)=>(
                  <div key={i} style={{ padding:"6px 10px", borderRadius:4, background:color+"11", border:`1px solid ${color}22`, marginBottom:3 }}>
                    <span style={{ color:color, fontFamily:"monospace", fontSize:10 }}>Top {field} paper #{i+1}</span>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ color:C.green, fontSize:11, marginTop:8 }}>✓ Diverse slate — improves exploration</div>
          </Card>

          <Card>
            <SLabel>Novelty Penalties</SLabel>
            {[
              { label:"Already read",     mult:0.0, color:C.muted },
              { label:"Already cited",    mult:0.0, color:C.muted },
              { label:"Already saved",    mult:0.4, color:C.amber },
              { label:"Not seen",         mult:1.0, color:C.green },
              { label:"Recently published",mult:1.10, color:C.teal, boost:true },
            ].map(({label,mult,color,boost})=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.border}20` }}>
                <span style={{ color:C.sub, fontSize:12 }}>{label}</span>
                <span style={{ color:color, fontFamily:"monospace", fontWeight:700 }}>×{mult.toFixed(1)}{boost?" ↑":""}</span>
              </div>
            ))}
          </Card>

          <Card>
            <SLabel>Freshness Decay</SLabel>
            <div style={{ background:"#040A12", borderRadius:8, padding:12, textAlign:"center", marginBottom:12, border:`1px solid ${C.teal}22` }}>
              <div style={{ color:C.teal, fontFamily:"monospace", fontSize:14, fontWeight:700 }}>Freshness = e^(−λ × age)</div>
              <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>λ = 0.05</div>
            </div>
            {[0,1,2,3,5,10].map(age=>{
              const f = Math.exp(-0.05*age);
              return <div key={age} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4 }}>
                <span style={{ color:C.muted, fontSize:11, minWidth:50, fontFamily:"monospace" }}>{age}yr old</span>
                <div style={{ flex:1, height:4, background:C.border, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${f*100}%`, background:C.teal, borderRadius:2 }} />
                </div>
                <span style={{ color:C.teal, fontSize:11, fontFamily:"monospace", minWidth:36 }}>{f.toFixed(2)}</span>
              </div>;
            })}
          </Card>
        </div>
      )}

      {/* EXPLAINABILITY */}
      {tab==="explainability" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SLabel>Explanation Generator — Claude-Powered</SLabel>
            <p style={{ color:C.sub, fontSize:13, margin:"0 0 14px" }}>Every recommendation gets a transparent reason. Run the fusion engine first, then generate explanations for the top 5 results.</p>
            <button onClick={generateExplanations} disabled={!results||expLoading} style={{ background: !results?C.border:C.teal, color: !results?C.muted:C.navy, border:"none", borderRadius:8, padding:"10px 22px", fontFamily:"monospace", fontSize:12, fontWeight:700, cursor: !results?"not-allowed":"pointer" }}>
              {expLoading ? <span style={{ display:"flex", alignItems:"center", gap:8 }}><Spinner size={12}/>Generating…</span> : "GENERATE EXPLANATIONS"}
            </button>
            {!results && <div style={{ color:C.amber, fontSize:11, marginTop:8 }}>Run the Fusion pipeline first (Fusion tab)</div>}
          </Card>

          {Object.keys(explanations).length>0 && results && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {results.ranked.slice(0,5).map((p,i)=>{
                const exp = explanations[p.id];
                if(!exp) return null;
                const sigCol = {content:C.teal,collaborative:C.sky,graph:C.amber}[exp.top_signal]||C.teal;
                return (
                  <Card key={p.id} accent={i===0}>
                    <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                      <span style={{ color:C.teal, fontFamily:"monospace", fontSize:16, fontWeight:700 }}>#{i+1}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ color:C.text, fontSize:13, fontWeight:600, marginBottom:3 }}>{p.title}</div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          <Badge label={p.journal} color={C.sub} sm />
                          <Badge label={p.evidence.replace("_"," ")} color={EVIDENCE_COLOR[p.evidence]||C.muted} sm />
                          <Badge label={`top signal: ${exp.top_signal}`} color={sigCol} sm />
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ color:C.muted, fontSize:9 }}>CONFIDENCE</div>
                        <div style={{ color:C.sky, fontFamily:"monospace", fontSize:15, fontWeight:700 }}>{(p.confidence*100).toFixed(0)}%</div>
                      </div>
                    </div>
                    <div style={{ background:C.teal+"0C", borderRadius:6, padding:10, marginBottom:8, border:`1px solid ${C.teal}22` }}>
                      <span style={{ color:C.teal, fontSize:12, fontStyle:"italic" }}>"{exp.one_line}"</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {(exp.reasons||[]).map((r,ri)=>(
                        <div key={ri} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                          <span style={{ color:sigCol, minWidth:16, fontSize:11 }}>◈</span>
                          <span style={{ color:C.sub, fontSize:12 }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* API */}
      {tab==="api" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Card>
            <SLabel>POST /api/v1/recommendations</SLabel>
            <div style={{ background:"#040A12", borderRadius:6, padding:12, fontFamily:"monospace", fontSize:11, color:"#93C5FD", border:`1px solid ${C.border}` }}>
              <div style={{ color:C.muted, fontSize:10, marginBottom:6 }}>// Request</div>
              <pre style={{ margin:0, whiteSpace:"pre-wrap" }}>{JSON.stringify({user_id:"uuid",seed_paper_ids:["uuid-1","uuid-2"],limit:20,maturity:"active",diversity:true,evidence_filter:null,explain:true},null,2)}</pre>
            </div>
          </Card>
          <Card>
            <SLabel>Response Schema</SLabel>
            <div style={{ background:"#040A12", borderRadius:6, padding:12, fontFamily:"monospace", fontSize:11, color:"#93C5FD", border:`1px solid ${C.border}` }}>
              <div style={{ color:C.muted, fontSize:10, marginBottom:6 }}>// Response</div>
              <pre style={{ margin:0, whiteSpace:"pre-wrap" }}>{JSON.stringify({recommendations:[{paper_id:"uuid",title:"...",final_score:0.95,confidence:0.91,evidence_tier:"rct",signals:{content:0.88,collab:0.79,graph:0.83},explanation:{one_line:"...",reasons:["..."]}}],meta:{total_candidates:24,engines_used:3,diversity_applied:true,latency_ms:380}},null,2)}</pre>
            </div>
          </Card>
          <Card style={{ gridColumn:"1/-1" }}>
            <SLabel>Production Infrastructure</SLabel>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {[
                { label:"FastAPI Gateway", desc:"Recommendation API", color:C.teal },
                { label:"PostgreSQL", desc:"Interaction storage", color:C.sky },
                { label:"Qdrant", desc:"Semantic embeddings", color:C.violet },
                { label:"Neo4j", desc:"Citation graph", color:C.amber },
                { label:"Redis", desc:"Profile & result cache", color:C.rose },
                { label:"Celery", desc:"Async retraining", color:C.green },
                { label:"LambdaMART", desc:"Learning-to-rank", color:C.teal },
                { label:"Prometheus", desc:"NDCG · CTR · P@K", color:C.muted },
              ].map(({label,desc,color})=>(
                <div key={label} style={{ background:C.surface, borderRadius:7, padding:"10px 12px", border:`1px solid ${color}33` }}>
                  <div style={{ color, fontSize:12, fontWeight:700, fontFamily:"monospace", marginBottom:3 }}>{label}</div>
                  <div style={{ color:C.muted, fontSize:11 }}>{desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:24 }}>
        <button onClick={onDone} style={{ background:C.teal, color:C.navy, border:"none", borderRadius:8, padding:"11px 28px", fontFamily:"monospace", fontSize:13, fontWeight:700, cursor:"pointer", letterSpacing:1 }}>
          CONTINUE TO STEP 6 →
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6 — BRIDE
// ═══════════════════════════════════════════════════════════════════════════

const RESEARCH_TOPICS = [
  { id:"spatial_multiomics",    label:"Spatial Multiomics",         growth:96, maturity:28, competition:22, funding:91, clinical:78, industry:82, pub_velocity:94, funding_vel:88, patent_vel:71, trial_vel:55, github_vel:79 },
  { id:"car_t_solid",           label:"CAR-T Solid Tumours",         growth:89, maturity:45, competition:61, funding:95, clinical:97, industry:90, pub_velocity:87, funding_vel:93, patent_vel:84, trial_vel:91, github_vel:55 },
  { id:"foundation_models_bio", label:"Biomedical Foundation Models",growth:98, maturity:18, competition:44, funding:99, clinical:61, industry:99, pub_velocity:99, funding_vel:97, patent_vel:92, trial_vel:32, github_vel:99 },
  { id:"rna_therapeutics",      label:"RNA Therapeutics",            growth:82, maturity:55, competition:70, funding:86, clinical:89, industry:88, pub_velocity:78, funding_vel:85, patent_vel:90, trial_vel:86, github_vel:48 },
  { id:"protein_structure",     label:"Protein Structure Prediction",growth:77, maturity:70, competition:82, funding:74, clinical:65, industry:95, pub_velocity:73, funding_vel:72, patent_vel:87, trial_vel:41, github_vel:96 },
  { id:"longevity",             label:"Longevity & Senolytics",      growth:91, maturity:32, competition:38, funding:88, clinical:72, industry:79, pub_velocity:88, funding_vel:84, patent_vel:68, trial_vel:67, github_vel:62 },
];

function opportunityScore(t) {
  return (
    0.20*(t.growth/100) +
    0.15*(t.pub_velocity/100) +
    0.15*(t.funding_vel/100) +
    0.10*((100-t.maturity)/100) +
    0.10*(t.clinical/100) +
    0.10*(t.industry/100) +
    0.10*((100-t.competition)/100) +
    0.10*(t.github_vel/100)
  );
}

function Step6() {
  const [tab, setTab] = useState("vision");
  const [selTopic, setSelTopic] = useState(RESEARCH_TOPICS[0]);
  const [entityText, setEntityText] = useState("BRCA1 mutation increases breast cancer risk and interacts with PARP inhibitors like Olaparib.");
  const [entityResult, setEntityResult] = useState(null);
  const [entityLoading, setEntityLoading] = useState(false);
  const [roadmapGoal, setRoadmapGoal] = useState("Spatial multiomics in pancreatic cancer diagnosis");
  const [roadmap, setRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [datasetQuery, setDatasetQuery] = useState("BRCA1 breast cancer genomic");
  const [datasets, setDatasets] = useState(null);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [opScores, setOpScores] = useState(null);
  const [opLoading, setOpLoading] = useState(false);
  const [barsReady, setBarsReady] = useState(false);

  const s6tabs = ["vision","m1-entities","m2-datasets","m3-topics","m4-trends","m5-opportunity","m6-planner"];

  // Module 1 — Entity extraction
  async function runEntityExtraction() {
    setEntityLoading(true);
    setEntityResult(null);
    try {
      const r = await callClaude(`You are Medinex's Biomedical Entity Intelligence module. Extract structured knowledge from this biomedical text. Return ONLY valid JSON:

Text: "${entityText}"

Return exactly:
{
  "entities": [
    {"text":"<entity>","type":"GENE|DISEASE|DRUG|PROTEIN|MUTATION|PATHWAY","umls_id":"<realistic UMLS:CXXXXXXX>","mesh_id":"<MeSH ID>","confidence":0.0-1.0}
  ],
  "triples": [
    {"subject":"<entity>","predicate":"associated_with|interacts_with|treats|inhibits|causes|expressed_in","object":"<entity>","confidence":0.0-1.0}
  ],
  "knowledge_graph_nodes": <integer>,
  "knowledge_graph_edges": <integer>
}`, 800);
      setEntityResult(r);
    } catch(e){}
    setEntityLoading(false);
  }

  // Module 2 — Dataset intelligence
  async function runDatasetIntelligence() {
    setDatasetsLoading(true);
    setDatasets(null);
    try {
      const r = await callClaude(`You are Medinex's Dataset Intelligence module. Recommend real biomedical datasets for this research query. Return ONLY valid JSON:

Query: "${datasetQuery}"

Return exactly:
{
  "datasets": [
    {
      "name":"<real dataset name like TCGA-BRCA>",
      "repository":"<GEO|TCGA|UK Biobank|MIMIC-IV|ArrayExpress|PhysioNet|dbGaP>",
      "description":"<1 sentence>",
      "sample_size":<integer>,
      "data_type":"<genomic|clinical|omics|imaging>",
      "quality_score":<0.0-1.0>,
      "citation_count":<integer>,
      "relevance_score":<0.0-1.0>,
      "diseases":["<disease1>"],
      "genes":["<gene1>","<gene2>"],
      "bundle_companion":"<another dataset often used together>"
    }
  ]
}`, 900);
      setDatasets(r.datasets || []);
    } catch(e){}
    setDatasetsLoading(false);
  }

  // Module 5 — Opportunity scores
  async function runOpportunityEngine() {
    setOpLoading(true);
    setOpScores(null);
    setBarsReady(false);
    await sleep(400);
    const scores = RESEARCH_TOPICS.map(t => ({
      ...t,
      opportunity: opportunityScore(t),
    })).sort((a,b)=>b.opportunity-a.opportunity);
    setOpScores(scores);
    setOpLoading(false);
    setTimeout(()=>setBarsReady(true),100);
  }

  // Module 6 — AI Planner
  async function runPlanner() {
    setRoadmapLoading(true);
    setRoadmap(null);
    try {
      const r = await callClaude(`You are Medinex's AI Research Planner. Generate a personalized research roadmap. Return ONLY valid JSON:

Research Goal: "${roadmapGoal}"

Return exactly:
{
  "title":"<roadmap title>",
  "estimated_timeline":"<e.g. 18 months>",
  "phases": [
    {
      "phase":"Phase 1",
      "label":"<phase name>",
      "duration":"<e.g. 2 months>",
      "items":["<item1>","<item2>","<item3>"],
      "milestone":"<key deliverable>"
    }
  ],
  "foundational_papers":<integer>,
  "key_datasets":["<dataset1>","<dataset2>","<dataset3>"],
  "skills_to_acquire":["<skill1>","<skill2>","<skill3>"],
  "target_journals":["<journal1>","<journal2>"],
  "funding_sources":["<source1>","<source2>"],
  "collaborators_to_find":["<role1>","<role2>"],
  "opportunity_score":<0.0-1.0>
}`, 1100);
      setRoadmap(r);
    } catch(e){}
    setRoadmapLoading(false);
  }

  const PHASE_COLORS = [C.teal, C.sky, C.violet, C.amber, C.green];

  return (
    <div>
      {/* Step header */}
      <div style={{ background:`linear-gradient(135deg, ${C.teal}11, ${C.violet}11)`, borderRadius:12, padding:"18px 22px", marginBottom:18, border:`1px solid ${C.teal}33` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
          <div style={{ background:C.violet+"22", border:`1px solid ${C.violet}44`, borderRadius:8, padding:"4px 14px", fontFamily:"monospace", fontWeight:700, color:C.violet, fontSize:13 }}>STEP 6</div>
          <span style={{ color:C.text, fontSize:18, fontWeight:700 }}>BRIDE — Biomedical Research Intelligence & Discovery Engine</span>
        </div>
        <p style={{ color:C.sub, fontSize:13, margin:0, lineHeight:1.6 }}>
          The AI scientist inside Medinex. Six cooperating modules that transform paper recommendations into a complete research intelligence layer — entity extraction, dataset discovery, trend prediction, opportunity scoring, and a personalized research planner.
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, marginBottom:20, overflowX:"auto" }}>
        {s6tabs.map((t,i) => {
          const labels = ["Vision","M1: Entities","M2: Datasets","M3: Topics","M4: Trends","M5: Opportunity","M6: Planner"];
          const colors = [C.sub,C.teal,C.sky,C.violet,C.amber,C.green,C.rose];
          return <button key={t} onClick={()=>setTab(t)} style={{ background:"none", border:"none", padding:"10px 14px", color: tab===t?colors[i]:C.muted, borderBottom:`2px solid ${tab===t?colors[i]:"transparent"}`, fontFamily:"monospace", fontSize:11, fontWeight:tab===t?700:400, cursor:"pointer", whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:0.8 }}>{labels[i]}</button>;
        })}
      </div>

      {/* VISION */}
      {tab==="vision" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <Card>
            <SLabel>What BRIDE Answers</SLabel>
            <div style={{ marginBottom:14, padding:12, background:C.rose+"0A", border:`1px solid ${C.rose}22`, borderRadius:8 }}>
              <div style={{ color:C.muted, fontSize:10, fontFamily:"monospace", marginBottom:4 }}>CURRENT AI SYSTEMS</div>
              <div style={{ color:C.rose, fontSize:13, fontStyle:"italic" }}>"Find me papers."</div>
            </div>
            <div style={{ padding:12, background:C.teal+"0A", border:`1px solid ${C.teal}22`, borderRadius:8 }}>
              <div style={{ color:C.muted, fontSize:10, fontFamily:"monospace", marginBottom:4 }}>MEDINEX BRIDE</div>
              <div style={{ color:C.teal, fontSize:13, fontStyle:"italic" }}>"Help me do research."</div>
            </div>
            <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:6 }}>
              {["Research Goal → Understand Researcher","Understand Biomedical Domain","Understand Scientific Ecosystem","Generate Research Intelligence","Guide Research Decisions"].map((s,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:C.teal, flexShrink:0 }} />
                  <span style={{ color:C.sub, fontSize:12 }}>{s}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SLabel>Six Module Architecture</SLabel>
            {[
              { num:"M1", label:"Biomedical Entity Intelligence", color:C.teal,   desc:"Extract diseases, genes, drugs, mutations from papers" },
              { num:"M2", label:"Dataset Intelligence",           color:C.sky,    desc:"Index and recommend GEO, TCGA, MIMIC-IV datasets" },
              { num:"M3", label:"Topic Intelligence",             color:C.violet, desc:"Papers become living topic objects with metadata" },
              { num:"M4", label:"Scientific Trend Intelligence",  color:C.amber,  desc:"Predict which topics will become important" },
              { num:"M5", label:"Research Opportunity Engine",    color:C.green,  desc:"Composite opportunity score per research direction" },
              { num:"M6", label:"AI Research Planner",           color:C.rose,   desc:"Generate personalised research roadmaps" },
            ].map(({num,label,color,desc})=>(
              <div key={num} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:`1px solid ${C.border}20` }}>
                <div style={{ background:color+"22", border:`1px solid ${color}44`, borderRadius:5, padding:"3px 8px", fontFamily:"monospace", fontWeight:700, color, fontSize:11, flexShrink:0 }}>{num}</div>
                <div>
                  <div style={{ color:C.text, fontSize:12, fontWeight:600 }}>{label}</div>
                  <div style={{ color:C.muted, fontSize:11 }}>{desc}</div>
                </div>
              </div>
            ))}
          </Card>

          <Card style={{ gridColumn:"1/-1" }}>
            <SLabel>Research Opportunity Formula</SLabel>
            <div style={{ background:"#040A12", borderRadius:8, padding:16, border:`1px solid ${C.violet}22`, textAlign:"center" }}>
              <div style={{ color:C.violet, fontFamily:"monospace", fontSize:13, fontWeight:700, lineHeight:2 }}>
                Opportunity = 0.20×TopicGrowth + 0.15×CitationVelocity + 0.15×FundingGrowth<br/>
                + 0.10×DatasetAvailability + 0.10×ClinicalNeed + 0.10×IndustryInterest<br/>
                + 0.10×UserAlignment + 0.10×Novelty
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODULE 1 — ENTITIES */}
      {tab==="m1-entities" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SLabel>M1 · Biomedical Entity Intelligence — NER + Relation Extraction + KG Triples</SLabel>
            <p style={{ color:C.sub, fontSize:13, margin:"0 0 12px" }}>Every paper is decomposed into structured biomedical concepts. Instead of understanding words, Medinex understands concepts — linked to UMLS, MeSH, HGNC, and DrugBank.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              <textarea
                value={entityText}
                onChange={e=>setEntityText(e.target.value)}
                rows={3}
                style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:10, color:C.text, fontSize:13, fontFamily:"system-ui", resize:"vertical" }}
              />
              <button onClick={runEntityExtraction} disabled={entityLoading} style={{ background:entityLoading?C.border:C.teal, color:entityLoading?C.muted:C.navy, border:"none", borderRadius:8, padding:"10px 22px", fontFamily:"monospace", fontSize:12, fontWeight:700, cursor:"pointer", alignSelf:"flex-end", display:"flex", alignItems:"center", gap:8 }}>
                {entityLoading && <Spinner size={12}/>} EXTRACT ENTITIES & TRIPLES
              </button>
            </div>
          </Card>

          {entityResult && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <Card>
                <SLabel>Extracted Entities — {entityResult.entities?.length || 0} found</SLabel>
                {(entityResult.entities||[]).map((e,i)=>{
                  const tColor = {GENE:C.amber,DISEASE:C.rose,DRUG:C.green,PROTEIN:C.sky,MUTATION:C.violet,PATHWAY:C.teal}[e.type]||C.sub;
                  return <div key={i} style={{ background:C.surface, borderRadius:7, padding:"9px 12px", marginBottom:8, border:`1px solid ${tColor}22` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                      <span style={{ color:C.text, fontWeight:700, fontSize:13 }}>{e.text}</span>
                      <Badge label={e.type} color={tColor} sm />
                    </div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      <Mono color={C.violet}>{e.umls_id}</Mono>
                      <Mono color={C.amber}>{e.mesh_id}</Mono>
                    </div>
                    <div style={{ marginTop:4 }}><ProgressBar value={e.confidence} color={tColor} height={3} /></div>
                  </div>;
                })}
              </Card>

              <Card>
                <SLabel>Knowledge Graph Triples — {entityResult.triples?.length || 0} edges</SLabel>
                <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                  <div style={{ background:C.surface, borderRadius:7, padding:"8px 14px", textAlign:"center", flex:1, border:`1px solid ${C.border}` }}>
                    <div style={{ color:C.teal, fontFamily:"monospace", fontSize:20, fontWeight:700 }}>{entityResult.knowledge_graph_nodes}</div>
                    <div style={{ color:C.muted, fontSize:10 }}>nodes</div>
                  </div>
                  <div style={{ background:C.surface, borderRadius:7, padding:"8px 14px", textAlign:"center", flex:1, border:`1px solid ${C.border}` }}>
                    <div style={{ color:C.violet, fontFamily:"monospace", fontSize:20, fontWeight:700 }}>{entityResult.knowledge_graph_edges}</div>
                    <div style={{ color:C.muted, fontSize:10 }}>edges</div>
                  </div>
                </div>
                {(entityResult.triples||[]).map((t,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 10px", background:C.surface, borderRadius:6, marginBottom:5, border:`1px solid ${C.border}`, flexWrap:"wrap" }}>
                    <span style={{ color:C.teal, fontFamily:"monospace", fontSize:11, fontWeight:700 }}>{t.subject}</span>
                    <span style={{ color:C.violet, fontFamily:"monospace", fontSize:10, background:C.violet+"15", padding:"1px 7px", borderRadius:3 }}>{t.predicate}</span>
                    <span style={{ color:C.teal, fontFamily:"monospace", fontSize:11, fontWeight:700 }}>{t.object}</span>
                    <span style={{ marginLeft:"auto", color:C.muted, fontSize:10, fontFamily:"monospace" }}>{(t.confidence*100).toFixed(0)}%</span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* MODULE 2 — DATASETS */}
      {tab==="m2-datasets" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SLabel>M2 · Dataset Intelligence — Index + Recommend + Quality Score</SLabel>
            <p style={{ color:C.sub, fontSize:13, margin:"0 0 12px" }}>Medinex continuously indexes TCGA, GEO, ArrayExpress, MIMIC-IV, PhysioNet, UK Biobank and more. Every dataset receives a composite quality score across 8 dimensions.</p>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input value={datasetQuery} onChange={e=>setDatasetQuery(e.target.value)} style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 12px", color:C.text, fontSize:13, fontFamily:"system-ui" }} placeholder="Research context e.g. BRCA1 breast cancer genomic…" />
              <button onClick={runDatasetIntelligence} disabled={datasetsLoading} style={{ background:datasetsLoading?C.border:C.sky, color:datasetsLoading?C.muted:C.navy, border:"none", borderRadius:8, padding:"10px 20px", fontFamily:"monospace", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                {datasetsLoading && <Spinner size={12}/>} FIND DATASETS
              </button>
            </div>
          </Card>

          {datasets && datasets.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {datasets.map((d,i)=>(
                <Card key={i} accent={i===0}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ color:C.text, fontWeight:700, fontSize:13, marginBottom:3 }}>{d.name}</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        <Badge label={d.repository} color={C.sky} sm />
                        <Badge label={d.data_type} color={C.teal} sm />
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:C.muted, fontSize:9, fontFamily:"monospace" }}>QUALITY</div>
                      <div style={{ color:C.green, fontFamily:"monospace", fontSize:16, fontWeight:700 }}>{(d.quality_score*100).toFixed(0)}</div>
                    </div>
                  </div>
                  <p style={{ color:C.sub, fontSize:11, margin:"0 0 10px", lineHeight:1.5 }}>{d.description}</p>
                  <div style={{ display:"flex", gap:12, marginBottom:8 }}>
                    <div>
                      <div style={{ color:C.muted, fontSize:9 }}>SAMPLES</div>
                      <div style={{ color:C.sky, fontFamily:"monospace", fontSize:13, fontWeight:700 }}>{d.sample_size?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color:C.muted, fontSize:9 }}>CITATIONS</div>
                      <div style={{ color:C.amber, fontFamily:"monospace", fontSize:13, fontWeight:700 }}>{d.citation_count?.toLocaleString()}</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ color:C.muted, fontSize:9, marginBottom:3 }}>RELEVANCE</div>
                      <ProgressBar value={d.relevance_score} color={C.teal} height={5} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {(d.genes||[]).map(g=><Tag key={g} color={C.amber}>{g}</Tag>)}
                    {(d.diseases||[]).map(dis=><Tag key={dis} color={C.rose}>{dis}</Tag>)}
                  </div>
                  {d.bundle_companion && (
                    <div style={{ marginTop:8, color:C.muted, fontSize:11 }}>
                      Often paired with: <span style={{ color:C.sky }}>{d.bundle_companion}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODULE 3 — TOPICS */}
      {tab==="m3-topics" && (
        <div style={{ display:"grid", gridTemplateColumns:"5fr 3fr", gap:16 }}>
          <Card>
            <SLabel>M3 · Topic Intelligence — Living Topic Objects</SLabel>
            <p style={{ color:C.sub, fontSize:12, margin:"0 0 14px" }}>Each research area is a living object updated continuously as new papers, datasets, trials, and funding arrive.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {RESEARCH_TOPICS.map(t=>{
                const opp = opportunityScore(t);
                const isSelected = selTopic.id===t.id;
                return (
                  <div key={t.id} onClick={()=>setSelTopic(t)} style={{ background: isSelected?C.teal+"11":C.surface, borderRadius:8, padding:"10px 14px", cursor:"pointer", border:`1px solid ${isSelected?C.teal+"55":C.border}`, transition:"all 0.15s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ color:C.text, fontWeight:600, fontSize:13 }}>{t.label}</span>
                      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                        <span style={{ color:C.teal, fontFamily:"monospace", fontSize:11 }}>opp: {(opp*100).toFixed(0)}</span>
                        <span style={{ color:t.growth>85?C.green:t.growth>70?C.amber:C.rose, fontFamily:"monospace", fontSize:11 }}>↑{t.growth}</span>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:4 }}>
                      {[{k:"Growth",v:t.growth,c:C.green},{k:"Funding",v:t.funding,c:C.amber},{k:"Clinical",v:t.clinical,c:C.sky},{k:"Industry",v:t.industry,c:C.violet},{k:"Novelty",v:100-t.maturity,c:C.teal}].map(({k,v,c})=>(
                        <div key={k}>
                          <div style={{ color:C.muted, fontSize:8, fontFamily:"monospace" }}>{k}</div>
                          <div style={{ height:3, background:C.border, borderRadius:2, overflow:"hidden", marginTop:2 }}>
                            <div style={{ height:"100%", width:`${v}%`, background:c, borderRadius:2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <SLabel>{selTopic.label}</SLabel>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {[
                {k:"Growth",v:selTopic.growth,c:C.green},{k:"Maturity",v:selTopic.maturity,c:C.amber},
                {k:"Competition",v:selTopic.competition,c:C.rose},{k:"Funding",v:selTopic.funding,c:C.amber},
                {k:"Clinical Impact",v:selTopic.clinical,c:C.sky},{k:"Industry",v:selTopic.industry,c:C.violet},
              ].map(({k,v,c})=>(
                <div key={k} style={{ background:C.surface, borderRadius:6, padding:"8px 10px", border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.muted, fontSize:9, fontFamily:"monospace" }}>{k.toUpperCase()}</div>
                  <div style={{ color:c, fontFamily:"monospace", fontSize:18, fontWeight:700 }}>{v}</div>
                </div>
              ))}
            </div>
            <SLabel>Velocity Signals</SLabel>
            {[{k:"Publications",v:selTopic.pub_velocity,c:C.teal},{k:"Funding",v:selTopic.funding_vel,c:C.amber},{k:"Patents",v:selTopic.patent_vel,c:C.violet},{k:"Clinical Trials",v:selTopic.trial_vel,c:C.sky},{k:"GitHub Activity",v:selTopic.github_vel,c:C.green}].map(({k,v,c})=>(
              <div key={k} style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span style={{ color:C.sub, fontSize:11 }}>{k}</span>
                  <span style={{ color:c, fontFamily:"monospace", fontSize:11 }}>{v}</span>
                </div>
                <ProgressBar value={v/100} color={c} height={4} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* MODULE 4 — TRENDS */}
      {tab==="m4-trends" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SLabel>M4 · Scientific Trend Intelligence — Predicting What Will Become Important</SLabel>
            <p style={{ color:C.sub, fontSize:13, margin:0, lineHeight:1.6 }}>Instead of showing what is popular, Medinex predicts what will become important. Every topic receives a multi-dimensional velocity score across publications, funding, patents, trials, and code repositories.</p>
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {RESEARCH_TOPICS.map(t=>{
              const futureScore = (t.pub_velocity*0.25 + t.funding_vel*0.25 + t.patent_vel*0.20 + t.trial_vel*0.15 + t.github_vel*0.15);
              const trend = futureScore>85?"🚀 Accelerating":futureScore>70?"📈 Growing":futureScore>50?"📊 Stable":"📉 Slowing";
              return (
                <Card key={t.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <span style={{ color:C.text, fontSize:12, fontWeight:700, flex:1 }}>{t.label}</span>
                    <span style={{ color:C.teal, fontFamily:"monospace", fontSize:16, fontWeight:700, marginLeft:8 }}>{futureScore.toFixed(0)}</span>
                  </div>
                  <div style={{ fontSize:12, marginBottom:10 }}>{trend}</div>
                  {[{k:"Pub Velocity",v:t.pub_velocity,c:C.teal},{k:"Funding",v:t.funding_vel,c:C.amber},{k:"Patents",v:t.patent_vel,c:C.violet},{k:"Trials",v:t.trial_vel,c:C.sky},{k:"GitHub",v:t.github_vel,c:C.green}].map(({k,v,c})=>(
                    <div key={k} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                      <span style={{ color:C.muted, fontSize:9, minWidth:70, fontFamily:"monospace" }}>{k}</span>
                      <div style={{ flex:1, height:3, background:C.border, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${v}%`, background:c, borderRadius:2 }} />
                      </div>
                      <span style={{ color:c, fontSize:9, fontFamily:"monospace", minWidth:22 }}>{v}</span>
                    </div>
                  ))}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* MODULE 5 — OPPORTUNITY */}
      {tab==="m5-opportunity" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SLabel>M5 · Research Opportunity Engine — Composite Opportunity Score</SLabel>
            <p style={{ color:C.sub, fontSize:13, margin:"0 0 14px" }}>Combines growth, funding, dataset availability, competition, clinical need, and user alignment into a single actionable score. Helps researchers find high-impact directions before they become crowded.</p>
            <button onClick={runOpportunityEngine} disabled={opLoading} style={{ background:opLoading?C.border:C.green, color:opLoading?C.muted:C.navy, border:"none", borderRadius:8, padding:"10px 22px", fontFamily:"monospace", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
              {opLoading && <Spinner size={12}/>} COMPUTE OPPORTUNITY SCORES
            </button>
          </Card>

          {opScores && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {opScores.map((t,i)=>{
                const pct2 = t.opportunity*100;
                const compLabel = t.competition<35?"Low":t.competition<65?"Medium":"High";
                const compCol = t.competition<35?C.green:t.competition<65?C.amber:C.rose;
                const fundLabel = t.funding>85?"Very High":t.funding>70?"High":t.funding>50?"Medium":"Low";
                return (
                  <Card key={t.id} accent={i===0}>
                    <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                      <div style={{ width:52, height:52, borderRadius:"50%", background: i===0?C.teal+"22":C.surface, border:`2px solid ${i===0?C.teal:C.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ color:i===0?C.teal:C.sub, fontFamily:"monospace", fontSize:14, fontWeight:700 }}>{pct2.toFixed(0)}</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <span style={{ color:C.text, fontWeight:700, fontSize:13 }}>{t.label}</span>
                          <div style={{ display:"flex", gap:6 }}>
                            <Badge label={`Competition: ${compLabel}`} color={compCol} sm />
                            <Badge label={`Funding: ${fundLabel}`} color={C.amber} sm />
                            {i===0 && <Badge label="HIGHEST OPPORTUNITY" color={C.teal} sm />}
                          </div>
                        </div>
                        <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden", marginBottom:4 }}>
                          <div style={{ height:"100%", width: barsReady?`${pct2}%`:"0%", background: i===0?C.teal:i<3?C.green:C.sub, borderRadius:3, transition:"width 0.9s cubic-bezier(.4,0,.2,1)" }} />
                        </div>
                        <div style={{ color:C.muted, fontSize:11 }}>
                          {i===0?"Extremely Promising — low competition, high funding, accelerating velocity"
                            :i<3?"Highly Promising — strong signals across multiple dimensions"
                            :"Moderate — solid fundamentals but facing competition or maturity"}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODULE 6 — PLANNER */}
      {tab==="m6-planner" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <SLabel>M6 · AI Research Planner — Personalised Research Roadmap</SLabel>
            <p style={{ color:C.sub, fontSize:13, margin:"0 0 12px" }}>Instead of recommending papers, Medinex recommends an entire research journey. Enter a research goal to generate a phased roadmap with papers, datasets, skills, journals, and funding sources.</p>
            <div style={{ display:"flex", gap:10 }}>
              <input value={roadmapGoal} onChange={e=>setRoadmapGoal(e.target.value)} style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 12px", color:C.text, fontSize:13, fontFamily:"system-ui" }} placeholder="Research goal e.g. Spatial multiomics in pancreatic cancer…" />
              <button onClick={runPlanner} disabled={roadmapLoading} style={{ background:roadmapLoading?C.border:C.rose, color:roadmapLoading?C.muted:C.navy, border:"none", borderRadius:8, padding:"10px 22px", fontFamily:"monospace", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                {roadmapLoading && <Spinner size={12}/>} GENERATE ROADMAP
              </button>
            </div>
          </Card>

          {roadmap && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Card accent>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div>
                    <div style={{ color:C.text, fontSize:17, fontWeight:700, marginBottom:4 }}>{roadmap.title}</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Badge label={`Timeline: ${roadmap.estimated_timeline}`} color={C.teal} sm />
                      <Badge label={`${roadmap.foundational_papers} foundational papers`} color={C.sky} sm />
                      <Badge label={`Opportunity: ${((roadmap.opportunity_score||0)*100).toFixed(0)}%`} color={C.green} sm />
                    </div>
                  </div>
                </div>

                {/* Phases */}
                <SLabel>Research Phases</SLabel>
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
                  {(roadmap.phases||[]).map((ph,i)=>{
                    const col = PHASE_COLORS[i % PHASE_COLORS.length];
                    return (
                      <div key={i} style={{ display:"flex", gap:12 }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", background:col+"22", border:`2px solid ${col}66`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontSize:11, fontWeight:700, color:col }}>{i+1}</div>
                          {i<(roadmap.phases.length-1) && <div style={{ width:1, flex:1, background:C.border, margin:"4px 0" }} />}
                        </div>
                        <div style={{ background:C.surface, borderRadius:8, padding:"10px 14px", flex:1, border:`1px solid ${col}22`, marginBottom:i<roadmap.phases.length-1?8:0 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ color:col, fontWeight:700, fontSize:13 }}>{ph.phase}: {ph.label}</span>
                            <Badge label={ph.duration} color={C.muted} sm />
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:3, marginBottom:6 }}>
                            {(ph.items||[]).map((item,j)=>(
                              <div key={j} style={{ color:C.sub, fontSize:12, display:"flex", gap:6 }}>
                                <span style={{ color:col }}>·</span>{item}
                              </div>
                            ))}
                          </div>
                          <div style={{ background:col+"11", borderRadius:4, padding:"4px 8px", fontSize:11, color:col }}>
                            Milestone: {ph.milestone}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Resources grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  {[
                    { label:"Key Datasets",        items: roadmap.key_datasets,          color:C.sky },
                    { label:"Skills to Acquire",   items: roadmap.skills_to_acquire,      color:C.amber },
                    { label:"Target Journals",     items: roadmap.target_journals,        color:C.violet },
                    { label:"Funding Sources",     items: roadmap.funding_sources,        color:C.green },
                    { label:"Find Collaborators",  items: roadmap.collaborators_to_find,  color:C.rose },
                  ].map(({label,items,color})=>(
                    <div key={label} style={{ background:C.surface, borderRadius:8, padding:"10px 12px", border:`1px solid ${color}22` }}>
                      <div style={{ color:color, fontSize:10, fontFamily:"monospace", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>{label}</div>
                      {(items||[]).map((item,j)=>(
                        <div key={j} style={{ color:C.sub, fontSize:11, display:"flex", gap:5, alignItems:"flex-start", marginBottom:3 }}>
                          <span style={{ color:color, flexShrink:0 }}>◈</span>{item}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tag helper ────────────────────────────────────────────────────────────────
function Tag({ children, color = C.teal }) {
  return <span style={{ background:color+"18", color, border:`1px solid ${color}30`, borderRadius:3, padding:"1px 7px", fontSize:10, fontFamily:"monospace" }}>{children}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════════════════
export default function MedinexStep5Step6() {
  const [activeStep, setActiveStep] = useState(5);

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <style>{`
        * { box-sizing:border-box; }
        @keyframes spin { to { transform:rotate(360deg); } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:2px; }
        button { transition: opacity 0.15s; }
        button:hover:not(:disabled) { opacity:0.85; }
        input, textarea { outline:none; }
        input:focus, textarea:focus { border-color:${C.teal}66 !important; }
      `}</style>

      {/* Top nav */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"12px 28px", display:"flex", alignItems:"center", gap:16, position:"sticky", top:0, background:C.bg, zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.teal, boxShadow:`0 0 8px ${C.teal}` }} />
          <span style={{ fontFamily:"monospace", fontSize:14, color:C.teal, fontWeight:700, letterSpacing:2 }}>MEDINEX</span>
        </div>
        <div style={{ width:1, height:20, background:C.border }} />
        <span style={{ color:C.muted, fontSize:12, fontFamily:"monospace" }}>Phase 5 · Recommendation Systems</span>
        <div style={{ flex:1 }} />
        {/* Step switcher */}
        <div style={{ display:"flex", gap:0, background:C.surface, borderRadius:8, padding:3, border:`1px solid ${C.border}` }}>
          {[5,6].map(s => {
            const labels = {5:"Step 5 — Hybrid Fusion", 6:"Step 6 — BRIDE"};
            const colors = {5:C.teal, 6:C.violet};
            return (
              <button key={s} onClick={()=>setActiveStep(s)} style={{
                background: activeStep===s ? colors[s]+"22" : "transparent",
                border: `1px solid ${activeStep===s ? colors[s]+"55" : "transparent"}`,
                borderRadius:6, padding:"6px 16px", color: activeStep===s?colors[s]:C.muted,
                fontFamily:"monospace", fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:0.5,
              }}>{labels[s]}</button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 24px" }}>
        {activeStep===5 && <Step5 onDone={()=>setActiveStep(6)} />}
        {activeStep===6 && <Step6 />}
      </div>
    </div>
  );
}
