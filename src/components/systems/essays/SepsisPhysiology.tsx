import React from 'react';
import SystemsEssay from '../SystemsEssay';

const SepsisPhysiology: React.FC = () => {
  const sections = [
    {
      title: "The Inflammatory Cascade",
      content: "Sepsis begins when the immune system's response to infection becomes dysregulated. Pattern recognition receptors on immune cells detect pathogen-associated molecular patterns (PAMPs) and damage-associated molecular patterns (DAMPs), triggering a cytokine cascade. TNF-α and IL-1 initiate the response within minutes; IL-6 amplifies it over hours. This inflammatory surge, designed to contain infection, instead causes widespread endothelial damage and organ dysfunction.",
      keyPoints: [
        "Initial response: TNF-α and IL-1β released within 30-90 minutes",
        "Amplification: IL-6 peaks at 2-6 hours, correlates with severity",
        "Endothelial activation leads to increased permeability",
        "Complement activation and coagulation cascade follow"
      ]
    },
    {
      title: "Cardiovascular Collapse",
      content: "Septic shock represents a unique form of circulatory failure. Unlike cardiogenic or hypovolemic shock, the problem is distributive - blood is in the wrong place. Massive vasodilation from nitric oxide release drops systemic vascular resistance. The heart initially compensates with increased cardiac output, but myocardial depression from cytokines often follows. Microcirculatory dysfunction means that even if macro-hemodynamics are corrected, tissues may not receive oxygen.",
      keyPoints: [
        "SVR drops dramatically due to pathological vasodilation",
        "Cardiac output initially increases (hyperdynamic state)",
        "Septic cardiomyopathy develops in 40-60% of patients",
        "Microcirculatory shunting causes tissue hypoxia despite adequate MAP"
      ],
      clinicalPearl: "A normal lactate with persistent hypotension suggests pure vasodilatory shock. Persistent elevated lactate despite restored MAP suggests microcirculatory failure - consider tissue perfusion, not just blood pressure."
    },
    {
      title: "The Kidney in Sepsis",
      content: "Septic AKI differs fundamentally from traditional pre-renal azotemia. While hypovolemia plays a role early, the dominant mechanism is often renal vasoconstriction paradoxically occurring alongside systemic vasodilation. Inflammatory mediators directly damage tubular cells. Microcirculatory flow abnormalities create patchy ischemia. This explains why fluid resuscitation alone often fails to prevent or reverse septic AKI.",
      keyPoints: [
        "Renal blood flow may be normal or even increased in sepsis",
        "Intrarenal vasoconstriction creates relative ischemia",
        "Tubular epithelial cells undergo apoptosis and necrosis",
        "Recovery depends on tubular regeneration capacity"
      ],
      clinicalPearl: "Aggressive fluid resuscitation beyond initial stabilization may worsen septic AKI by causing renal venous congestion and compartment syndrome of the kidney."
    },
    {
      title: "Immunoparalysis",
      content: "The body's anti-inflammatory response to sepsis can become pathologically excessive. IL-10 and other regulatory cytokines suppress immune function, leading to immunoparalysis. Patients become susceptible to secondary infections - the leading cause of late sepsis deaths. This biphasic response explains why both anti-inflammatory and pro-inflammatory strategies have failed in clinical trials; the right intervention depends on timing.",
      keyPoints: [
        "Anti-inflammatory cytokines surge 24-72 hours into sepsis",
        "HLA-DR expression on monocytes indicates immune competence",
        "Secondary infections occur in 15-30% of ICU sepsis patients",
        "Immunoparalysis may persist for weeks after apparent recovery"
      ]
    },
    {
      title: "Therapeutic Integration",
      content: "Modern sepsis management integrates understanding across systems. Early antibiotics and source control address the inciting infection. Hemodynamic resuscitation targets macro-circulation, but we must monitor for fluid overload. Vasopressors restore SVR, but excessive doses suggest refractory shock requiring reassessment. The future may bring targeted immunomodulation based on individual inflammatory phenotypes.",
      keyPoints: [
        "Each hour of antibiotic delay increases mortality by 7-8%",
        "Initial crystalloid bolus (30 mL/kg) within first 3 hours",
        "Norepinephrine is first-line vasopressor (targets alpha-1 and beta-1)",
        "Hydrocortisone for vasopressor-dependent shock only"
      ],
      clinicalPearl: "The patient who remains hypotensive despite fluids and norepinephrine needs re-evaluation: Is the source controlled? Is there an additional diagnosis (hemorrhage, PE, tamponade)? Is this refractory distributive shock requiring alternative vasopressors?"
    }
  ];

  return (
    <SystemsEssay
      title="Sepsis Physiology"
      subtitle="From pathogen recognition to multi-organ dysfunction"
      sections={sections}
      relatedTopics={[
        "Frank-Starling Mechanism",
        "Cytokine Cascade",
        "Vasopressor Pharmacology",
        "Acute Kidney Injury",
        "Inflammatory Response",
        "Shock Phenotypes"
      ]}
    />
  );
};

export default SepsisPhysiology;
