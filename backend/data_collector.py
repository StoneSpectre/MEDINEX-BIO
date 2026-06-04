"""
MEDINEX — STEP 2: BIOMEDICAL DATA COLLECTION ENGINE
====================================================
Uses NCBI E-Utilities to build a structured PubMed dataset:
  - Paper Search Engine (ESearch)
  - Metadata Fetching (ESummary)
  - Abstract Retrieval (EFetch)
  - Citation Retrieval (ELink)
  - Batch processing → Pandas DataFrame → CSV/JSON
"""

import json
import time
import requests
import pandas as pd
from pathlib import Path
from xml.etree import ElementTree as ET
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data" / "pubmed"
DATA_DIR.mkdir(parents=True, exist_ok=True)

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
EMAIL = "medinex@example.com"
MAX_REQUESTS_PER_SEC = 3  # NCBI rate limit (10/sec with API key)


# ─────────────────────────────────────────────
# 2A. PAPER SEARCH ENGINE — ESearch
# ─────────────────────────────────────────────

def search_pubmed(
    query: str,
    max_results: int = 20,
    date_from: Optional[str] = None,  # e.g. "2020/01/01"
    date_to: Optional[str] = None,
    article_types: Optional[list] = None,  # e.g. ["Review", "Clinical Trial"]
) -> dict:
    """
    Search PubMed with a query and return structured results.

    NCBI Query Syntax examples:
      "Alzheimer's disease"[MeSH Terms]
      "metformin"[Title/Abstract] AND "diabetes"[MeSH Terms]
      "BRCA1"[Gene Name] AND "breast cancer"[Title]
    """
    url = f"{NCBI_BASE}/esearch.fcgi"

    # Build query
    full_query = query
    if article_types:
        type_filter = " OR ".join([f'"{t}"[Publication Type]' for t in article_types])
        full_query = f"({query}) AND ({type_filter})"

    params = {
        "db": "pubmed",
        "term": full_query,
        "retmax": max_results,
        "retmode": "json",
        "usehistory": "y",  # Server-side history for batch fetching
        "email": EMAIL,
    }

    if date_from and date_to:
        params["datetype"] = "pdat"
        params["mindate"] = date_from
        params["maxdate"] = date_to

    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()["esearchresult"]

    return {
        "query": full_query,
        "total_results": int(data.get("count", 0)),
        "returned": len(data.get("idlist", [])),
        "pmids": data.get("idlist", []),
        "web_env": data.get("webenv"),       # Server-side history key
        "query_key": data.get("querykey"),   # For batch fetching
        "translations": data.get("translationset", []),  # Query expansion
    }


# ─────────────────────────────────────────────
# 2B. METADATA FETCHING — ESummary
# ─────────────────────────────────────────────

def fetch_summaries(pmids: list) -> list:
    """
    Batch fetch lightweight metadata for a list of PMIDs.
    Faster than EFetch — good for building indexes.
    Returns: list of summary dicts.
    """
    if not pmids:
        return []

    url = f"{NCBI_BASE}/esummary.fcgi"
    params = {
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "json",
        "email": EMAIL,
    }
    resp = requests.get(url, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    summaries = []
    result = data.get("result", {})
    for pmid in pmids:
        item = result.get(pmid, {})
        if not item or "error" in item:
            continue
        summaries.append({
            "pmid": pmid,
            "title": item.get("title", ""),
            "authors": [a.get("name", "") for a in item.get("authors", [])],
            "journal": item.get("fulljournalname", item.get("source", "")),
            "pub_date": item.get("pubdate", ""),
            "article_types": item.get("pubtype", []),
            "doi": next((id_["value"] for id_ in item.get("articleids", []) if id_["idtype"] == "doi"), ""),
            "pmc": next((id_["value"] for id_ in item.get("articleids", []) if id_["idtype"] == "pmc"), ""),
        })
    return summaries


# ─────────────────────────────────────────────
# 2C. ABSTRACT RETRIEVAL — EFetch (batch)
# ─────────────────────────────────────────────

def fetch_abstracts_batch(pmids: list, batch_size: int = 10) -> list:
    """
    Fetch full abstracts + MeSH terms for a list of PMIDs.
    Processes in batches to respect NCBI rate limits.
    """
    all_papers = []

    for i in range(0, len(pmids), batch_size):
        batch = pmids[i:i + batch_size]
        print(f"  Fetching abstracts {i+1}–{i+len(batch)} of {len(pmids)}...")

        url = f"{NCBI_BASE}/efetch.fcgi"
        params = {
            "db": "pubmed",
            "id": ",".join(batch),
            "retmode": "xml",
            "rettype": "abstract",
            "email": EMAIL,
        }
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()

        papers = _parse_batch_xml(resp.text)
        all_papers.extend(papers)
        time.sleep(1.0 / MAX_REQUESTS_PER_SEC)

    return all_papers


def _parse_batch_xml(xml_text: str) -> list:
    """Parse a batch EFetch XML response into a list of paper dicts."""
    root = ET.fromstring(xml_text)
    papers = []

    for article in root.findall(".//PubmedArticle"):
        def text(path):
            el = article.find(path)
            return el.text.strip() if el is not None and el.text else ""

        pmid = text(".//PMID")

        # Abstract
        abstract_parts = []
        for ab in article.findall(".//AbstractText"):
            label = ab.get("Label", "")
            content = ab.text or ""
            abstract_parts.append(f"{label}: {content}".strip(": ") if label else content)
        abstract = " ".join(abstract_parts)

        # Authors
        authors = []
        for author in article.findall(".//Author"):
            last = _text_of(author, "LastName")
            fore = _text_of(author, "ForeName")
            affil = _text_of(author, "AffiliationInfo/Affiliation")
            if last:
                authors.append({"name": f"{last} {fore}".strip(), "affiliation": affil})

        # MeSH
        mesh_terms = []
        for mesh in article.findall(".//MeshHeading"):
            d = mesh.find("DescriptorName")
            if d is not None:
                mesh_terms.append({
                    "term": d.text,
                    "major": d.get("MajorTopicYN") == "Y",
                    "qualifiers": [q.text for q in mesh.findall("QualifierName")],
                })

        # DOI
        doi = ""
        for id_el in article.findall(".//ArticleId"):
            if id_el.get("IdType") == "doi":
                doi = id_el.text or ""

        papers.append({
            "pmid": pmid,
            "title": text(".//ArticleTitle"),
            "abstract": abstract,
            "abstract_word_count": len(abstract.split()),
            "authors": authors,
            "author_count": len(authors),
            "journal": text(".//Journal/Title"),
            "issn": text(".//ISSN"),
            "volume": text(".//Volume"),
            "issue": text(".//Issue"),
            "pub_year": text(".//PubDate/Year"),
            "pub_month": text(".//PubDate/Month"),
            "mesh_terms": mesh_terms,
            "mesh_count": len(mesh_terms),
            "keywords": [kw.text for kw in article.findall(".//Keyword") if kw.text],
            "doi": doi,
            "pubmed_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "fetched_at": pd.Timestamp.now().isoformat(),
        })

    return papers


def _text_of(element, path):
    el = element.find(path)
    return el.text.strip() if el is not None and el.text else ""


# ─────────────────────────────────────────────
# 2D. CITATION RETRIEVAL — ELink
# ─────────────────────────────────────────────

def fetch_related_papers(pmid: str, max_results: int = 10) -> dict:
    """
    For a given PMID, find:
      - Papers that cite it (citedin)
      - Related papers (similarity)
      - References it cites (refs)
    """
    url = f"{NCBI_BASE}/elink.fcgi"

    results = {}
    link_types = {
        "cited_by": "pubmed_pubmed_citedin",
        "related": "pubmed_pubmed",
        "references": "pubmed_pubmed_refs",
    }

    for label, linkname in link_types.items():
        params = {
            "dbfrom": "pubmed",
            "db": "pubmed",
            "id": pmid,
            "linkname": linkname,
            "retmode": "json",
            "email": EMAIL,
        }
        try:
            resp = requests.get(url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            links = data["linksets"][0].get("linksetdbs", [])
            if links:
                results[label] = links[0].get("links", [])[:max_results]
            else:
                results[label] = []
        except Exception:
            results[label] = []
        time.sleep(0.35)

    return results


# ─────────────────────────────────────────────
# 2E. BUILD STRUCTURED DATASET
# ─────────────────────────────────────────────

def build_dataset(papers: list, topic: str) -> pd.DataFrame:
    """
    Convert list of paper dicts → flat Pandas DataFrame.
    Explodes MeSH terms into top-level columns for analysis.
    """
    rows = []
    for p in papers:
        row = {
            "pmid": p.get("pmid"),
            "title": p.get("title"),
            "abstract": p.get("abstract"),
            "abstract_words": p.get("abstract_word_count", 0),
            "first_author": p["authors"][0]["name"] if p.get("authors") else "",
            "author_count": p.get("author_count", 0),
            "journal": p.get("journal"),
            "pub_year": p.get("pub_year"),
            "pub_month": p.get("pub_month"),
            "doi": p.get("doi"),
            "mesh_count": p.get("mesh_count", 0),
            "mesh_terms_flat": "; ".join(m["term"] for m in p.get("mesh_terms", [])),
            "major_mesh": "; ".join(m["term"] for m in p.get("mesh_terms", []) if m.get("major")),
            "keywords": "; ".join(p.get("keywords", [])),
            "pubmed_url": p.get("pubmed_url"),
            "topic": topic,
        }
        rows.append(row)

    df = pd.DataFrame(rows)
    return df


def save_dataset(df: pd.DataFrame, topic: str):
    """Save dataset to CSV and JSON."""
    slug = topic.lower().replace(" ", "_").replace("/", "_")[:40]
    csv_path = DATA_DIR / f"dataset_{slug}.csv"
    json_path = DATA_DIR / f"dataset_{slug}.json"

    df.to_csv(csv_path, index=False)
    df.to_json(json_path, orient="records", indent=2)

    print(f"\n  ✓ Saved CSV  → {csv_path}")
    print(f"  ✓ Saved JSON → {json_path}")
    return csv_path, json_path


def print_dataset_summary(df: pd.DataFrame, topic: str):
    """Print a rich summary of the collected dataset."""
    print("\n" + "═" * 70)
    print(f"  MEDINEX │ STEP 2 — DATASET SUMMARY: '{topic}'")
    print("═" * 70)
    print(f"\n  📄 Papers collected   : {len(df)}")
    print(f"  📅 Year range         : {df['pub_year'].min()} – {df['pub_year'].max()}")
    print(f"  📰 Unique journals    : {df['journal'].nunique()}")
    print(f"  👤 Avg authors/paper  : {df['author_count'].mean():.1f}")
    print(f"  📝 Avg abstract words : {df['abstract_words'].mean():.0f}")
    print(f"  🏷️  Avg MeSH terms     : {df['mesh_count'].mean():.1f}")

    print(f"\n  TOP JOURNALS:")
    for j, cnt in df["journal"].value_counts().head(5).items():
        print(f"    {cnt:3d}x  {j}")

    print(f"\n  PUBLICATION YEARS:")
    for y, cnt in df["pub_year"].value_counts().sort_index(ascending=False).head(5).items():
        bar = "█" * cnt
        print(f"    {y}  {bar} ({cnt})")

    # Most common MeSH terms
    all_mesh = []
    for terms in df["mesh_terms_flat"].dropna():
        all_mesh.extend([t.strip() for t in terms.split(";") if t.strip()])

    from collections import Counter
    mesh_counts = Counter(all_mesh).most_common(8)
    print(f"\n  TOP MeSH TERMS:")
    for term, cnt in mesh_counts:
        print(f"    {cnt:3d}x  {term}")

    print("\n" + "═" * 70)


# ─────────────────────────────────────────────
# DEMO — Run Step 2
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("\n  MEDINEX PHASE 0 · STEP 2: DATA COLLECTION ENGINE")
    print("  " + "─" * 50)

    QUERIES = [
        {
            "query": '"Alzheimer disease"[MeSH Terms] AND "amyloid"[Title/Abstract]',
            "topic": "Alzheimer Disease Amyloid",
            "max_results": 15,
            "date_from": "2020/01/01",
            "date_to": "2024/12/31",
        },
        {
            "query": '"BRCA1"[Gene Name] AND "breast neoplasms"[MeSH Terms]',
            "topic": "BRCA1 Breast Cancer",
            "max_results": 10,
            "date_from": "2021/01/01",
            "date_to": "2024/12/31",
        },
    ]

    all_dfs = []
    for q in QUERIES:
        print(f"\n  🔍 Searching: {q['topic']}")

        # Search
        search_result = search_pubmed(
            q["query"],
            max_results=q["max_results"],
            date_from=q.get("date_from"),
            date_to=q.get("date_to"),
        )
        print(f"     Total results in PubMed: {search_result['total_results']:,}")
        print(f"     Fetching: {search_result['returned']} papers")

        if search_result["translations"]:
            print(f"     Query expansion: {[t.get('to','') for t in search_result['translations'][:2]]}")

        # Fetch abstracts
        papers = fetch_abstracts_batch(search_result["pmids"])

        # Build dataset
        df = build_dataset(papers, q["topic"])
        all_dfs.append(df)
        print_dataset_summary(df, q["topic"])
        save_dataset(df, q["topic"])

        # Fetch citations for the first paper
        if search_result["pmids"]:
            first_pmid = search_result["pmids"][0]
            print(f"\n  🔗 Fetching citation network for PMID {first_pmid}...")
            citations = fetch_related_papers(first_pmid, max_results=5)
            for k, v in citations.items():
                print(f"     {k:12s}: {len(v)} papers {v[:3]}")

    # Merge all datasets
    if all_dfs:
        combined = pd.concat(all_dfs, ignore_index=True)
        combined_path = DATA_DIR / "combined_dataset.csv"
        combined.to_csv(combined_path, index=False)
        print(f"\n  ✓ Combined dataset ({len(combined)} papers) → {combined_path}")

    print("\n  ✅ STEP 2 COMPLETE — PubMed → Python → Structured Dataset.\n")
