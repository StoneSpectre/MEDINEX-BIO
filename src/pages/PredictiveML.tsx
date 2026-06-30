import React, { useState } from 'react';
import { ArrowLeft, Brain, TrendingUp, BarChart2, Activity, Zap, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const C = {
  bg: "#030614",
  surface: "rgba(10, 15, 40, 0.7)",
  border: "rgba(167, 139, 250, 0.2)",
  accent: "#a78bfa", // Purple
  accent2: "#3b82f6", // Blue
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  danger: "#ef4444",
  warning: "#f59e0b",
  success: "#10b981"
};

const TRAJECTORY_DATA = [
  { month: 'Jan', riskScore: 20, biomarker: 1.2 },
  { month: 'Feb', riskScore: 25, biomarker: 1.5 },
  { month: 'Mar', riskScore: 35, biomarker: 2.1 },
  { month: 'Apr', riskScore: 45, biomarker: 2.8 },
  { month: 'May (Now)', riskScore: 60, biomarker: 3.5 },
  { month: 'Jun (Proj)', riskScore: 75, biomarker: 4.8 },
  { month: 'Jul (Proj)', riskScore: 88, biomarker: 6.2 },
];

const SHAP_DATA = [
  { feature: 'LDL Cholesterol', importance: 0.85, type: 'Clinical' },
  { feature: 'rs1042713 (ADRB2)', importance: 0.72, type: 'Genomic' },
  { feature: 'Systolic BP', importance: 0.65, type: 'Clinical' },
  { feature: 'Age', importance: 0.45, type: 'Demographic' },
  { feature: 'Smoking History', importance: 0.30, type: 'Lifestyle' }
];

export default function PredictiveML() {
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
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(167, 139, 250, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          <ArrowLeft size={16} /> BACK TO HOME
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Brain size={20} color={C.accent} />
          <span style={{ fontSize: "14px", color: C.text, letterSpacing: "2px", fontWeight: "bold", textTransform: "uppercase" }}>Predictive ML Engine</span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: C.accent, border: `1px solid ${C.accent}40`, padding: "4px 12px", borderRadius: "20px", background: `${C.accent}10` }}>
            <Zap size={12} fill={C.accent} />
            INFERENCE ACTIVE
          </div>
        </div>
      </div>

      <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "32px", flex: 1 }}>
        
        {/* Top Row: Risk Panels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          <RiskPanel title="Cardiovascular Risk (10yr)" score={68} color={C.danger} trend="+12%" icon={<Activity size={24} />} />
          <RiskPanel title="Renal Decline Probability" score={42} color={C.warning} trend="+5%" icon={<AlertTriangle size={24} />} />
          <RiskPanel title="Immunological Stability" score={85} color={C.success} trend="Stable" icon={<Activity size={24} />} />
        </div>

        {/* Bottom Row: Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "24px", flex: 1 }}>
          
          {/* Disease Trajectory Chart */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
              <TrendingUp size={20} color={C.accent} />
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>Disease Trajectory Simulation (LSTM)</h3>
            </div>
            <div style={{ height: "300px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TRAJECTORY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke={C.textMuted} fontSize={12} />
                  <YAxis yAxisId="left" stroke={C.textMuted} fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke={C.textMuted} fontSize={12} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(167, 139, 250, 0.4)", borderRadius: "8px" }} />
                  <Line yAxisId="left" type="monotone" dataKey="riskScore" stroke={C.accent} strokeWidth={3} dot={{ r: 4, fill: C.bg, stroke: C.accent, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Risk Score" />
                  <Line yAxisId="right" type="monotone" dataKey="biomarker" stroke={C.accent2} strokeWidth={3} strokeDasharray="5 5" name="Key Biomarker" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: "16px", fontSize: "13px", color: C.textMuted, lineHeight: "1.6" }}>
              <strong style={{ color: C.accent }}>Model Insight:</strong> Projected non-linear escalation of risk score beginning in June. Trajectory correlates strongly with recent biomarker spikes. Preventative intervention highly recommended before Month 6.
            </div>
          </div>

          {/* SHAP Feature Importance */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
              <BarChart2 size={20} color={C.accent2} />
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>Feature Importance (SHAP)</h3>
            </div>
            <div style={{ height: "300px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={SHAP_DATA} margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="feature" type="category" stroke={C.textMuted} fontSize={11} width={120} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ background: "#0f172a", border: "1px solid rgba(59, 130, 246, 0.4)", borderRadius: "8px" }} />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={20}>
                    {SHAP_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'Genomic' ? C.accent : C.accent2} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "16px", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: C.textMuted }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: C.accent2 }} /> Clinical / Demo
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: C.textMuted }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: C.accent }} /> Genomic
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function RiskPanel({ title, score, color, trend, icon }: { title: string, score: number, color: string, trend: string, icon: any }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: "24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "4px", background: color }} />
      <div style={{ padding: "16px", borderRadius: "50%", background: `${color}15`, color: color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "13px", color: C.textMuted, marginBottom: "8px", fontWeight: "600" }}>{title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
          <span style={{ fontSize: "36px", fontWeight: "900", color: "#fff" }}>{score}%</span>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: color, background: `${color}20`, padding: "4px 8px", borderRadius: "12px" }}>{trend}</span>
        </div>
      </div>
    </div>
  );
}
