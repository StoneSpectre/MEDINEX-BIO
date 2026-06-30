import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, FileText, ArrowRight, Activity, Cpu, Server, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const C = {
  bg: "#020617",
  surface: "rgba(15, 23, 42, 0.6)",
  border: "rgba(56, 189, 248, 0.15)",
  accent: "#38bdf8",
  accentGlow: "rgba(56, 189, 248, 0.4)",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  success: "#34d399",
  warning: "#fbbf24"
};

const INGESTION_SOURCES = [
  { name: "PubMed Central", type: "Literature", count: "35M+ Articles", status: "Syncing", icon: FileText, color: "#38bdf8" },
  { name: "MIMIC-IV", type: "EHR Data", count: "300K+ Patients", status: "Connected", icon: Activity, color: "#fbbf24" },
  { name: "ClinVar", type: "Genomics", count: "2.5M+ Variants", status: "Indexed", icon: Cpu, color: "#a78bfa" }
];

const ONTOLOGIES = [
  { name: "UMLS", desc: "Unified Medical Language System", coverage: "100%", color: "#38bdf8" },
  { name: "MeSH", desc: "Medical Subject Headings", coverage: "100%", color: "#34d399" },
  { name: "HPO", desc: "Human Phenotype Ontology", coverage: "98%", color: "#f472b6" },
  { name: "SNOMED CT", desc: "Systematized Nomenclature", coverage: "95%", color: "#fbbf24" }
];

export default function FoundationDashboard() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, sans-serif", padding: "40px" }}>
      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: "transparent", border: `1px solid ${C.border}`, color: C.accent,
            padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
            fontSize: "14px", fontWeight: "600", transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(56, 189, 248, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          ← BACK TO HOME
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <ShieldCheck size={20} color={C.success} />
          <span style={{ fontSize: "14px", color: C.success, letterSpacing: "1px" }}>HIPAA/FHIR COMPLIANT</span>
        </div>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "60px" }}>
        <h1 style={{ fontSize: "42px", fontWeight: "800", marginBottom: "16px", background: "linear-gradient(to right, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Data Ingestion & Ontology Foundation
        </h1>
        <p style={{ color: C.textMuted, fontSize: "18px", maxWidth: "800px", margin: "0 auto" }}>
          Real-time visualization of the Bioquora ETL pipeline mapping raw clinical and molecular data into unified semantic standards.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Left Column: Sources & Infrastructure */}
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          
          {/* Data Sources */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "30px", backdropFilter: "blur(12px)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
              <Database color={C.accent} /> Raw Data Sources
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {INGESTION_SOURCES.map((src, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: `1px solid rgba(255,255,255,0.05)` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ padding: "10px", background: `${src.color}20`, borderRadius: "10px", color: src.color }}>
                      <src.icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "16px" }}>{src.name}</div>
                      <div style={{ fontSize: "12px", color: C.textMuted }}>{src.type}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700" }}>{src.count}</div>
                    <div style={{ fontSize: "12px", color: src.status === "Syncing" ? C.accent : C.success }}>{src.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "30px", backdropFilter: "blur(12px)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
              <Server color="#a78bfa" /> Infrastructure & Standards
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ padding: "20px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: "1px solid rgba(167, 139, 250, 0.2)" }}>
                <div style={{ fontSize: "12px", color: C.textMuted, marginBottom: "8px" }}>DATA SCHEMA</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#a78bfa" }}>OMOP CDM</div>
              </div>
              <div style={{ padding: "20px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: "1px solid rgba(167, 139, 250, 0.2)" }}>
                <div style={{ fontSize: "12px", color: C.textMuted, marginBottom: "8px" }}>STORAGE</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#a78bfa" }}>PostgreSQL</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Pipeline Simulator & Ontologies */}
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          
          {/* Pipeline Animation */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "30px", backdropFilter: "blur(12px)", position: "relative", overflow: "hidden" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px" }}>
              <Network color={C.success} /> Normalization Pipeline
            </h2>
            
            <div style={{ position: "relative", height: "150px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {/* Nodes */}
              <div style={{ zIndex: 2, padding: "16px", background: activeStep === 0 ? `${C.accent}40` : "rgba(0,0,0,0.5)", border: `2px solid ${activeStep === 0 ? C.accent : '#333'}`, borderRadius: "12px", transition: "all 0.3s", width: "120px", textAlign: "center" }}>
                Raw Data
              </div>
              <ArrowRight color={activeStep === 1 ? C.accent : '#333'} size={24} style={{ transition: "all 0.3s" }} />
              <div style={{ zIndex: 2, padding: "16px", background: activeStep === 2 ? `${C.warning}40` : "rgba(0,0,0,0.5)", border: `2px solid ${activeStep === 2 ? C.warning : '#333'}`, borderRadius: "12px", transition: "all 0.3s", width: "120px", textAlign: "center" }}>
                NLP Entity Linking
              </div>
              <ArrowRight color={activeStep === 3 ? C.accent : '#333'} size={24} style={{ transition: "all 0.3s" }} />
              <div style={{ zIndex: 2, padding: "16px", background: activeStep === 0 ? `${C.success}40` : "rgba(0,0,0,0.5)", border: `2px solid ${activeStep === 0 ? C.success : '#333'}`, borderRadius: "12px", transition: "all 0.3s", width: "120px", textAlign: "center" }}>
                Unified Namespace
              </div>
            </div>
            
            <div style={{ textAlign: "center", fontSize: "14px", color: C.textMuted, marginTop: "16px" }}>
              {activeStep === 0 && "Fetching batched literature and EHR records..."}
              {activeStep === 1 && "Cleaning and validating schema..."}
              {activeStep === 2 && "scispaCy parsing named entities..."}
              {activeStep === 3 && "Resolving identifiers to UMLS CUI..."}
            </div>
          </div>

          {/* Ontologies */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "30px", backdropFilter: "blur(12px)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "24px" }}>Controlled Vocabularies</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {ONTOLOGIES.map((ont, i) => (
                <div key={i} style={{ padding: "16px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: `1px solid ${ont.color}30`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, height: "4px", width: ont.coverage, background: ont.color }} />
                  <div style={{ fontSize: "16px", fontWeight: "700", color: ont.color, marginBottom: "4px", marginTop: "8px" }}>{ont.name}</div>
                  <div style={{ fontSize: "12px", color: C.textMuted }}>{ont.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
