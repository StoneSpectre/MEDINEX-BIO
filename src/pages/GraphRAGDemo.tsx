import React, { useState } from 'react';
import { BookOpen, Stethoscope, Search, Network, BrainCircuit, Activity, ChevronRight, User, ShieldAlert, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const C = {
  bg: "#040b16",
  surface: "rgba(15, 23, 42, 0.7)",
  border: "rgba(0, 212, 200, 0.2)",
  accent: "#00d4c8", // Teal for Graph RAG
  accentGlow: "rgba(0, 212, 200, 0.4)",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f43f5e"
};

export default function GraphRAGDemo() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'Bioquora Clinical Intelligence Online. Medical literature, genomic variants, and clinical guidelines loaded. How can I assist with your diagnostic query today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeSources, setActiveSources] = useState<string[]>([]);

  const handleSend = () => {
    if (!query.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setQuery("");
    setIsTyping(true);

    // Simulate RAG retrieval pipeline
    setTimeout(() => {
      setActiveSources(['Harrison', 'Robbins']);
    }, 800);

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: `Based on the latest graph retrieval, the patient's presentation of paradoxical hypertension alongside severe asthma exacerbation suggests a complex pharmacological interaction rather than isolated disease progression.

According to **Harrison's Principles of Internal Medicine**, systemic absorption of high-dose beta-2 agonists (like Albuterol) can rarely induce transient hypertension and tachycardia. Furthermore, **Robbins Basic Pathology** highlights the vascular remodeling that occurs in chronic inflammatory states. 

**Graph Traversal Findings:** 
Albuterol → [TARGETS] → ADRB2 → [VARIANT rs1042713] → Reduced receptor desensitization.`
      }]);
      setIsTyping(false);
    }, 2500);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" }}>
      
      {/* Top Navigation */}
      <div style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid rgba(255,255,255,0.05)`, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: "transparent", border: `1px solid ${C.border}`, color: C.accent,
            padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
            fontSize: "14px", fontWeight: "600", transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(0, 212, 200, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          ← BACK TO HOME
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BrainCircuit size={20} color={C.accent} />
          <span style={{ fontSize: "14px", color: C.text, letterSpacing: "1px", fontWeight: "bold" }}>CLINICAL INTELLIGENCE (MULTI-AGENT RAG)</span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* Left Side: Clinical Chat Interface */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          
          {/* Chat History */}
          <div style={{ flex: 1, padding: "40px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start", maxWidth: "85%", alignSelf: msg.role === 'user' ? "flex-end" : "flex-start", flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                
                <div style={{ 
                  width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", shrink: 0,
                  background: msg.role === 'user' ? "rgba(255,255,255,0.1)" : `rgba(0, 212, 200, 0.15)`,
                  border: `1px solid ${msg.role === 'user' ? 'rgba(255,255,255,0.2)' : C.accent}`
                }}>
                  {msg.role === 'user' ? <User size={20} color="#fff" /> : <BrainCircuit size={20} color={C.accent} />}
                </div>

                <div style={{
                  padding: "20px", borderRadius: "16px",
                  background: msg.role === 'user' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.4)",
                  border: msg.role === 'user' ? "1px solid rgba(255,255,255,0.1)" : `1px solid rgba(0, 212, 200, 0.2)`,
                  borderTopRightRadius: msg.role === 'user' ? "4px" : "16px",
                  borderTopLeftRadius: msg.role === 'agent' ? "4px" : "16px",
                  lineHeight: "1.6", fontSize: "15px", color: msg.role === 'user' ? "#fff" : "#e2e8f0",
                  whiteSpace: "pre-wrap", boxShadow: msg.role === 'agent' ? "0 10px 30px rgba(0,0,0,0.5)" : "none"
                }}>
                  {/* Basic markdown parsing for bold text */}
                  {msg.content.split('**').map((part, index) => 
                    index % 2 === 1 ? <strong key={index} style={{ color: C.accent }}>{part}</strong> : part
                  )}
                </div>

              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `rgba(0, 212, 200, 0.15)`, border: `1px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BrainCircuit size={20} color={C.accent} />
                </div>
                <div style={{ padding: "16px 24px", borderRadius: "16px", background: "rgba(0,0,0,0.4)", border: `1px solid rgba(0, 212, 200, 0.2)`, display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.accent, animation: "pulse 1.5s infinite" }}></span>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.accent, animation: "pulse 1.5s infinite", animationDelay: "0.2s" }}></span>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.accent, animation: "pulse 1.5s infinite", animationDelay: "0.4s" }}></span>
                  <span style={{ marginLeft: "8px", fontSize: "12px", color: C.accent, letterSpacing: "1px" }}>QUERYING GRAPH VECTOR STORE...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ padding: "24px 40px", background: "rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", gap: "16px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", padding: "12px", borderRadius: "16px", alignItems: "flex-end" }}>
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter patient symptoms, genetic markers, or clinical questions..."
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", resize: "none",
                  padding: "8px 12px", fontSize: "15px", fontFamily: "inherit", maxHeight: "150px"
                }}
                rows={2}
              />
              <button 
                onClick={handleSend}
                disabled={!query.trim() || isTyping}
                style={{
                  background: query.trim() && !isTyping ? C.accent : "rgba(255,255,255,0.1)",
                  color: query.trim() && !isTyping ? "#000" : "#666",
                  border: "none", padding: "12px", borderRadius: "10px", cursor: query.trim() && !isTyping ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s"
                }}
              >
                <ChevronRight size={24} />
              </button>
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "12px", paddingLeft: "12px" }}>
              <span style={{ fontSize: "11px", color: C.textMuted, display: "flex", alignItems: "center", gap: "4px" }}><ShieldAlert size={12} /> HIPAA Compliant Mode</span>
              <span style={{ fontSize: "11px", color: C.textMuted, display: "flex", alignItems: "center", gap: "4px" }}><Zap size={12} /> Graph-Enhanced RAG</span>
            </div>
          </div>
        </div>

        {/* Right Side: RAG Sources & Graph Context */}
        <div style={{ width: "450px", background: "rgba(15,23,42,0.3)", padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ fontSize: "12px", letterSpacing: "2px", color: C.accent, fontWeight: "bold" }}>RETRIEVAL CONTEXT</div>

          {/* Book Sources */}
          <div>
            <h3 style={{ fontSize: "14px", color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={16} /> Clinical Knowledge Base
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { id: 'Harrison', title: "Harrison's Principles of Internal Medicine", desc: "21st Edition • Ch 252: Asthma", active: activeSources.includes('Harrison') },
                { id: 'Guyton', title: "Guyton and Hall Textbook of Medical Physiology", desc: "14th Edition • Unit VIII: Respiration", active: activeSources.includes('Guyton') },
                { id: 'Robbins', title: "Robbins Basic Pathology", desc: "10th Edition • Ch 15: The Lung", active: activeSources.includes('Robbins') }
              ].map(book => (
                <div key={book.id} style={{ 
                  background: book.active ? `rgba(0, 212, 200, 0.1)` : "rgba(0,0,0,0.3)", 
                  border: `1px solid ${book.active ? C.accent : 'rgba(255,255,255,0.05)'}`, 
                  borderRadius: "12px", padding: "16px", display: "flex", alignItems: "flex-start", gap: "12px",
                  transition: "all 0.3s"
                }}>
                  <div style={{ padding: "8px", background: book.active ? C.accent : "rgba(255,255,255,0.05)", borderRadius: "8px", color: book.active ? "#000" : C.textMuted }}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: book.active ? "#fff" : C.textMuted, marginBottom: "4px" }}>{book.title}</div>
                    <div style={{ fontSize: "11px", color: book.active ? C.accent : "#64748b" }}>{book.desc}</div>
                    {book.active && <div style={{ fontSize: "10px", background: C.accent, color: "#000", padding: "2px 6px", borderRadius: "4px", display: "inline-block", marginTop: "8px", fontWeight: "bold" }}>RETRIEVED VECTOR</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", margin: "8px 0" }} />

          {/* Graph Sub-graph Extraction UI */}
          <div>
            <h3 style={{ fontSize: "14px", color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Network size={16} /> Extracted Sub-Graph
            </h3>
            
            <div style={{ 
              background: "#0a0f1c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "20px",
              minHeight: "200px", position: "relative", overflow: "hidden"
            }}>
              {activeSources.length === 0 ? (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
                  <Network size={32} color="#334155" />
                  <span style={{ fontSize: "12px", color: "#475569" }}>Waiting for query...</span>
                </div>
              ) : (
                <div style={{ animation: "fadeIn 1s ease forwards" }}>
                  <div style={{ fontSize: "12px", color: C.accent, fontFamily: "monospace", marginBottom: "12px" }}>
                    &gt; MATCH (n)-[r]-(m) <br/>&gt; WHERE n.id IN vector_results<br/>&gt; RETURN subgraph;
                  </div>
                  
                  {/* Mock graph visualization nodes */}
                  <div style={{ position: "relative", height: "120px", marginTop: "20px" }}>
                    <div style={{ position: "absolute", top: "10px", left: "20px", padding: "6px 10px", background: "#f43f5e20", border: "1px solid #f43f5e", borderRadius: "20px", fontSize: "11px", color: "#f43f5e" }}>Asthma</div>
                    <div style={{ position: "absolute", top: "10px", right: "20px", padding: "6px 10px", background: "#38bdf820", border: "1px solid #38bdf8", borderRadius: "20px", fontSize: "11px", color: "#38bdf8" }}>Albuterol</div>
                    <div style={{ position: "absolute", bottom: "10px", left: "90px", padding: "6px 10px", background: "#34d39920", border: "1px solid #34d399", borderRadius: "20px", fontSize: "11px", color: "#34d399" }}>ADRB2</div>
                    
                    {/* SVG lines */}
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: -1 }}>
                      <line x1="60" y1="25" x2="110" y2="90" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="4 4" />
                      <line x1="180" y1="25" x2="130" y2="90" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="4 4" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.2; transform: scale(0.8); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
