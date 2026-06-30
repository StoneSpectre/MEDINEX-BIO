import React, { useState } from 'react';
import { ArrowLeft, Target, Bookmark, Sparkles, Database, Layers, CheckCircle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';

const C = {
  bg: "#020810",
  surface: "rgba(10, 30, 25, 0.7)",
  border: "rgba(16, 185, 129, 0.2)",
  accent: "#10b981", // Emerald
  accent2: "#14b8a6", // Teal
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  highlight: "#34d399",
};

const RADAR_DATA = [
  { subject: 'Genomic Overlap', A: 90, fullMark: 100 },
  { subject: 'Symptom Match', A: 85, fullMark: 100 },
  { subject: 'Demographic Similarity', A: 60, fullMark: 100 },
  { subject: 'Treatment History', A: 75, fullMark: 100 },
  { subject: 'Temporal Relevance', A: 95, fullMark: 100 },
];

const SCATTER_DATA = [
  { x: 10, y: 30, z: 200, label: 'Patient Anchor', type: 'anchor' },
  { x: 15, y: 35, z: 100, label: 'Paper A', type: 'match' },
  { x: 8, y: 25, z: 100, label: 'Paper B', type: 'match' },
  { x: 40, y: 60, z: 50, label: 'Paper C', type: 'miss' },
  { x: 50, y: 10, z: 50, label: 'Trial X', type: 'miss' },
  { x: 12, y: 28, z: 120, label: 'Trial Y', type: 'match' },
];

const RECOMMENDED_PAPERS = [
  { title: "Efficacy of Albuterol with Corticosteroids in ADRB2 Mutants", author: "Chen et al.", match: "98%", source: "PubMed", type: "Clinical Study" },
  { title: "Pharmacokinetic modeling of CYP3A4 variant *1G", author: "Smith et al.", match: "92%", source: "Nature Medicine", type: "Review" },
  { title: "Phase III Trial: Targeted therapy for TP53 VUS", author: "NCT0456221", match: "87%", source: "ClinicalTrials.gov", type: "Active Trial" }
];

export default function RecommendationEngine() {
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
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          <ArrowLeft size={16} /> BACK TO ROADMAP
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Target size={20} color={C.accent} />
          <span style={{ fontSize: "14px", color: C.text, letterSpacing: "2px", fontWeight: "bold", textTransform: "uppercase" }}>Recommendation Engine</span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: C.accent, border: `1px solid ${C.accent}40`, padding: "4px 12px", borderRadius: "20px", background: `${C.accent}10` }}>
            <Sparkles size={12} fill={C.accent} />
            EMBEDDINGS SYNCED
          </div>
        </div>
      </div>

      <div style={{ padding: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", flex: 1 }}>
        
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          
          {/* Neural Embedding Space */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
              <Database size={20} color={C.accent} />
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>Neural Embedding Space (Vector Search)</h3>
            </div>
            
            <div style={{ flex: 1, minHeight: "300px", position: "relative" }}>
               <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis type="number" dataKey="x" hide />
                  <YAxis type="number" dataKey="y" hide />
                  <ZAxis type="number" dataKey="z" range={[50, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: "#020810", border: `1px solid ${C.border}` }} />
                  <Scatter name="Embeddings" data={SCATTER_DATA} fill={C.textMuted}>
                    {SCATTER_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'anchor' ? C.accent : (entry.type === 'match' ? C.highlight : 'rgba(255,255,255,0.1)')} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              
              <div style={{ position: "absolute", top: 16, right: 16, display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.6)", padding: "12px", borderRadius: "8px", border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} /> Patient Anchor
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.highlight }} /> High Similarity Matches
                </div>
              </div>
            </div>
          </div>

          {/* Personalization Matrix */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Layers size={20} color={C.accent2} />
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>Personalization Weights</h3>
            </div>
            
            <div style={{ height: "250px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RADAR_DATA}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: C.textMuted, fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Weights" dataKey="A" stroke={C.accent} fill={C.accent} fillOpacity={0.4} />
                  <Tooltip contentStyle={{ background: "#020810", border: `1px solid ${C.border}`, borderRadius: "8px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Feed */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bookmark size={20} color={C.accent} />
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>Top Recommended Literature & Trials</h3>
            </div>
            <div style={{ fontSize: "12px", color: C.textMuted }}>Sorted by Vector Similarity</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, overflowY: "auto", paddingRight: "8px" }}>
            {RECOMMENDED_PAPERS.map((paper, i) => (
              <div key={i} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "20px", transition: "all 0.2s", cursor: "pointer" }}
                onMouseOver={(e) => {
                  e.currentTarget.style.border = `1px solid ${C.border}`;
                  e.currentTarget.style.background = "rgba(16, 185, 129, 0.05)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.05)";
                  e.currentTarget.style.background = "rgba(0,0,0,0.4)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: C.accent2, textTransform: "uppercase", letterSpacing: "1px" }}>{paper.type}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "bold", color: C.accent, background: `${C.accent}20`, padding: "4px 8px", borderRadius: "12px" }}>
                    <CheckCircle size={12} /> {paper.match}
                  </div>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", marginBottom: "8px", lineHeight: "1.4" }}>
                  {paper.title}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: C.textMuted }}>
                  <span>{paper.author}</span>
                  <span style={{ borderBottom: `1px dashed ${C.textMuted}` }}>{paper.source}</span>
                </div>
              </div>
            ))}

            <div style={{ marginTop: "auto", padding: "24px", textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: "12px", background: "rgba(16, 185, 129, 0.05)" }}>
              <div style={{ color: C.textMuted, fontSize: "13px", marginBottom: "12px" }}>End of high-confidence matches.</div>
              <button style={{ background: "transparent", border: `1px solid ${C.accent}`, color: C.accent, padding: "8px 24px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>LOAD MORE RESULTS</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
