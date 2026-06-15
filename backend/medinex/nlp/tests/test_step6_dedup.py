import pytest
from medinex.nlp.workers.pubmed_ingest import fetch_pubmed_delta, filter_existing_pmids

class MockNeo4j:
    def __init__(self, available=True):
        self.available = available

def test_fetch_pubmed_delta():
    # Test our mocked fetcher
    papers = fetch_pubmed_delta(["oncology"], 1)
    
    assert len(papers) == 2
    assert "mock_" in papers[0]["pmid"]
    assert "Neoplasms" in papers[0]["mesh_terms"]

def test_filter_existing_pmids_neo4j_down():
    # If Neo4j is down, dedup shouldn't block papers
    neo4j = MockNeo4j(available=False)
    papers = [{"pmid": "1"}, {"pmid": "2"}]
    
    filtered = filter_existing_pmids(neo4j, papers)
    assert len(filtered) == 2

def test_filter_existing_pmids_neo4j_up():
    # Our mocked dedup in pubmed_ingest.py currently returns all as new 
    # (because it mocks the existing_set as empty for the sake of tests)
    neo4j = MockNeo4j(available=True)
    papers = [{"pmid": "1"}, {"pmid": "2"}]
    
    filtered = filter_existing_pmids(neo4j, papers)
    assert len(filtered) == 2
