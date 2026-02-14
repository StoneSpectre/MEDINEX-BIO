import React from 'react';
import SystemsEssay from '../SystemsEssay';

const CardiorenalSyndrome: React.FC = () => {
  const sections = [
    {
      title: "The Bidirectional Relationship",
      content: "The heart and kidneys exist in a delicate feedback loop. Cardiac output determines renal perfusion, while renal function regulates volume status and afterload. When one organ fails, the other invariably suffers. This bidirectional relationship defines the cardiorenal syndromes - five distinct phenotypes unified by the principle that you cannot treat one organ in isolation.",
      keyPoints: [
        "Type 1: Acute heart failure → Acute kidney injury",
        "Type 2: Chronic heart failure → Progressive CKD",
        "Type 3: Acute kidney injury → Acute cardiac dysfunction",
        "Type 4: CKD → Chronic cardiac disease",
        "Type 5: Systemic conditions affecting both simultaneously"
      ]
    },
    {
      title: "Hemodynamic Mechanisms",
      content: "The hemodynamic hypothesis centers on renal perfusion pressure. As cardiac output falls, the kidneys receive less blood flow. However, the story is more nuanced than simple hypoperfusion. Elevated central venous pressure transmits backward to the renal veins, creating renal congestion that may be equally or more important than arterial underfilling. This explains why diuresis can sometimes improve renal function in heart failure - by relieving venous congestion.",
      keyPoints: [
        "Renal blood flow is determined by both arterial pressure and venous pressure",
        "Renal perfusion pressure = MAP - CVP",
        "Venous congestion can impair GFR even with preserved cardiac output",
        "Intra-abdominal pressure from ascites adds another layer of complexity"
      ],
      clinicalPearl: "When a heart failure patient's creatinine rises during diuresis, consider whether it's from over-diuresis (rising BUN:Cr ratio) or inadequate diuresis (persistent congestion). The treatment is opposite."
    },
    {
      title: "Neurohormonal Activation",
      content: "Beyond hemodynamics, both organs communicate through shared neurohormonal pathways. The kidneys sense hypoperfusion and activate the renin-angiotensin-aldosterone system. While this maintains GFR short-term through efferent arteriolar constriction, chronic RAAS activation drives cardiac remodeling, sodium retention, and progressive fibrosis in both organs. Sympathetic nervous system activation adds to this maladaptive cycle, promoting vasoconstriction and direct cardiac toxicity.",
      keyPoints: [
        "RAAS activation is initially compensatory but becomes pathological",
        "Angiotensin II causes cardiac hypertrophy and renal fibrosis",
        "Aldosterone promotes inflammation and fibrosis in both organs",
        "Sympathetic overdrive contributes to arrhythmias and vasoconstriction"
      ]
    },
    {
      title: "Inflammatory and Metabolic Crosstalk",
      content: "Both heart and kidney failure generate systemic inflammation. Uremic toxins accumulate as GFR falls, directly damaging the myocardium. Pro-inflammatory cytokines like IL-6 and TNF-α promote cardiac dysfunction and accelerate atherosclerosis. Iron deficiency - common in both conditions - impairs oxygen delivery and mitochondrial function. This creates a metabolic milieu hostile to both organs.",
      keyPoints: [
        "Uremic toxins (indoxyl sulfate, p-cresol) are directly cardiotoxic",
        "Inflammation accelerates atherosclerosis and cardiac remodeling",
        "Anemia worsens oxygen delivery to already-stressed organs",
        "Metabolic acidosis from CKD depresses cardiac contractility"
      ],
      clinicalPearl: "Check iron studies in all cardiorenal syndrome patients. IV iron can improve symptoms and reduce hospitalizations even without significant anemia."
    },
    {
      title: "Therapeutic Implications",
      content: "Treating cardiorenal syndrome requires systems thinking. SGLT2 inhibitors represent a breakthrough precisely because they address multiple pathways simultaneously - reducing preload, improving cardiac energetics, and providing direct renal protection. Similarly, RAAS blockade benefits both organs despite causing a transient GFR drop. The key insight is tolerating short-term renal function changes for long-term organ protection.",
      keyPoints: [
        "SGLT2 inhibitors benefit both heart and kidneys through multiple mechanisms",
        "Don't stop ACE-I/ARB for modest creatinine increases (up to 30%)",
        "Diuretics treat symptoms but don't modify disease",
        "Ultrafiltration may be needed when diuretic resistance develops"
      ],
      clinicalPearl: "A patient with CKD and heart failure should be on SGLT2 inhibitor, RAAS blocker, and MRA unless absolutely contraindicated. The survival benefit is cumulative."
    }
  ];

  return (
    <SystemsEssay
      title="Cardiorenal Syndrome"
      subtitle="Understanding the bidirectional relationship between heart and kidney failure"
      sections={sections}
      relatedTopics={[
        "Frank-Starling Mechanism",
        "RAAS Physiology",
        "Diuretic Resistance",
        "Renal Autoregulation",
        "SGLT2 Inhibitors"
      ]}
    />
  );
};

export default CardiorenalSyndrome;
