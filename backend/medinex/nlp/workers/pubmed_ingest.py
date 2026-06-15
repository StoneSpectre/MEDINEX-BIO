import logging
import datetime
from typing import List, Dict

logger = logging.getLogger(__name__)

def fetch_pubmed_delta(domains: List[str] = None, days_back: int = 1) -> List[Dict]:
    """
    Mocks a call to NCBI E-utilities to fetch new papers matching disease domains.
    In production, this would use esearch.fcgi and efetch.fcgi to retrieve actual PMIDs and XML abstracts.
    """
    if domains is None:
        domains = ["oncology", "cardiology", "neurology", "immunology"]
        
    logger.info(f"Fetching PubMed delta for domains: {domains} over last {days_back} days")
    
    # Mocking E-utilities response
    mock_papers = [
        {
            "pmid": f"mock_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_01",
            "title": "A novel RCT for non-small cell lung cancer using Pembrolizumab.",
            "text": "Pembrolizumab treats non-small cell lung cancer. TP53 mutations were analyzed.",
            "mesh_terms": ["Randomized Controlled Trial", "Neoplasms", "Carcinoma, Non-Small-Cell Lung"],
            "source": "scheduler"
        },
        {
            "pmid": f"mock_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_02",
            "title": "Case report of Alzheimer's early onset.",
            "text": "We present a case of early onset Alzheimer's disease associated with APOE.",
            "mesh_terms": ["Case Report", "Alzheimer Disease"],
            "source": "scheduler"
        }
    ]
    return mock_papers

def filter_existing_pmids(neo4j_client, papers: List[Dict]) -> List[Dict]:
    """
    Checks Neo4j to deduplicate papers before processing so we don't re-run expensive NLP tasks.
    """
    if not neo4j_client or getattr(neo4j_client, 'available', False) is False:
        logger.warning("Neo4j not available, skipping deduplication.")
        return papers
        
    pmids = [p["pmid"] for p in papers if "pmid" in p]
    if not pmids:
        return papers
        
    # In production, this would execute:
    # MATCH (p:Paper) WHERE p.pmid IN $pmids RETURN p.pmid
    try:
        # We mock the response to assume none of the generated mock PMIDs exist yet
        existing_set = set()
        
        filtered_papers = [p for p in papers if p.get("pmid") not in existing_set]
        logger.info(f"Deduplication: {len(papers)} fetched -> {len(filtered_papers)} new")
        return filtered_papers
    except Exception as e:
        logger.error(f"Error deduplicating PMIDs: {e}")
        return papers
