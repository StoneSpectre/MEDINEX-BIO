export interface ClinicalTrial {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  conditions: string;
}

const BASE_URL = 'https://clinicaltrials.gov/api/v2/studies';

/**
 * Searches ClinicalTrials.gov for the given condition/query.
 */
export async function searchClinicalTrials(query: string, maxResults: number = 4): Promise<ClinicalTrial[]> {
  try {
    const searchUrl = `${BASE_URL}?query.cond=${encodeURIComponent(query)}&pageSize=${maxResults}`;
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error('Failed to fetch from ClinicalTrials.gov');
    
    const data = await response.json();
    const studies = data.studies || [];
    
    return studies.map((study: any) => {
      const protocol = study.protocolSection || {};
      const idModule = protocol.identificationModule || {};
      const statusModule = protocol.statusModule || {};
      const designModule = protocol.designModule || {};
      const conditionsModule = protocol.conditionsModule || {};
      
      const phases = designModule.phases || [];
      const phaseStr = phases.length > 0 ? phases.join(', ') : 'Not Specified';
      
      const conditions = conditionsModule.conditions || [];
      const conditionStr = conditions.length > 0 ? conditions.join(', ') : 'Unknown Condition';
      
      return {
        nctId: idModule.nctId || 'Unknown ID',
        title: idModule.briefTitle || idModule.officialTitle || 'No Title',
        status: statusModule.overallStatus || 'Unknown Status',
        phase: phaseStr,
        conditions: conditionStr,
      };
    });
  } catch (error) {
    console.error("ClinicalTrials Search Error:", error);
    return [];
  }
}
