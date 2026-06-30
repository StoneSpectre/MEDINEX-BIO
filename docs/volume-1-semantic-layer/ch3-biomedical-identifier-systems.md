# Volume I: Biomedical Semantic Layer & Knowledge Representation

## Chapter 3: Biomedical Identifier Systems

If ontologies provide the vocabulary of biology, identifier systems provide the exact addresses. To successfully link data across disparate domains, Bioquora relies on rigorous biomedical identifier systems. Biological databases historically evolved in disconnected silos across the globe (e.g., NCBI in the US, EBI in Europe). Consequently, the exact same biological protein might be referenced by a completely different string ID in UniProt compared to NCBI. Resolving these conflicting namespaces is a fundamental prerequisite for building a connected semantic layer.

### 3.1 The Taxonomy of Primary Identifier Systems
The Bioquora ingestion engine recognizes and normalizes hundreds of identifier formats. Below are the primary namespaces the system relies upon to construct the canonical nodes in the Knowledge Graph.

#### 3.1.1 Genomic and Proteomic Identifiers
*   **Ensembl (ENSG/ENST/ENSP):** Maintained by EMBL-EBI, Ensembl is the absolute gold standard for genomic annotations. It provides stable, versioned identifiers for genes (`ENSG...`), transcripts (`ENST...`), and proteins (`ENSP...`). Because biology is dynamic (a single gene can produce multiple transcripts via alternative splicing), Bioquora defaults to Ensembl IDs for high-resolution genomic tracking, rather than relying purely on gene symbols.
*   **HGNC (HUGO Gene Nomenclature Committee):** The official global authority that assigns unique, readable symbols (e.g., `TP53`, `BRCA1`) and IDs to human genes. While clinicians think in HGNC symbols, Bioquora internally resolves these symbols to Ensembl IDs to prevent ambiguity (e.g., when a symbol is retired or historically mapped to a different locus).
*   **NCBI Entrez Gene ID:** An integer-based identifier (e.g., `7157` for TP53) heavily used in literature and legacy U.S. databases. Bioquora maintains a strict cross-reference map between Entrez and Ensembl.
*   **UniProtKB Accession (e.g., `P04637`):** The definitive global identifier for proteins. A UniProt node in Bioquora is a hub of immense metadata, connecting the protein to its known 3D structures (PDB), post-translational modifications, and cellular functions.

#### 3.1.2 Chemical and Pharmacological Identifiers
*   **PubChem CID:** The world's largest collection of freely accessible chemical information, providing integer IDs for exact chemical structures.
*   **ChEMBL ID (e.g., `CHEMBL25`):** Identifiers for bioactive, drug-like molecules. ChEMBL is deeply integrated into Bioquora because it links molecules to their bioactivity data (e.g., IC50, Ki affinities) against specific protein targets.
*   **DrugBank ID:** Focuses heavily on approved and investigational clinical drugs. It provides the crucial link between a chemical structure and its authorized clinical usage, side effects, and drug-drug interactions.
*   **RxNorm (RXCUI):** Normalizes names for clinical drugs as prescribed by physicians. It maps the complex relationships between the active pharmaceutical ingredient (API), the clinical dose form (e.g., 500mg oral tablet), and brand names.

#### 3.1.3 Disease, Phenotype, and Clinical Identifiers
*   **UMLS CUI:** As discussed in Chapter 2, the Concept Unique Identifier unifies clinical terms across SNOMED, ICD, and MeSH.
*   **OMIM (Online Mendelian Inheritance in Man):** Provides identifiers for specific genetic phenotypes and diseases, crucial for mapping inherited Mendelian disorders.
*   **Orphanet ID:** Specifically tracks and identifies rare genetic diseases, often filling gaps where standard ICD billing codes lack granularity.

#### 3.1.4 Publication and Clinical Trial Identifiers
*   **PMID (PubMed Unique Identifier):** The integer ID representing an abstract in the MEDLINE database.
*   **PMCID:** The identifier for full-text, open-access papers in PubMed Central.
*   **DOI (Digital Object Identifier):** The persistent, globally resolvable identifier for academic papers across all publishers.
*   **NCT Number:** The standard identifier for clinical trials registered on ClinicalTrials.gov (e.g., `NCT0456221`).

### 3.2 Persistent URIs and the Bioquora Namespace Strategy
A Knowledge Graph cannot simply store strings like `"P04637"`. If a node property holds the value `"12345"`, the database has no idea if that is an Entrez Gene ID, a PubChem CID, or a PubMed ID.

To construct the Knowledge Graph using Semantic Web standards (RDF/OWL), every identifier must be represented as a unique **Uniform Resource Identifier (URI)**.

Bioquora adopts the **Identifiers.org** resolution strategy to guarantee global uniqueness.
*   Instead of storing raw string IDs, Bioquora stores the canonical URI: `http://identifiers.org/uniprot/P04637`.
*   This ensures that namespaces never collide. The system can definitively distinguish `http://identifiers.org/pubmed/12345` from `http://identifiers.org/pubchem.compound/12345`.

### 3.3 The Cross-Reference Resolution Engine
The physical engineering of mapping these IDs is one of the most computationally intense processes in Step 1. Bioquora cannot afford to query external APIs (like UniProt's REST API) in real-time during a diagnostic run, as the network latency would destroy the platform's speed.

#### The Technical Implementation
1.  **Bulk Crosswalk Ingestion:** Bioquora utilizes a specialized Entity Linking module that downloads the massive flat-file mapping dumps provided by major databases on a weekly basis (e.g., UniProt's `idmapping.dat`, which maps UniProt IDs to dozens of other databases, and Ensembl's BioMart exports).
2.  **In-Memory Dictionary Build:** These flat files are parsed and loaded into a high-speed, distributed in-memory key-value store (Redis). 
3.  **Real-Time Canonicalization:** When a new data stream (like a patient's VCF genomic file or a hospital HL7 message) arrives at the Bioquora API, the ingestion workers query the local Redis cluster. The worker instantly translates the external ID into the internal Bioquora Canonical URI before the data is ever inserted into the Neo4j graph.
4.  **Handling 1-to-Many Collisions:** In biology, mappings are rarely 1-to-1. A single gene might map to five different transcripts. The Bioquora Entity Resolution Engine uses context-aware logic to handle 1-to-N mappings. If resolving an HGNC symbol to an Ensembl Transcript for a protein-level query, Bioquora defaults to selecting the **MANE (Matched Annotation from NCBI and EMBL-EBI)** transcript, which represents the universally agreed-upon primary transcript for that gene.

By enforcing a mathematically strict URI namespace and deploying a sub-millisecond local resolution engine, Bioquora guarantees that the nodes in its Knowledge Graph represent singular, undeniable biological truths.

---
*End of Chapter 3. Proceed to Chapter 4: Knowledge Representation.*
