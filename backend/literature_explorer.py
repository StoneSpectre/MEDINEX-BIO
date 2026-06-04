"""
MEDINEX — STEP 1: BIOMEDICAL KNOWLEDGE SOURCES
===============================================
Understand the structure of biomedical literature:
  - PubMed abstracts
  - Full-text (PMC)
  - Citations
  - MeSH Terms
  - Journal Structure
"""

import json
import time
import requests
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

DATA_DIR = Path(__file__).parent.parent / "data" / "pubmed"
DATA_DIR.mkdir(parents=True, exist_ok=True)

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
EMAIL = "medinex@example.com"  # Required by NCBI


# ─────────────────────────────────────────────
# 1A. FETCH A PUBMED ABSTRACT BY PMID
# ─────────────────────────────────────────────

def fetch_abstract(pmid: str) -> dict:
    """
    Fetch a single PubMed record and parse its structure.
    Returns a dict with: title, abstract, authors, journal,
    pub_date, mesh_terms, pmid, doi
    """
    url = f"{NCBI_BASE}/efetch.fcgi"
    params = {
        "db": "pubmed",
        "id": pmid,
        "retmode": "xml",
        "rettype": "abstract",
        "email": EMAIL,
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    return _parse_pubmed_xml(resp.text, pmid)


def _parse_pubmed_xml(xml_text: str, pmid: str) -> dict:
    """Parse PubMed XML into a clean structured dict."""
    root = ET.fromstring(xml_text)
    article = root.find(".//PubmedArticle")
    if article is None:
        return {"pmid": pmid, "error": "Article not found"}

    def text(path):
        el = article.find(path)
        return el.text.strip() if el is not None and el.text else ""

    # Title
    title = text(".//ArticleTitle")

    # Abstract (may have multiple sections)
    abstract_texts = []
    for ab in article.findall(".//AbstractText"):
        label = ab.get("Label", "")
        content = ab.text or ""
        abstract_texts.append(f"{label}: {content}".strip(": ") if label else content)
    abstract = " ".join(abstract_texts)

    # Authors
    authors = []
    for author in article.findall(".//Author"):
        last = text_of(author, "LastName")
        fore = text_of(author, "ForeName")
        if last:
            authors.append(f"{last}, {fore}".strip(", "))

    # Journal
    journal = text(".//Journal/Title")
    volume = text(".//Journal/JournalIssue/Volume")
    issue = text(".//Journal/JournalIssue/Issue")

    # Publication date
    pub_year = text(".//PubDate/Year")
    pub_month = text(".//PubDate/Month")

    # MeSH Terms — critical for biomedical indexing
    mesh_terms = []
    for mesh in article.findall(".//MeshHeading"):
        descriptor = mesh.find("DescriptorName")
        if descriptor is not None:
            major = descriptor.get("MajorTopicYN", "N")
            mesh_terms.append({
                "term": descriptor.text,
                "major_topic": major == "Y",
                "qualifiers": [q.text for q in mesh.findall("QualifierName")]
            })

    # DOI
    doi = ""
    for id_el in article.findall(".//ArticleId"):
        if id_el.get("IdType") == "doi":
            doi = id_el.text or ""

    # Keywords
    keywords = [kw.text for kw in article.findall(".//Keyword") if kw.text]

    return {
        "pmid": pmid,
        "title": title,
        "abstract": abstract,
        "authors": authors,
        "journal": journal,
        "volume": volume,
        "issue": issue,
        "pub_year": pub_year,
        "pub_month": pub_month,
        "mesh_terms": mesh_terms,
        "keywords": keywords,
        "doi": doi,
        "pmc_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
    }


def text_of(element, tag):
    el = element.find(tag)
    return el.text.strip() if el is not None and el.text else ""


# ─────────────────────────────────────────────
# 1B. UNDERSTAND JOURNAL STRUCTURE
# ─────────────────────────────────────────────

def explain_journal_structure(paper: dict):
    """
    Print a structured breakdown of a paper's anatomy —
    teaching the user what each field means.
    """
    print("\n" + "═" * 70)
    print("  MEDINEX │ STEP 1 — BIOMEDICAL LITERATURE ANATOMY")
    print("═" * 70)

    sections = {
        "PMID (PubMed ID)": f"{paper.get('pmid')} → unique identifier for every paper",
        "TITLE": paper.get('title', '')[:100] + ("..." if len(paper.get('title','')) > 100 else ""),
        "AUTHORS": f"{len(paper.get('authors', []))} authors · First: {paper.get('authors', ['?'])[0]}",
        "JOURNAL": f"{paper.get('journal')} Vol.{paper.get('volume')} Issue {paper.get('issue')}",
        "DATE": f"{paper.get('pub_month', '')} {paper.get('pub_year', '')}",
        "DOI": paper.get('doi') or "Not available",
        "ABSTRACT LENGTH": f"{len(paper.get('abstract','').split())} words",
    }

    for label, value in sections.items():
        print(f"\n  ▸ {label}")
        print(f"    {value}")

    print(f"\n  ▸ MeSH TERMS ({len(paper.get('mesh_terms', []))} total)")
    print("    MeSH = Medical Subject Headings — NCBI's controlled vocabulary for indexing")
    for m in paper.get("mesh_terms", [])[:6]:
        major = " ★" if m.get("major_topic") or m.get("major") else ""
        quals = f" / {', '.join(m['qualifiers'])}" if m["qualifiers"] else ""
        print(f"    · {m['term']}{quals}{major}")

    if paper.get("keywords"):
        print(f"\n  ▸ AUTHOR KEYWORDS")
        print(f"    {' · '.join(paper.get('keywords', [])[:8])}")

    print(f"\n  ▸ ABSTRACT EXCERPT")
    abstract = paper.get("abstract", "")
    print(f"    {abstract[:300]}...")
    print("\n" + "═" * 70)


# ─────────────────────────────────────────────
# 1C. FETCH CITATIONS (papers that cite this one)
# ─────────────────────────────────────────────

def fetch_citations(pmid: str, max_results: int = 10) -> list:
    """
    Find papers that cite a given PMID using NCBI elink.
    Returns list of citing PMIDs.
    """
    url = f"{NCBI_BASE}/elink.fcgi"
    params = {
        "dbfrom": "pubmed",
        "db": "pubmed",
        "id": pmid,
        "linkname": "pubmed_pubmed_citedin",
        "retmode": "json",
        "email": EMAIL,
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    try:
        links = data["linksets"][0]["linksetdbs"][0]["links"]
        return links[:max_results]
    except (KeyError, IndexError):
        return []


# ─────────────────────────────────────────────
# 1D. SAVE TO DISK
# ─────────────────────────────────────────────

def save_paper(paper: dict):
    out_path = DATA_DIR / f"paper_{paper['pmid']}.json"
    with open(out_path, "w") as f:
        json.dump(paper, f, indent=2)
    print(f"\n  ✓ Saved to {out_path}")
    return out_path


# ─────────────────────────────────────────────
# DEMO — Run Step 1
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("\n  MEDINEX PHASE 0 · STEP 1: BIOMEDICAL KNOWLEDGE SOURCES")
    print("  " + "─" * 50)

    # Famous Alzheimer's paper — good example of MeSH terms + citations
    DEMO_PMIDS = [
        "33462182",  # Alzheimer's amyloid research
        "34942836",  # COVID long-term outcomes
    ]

    for pmid in DEMO_PMIDS:
        print(f"\n  Fetching PMID {pmid}...")
        paper = fetch_abstract(pmid)
        explain_journal_structure(paper)
        save_paper(paper)

        print(f"\n  Fetching citations for PMID {pmid}...")
        citations = fetch_citations(pmid)
        print(f"  → Found {len(citations)} citing papers: {citations[:5]}")
        time.sleep(0.5)  # Respect NCBI rate limits

    print("\n  ✅ STEP 1 COMPLETE — Biomedical literature structure understood.\n")
