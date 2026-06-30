import React, { useState, useEffect } from 'react';
import { Network, Server, FileText, Database, UserCheck, Settings, Play, CheckCircle2, ChevronRight, Activity, Terminal } from 'lucide-react';

const C = {
  bg: "#050A12",
  surface: "rgba(12, 22, 40, 0.7)",
  border: "rgba(139, 127, 232, 0.2)",
  accent: "#8B7FE8", // Violet for AI Planner
  accentGlow: "rgba(139, 127, 232, 0.4)",
  text: "#D8E8F8",
  textMuted: "#6888A8",
  success: "#1CC47A",
  warning: "#F0A030",
  cyan: "#00C2A8"
};

const AGENTS = [
  { id: "lead", title: "Lead Diagnostic Orchestrator", icon: <UserCheck size={18}/>, x: 50, y: 15, status: "completed", type: "primary" },
  { id: "emr", title: "EMR Traversal Agent", icon: <Database size={18}/>, x: 15, y: 50, status: "completed", type: "worker" },
  { id: "genomics", title: "Genomics (ClinVar) Agent", icon: <Network size={18}/>, x: 50, y: 50, status: "completed", type: "worker" },
  { id: "lit", title: "Literature (PubMed) Agent", icon: <FileText size={18}/>, x: 85, y: 50, status: "running", type: "worker" },
  { id: "synthesizer", title: "Clinical Synthesizer", icon: <Activity size={18}/>, x: 50, y: 85, status: "pending", type: "primary" }
];

const EDGES = [
  { from: "lead", to: "emr" },
  { from: "lead", to: "genomics" },
  { from: "lead", to: "lit" },
  { from: "emr", to: "synthesizer" },
  { from: "genomics", to: "synthesizer" },
  { from: "lit", to: "synthesizer" }
];

const LOGS = [
  { time: "00:00:01", source: "Lead Agent", msg: "Received query: Asthma + Paradoxical Hypertension" },
  { time: "00:00:02", source: "Lead Agent", msg: "Decomposing into 3 parallel sub-tasks..." },
  { time: "00:00:03", source: "EMR Agent", msg: "Querying MIMIC-IV for prior beta-agonist responses." },
  { time: "00:00:05", source: "Genomics Agent", msg: "Scanning ADRB2 variant rs1042713." },
  { time: "00:00:06", source: "EMR Agent", msg: "Found 12 matching clinical profiles. [SUCCESS]" },
  { time: "00:00:08", source: "Genomics Agent", msg: "Variant reduces receptor downregulation. [SUCCESS]" },
  { time: "00:00:09", source: "Literature Agent", msg: "Retrieving Harrison's Ch 252 & Robbins Ch 15..." },
];

export default function BioquoraCopilotDAG() {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const simulateRun = () => {
    setIsRunning(true);
    setLogs([]);
    LOGS.forEach((log, idx) => {
      setTimeout(() => {
        setLogs(prev => [...prev, log]);
      }, idx * 1200);
    });
    setTimeout(() => setIsRunning(false), LOGS.length * 1200);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" }}>
      
      {/* Top Navigation */}
      <div style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid rgba(255,255,255,0.05)`, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}>
        <button 
          onClick={() => window.location.href = '/roadmap'}
          style={{
            background: "transparent", border: `1px solid ${C.border}`, color: C.accent,
            padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
            fontSize: "14px", fontWeight: "600", transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(139, 127, 232, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          ← BACK TO ROADMAP
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Settings size={20} color={C.accent} />
          <span style={{ fontSize: "14px", color: C.text, letterSpacing: "1px", fontWeight: "bold" }}>MULTI-AGENT PLANNER (DAG)</span>
        </div>
        <button 
          onClick={simulateRun}
          disabled={isRunning}
          style={{
            background: isRunning ? "rgba(255,255,255,0.1)" : C.accent, border: "none", color: isRunning ? "#666" : "#000",
            padding: "8px 24px", borderRadius: "8px", cursor: isRunning ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px",
            fontSize: "14px", fontWeight: "bold", boxShadow: isRunning ? "none" : `0 0 15px ${C.accentGlow}`
          }}
        >
          {isRunning ? <Spin /> : <Play size={16} fill="#000" />} {isRunning ? 'EXECUTING DAG...' : 'RUN SIMULATION'}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", flex: 1 }}>
        
        {/* Left Side: Interactive DAG Canvas */}
        <div style={{ position: "relative", background: "radial-gradient(circle at 50% 50%, #0c1524 0%, #050a12 100%)" }}>
          
          {/* Background grid */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: `linear-gradient(${C.accent} 1px, transparent 1px), linear-gradient(90deg, ${C.accent} 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
          
          <div style={{ position: "absolute", top: "24px", left: "24px", padding: "12px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", display: "flex", gap: "16px" }}>
             <LegendItem color={C.success} label="COMPLETED" />
             <LegendItem color={C.warning} label="RUNNING" />
             <LegendItem color={C.textMuted} label="PENDING" />
          </div>

          <div style={{ position: "relative", width: "100%", height: "100%", padding: "40px", display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", width: "800px", height: "500px", marginTop: "60px" }}>
              
              {/* Edges */}
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={C.border} />
                  </marker>
                  <marker id="arrow-active" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={C.warning} />
                  </marker>
                </defs>
                {EDGES.map((edge, i) => {
                  const from = AGENTS.find(a => a.id === edge.from);
                  const to = AGENTS.find(a => a.id === edge.to);
                  const isActive = isRunning && (from.status === 'completed' || from.status === 'running') && to.status !== 'completed';
                  return (
                    <g key={i}>
                      <line 
                        x1={`${from.x}%`} y1={`${from.y}%`} 
                        x2={`${to.x}%`} y2={`${to.y}%`} 
                        stroke={isActive ? C.warning : C.border} 
                        strokeWidth="2"
                        strokeDasharray={isActive ? "4 4" : "none"}
                        markerEnd={`url(#${isActive ? 'arrow-active' : 'arrow'})`}
                      />
                      {isActive && (
                        <circle cx={`${from.x}%`} cy={`${from.y}%`} r="3" fill={C.warning}>
                          <animate attributeName="cx" values={`${from.x}%;${to.x}%`} dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="cy" values={`${from.y}%;${to.y}%`} dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Nodes */}
              {AGENTS.map((agent) => (
                <div key={agent.id} style={{
                  position: "absolute",
                  left: `${agent.x}%`,
                  top: `${agent.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
                  opacity: (isRunning && logs.length === 0 && agent.id !== 'lead') ? 0.4 : 1,
                  transition: "opacity 0.3s"
                }}>
                  <div style={{
                    width: agent.type === 'primary' ? "64px" : "50px",
                    height: agent.type === 'primary' ? "64px" : "50px",
                    borderRadius: "16px",
                    background: C.surface,
                    border: `2px solid ${agent.status === 'completed' && isRunning ? C.success : (agent.status === 'running' && isRunning ? C.warning : C.border)}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: agent.status === 'running' && isRunning ? `0 0 20px ${C.warning}40` : "0 10px 20px rgba(0,0,0,0.5)",
                    position: "relative"
                  }}>
                    {React.cloneElement(agent.icon, { color: agent.status === 'completed' && isRunning ? C.success : (agent.status === 'running' && isRunning ? C.warning : C.text) })}
                    
                    {agent.status === 'completed' && isRunning && (
                      <div style={{ position: "absolute", top: -6, right: -6, background: C.success, borderRadius: "50%", padding: "2px", color: "#000" }}>
                        <CheckCircle2 size={12} />
                      </div>
                    )}
                    {agent.status === 'running' && isRunning && (
                      <div style={{ position: "absolute", bottom: -6, right: -6 }}>
                        <Spin color={C.warning} />
                      </div>
                    )}
                  </div>
                  <div style={{
                    background: "rgba(0,0,0,0.8)", border: `1px solid ${C.border}`, padding: "6px 12px", borderRadius: "8px",
                    fontSize: "11px", fontWeight: "bold", color: C.text, textAlign: "center", whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                  }}>
                    {agent.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Execution Trace */}
        <div style={{ background: "rgba(8, 15, 26, 0.9)", borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "12px" }}>
            <Terminal size={18} color={C.accent} />
            <span style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" }}>EXECUTION TRACE</span>
          </div>
          
          <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
            {logs.length === 0 && !isRunning && (
              <div style={{ textAlign: "center", color: C.textMuted, fontSize: "12px", marginTop: "40px" }}>
                Click 'Run Simulation' to execute the DAG.
              </div>
            )}
            
            {logs.map((log, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", animation: "slideIn 0.3s ease-out forwards" }}>
                <div style={{ color: C.textMuted, fontSize: "11px", fontFamily: "monospace", paddingTop: "2px" }}>{log.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: C.accent, fontWeight: "bold", marginBottom: "4px", textTransform: "uppercase" }}>{log.source}</div>
                  <div style={{ fontSize: "13px", color: log.msg.includes('SUCCESS') ? C.success : C.text, lineHeight: "1.5" }}>{log.msg}</div>
                </div>
              </div>
            ))}

            {isRunning && logs.length > 0 && logs.length < LOGS.length && (
              <div style={{ display: "flex", gap: "12px", opacity: 0.5 }}>
                <div style={{ color: C.textMuted, fontSize: "11px", fontFamily: "monospace", paddingTop: "2px" }}>--:--:--</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: C.warning, fontWeight: "bold", marginBottom: "4px" }}>AWAITING AGENT...</div>
                  <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}><Spin size={12} color={C.warning} /> Processing next node in DAG</div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function Spin({ size = 14, color = "#000" }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}40`, borderTop: `2px solid ${color}`,
      borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px", color: "#888" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
      {label}
    </div>
  );
}
