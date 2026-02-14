// Physiological calculations based on real hemodynamic formulas

export interface HemodynamicInputs {
  preload: number; // 0-30 mmHg (LVEDP/CVP)
  svr: number; // 500-2500 dynes·s·cm⁻⁵
  heartRate: number; // 40-180 bpm
  contractility: number; // 0.5-2.0 (multiplier)
}

export interface HemodynamicOutputs {
  strokeVolume: number; // mL
  cardiacOutput: number; // L/min
  map: number; // mmHg
  oxygenDelivery: number; // mL/min
  svr: number; // dynes·s·cm⁻⁵
  interpretation: string;
  warnings: string[];
}

// Frank-Starling curve - stroke volume as function of preload
// SV increases with preload but plateaus (diminishing returns)
function calculateStrokeVolume(
  preload: number,
  contractility: number,
  svr: number
): number {
  // Base SV using modified Frank-Starling relationship
  // SV = SVmax * (1 - e^(-k * preload))
  const svMax = 120 * contractility; // Maximum SV with normal contractility ~120mL
  const k = 0.15; // Rate constant for curve shape
  
  // Afterload effect - higher SVR reduces SV
  const afterloadFactor = 1 - (svr - 1000) / 5000; // Normalized around 1000
  const clampedAfterloadFactor = Math.max(0.5, Math.min(1.2, afterloadFactor));
  
  const baseSV = svMax * (1 - Math.exp(-k * preload));
  const adjustedSV = baseSV * clampedAfterloadFactor;
  
  return Math.max(20, Math.min(150, adjustedSV));
}

// Cardiac Output = SV × HR
function calculateCardiacOutput(strokeVolume: number, heartRate: number): number {
  return (strokeVolume * heartRate) / 1000; // Convert to L/min
}

// MAP = (CO × SVR / 80) + CVP
// Using simplified formula: MAP ≈ DBP + 1/3(SBP - DBP) ≈ CO × SVR / 80
function calculateMAP(cardiacOutput: number, svr: number, preload: number): number {
  // CO in L/min, SVR in dynes·s·cm⁻⁵
  // MAP = (CO × SVR) / 80 + CVP
  const cvp = preload * 0.3; // Approximate CVP from preload
  const map = (cardiacOutput * svr) / 80 + cvp;
  return Math.max(40, Math.min(180, map));
}

// DO2 = CO × CaO2
// CaO2 = (Hb × 1.34 × SaO2) + (0.003 × PaO2)
// Assuming normal Hb (14), SaO2 (98%), PaO2 (95)
function calculateOxygenDelivery(cardiacOutput: number): number {
  const hb = 14; // g/dL
  const sao2 = 0.98; // 98%
  const pao2 = 95; // mmHg
  
  const cao2 = (hb * 1.34 * sao2) + (0.003 * pao2); // ~18.6 mL O2/dL
  const do2 = cardiacOutput * cao2 * 10; // Convert to mL/min
  
  return Math.round(do2);
}

// Generate clinical interpretation based on values
function generateInterpretation(
  inputs: HemodynamicInputs,
  outputs: Omit<HemodynamicOutputs, 'interpretation' | 'warnings'>
): { interpretation: string; warnings: string[] } {
  const warnings: string[] = [];
  let interpretation = "";

  // Check for critical values
  if (outputs.map < 65) {
    warnings.push("MAP below 65 mmHg - inadequate organ perfusion");
  } else if (outputs.map > 110) {
    warnings.push("MAP elevated - consider afterload reduction");
  }

  if (outputs.cardiacOutput < 4) {
    warnings.push("Cardiac output reduced - tissue hypoperfusion risk");
  }

  if (outputs.oxygenDelivery < 800) {
    warnings.push("DO₂ critically low - tissue hypoxia likely");
  }

  // Generate interpretation based on current state
  if (inputs.preload < 8) {
    interpretation = "Low preload state. Stroke volume is preload-dependent — fluid resuscitation would increase CO.";
  } else if (inputs.preload > 18) {
    interpretation = "Elevated preload. Operating on the flat portion of the Frank-Starling curve — additional fluid unlikely to improve SV.";
  } else if (inputs.svr > 1800) {
    interpretation = "High afterload state. Elevated SVR is limiting stroke volume and increasing myocardial work.";
  } else if (inputs.svr < 700) {
    interpretation = "Low SVR state (vasodilatory). MAP maintained by cardiac output compensation.";
  } else if (inputs.contractility < 0.7) {
    interpretation = "Reduced contractility. The heart is generating less force per preload — consider inotropic support.";
  } else if (inputs.heartRate > 120) {
    interpretation = "Tachycardia. While CO increases with HR, diastolic filling time decreases at very high rates.";
  } else if (inputs.heartRate < 50) {
    interpretation = "Bradycardia. Cardiac output is rate-limited despite adequate stroke volume.";
  } else {
    interpretation = "Hemodynamic parameters within physiological range. The system is in a balanced state.";
  }

  return { interpretation, warnings };
}

export function calculateHemodynamics(inputs: HemodynamicInputs): HemodynamicOutputs {
  const strokeVolume = calculateStrokeVolume(inputs.preload, inputs.contractility, inputs.svr);
  const cardiacOutput = calculateCardiacOutput(strokeVolume, inputs.heartRate);
  const map = calculateMAP(cardiacOutput, inputs.svr, inputs.preload);
  const oxygenDelivery = calculateOxygenDelivery(cardiacOutput);
  
  const { interpretation, warnings } = generateInterpretation(inputs, {
    strokeVolume,
    cardiacOutput,
    map,
    oxygenDelivery,
    svr: inputs.svr,
  });

  return {
    strokeVolume: Math.round(strokeVolume),
    cardiacOutput: Math.round(cardiacOutput * 10) / 10,
    map: Math.round(map),
    oxygenDelivery,
    svr: inputs.svr,
    interpretation,
    warnings,
  };
}

// Generate data points for Frank-Starling curve visualization
export function generateFrankStarlingCurve(
  contractility: number,
  svr: number
): { preload: number; strokeVolume: number }[] {
  const points: { preload: number; strokeVolume: number }[] = [];
  
  for (let preload = 0; preload <= 30; preload += 1) {
    const sv = calculateStrokeVolume(preload, contractility, svr);
    points.push({ preload, strokeVolume: sv });
  }
  
  return points;
}

// Get status level for a value
export function getValueStatus(
  type: 'map' | 'co' | 'do2',
  value: number
): 'normal' | 'warning' | 'critical' {
  switch (type) {
    case 'map':
      if (value < 60 || value > 120) return 'critical';
      if (value < 65 || value > 110) return 'warning';
      return 'normal';
    case 'co':
      if (value < 3) return 'critical';
      if (value < 4) return 'warning';
      return 'normal';
    case 'do2':
      if (value < 700) return 'critical';
      if (value < 900) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}
