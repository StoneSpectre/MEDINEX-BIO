# Volume II: Biomedical Infrastructure

## Chapter 2: Data Sources & Acquisition Strategies

A biomedical reasoning engine is only as powerful as the breadth and quality of the data it consumes. Bioquora operates as a massive data aggregator, continuously pulling from over 100 distinct global sources. 

However, acquiring biological data is immensely complex. Formats range from simple REST JSON to massive binary `.bam` files, and refresh frequencies range from real-time WebSockets to annual FTP `.tar.gz` dumps. This chapter maps the primary data sources and the architectural strategies required to acquire them.

### 2.1 Unstructured Literature and Text Sources
Extracting relational logic from human text forms the bulk of the Entity Resolution pipeline (Vol I, Ch 5).
*   **PubMed / MEDLINE:** The primary index for biomedical abstracts. Bioquora utilizes the NCBI E-utilities API to pull XML abstracts daily.
*   **EuropePMC:** Crucial because it provides *full-text*, open-access XML articles. Analyzing only abstracts misses 80% of the biological mechanisms detailed in the Results sections of papers.
*   **ClinicalTrials.gov (AACT Database):** Provides structured and semi-structured data on active, recruiting, and completed clinical drug trials. Bioquora uses this to link drugs to specific diseases in the Knowledge Graph, tagging the edge with the trial's success or failure status.

### 2.2 Genomics, Transcriptomics, & Proteomics
The foundational layers (Layers 1 & 2) of the Bioquora abstraction stack.
*   **Ensembl / GENCODE:** The definitive source for genome assemblies (e.g., GRCh38). Bioquora downloads the massive GTF/GFF3 files via FTP to build the chromosomal coordinate system for the graph.
*   **ClinVar:** The NIH archive mapping human variations to phenotypes. Bioquora ingests the XML release monthly to update the `[:ASSOCIATED_WITH]` edges between `:Variant` and `:Disease` nodes.
*   **dbSNP & gnomAD:** Critical for determining the allele frequency (statistical rarity) of a variant across different global populations.
*   **UniProtKB:** The master protein database. Bioquora ingests the massive XML dump to map protein structures, functional domains, and post-translational modifications.
*   **AlphaFold Protein Structure Database:** Bioquora ingests 3D coordinate files (`.cif`) from DeepMind’s AlphaFold to understand the physical topography of proteins without experimental PDB structures.

### 2.3 Pharmacology and Chemistry
*   **ChEMBL:** Manually curated database of bioactive molecules. Bioquora ingests ChEMBL's SQLite/PostgreSQL dumps to extract billions of `(Drug)-[:BINDS_TO]->(Protein)` edges, complete with exact `IC50` and `Ki` affinity scores.
*   **PubChem:** Used primarily for chemical structure validation (SMILES strings) and toxicity data.
*   **DrugBank:** Provides highly detailed pharmacological data, including drug-drug interactions (DDIs). If Drug A inhibits an enzyme required to metabolize Drug B, Bioquora explicitly maps this interaction to warn clinicians.

### 2.4 Systems Biology and Pathways
The biological network layer (Layer 3).
*   **Reactome:** A manually curated, peer-reviewed pathway database. Bioquora imports Reactome data to build the sequential cascades of proteins interacting inside a cell.
*   **KEGG (Kyoto Encyclopedia of Genes and Genomes):** High-level mapping of metabolic pathways.
*   **STRING:** A database of known and predicted protein-protein interactions (PPI). STRING edges are highly probabilistic; Bioquora stores the STRING confidence score as a float attribute on the edge, ensuring weak predictions don't override proven biology.

### 2.5 Real-World Data (RWD) & Clinical Registries
To train predictive ML models (like the Phase 1 Risk Engine), curated biological databases are insufficient. The models require messy, real-world patient data containing age, weight, chaotic lab results, and actual clinical outcomes.
*   **MIMIC-IV (PhysioNet):** A massive de-identified ICU database containing vital signs, lab results, medications, and clinical notes for thousands of patients. Bioquora uses this to train baseline mortality and disease progression models.
*   **UK Biobank:** A cohort dataset providing deep phenotypic and genomic data for half a million individuals.

### 2.6 The Multi-Omics Integration Challenge
A core capability of Bioquora is correlative analysis across "-omics" layers. How does a change in DNA (Genomics) affect RNA levels (Transcriptomics) and Protein abundance (Proteomics) in a specific tissue?
*   **GTEx (Genotype-Tissue Expression):** This dataset provides the crucial bridge. It catalogs how specific genetic variants act as Expression Quantitative Trait Loci (eQTLs). Bioquora ingests GTEx to understand that a variant in `Gene X` might drastically reduce RNA expression in the Liver, but have zero effect in the Brain.

**Acquisition Architecture (The Ingestion Handlers):**
Because these sources are so diverse, Bioquora cannot use a single ingestion script. The infrastructure utilizes a highly decoupled **Factory Pattern** in Python. Specific "Connector Modules" are written for each source (e.g., a `ClinVarXMLParser`, a `UniprotFlatFileParser`), orchestrating the download, hash verification, decompression, and initial parsing of the data before passing it down the ELT pipeline.

---
*End of Chapter 2. Proceed to Chapter 3: Data Engineering.*
