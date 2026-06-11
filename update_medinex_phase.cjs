const fs = require('fs');

let content = fs.readFileSync('src/pages/MedinexPhase.tsx', 'utf8');

// We need to inject state for activePhaseTab
content = content.replace(
  'const [activeTab, setActiveTabState]      = useState("tasks"); // "tasks" | "code"',
  `const [activeTab, setActiveTabState]      = useState("tasks"); // "tasks" | "code"\n  const [activePhaseTab, setActivePhaseTab] = useState(0);`
);

// We need to modify the footer map to make it clickable
content = content.replace(
  /\{\[\s*\{\s*label:\s*"Phase 0"[\s\S]*?\}\)\}/m,
  `{[ 
              { label: "Phase 0", sub: "Biomedical Intelligence Layer", color: "#00d4ff", active: true },
              { label: "Phase 1", sub: "Multi-Omics & Genomics", color: "#a78bfa", active: true },
              { label: "Phase 2", sub: "Imaging & Drug Discovery", color: "#34d399", active: true },
              { label: "Phase 3", sub: "Regulatory & Deployment", color: "#fbbf24", active: false },
            ].map((p, i) => (
              <div 
                key={p.label} 
                onClick={() => setActivePhaseTab(i)}
                style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              >
                <div style={{
                  padding: "10px 20px",
                  background: p.active || activePhaseTab === i ? \`rgba(\${hexToRgb(p.color)},0.15)\` : "rgba(255,255,255,0.02)",
                  border: \`1px solid \${p.active || activePhaseTab === i ? p.color + "50" : "rgba(255,255,255,0.06)"}\`,
                  borderRadius: "10px",
                  textAlign: "left",
                  opacity: p.active ? 1 : 0.4,
                  boxShadow: activePhaseTab === i ? \`0 0 15px \${p.color}40\` : "none",
                  transform: activePhaseTab === i ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.2s ease"
                }}>
                  <div style={{ fontSize: "11px", color: p.color, fontWeight: 700, marginBottom: "2px" }}>{p.label}</div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{p.sub}</div>
                </div>
                {i < 3 && <span style={{ color: "#1e3a4a", fontSize: "20px" }}>→</span>}
              </div>
            ))}`
);

// We need to filter the steps based on activePhaseTab.
// Currently all steps are in the 'steps' array. We can assign a 'phase' property to each step.
// Let's replace the `steps.map` with `steps.filter(s => (s.phase || 0) === activePhaseTab).map`
content = content.replace(
  'steps.map((s, i) => {',
  'steps.filter(s => (s.phase || 0) === activePhaseTab).map((s, idx) => {\n            const i = steps.findIndex(st => st.id === s.id);'
);

// Now we add the steps for Phase 1 and Phase 2 into the `steps` array.
// First remove the old 11 and 12 we added.
content = content.replace(
  /[\s]*\{\s*id:\s*11,\s*title:\s*"Phase 1: Clinical AI Integration"[\s\S]*?codeKey:\s*12,\s*\},/m,
  ''
);

// Add proper phase 1 and 2 steps
const newSteps = `
  {
    id: 11,
    phase: 1,
    title: "Bioinformatics Pipeline",
    subtitle: "Multi-Omics & Genomics",
    color: "#a78bfa",
    icon: "🧬",
    description: "Build robust bioinformatics pipelines for analysing large-scale multi-omics data.",
    resources: [],
    learn: ["Sequence Analysis", "Variant Calling", "Transcriptomics"],
    deliverable: "Automated Bioinformatics Pipeline",
    flow: ["Raw Data", "Pipeline", "Annotated Variants"],
  },
  {
    id: 12,
    phase: 1,
    title: "Genomics",
    subtitle: "Variant Analysis",
    color: "#a78bfa",
    icon: "🔬",
    description: "Analyse genomic variants and their implications in diseases.",
    resources: [],
    learn: ["GWAS", "Variant Effect Prediction", "Population Genetics"],
    deliverable: "Genomic Variant Database",
    flow: null,
  },
  {
    id: 13,
    phase: 1,
    title: "Proteomics",
    subtitle: "Protein Structures",
    color: "#a78bfa",
    icon: "🧪",
    description: "Integrate protein structure and interaction data into the knowledge graph.",
    resources: [],
    learn: ["AlphaFold", "Protein-Protein Interactions", "Mass Spectrometry"],
    deliverable: "Proteomics Data Layer",
    flow: null,
  },
  {
    id: 14,
    phase: 2,
    title: "MONAI Framework",
    subtitle: "Medical Imaging",
    color: "#34d399",
    icon: "🖼️",
    description: "Implement MONAI for deep learning in medical imaging.",
    resources: [],
    learn: ["Medical Image Segmentation", "Classification", "MONAI"],
    deliverable: "Imaging AI Models",
    flow: ["Images", "MONAI", "Predictions"],
  },
  {
    id: 15,
    phase: 2,
    title: "SimpleITK",
    subtitle: "Image Processing",
    color: "#34d399",
    icon: "⚙️",
    description: "Use SimpleITK for robust medical image processing and registration.",
    resources: [],
    learn: ["Image Registration", "Filtering", "Segmentation"],
    deliverable: "Image Processing Pipeline",
    flow: null,
  },
  {
    id: 16,
    phase: 2,
    title: "DeepChem",
    subtitle: "Drug Discovery",
    color: "#34d399",
    icon: "💊",
    description: "Leverage DeepChem for virtual screening and drug discovery.",
    resources: [],
    learn: ["Molecular Fingerprints", "GNNs", "Virtual Screening"],
    deliverable: "Drug Discovery Engine",
    flow: ["Molecules", "DeepChem", "Hit Compounds"],
  }
`;

// Insert the new steps at the end of the steps array
content = content.replace(
  '    codeKey: 10,\n  },',
  '    codeKey: 10,\n  },' + newSteps
);

fs.writeFileSync('src/pages/MedinexPhase.tsx', content, 'utf8');
console.log("Successfully updated MedinexPhase.tsx with phase tabs and new steps.");
