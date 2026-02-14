import React from 'react';
import SystemsEssay from '../SystemsEssay';

const AcidBaseIntegration: React.FC = () => {
  const sections = [
    {
      title: "The Three Controllers",
      content: "Acid-base homeostasis depends on three systems operating on different timescales. The chemical buffer systems (bicarbonate, phosphate, proteins) respond instantaneously but have limited capacity. The lungs adjust CO₂ within minutes to hours. The kidneys regulate bicarbonate and excrete fixed acids over hours to days. Understanding these timescales is essential for interpreting blood gases and predicting compensation.",
      keyPoints: [
        "Buffers: Instant response, limited capacity",
        "Lungs: Minutes to hours, adjusts PaCO₂",
        "Kidneys: Hours to days, adjusts HCO₃⁻ and NH₄⁺ excretion",
        "Compensation is never complete - pH moves toward but doesn't reach normal"
      ]
    },
    {
      title: "The Bicarbonate-CO₂ System",
      content: "The Henderson-Hasselbalch equation (pH = 6.1 + log[HCO₃⁻]/[0.03 × PaCO₂]) reveals that pH depends on the ratio of bicarbonate to dissolved CO₂. The lungs control the denominator; the kidneys control the numerator. This explains compensation: respiratory acidosis triggers renal bicarbonate retention to maintain the ratio. It also explains why you cannot fully compensate without external intervention.",
      keyPoints: [
        "Normal ratio HCO₃⁻:H₂CO₃ is 20:1, maintaining pH 7.4",
        "Changing one component without the other dramatically shifts pH",
        "The respiratory system has limits (PaCO₂ rarely < 10 or > 80 mmHg)",
        "Renal compensation takes 3-5 days to maximize"
      ],
      clinicalPearl: "Expected compensation formulas are your friends: In metabolic acidosis, expected PaCO₂ = 1.5 × HCO₃⁻ + 8 (±2). If actual PaCO₂ differs, there's a second disorder."
    },
    {
      title: "Anion Gap: The Detective's Tool",
      content: "The anion gap (Na⁺ - Cl⁻ - HCO₃⁻) reveals unmeasured anions. A normal gap of 8-12 mEq/L represents albumin and other proteins. An elevated gap signals accumulation of organic acids: lactate in sepsis or hypoperfusion, ketoacids in DKA, uremic toxins in renal failure, or ingested toxins. The mnemonic MUDPILES captures common causes, but the pathophysiology is more illuminating.",
      keyPoints: [
        "Each mEq/L of unmeasured acid consumes one HCO₃⁻",
        "Correct AG for hypoalbuminemia: add 2.5 for each 1 g/dL below 4",
        "Delta-delta ratio detects concurrent non-AG acidosis or metabolic alkalosis",
        "Osmolar gap helps identify toxic alcohols"
      ],
      clinicalPearl: "An anion gap of 24 with bicarbonate of 18 (delta AG = 12, delta HCO₃⁻ = 6) suggests concomitant metabolic alkalosis - common in vomiting DKA patients."
    },
    {
      title: "Strong Ion Difference",
      content: "The Stewart approach offers an alternative framework. pH is determined by PaCO₂, total weak acids (mainly albumin), and the strong ion difference (SID) - the difference between strong cations and anions. Traditional bicarbonate-centered analysis and Stewart analysis reach the same conclusions but provide different insights. Stewart explains why saline causes acidosis (chloride lowers SID) and why albumin matters.",
      keyPoints: [
        "SID = (Na⁺ + K⁺ + Ca²⁺ + Mg²⁺) - (Cl⁻ + lactate⁻ + other strong anions)",
        "Normal SID ≈ 40 mEq/L maintains normal pH",
        "Hyperchloremia from saline reduces SID → acidosis",
        "Hypoalbuminemia reduces weak acids → relative alkalosis"
      ]
    },
    {
      title: "Clinical Integration",
      content: "Interpreting a blood gas requires systematic analysis. First, assess the pH: is it acidemic or alkalemic? Second, identify the primary disorder from PaCO₂ and HCO₃⁻. Third, calculate expected compensation - discrepancy indicates a mixed disorder. Fourth, check the anion gap. Fifth, if elevated, calculate the delta-delta. This algorithm catches complex triple disorders that casual inspection misses.",
      keyPoints: [
        "Systematic approach prevents missing mixed disorders",
        "The patient's history guides interpretation (DKA vs. renal failure vs. toxin)",
        "Trends matter more than single values",
        "Treatment targets the underlying cause, not just the pH"
      ],
      clinicalPearl: "A pH of 7.40 with abnormal PaCO₂ and HCO₃⁻ is not normal - it's a perfectly compensated mixed disorder or two opposing processes. The clinical context determines which."
    }
  ];

  return (
    <SystemsEssay
      title="Acid-Base Integration"
      subtitle="How lungs, kidneys, and buffers maintain pH homeostasis"
      sections={sections}
      relatedTopics={[
        "Frank-Starling Mechanism",
        "Renal Tubular Acidosis",
        "Diabetic Ketoacidosis",
        "Respiratory Failure",
        "Lactic Acidosis",
        "Stewart Approach"
      ]}
    />
  );
};

export default AcidBaseIntegration;
