import { useState, useEffect, useCallback, useRef } from "react";

// ─── Design Tokens ───────────────────────────────────────────────────────────
// Dark surgical: deep navy bg, teal pulse accent, violet for AI cognition,
// amber for data signals, green for success states.
// Mono: JetBrains-style for data; Inter for prose.
const C = {
  bg:       "#050A12",
  surface:  "#080F1A",
  card:     "#0C1628",
  card2:    "#0F1E35",
  border:   "#132238",
  border2:  "#1C3350",
  teal:     "#00C2A8",
  teal2:    "#007A6E",
  violet:   "#8B7FE8",
  violet2:  "#5B51C4",
  amber:    "#F0A030",
  amber2:   "#B87020",
  rose:     "#E84460",
  green:    "#1CC47A",
  sky:      "#38AAEE",
  text:     "#D8E8F8",
  sub:      "#6888A8",
  muted:    "#384E66",
  navy:     "#050A12",
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const uuid  = () => Math.random().toString(36).slice(2, 10);

// ─── Claude API ───────────────────────────────────────────────────────────────
async function callClaude(prompt, maxTok = 900) {
  const apiKey = localStorage.getItem('anthropic_api_key');
  if (!apiKey) throw new Error("API Key missing");

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: maxTok,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  const t = d.content?.map(b => b.text || "").join("") || "{}";
  return JSON.parse(t.replace(/```json|```/g, "").trim());
}

// ─── Primitive Components ─────────────────────────────────────────────────────
function Pill({ label, color = C.teal, sm }) {
  return (
    <span style={{
      background: color + "20", color, border: `1px solid ${color}44`,
      borderRadius: 5, padding: sm ? "1px 7px" : "3px 10px",
      fontSize: sm ? 10 : 11, fontFamily: "monospace",
      fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function SectionBar({ children, color = C.teal }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 3, height: 16, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ color, fontFamily: "monospace", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function Card({ children, accent, glow, style: st = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${accent ? C.teal + "50" : C.border}`,
      borderRadius: 10, padding: 18,
      boxShadow: glow ? `0 0 32px ${C.teal}0A` : "none",
      ...st,
    }}>{children}</div>
  );
}

function Spin({ size = 14 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${C.border}`, borderTop: `2px solid ${C.teal}`,
      borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

// ─── Research Context Object ──────────────────────────────────────────────────
const MOCK_CONTEXT = {
  user_id: "researcher-suryansh-001",
  name: "Suryansh",
  academic_level: "Graduate Researcher",
  institution: "BIT Mesra",
  active_projects: ["Cancer Immunotherapy Mechanisms", "BRCA1 Pathway Analysis"],
  current_goal: "",
  research_interests: ["Immunotherapy", "Precision Oncology", "Genomics"],
  reading_history: 47,
  saved_papers: 18,
  saved_datasets: 6,
  saved_topics: 4,
  preferred_journals: ["Nature Medicine", "Cell", "NEJM"],
  user_embedding: Array.from({ length: 8 }, () => Math.random().toFixed(3)),
  open_questions: [
    "What drives CAR-T failure in solid tumours?",
    "Can spatial multiomics predict immunotherapy response?",
  ],
  session_id: uuid(),
};

// ─── DAG Workflow nodes ───────────────────────────────────────────────────────
const WORKFLOW_NODES = [
  { id: "goal",      label: "Parse Research Goal",    color: C.violet,  duration: 200 },
  { id: "context",   label: "Build Context Model",    color: C.sky,     duration: 350 },
  { id: "plan",      label: "AI Planner — DAG",       color: C.teal,    duration: 400 },
  { id: "semantic",  label: "Semantic Engine",         color: C.teal,    duration: 500, parallel: true },
  { id: "graph",     label: "Graph Engine",            color: C.amber,   duration: 450, parallel: true },
  { id: "collab",    label: "Collaborative Engine",    color: C.sky,     duration: 480, parallel: true },
  { id: "dataset",   label: "Dataset Engine",          color: C.green,   duration: 420, parallel: true },
  { id: "topic",     label: "Topic Engine",            color: C.violet,  duration: 400, parallel: true },
  { id: "fusion",    label: "Hybrid Fusion",           color: C.teal,    duration: 300 },
  { id: "explain",   label: "Explanation Engine",      color: C.rose,    duration: 350 },
  { id: "workspace", label: "Workspace Builder",       color: C.amber,   duration: 280 },
  { id: "events",    label: "Event Bus Publish",       color: C.muted,   duration: 150 },
  { id: "response",  label: "Unified API Response",    color: C.green,   duration: 100 },
];

// ─── Section: Context Engine ──────────────────────────────────────────────────
function ContextEngineSection() {
  const [ctx] = useState(MOCK_CONTEXT);
  const fields = [
    { key: "user_id",           icon: "⬡", color: C.teal },
    { key: "academic_level",    icon: "◎", color: C.sky },
    { key: "institution",       icon: "▣", color: C.violet },
    { key: "active_projects",   icon: "◈", color: C.amber },
    { key: "research_interests",icon: "◉", color: C.teal },
    { key: "reading_history",   icon: "◌", color: C.sub },
    { key: "saved_papers",      icon: "★", color: C.green },
    { key: "open_questions",    icon: "?", color: C.rose },
    { key: "preferred_journals",icon: "◆", color: C.violet },
    { key: "user_embedding",    icon: "⌬", color: C.teal },
    { key: "session_id",        icon: "⊡", color: C.muted },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <SectionBar>Research Context Object</SectionBar>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {fields.map(f => (
            <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 10px", background: C.card2, borderRadius: 6, border: `1px solid ${C.border}` }}>
              <span style={{ color: f.color, fontSize: 13, minWidth: 16, textAlign: "center" }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.muted, fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 1 }}>{f.key}</div>
                <div style={{ color: C.text, fontSize: 11, fontFamily: "monospace" }}>
                  {Array.isArray(ctx[f.key])
                    ? ctx[f.key].length > 3
                      ? `[${ctx[f.key].slice(0,2).join(", ")}, …+${ctx[f.key].length-2}]`
                      : `[${ctx[f.key].join(", ")}]`
                    : String(ctx[f.key])}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <SectionBar>Context Construction Pipeline</SectionBar>
          {["User Login","User Database","Research History","Interaction History","Knowledge Graph","Current Session","Embedding Service","Research Context Object"].map((s, i, arr) => (
            <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: i === arr.length-1 ? C.teal+"14" : C.card2, borderRadius: 5, border: `1px solid ${i === arr.length-1 ? C.teal+"44" : C.border}`, width: "100%" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: i === arr.length-1 ? C.teal : C.muted, flexShrink: 0 }} />
                <span style={{ color: i === arr.length-1 ? C.teal : C.sub, fontSize: 12, fontFamily: "monospace" }}>{s}</span>
              </div>
              {i < arr.length-1 && <div style={{ width: 1, height: 10, background: C.border, marginLeft: 13 }} />}
            </div>
          ))}
        </Card>

        <Card>
          <SectionBar>User Embedding (768-D, first 8 shown)</SectionBar>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 60 }}>
            {ctx.user_embedding.map((v, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
                <div style={{ width: "100%", height: Math.abs(parseFloat(v)) * 54, background: C.teal, borderRadius: "2px 2px 0 0", opacity: 0.5 + parseFloat(v)*0.5, transition: "height 0.6s ease" }} />
                <span style={{ color: C.muted, fontSize: 8, fontFamily: "monospace" }}>d{i}</span>
              </div>
            ))}
            <span style={{ color: C.muted, fontSize: 10, alignSelf: "center", marginLeft: 4 }}>…+760</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Section: AI Planner ──────────────────────────────────────────────────────
function AIPlannerSection() {
  const [goal, setGoal] = useState("Help me start research on spatial multiomics in pancreatic cancer");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generatePlan() {
    setLoading(true);
    setPlan(null);
    try {
      const r = await callClaude(`You are Medinex ResearchOS AI Planner. Convert this research goal into a structured execution DAG. Return ONLY valid JSON:

Goal: "${goal}"

{
  "interpreted_goal": "<one line>",
  "complexity": "simple|moderate|complex",
  "tasks": [
    {"id":"t1","label":"<task>","type":"literature|dataset|graph|people|opportunity|synthesis","depends_on":[],"parallel":false,"estimated_ms":<int>,"rationale":"<why>"},
    {"id":"t2","label":"<task>","type":"literature|dataset|graph|people|opportunity|synthesis","depends_on":["t1"],"parallel":true,"estimated_ms":<int>,"rationale":"<why>"}
  ],
  "total_tasks": <int>,
  "parallel_groups": <int>,
  "estimated_total_ms": <int>,
  "research_questions": ["<q1>","<q2>","<q3>"]
}`, 900);
      setPlan(r);
    } catch(e) { 
      // Fallback if API fails
      setPlan({
        "interpreted_goal": "Analyze spatial multiomics in pancreatic cancer",
        "complexity": "complex",
        "tasks": [
          {"id":"t1","label":"Extract Entities","type":"literature","depends_on":[],"parallel":false,"estimated_ms":200,"rationale":"Identify key biomedical terms"},
          {"id":"t2","label":"Vector Search","type":"literature","depends_on":["t1"],"parallel":true,"estimated_ms":500,"rationale":"Semantic search over PubMed"},
          {"id":"t3","label":"Graph Traversal","type":"graph","depends_on":["t1"],"parallel":true,"estimated_ms":450,"rationale":"Neo4j multi-hop lookup"},
          {"id":"t4","label":"Hybrid Fusion","type":"synthesis","depends_on":["t2","t3"],"parallel":false,"estimated_ms":300,"rationale":"RRF ranking"}
        ],
        "total_tasks": 4,
        "parallel_groups": 1,
        "estimated_total_ms": 1450,
        "research_questions": ["What spatial markers indicate immune evasion?"]
      });
    }
    setLoading(false);
  }

  const typeColor = { literature: C.teal, dataset: C.sky, graph: C.amber, people: C.violet, opportunity: C.green, synthesis: C.rose };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionBar>Research Goal → Execution DAG</SectionBar>
        <p style={{ color: C.sub, fontSize: 13, margin: "0 0 12px", lineHeight: 1.6 }}>
          Every user request is transformed into a structured execution plan — not a single search. The AI Planner decomposes the goal into typed tasks, infers dependencies, identifies which can run in parallel, and estimates total execution time.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={2}
            style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 12px", color: C.text, fontSize: 13, fontFamily: "system-ui", resize: "vertical" }} />
          <button onClick={generatePlan} disabled={loading} style={{ background: loading ? C.border : C.teal, color: loading ? C.muted : C.navy, border: "none", borderRadius: 8, padding: "0 22px", fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {loading && <Spin size={12} />} PLAN
          </button>
        </div>
      </Card>

      {plan && (
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
          <Card>
            <SectionBar color={C.violet}>Execution DAG — {plan.total_tasks} Tasks</SectionBar>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <Pill label={plan.complexity} color={plan.complexity === "complex" ? C.rose : plan.complexity === "moderate" ? C.amber : C.green} />
              <Pill label={`${plan.parallel_groups} parallel groups`} color={C.sky} />
              <Pill label={`~${plan.estimated_total_ms}ms`} color={C.teal} />
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 11, marginBottom: 10, color: C.teal, fontStyle: "italic" }}>Goal: {plan.interpreted_goal}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(plan.tasks || []).map((t, i) => (
                <div key={t.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", background: C.card2, borderRadius: 7, border: `1px solid ${(typeColor[t.type] || C.teal) + "33"}` }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: (typeColor[t.type] || C.teal) + "22", border: `1px solid ${(typeColor[t.type] || C.teal) + "55"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 10, color: typeColor[t.type] || C.teal, flexShrink: 0 }}>{t.id}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                      <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{t.label}</span>
                      {t.parallel && <Pill label="parallel" color={C.sky} sm />}
                      <Pill label={t.type} color={typeColor[t.type] || C.teal} sm />
                    </div>
                    <div style={{ color: C.muted, fontSize: 10 }}>{t.rationale} · {t.estimated_ms}ms</div>
                    {t.depends_on?.length > 0 && <div style={{ color: C.muted, fontSize: 10 }}>depends: {t.depends_on.join(", ")}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionBar color={C.violet}>Research Questions Identified</SectionBar>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(plan.research_questions || []).map((q, i) => (
                <div key={i} style={{ padding: "9px 12px", background: C.violet + "0E", border: `1px solid ${C.violet}22`, borderRadius: 7 }}>
                  <span style={{ color: C.violet, fontSize: 12, fontStyle: "italic" }}>Q{i+1}.</span>
                  <span style={{ color: C.sub, fontSize: 12, marginLeft: 6 }}>{q}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Section: Workflow Engine ─────────────────────────────────────────────────
function WorkflowNode({ node, done, running, ms }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 12px", background: running ? node.color + "14" : C.card2, borderRadius: 6, border: `1px solid ${running ? node.color : C.border}` }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", background: done ? node.color : running ? "transparent" : C.border, border: `2px solid ${done || running ? node.color : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {done && <span style={{ color: C.navy, fontSize: 10, fontWeight: 700 }}>✓</span>}
        {running && <Spin size={10} />}
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: running || done ? C.text : C.sub, fontSize: 12, fontFamily: "monospace" }}>{node.label}</span>
        {ms && <span style={{ color: C.muted, fontSize: 10, fontFamily: "monospace" }}>{ms}ms</span>}
      </div>
    </div>
  );
}

function WorkflowEngineSection() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(new Set());
  const [active, setActive] = useState(new Set());
  const [times, setTimes] = useState({});

  async function runWorkflow() {
    setRunning(true);
    setCompleted(new Set());
    setActive(new Set());
    setTimes({});

    const parallelStart = ["semantic","graph","collab","dataset","topic"];
    const sequential = ["goal","context","plan"];
    const after = ["fusion","explain","workspace","events","response"];

    for (const id of sequential) {
      setActive(s => new Set([...s, id]));
      const node = WORKFLOW_NODES.find(n => n.id === id);
      await sleep(node.duration);
      setCompleted(c => new Set([...c, id]));
      setActive(s => { const n = new Set(s); n.delete(id); return n; });
      setTimes(t => ({ ...t, [id]: node.duration }));
    }

    // Parallel group
    setActive(new Set(parallelStart));
    await Promise.all(parallelStart.map(async id => {
      const node = WORKFLOW_NODES.find(n => n.id === id);
      await sleep(node.duration);
      setCompleted(c => new Set([...c, id]));
      setActive(s => { const n = new Set(s); n.delete(id); return n; });
      setTimes(t => ({ ...t, [id]: node.duration }));
    }));

    for (const id of after) {
      setActive(s => new Set([...s, id]));
      const node = WORKFLOW_NODES.find(n => n.id === id);
      await sleep(node.duration);
      setCompleted(c => new Set([...c, id]));
      setActive(s => { const n = new Set(s); n.delete(id); return n; });
      setTimes(t => ({ ...t, [id]: node.duration }));
    }

    setRunning(false);
  }

  const totalMs = Object.values(times).reduce((a,b) => a+b, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionBar>DAG Workflow Execution — Live Simulation</SectionBar>
        <p style={{ color: C.sub, fontSize: 13, margin: "0 0 14px", lineHeight: 1.6 }}>
          The workflow engine represents every research query as a Directed Acyclic Graph. Sequential steps (parse goal → build context → AI plan) feed into a parallel execution group (all five intelligence engines run simultaneously), then results converge into fusion, explanation, and workspace assembly.
        </p>
        <button onClick={runWorkflow} disabled={running} style={{ background: running ? C.border : C.teal, color: running ? C.muted : C.navy, border: "none", borderRadius: 8, padding: "10px 24px", fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: running ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          {running && <Spin size={12} />} {running ? "EXECUTING WORKFLOW…" : "▶  EXECUTE WORKFLOW DAG"}
        </button>

        {/* Node grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Sequential */}
          {WORKFLOW_NODES.filter(n => ["goal","context","plan"].includes(n.id)).map(n => (
            <WorkflowNode key={n.id} node={n} done={completed.has(n.id)} running={active.has(n.id)} ms={times[n.id]} />
          ))}
          {/* Parallel group */}
          <div style={{ background: C.border + "50", border: `1px dashed ${C.border}`, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 4, margin: "8px 0" }}>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: C.sub, marginBottom: 4, textAlign: "center" }}>PARALLEL EXECUTION GROUP</div>
            {WORKFLOW_NODES.filter(n => n.parallel).map(n => (
              <WorkflowNode key={n.id} node={n} done={completed.has(n.id)} running={active.has(n.id)} ms={times[n.id]} />
            ))}
          </div>
          {/* After */}
          {WORKFLOW_NODES.filter(n => ["fusion","explain","workspace","events","response"].includes(n.id)).map(n => (
            <WorkflowNode key={n.id} node={n} done={completed.has(n.id)} running={active.has(n.id)} ms={times[n.id]} />
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function BioquoraCopilotDAG() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "20px 40px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
        
        {/* Navigation Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, paddingBottom: "16px" }}>
          <a href="/roadmap" style={{ display: "flex", alignItems: "center", gap: "8px", color: C.teal, textDecoration: "none", fontSize: "14px", fontWeight: "bold", fontFamily: "monospace" }}>
            <span style={{ fontSize: "18px" }}>←</span> BACK TO ROADMAP
          </a>
          <div style={{ color: C.muted, fontSize: "12px", fontFamily: "monospace", letterSpacing: "2px" }}>RESEARCH CO-PILOT SIMULATOR</div>
        </div>

        <ContextEngineSection />
        <AIPlannerSection />
        <WorkflowEngineSection />
      </div>
    </div>
  );
}
