import fs from 'fs';
import path from 'path';

async function fetchPMC() {
  try {
    const res = await fetch("https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/40199464/unicode");
    const data = await res.text();
    fs.writeFileSync(path.join(process.cwd(), 'pmc_40199464.txt'), data);
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}

fetchPMC();
