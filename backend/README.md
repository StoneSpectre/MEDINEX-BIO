# MEDINEX — Phase 0: Biomedical Intelligence Layer

## Steps Implemented

### Step 1 — Biomedical Knowledge Sources (`step1_literature/`)
**`literature_explorer.py`** — Understands PubMed paper anatomy:
- `fetch_abstract(pmid)` — fetch + parse single paper by PMID
- `explain_journal_structure(paper)` — print full anatomy (MeSH, authors, abstract)
- `fetch_citations(pmid)` — get citing papers via NCBI ELink
- `save_paper(paper)` — persist to JSON

### Step 2 — Data Collection Engine (`step2_data_collection/`)
**`data_collector.py`** — Builds structured PubMed datasets:
- `search_pubmed(query, max_results, date_from, date_to)` — ESearch with filters
- `fetch_summaries(pmids)` — lightweight batch metadata via ESummary
- `fetch_abstracts_batch(pmids)` — full abstracts + MeSH via EFetch
- `fetch_related_papers(pmid)` — citation network via ELink
- `build_dataset(papers, topic)` → Pandas DataFrame
- `save_dataset(df, topic)` → CSV + JSON

### Step 3 — Clinical Data Infrastructure (`step3_clinical/`)
**`clinical_infrastructure.py`** — Full MIMIC-IV data model:
- Complete schema for all 7 tables: `patients`, `admissions`, `diagnoses_icd`,
  `procedures_icd`, `prescriptions`, `labevents`, `chartevents`
- `generate_synthetic_db(n_patients)` — SQLite demo database (no credentials needed)
- `get_patient_journey(subject_id)` — reconstruct Patient→Diagnosis→Treatment→Outcome
- `run_clinical_analytics(conn)` — mortality, LOS, top diagnoses, drug frequency
- `print_schema_reference()` — full annotated schema printout

## Data Outputs
```
data/
  pubmed/
    paper_33462182.json          # Alzheimer's paper
    paper_34942836.json          # Long COVID paper
    dataset_alzheimer_*.csv/json
    dataset_brca1_*.csv/json
    dataset_metabolic_*.csv/json
    combined_dataset.csv         # All topics merged
  clinical/
    mimic_demo.db                # SQLite synthetic MIMIC-IV (50 patients, 21k rows)
    patients.csv
    admissions.csv
    diagnoses_icd.csv
```

## Running
```bash
python run_step1.py   # Literature anatomy
python run_step2.py   # Data collection + datasets
python step3_clinical/clinical_infrastructure.py  # Clinical infrastructure
```

## Production Notes
- **Step 1 & 2**: Replace sample data with live NCBI API calls (already implemented).
  Register API key at https://www.ncbi.nlm.nih.gov/account/ for 10 req/sec limit.
- **Step 3**: Register at https://physionet.org/, complete CITI training,
  sign MIMIC-IV DUA, then swap SQLite for PostgreSQL with real data.

## Next Steps
- **Step 4**: scispaCy NER on abstracts → extract Disease/Drug/Gene entities
- **Step 5**: Neo4j knowledge graph from extracted entities
- **Step 6**: NetworkX analytics on disease/drug/gene networks
