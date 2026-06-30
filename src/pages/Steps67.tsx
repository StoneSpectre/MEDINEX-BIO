import React, { useState, useEffect } from 'react';
import { Activity, Dna, Fingerprint, Heart, Wind, ShieldAlert, ArrowLeft, Maximize2, GitBranch, Crosshair } from 'lucide-react';

const C = {
  bg: "#05030A",
  surface: "rgba(20, 10, 25, 0.7)",
  border: "rgba(249, 115, 22, 0.2)",
  accent: "#f97316", // Neon Orange for Phase 7
  accentGlow: "rgba(249, 115, 22, 0.4)",
  text: "#FDF5E6",
  textMuted: "#A38F85",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  fuchsia: "#d946ef",
  cyan: "#00d4c8"
};

export default function Steps67() {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const int = setInterval(() => setPulse(p => (p + 1) % 100), 2000);
    return () => clearInterval(int);
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" }}>
      
      {/* Header */}
      <div style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}>
        <button 
          onClick={() => window.location.href = '/roadmap'}
          style={{
            background: "transparent", border: `1px solid ${C.border}`, color: C.accent,
            padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
            fontSize: "14px", fontWeight: "600", transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          <ArrowLeft size={16} /> BACK TO HOME
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Fingerprint size={20} color={C.accent} />
          <span style={{ fontSize: "14px", color: C.text, letterSpacing: "2px", fontWeight: "bold", textTransform: "uppercase" }}>Patient Digital Twin</span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: C.success, border: `1px solid ${C.success}40`, padding: "4px 12px", borderRadius: "20px", background: `${C.success}10` }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.success, animation: 'pulse 2s infinite' }} />
            TELEMETRY SYNCED
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "32px", display: "grid", gridTemplateColumns: "350px 1fr 350px", gap: "24px" }}>
        
        {/* Left Panel: Genomics & Multi-Omics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: C.fuchsia, marginBottom: "20px" }}>
              <Dna size={18} />
              <h3 style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" }}>GENOMIC VARIANT MAP</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { gene: "ADRB2", variant: "rs1042713", effect: "Pathogenic", desc: "Alters beta-2 receptor downregulation" },
                { gene: "CYP3A4", variant: "*1G", effect: "Likely Benign", desc: "Normal metabolizer phenotype" },
                { gene: "TP53", variant: "rs1042522", effect: "VUS", desc: "Arg72Pro polymorphism" }
              ].map(v => (
                <div key={v.gene} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                      {v.gene} <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", color: C.textMuted }}>{v.variant}</span>
                    </div>
                    <div style={{ 
                      fontSize: "10px", padding: "2px 8px", borderRadius: "12px", fontWeight: "bold",
                      background: v.effect === 'Pathogenic' ? `${C.danger}20` : (v.effect === 'VUS' ? `${C.warning}20` : `${C.success}20`),
                      color: v.effect === 'Pathogenic' ? C.danger : (v.effect === 'VUS' ? C.warning : C.success),
                      border: `1px solid ${v.effect === 'Pathogenic' ? C.danger : (v.effect === 'VUS' ? C.warning : C.success)}40`
                    }}>
                      {v.effect}
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", color: C.textMuted }}>{v.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: C.accent, marginBottom: "20px" }}>
              <GitBranch size={18} />
              <h3 style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" }}>PHARMACOKINETICS</h3>
            </div>
            
            {/* Simulated PK Graph */}
            <div style={{ height: "150px", borderBottom: `1px solid ${C.border}`, borderLeft: `1px solid ${C.border}`, position: "relative", marginBottom: "20px" }}>
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: 0 }}>
                <path d="M 0,100 C 20,20 40,10 50,40 C 60,70 80,90 100,95" fill="none" stroke={C.accent} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <path d="M 0,100 C 20,20 40,10 50,40 C 60,70 80,90 100,95 L 100,100 L 0,100 Z" fill={`url(#pk-gradient)`} opacity="0.3" />
                <defs>
                  <linearGradient id="pk-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: "absolute", top: "10%", left: "45%", fontSize: "10px", color: C.accent, background: "rgba(0,0,0,0.8)", padding: "2px 6px", borderRadius: "4px" }}>C_max (Albuterol)</div>
            </div>
            <div style={{ fontSize: "12px", color: C.textMuted, lineHeight: "1.5" }}>
              Simulated drug clearance reduced by 14% due to receptor polymorphism. Dose adjustment recommended.
            </div>
          </div>

        </div>

        {/* Center Panel: 3D Avatar Simulator */}
        <div style={{ position: "relative", background: "radial-gradient(ellipse at center, rgba(249, 115, 22, 0.1) 0%, rgba(0,0,0,0) 70%)", borderRadius: "16px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          
          <div style={{ position: "absolute", top: 24, left: 24, fontSize: "12px", color: C.textMuted, letterSpacing: "2px" }}>
            <span style={{ color: "#fff", fontWeight: "bold" }}>ID:</span> P-77492-BX<br/>
            <span style={{ color: "#fff", fontWeight: "bold" }}>STATUS:</span> EXACERBATION
          </div>

          <div style={{ position: "absolute", top: 24, right: 24, background: "rgba(0,0,0,0.5)", border: `1px solid ${C.border}`, padding: "8px", borderRadius: "8px", display: "flex", gap: "8px" }}>
             <Maximize2 size={16} color={C.textMuted} />
             <Crosshair size={16} color={C.accent} />
          </div>

          {/* Wireframe Humanoid Body (SVG) */}
          <div style={{ position: "relative", width: "250px", height: "500px" }}>
            <svg viewBox="0 0 100 250" width="100%" height="100%" style={{ filter: `drop-shadow(0 0 20px ${C.accentGlow})` }}>
              <g stroke={C.accent} strokeWidth="0.5" fill="transparent" opacity="0.6">
                {/* Head */}
                <ellipse cx="50" cy="20" rx="12" ry="16" />
                <path d="M 45 36 L 50 42 L 55 36" />
                {/* Torso */}
                <path d="M 35 45 C 30 60, 35 110, 50 120 C 65 110, 70 60, 65 45 Z" />
                <line x1="50" y1="42" x2="50" y2="120" />
                {/* Lungs (Highlighted due to asthma) */}
                <path d="M 48 55 C 40 55, 38 75, 48 85 Z" fill={pulse < 50 ? `${C.danger}80` : `${C.danger}30`} stroke={C.danger} strokeWidth="1" />
                <path d="M 52 55 C 60 55, 62 75, 52 85 Z" fill={pulse < 50 ? `${C.danger}80` : `${C.danger}30`} stroke={C.danger} strokeWidth="1" />
                {/* Arms */}
                <path d="M 35 45 C 20 60, 15 100, 10 130" />
                <path d="M 65 45 C 80 60, 85 100, 90 130" />
                {/* Legs */}
                <path d="M 45 120 C 40 160, 35 200, 30 240" />
                <path d="M 55 120 C 60 160, 65 200, 70 240" />
              </g>
            </svg>

            {/* Target lines pointing to organs */}
            <div style={{ position: "absolute", top: "28%", left: "-20%", width: "40%", height: "1px", background: C.danger, transform: "rotate(-15deg)" }}></div>
            <div style={{ position: "absolute", top: "22%", left: "-45%", background: "rgba(239,68,68,0.1)", border: `1px solid ${C.danger}`, padding: "4px 8px", borderRadius: "4px", fontSize: "10px", color: C.danger, fontWeight: "bold" }}>
              BRONCHOCONSTRICTION
            </div>
            
            <div style={{ position: "absolute", top: "50%", right: "-20%", width: "40%", height: "1px", background: C.warning, transform: "rotate(15deg)" }}></div>
            <div style={{ position: "absolute", top: "54%", right: "-45%", background: "rgba(245,158,11,0.1)", border: `1px solid ${C.warning}`, padding: "4px 8px", borderRadius: "4px", fontSize: "10px", color: C.warning, fontWeight: "bold" }}>
              VASOCONSTRICTION
            </div>

          </div>

          <div style={{ position: "absolute", bottom: 24, left: 24, right: 24, background: "rgba(0,0,0,0.6)", padding: "16px", borderRadius: "12px", border: `1px solid ${C.border}`, display: "flex", gap: "16px", alignItems: "center" }}>
             <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${C.danger}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <ShieldAlert size={20} color={C.danger} />
             </div>
             <div>
               <div style={{ fontSize: "12px", color: C.danger, fontWeight: "bold", marginBottom: "4px" }}>CRITICAL INSIGHT</div>
               <div style={{ fontSize: "13px", color: "#fff" }}>Digital twin simulation predicts 85% probability of severe asthmatic event if Albuterol is administered without concurrent corticosteroid.</div>
             </div>
          </div>
        </div>

        {/* Right Panel: Live Biomarkers */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: C.success, marginBottom: "20px" }}>
              <Activity size={18} />
              <h3 style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" }}>REAL-TIME TELEMETRY</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Heart size={20} color={C.danger} style={{ marginBottom: "8px" }} />
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>134</div>
                <div style={{ fontSize: "10px", color: C.textMuted, letterSpacing: "1px" }}>BPM (HIGH)</div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Wind size={20} color={C.cyan} style={{ marginBottom: "8px" }} />
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>88%</div>
                <div style={{ fontSize: "10px", color: C.textMuted, letterSpacing: "1px" }}>SpO2 (LOW)</div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>160/95</div>
                <div style={{ fontSize: "10px", color: C.textMuted, letterSpacing: "1px" }}>BLOOD PRESSURE</div>
                <div style={{ width: "100%", height: "4px", background: "#333", borderRadius: "2px", marginTop: "12px", overflow: "hidden" }}>
                   <div style={{ width: "80%", height: "100%", background: C.danger }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)", flex: 1 }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px", color: "#fff", marginBottom: "16px" }}>CLINICAL TIMELINE</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
              <div style={{ position: "absolute", left: "6px", top: "10px", bottom: "10px", width: "2px", background: "rgba(255,255,255,0.1)" }} />
              
              {[
                { time: "09:42", ev: "Albuterol Administered", color: C.warning },
                { time: "09:55", ev: "SpO2 dropped to 88%", color: C.danger },
                { time: "10:12", ev: "Hypertensive Spike", color: C.danger },
                { time: "10:15", ev: "Digital Twin Activated", color: C.accent }
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                  <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: item.color, border: "3px solid #000", marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "11px", color: C.textMuted, marginBottom: "2px" }}>{item.time}</div>
                    <div style={{ fontSize: "13px", color: "#fff", fontWeight: "500" }}>{item.ev}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}
