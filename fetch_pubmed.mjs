import fs from 'fs';
import path from 'path';

async function fetchPubMed() {
  try {
    const url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=40199464&retmode=xml";
    const res = await fetch(url);
    const text = await res.text();
    fs.writeFileSync(path.join(process.cwd(), 'pubmed_40199464.xml'), text);
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}

fetchPubMed();
