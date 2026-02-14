// Immunology & Cytokine Cascade Calculations

export interface CytokineState {
  tnfAlpha: number; // pg/mL (0-100)
  il1: number; // pg/mL (0-50)
  il6: number; // pg/mL (0-100)
  il10: number; // pg/mL (0-50) - anti-inflammatory
  interferonGamma: number; // pg/mL (0-50)
}

export interface ImmuneInputs {
  pathogenLoad: number; // arbitrary units (0-100)
  macrophageActivity: number; // percentage (0-100)
  tCellCount: number; // cells/μL (500-2000)
  time: number; // hours since infection (0-72)
}

export interface ImmuneOutputs {
  cytokines: CytokineState;
  inflammationIndex: number; // 0-100
  immuneResponse: 'insufficient' | 'appropriate' | 'excessive';
  sirsRisk: boolean;
  tissuesDamageRisk: number; // 0-100
  status: 'normal' | 'warning' | 'critical';
  warnings: string[];
  phase: 'innate' | 'transition' | 'adaptive';
}

export function simulateCytokineResponse(inputs: ImmuneInputs): ImmuneOutputs {
  const { pathogenLoad, macrophageActivity, tCellCount, time } = inputs;
  const warnings: string[] = [];
  
  // Phase determination
  let phase: 'innate' | 'transition' | 'adaptive' = 'innate';
  if (time > 72) {
    phase = 'adaptive';
  } else if (time > 24) {
    phase = 'transition';
  }
  
  // TNF-α: Early response, peaks at 1-2 hours
  const tnfPeak = pathogenLoad * macrophageActivity / 100;
  const tnfDecay = Math.exp(-time / 6);
  const tnfAlpha = Math.round(tnfPeak * (1 - Math.exp(-time / 2)) * (time < 6 ? 1 : tnfDecay) * 10) / 10;
  
  // IL-1: Follows TNF-α, peaks at 2-4 hours
  const il1Peak = tnfAlpha * 0.6;
  const il1Delay = Math.max(0, 1 - Math.exp(-(time - 1) / 3));
  const il1 = Math.round(il1Peak * il1Delay * 10) / 10;
  
  // IL-6: Peaks at 4-8 hours, more sustained
  const il6Peak = (pathogenLoad * 0.8 + tnfAlpha * 0.3) * macrophageActivity / 100;
  const il6Delay = Math.max(0, 1 - Math.exp(-(time - 2) / 5));
  const il6Decay = time > 12 ? Math.exp(-(time - 12) / 24) : 1;
  const il6 = Math.round(il6Peak * il6Delay * il6Decay * 10) / 10;
  
  // IFN-γ: T-cell mediated, peaks later (12-24 hours)
  const tCellFactor = tCellCount / 1000;
  const ifnDelay = Math.max(0, 1 - Math.exp(-(time - 6) / 8));
  const interferonGamma = Math.round(pathogenLoad * 0.4 * tCellFactor * ifnDelay * 10) / 10;
  
  // IL-10: Anti-inflammatory, peaks after pro-inflammatory
  const antiInflammatoryDelay = Math.max(0, 1 - Math.exp(-(time - 4) / 6));
  const il10 = Math.round((tnfAlpha + il6) * 0.3 * antiInflammatoryDelay * 10) / 10;
  
  const cytokines: CytokineState = {
    tnfAlpha,
    il1,
    il6,
    il10,
    interferonGamma
  };
  
  // Inflammation index (weighted sum of pro-inflammatory minus anti-inflammatory)
  const proInflammatory = tnfAlpha + il1 * 1.5 + il6 + interferonGamma * 0.5;
  const antiInflammatory = il10 * 2;
  const inflammationIndex = Math.min(100, Math.max(0, Math.round(proInflammatory - antiInflammatory)));
  
  // Immune response classification
  let immuneResponse: 'insufficient' | 'appropriate' | 'excessive' = 'appropriate';
  if (inflammationIndex < 20 && pathogenLoad > 30) {
    immuneResponse = 'insufficient';
  } else if (inflammationIndex > 60) {
    immuneResponse = 'excessive';
  }
  
  // SIRS risk (systemic inflammatory response syndrome)
  const sirsRisk = il6 > 50 || tnfAlpha > 40 || inflammationIndex > 70;
  
  // Tissue damage risk
  const tissuesDamageRisk = Math.min(100, Math.round(
    (tnfAlpha * 1.2 + il1 * 1.5 - il10) * (time > 24 ? 1.5 : 1)
  ));
  
  // Status and warnings
  let status: 'normal' | 'warning' | 'critical' = 'normal';
  
  if (sirsRisk) {
    warnings.push('Risk of SIRS/Cytokine Storm');
    status = 'critical';
  }
  
  if (tissuesDamageRisk > 60) {
    warnings.push('High tissue damage risk from prolonged inflammation');
    if (status === 'normal') status = 'warning';
  }
  
  if (immuneResponse === 'insufficient') {
    warnings.push('Insufficient immune response - risk of uncontrolled infection');
    if (status === 'normal') status = 'warning';
  }
  
  if (tCellCount < 500) {
    warnings.push('Lymphopenia - impaired adaptive immunity');
    if (status === 'normal') status = 'warning';
  }
  
  if (il10 > 30 && inflammationIndex < 20) {
    warnings.push('Immunosuppressive state - anti-inflammatory dominance');
  }
  
  return {
    cytokines,
    inflammationIndex,
    immuneResponse,
    sirsRisk,
    tissuesDamageRisk,
    status,
    warnings,
    phase
  };
}

// Generate cytokine cascade timeline
export function generateCytokineTimeline(
  pathogenLoad: number,
  macrophageActivity: number,
  tCellCount: number
): { time: number; tnf: number; il1: number; il6: number; il10: number; ifn: number }[] {
  const data: { time: number; tnf: number; il1: number; il6: number; il10: number; ifn: number }[] = [];
  
  for (let t = 0; t <= 72; t += 2) {
    const result = simulateCytokineResponse({
      pathogenLoad,
      macrophageActivity,
      tCellCount,
      time: t
    });
    
    data.push({
      time: t,
      tnf: result.cytokines.tnfAlpha,
      il1: result.cytokines.il1,
      il6: result.cytokines.il6,
      il10: result.cytokines.il10,
      ifn: result.cytokines.interferonGamma
    });
  }
  
  return data;
}

export function getImmuneInterpretation(outputs: ImmuneOutputs): string {
  const { phase, immuneResponse, inflammationIndex, sirsRisk, tissuesDamageRisk } = outputs;
  
  const parts: string[] = [];
  
  parts.push(`Currently in ${phase} immune phase`);
  
  if (immuneResponse === 'appropriate') {
    parts.push('Immune response magnitude is proportionate to pathogen load');
  } else if (immuneResponse === 'excessive') {
    parts.push('Hyperinflammatory state with risk of collateral tissue damage');
  } else {
    parts.push('Inadequate immune activation - consider immunodeficiency or pathogen evasion');
  }
  
  if (sirsRisk) {
    parts.push('Pattern consistent with systemic inflammatory response');
  }
  
  if (tissuesDamageRisk > 40) {
    parts.push(`Tissue damage risk ${tissuesDamageRisk}% - consider anti-inflammatory intervention`);
  }
  
  return parts.join('. ') + '.';
}
