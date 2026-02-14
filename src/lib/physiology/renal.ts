// Renal Physiology Calculations

export interface RenalInputs {
  meanArterialPressure: number; // mmHg (60-140)
  afferentResistance: number; // relative units (0.5-2.0)
  efferentResistance: number; // relative units (0.5-2.0)
  plasmaProteinConcentration: number; // g/dL (5-9)
  tubularReabsorption: number; // percentage (95-99.5)
}

export interface RenalOutputs {
  renalBloodFlow: number; // mL/min
  glomerularFiltrationRate: number; // mL/min
  filtrationFraction: number; // percentage
  urineOutput: number; // mL/hr
  glomerularPressure: number; // mmHg
  netFiltrationPressure: number; // mmHg
  status: 'normal' | 'warning' | 'critical';
  warnings: string[];
}

// Constants
const NORMAL_RBF = 1200; // mL/min
const NORMAL_GFR = 120; // mL/min
const CAPSULAR_PRESSURE = 15; // mmHg (Bowman's capsule)
const ONCOTIC_COEFFICIENT = 3.5; // mmHg per g/dL protein

export function calculateRenalFunction(inputs: RenalInputs): RenalOutputs {
  const {
    meanArterialPressure,
    afferentResistance,
    efferentResistance,
    plasmaProteinConcentration,
    tubularReabsorption
  } = inputs;

  const warnings: string[] = [];
  
  // Autoregulation range: 80-180 mmHg
  const inAutoregRange = meanArterialPressure >= 80 && meanArterialPressure <= 180;
  
  // Calculate renal blood flow (affected by total resistance)
  const totalResistance = afferentResistance + efferentResistance;
  let rbfFactor = 1;
  
  if (inAutoregRange) {
    // Within autoregulation range, RBF relatively stable
    rbfFactor = 1 - (Math.abs(meanArterialPressure - 100) * 0.002);
  } else {
    // Outside autoregulation, RBF follows pressure
    rbfFactor = meanArterialPressure / 100;
  }
  
  const renalBloodFlow = Math.round(NORMAL_RBF * rbfFactor / totalResistance);
  
  // Glomerular capillary pressure
  // Higher afferent resistance = lower glomerular pressure
  // Higher efferent resistance = higher glomerular pressure
  const afferentEffect = 1 / afferentResistance;
  const efferentEffect = efferentResistance;
  const glomerularPressure = Math.round(
    meanArterialPressure * 0.6 * afferentEffect * Math.sqrt(efferentEffect)
  );
  
  // Oncotic pressure (opposes filtration)
  const oncoticPressure = plasmaProteinConcentration * ONCOTIC_COEFFICIENT;
  
  // Net filtration pressure
  const netFiltrationPressure = Math.round(
    glomerularPressure - CAPSULAR_PRESSURE - oncoticPressure
  );
  
  // GFR calculation (Kf * NFP, where Kf is filtration coefficient)
  const Kf = 12.5; // mL/min/mmHg (normal)
  let gfr = Math.max(0, Math.round(Kf * netFiltrationPressure * (renalBloodFlow / NORMAL_RBF)));
  
  // Clamp GFR to reasonable range
  gfr = Math.min(200, Math.max(0, gfr));
  
  // Filtration fraction
  const renalPlasmaFlow = renalBloodFlow * 0.55; // assuming 55% plasma
  const filtrationFraction = Math.round((gfr / renalPlasmaFlow) * 100);
  
  // Urine output (GFR minus reabsorption)
  const reabsorbedVolume = gfr * (tubularReabsorption / 100);
  const urineOutput = Math.round(((gfr - reabsorbedVolume) * 60) / 1000); // Convert to mL/hr
  
  // Status assessment
  let status: 'normal' | 'warning' | 'critical' = 'normal';
  
  if (gfr < 30) {
    status = 'critical';
    warnings.push('Severe reduction in GFR - Stage 4/5 CKD equivalent');
  } else if (gfr < 60) {
    status = 'warning';
    warnings.push('Moderate GFR reduction - Stage 3 CKD equivalent');
  }
  
  if (!inAutoregRange) {
    warnings.push(`MAP outside autoregulation range (80-180 mmHg)`);
    if (status === 'normal') status = 'warning';
  }
  
  if (filtrationFraction > 25) {
    warnings.push('Elevated filtration fraction - risk of medullary hypoxia');
  } else if (filtrationFraction < 15) {
    warnings.push('Low filtration fraction - impaired glomerular function');
  }
  
  if (urineOutput < 30) {
    warnings.push('Oliguria detected - monitor for acute kidney injury');
    if (status === 'normal') status = 'warning';
  } else if (urineOutput > 200) {
    warnings.push('Polyuria - consider diabetes insipidus or osmotic diuresis');
  }
  
  return {
    renalBloodFlow,
    glomerularFiltrationRate: gfr,
    filtrationFraction,
    urineOutput,
    glomerularPressure,
    netFiltrationPressure,
    status,
    warnings
  };
}

// Generate autoregulation curve data
export function generateAutoregulationCurve(
  afferentResistance: number,
  efferentResistance: number
): { map: number; rbf: number; gfr: number }[] {
  const data: { map: number; rbf: number; gfr: number }[] = [];
  
  for (let map = 40; map <= 200; map += 10) {
    const result = calculateRenalFunction({
      meanArterialPressure: map,
      afferentResistance,
      efferentResistance,
      plasmaProteinConcentration: 7,
      tubularReabsorption: 99
    });
    
    data.push({
      map,
      rbf: result.renalBloodFlow,
      gfr: result.glomerularFiltrationRate
    });
  }
  
  return data;
}

export function getRenalInterpretation(outputs: RenalOutputs): string {
  const { glomerularFiltrationRate, filtrationFraction, urineOutput, netFiltrationPressure } = outputs;
  
  const parts: string[] = [];
  
  if (glomerularFiltrationRate >= 90) {
    parts.push('GFR within normal limits');
  } else if (glomerularFiltrationRate >= 60) {
    parts.push('Mildly reduced GFR (CKD Stage 2)');
  } else if (glomerularFiltrationRate >= 30) {
    parts.push('Moderately reduced GFR (CKD Stage 3)');
  } else if (glomerularFiltrationRate >= 15) {
    parts.push('Severely reduced GFR (CKD Stage 4)');
  } else {
    parts.push('Kidney failure (CKD Stage 5)');
  }
  
  if (netFiltrationPressure < 5) {
    parts.push('Very low NFP limits filtration');
  } else if (netFiltrationPressure > 20) {
    parts.push('Elevated NFP may cause hyperfiltration injury');
  }
  
  if (filtrationFraction > 25) {
    parts.push('High FF suggests efferent constriction (e.g., angiotensin II effect)');
  } else if (filtrationFraction < 15) {
    parts.push('Low FF suggests afferent constriction or reduced plasma flow');
  }
  
  return parts.join('. ') + '.';
}
