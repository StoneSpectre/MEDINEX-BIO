# Volume I: Biomedical Semantic Layer & Knowledge Representation

## Chapter 5: Entity Resolution

Ingesting highly structured relational databases is relatively straightforward when Canonical IDs are provided. However, the vast majority of cutting-edge biomedical knowledge is locked in unstructured text: peer-reviewed research papers (PubMed), clinical trial protocols, and physician Electronic Health Records (EHRs). 

To extract this knowledge and integrate it into the Neo4j Knowledge Graph without corrupting the ontology namespace, Bioquora deploys a heavy-duty Entity Resolution (ER) pipeline. The pipeline's core mandate is to ensure that a biological concept—regardless of how it is phrased or abbreviated in natural language—always maps to one, and only one, canonical URI.

### 5.1 The Challenge of Synonymy and Polysemy in Biology
Biological nomenclature is notoriously chaotic. The Bioquora ER pipeline must mathematically overcome two linguistic hurdles:
1.  **Synonymy (Multiple words, one meaning):** 
    *   The gene officially designated as `ERBB2` by HGNC is almost exclusively referred to as `HER2` in breast cancer literature. It is also known as `NEU`, `NGL`, `CD340`, and `TKR1`.
    *   A drug might be referenced by its IUPAC chemical name, its generic API (e.g., `Trastuzumab`), or any of its global brand names (`Herceptin`, `Ogivri`, `Herzuma`).
    *   If a paper states "HER2 is amplified", Bioquora must map the string "HER2" to the exact Ensembl ID for `ERBB2`. Failure to do so results in graph fragmentation (creating a new, disconnected node called "HER2").
2.  **Polysemy (One word, multiple meanings):** 
    *   The acronym "APC" is highly polysemous. Depending on the context of the sentence, it can mean *Adenomatous Polyposis Coli* (a tumor suppressor gene), an *Antigen-Presenting Cell* (an immunology cell type), or *Argon Plasma Coagulation* (a clinical procedure).

### 5.2 Named Entity Recognition (NER)
The first step in the pipeline is Named Entity Recognition: identifying the exact spans of text (tokens) that represent biological entities.

Traditional rule-based NER (using regex or dictionary lookups) fails drastically in biomedicine due to spelling variations and complex hyphenations (e.g., "non-small cell lung cancer" vs "NSCLC").

**The Bioquora NER Architecture:**
Bioquora utilizes deep transformer-based language models fine-tuned specifically for the biomedical domain.
*   **Base Models:** The pipeline employs models like **PubMedBERT** or **BioLinkBERT**. Unlike standard BERT (which is pre-trained on Wikipedia and BooksCorpus), PubMedBERT is pre-trained entirely from scratch on 14 million PubMed abstracts. It natively understands the syntax of medical literature.
*   **Token Classification:** The model is fine-tuned on gold-standard annotated corpora (e.g., the BC5CDR corpus for Chemicals and Diseases, the NCBI Disease corpus, and the JNLPBA corpus for Cell Types). 
*   **Output:** When fed a sentence, the model outputs a probability distribution over the text tokens, labeling them with tags like `B-DISEASE` (Beginning of a Disease entity) or `I-GENE` (Inside a Gene entity).

### 5.3 Entity Linking (Grounding)
Once the NER model extracts the string "HER2", the system must perform Entity Linking (often called Normalization or Grounding). This is the process of mapping the extracted string to the canonical ontology URI (Chapter 3).

**The Bioquora Entity Linking Architecture:**
Bioquora utilizes **Dense Passage Retrieval (DPR)** and **Bi-Encoders** for entity linking.
1.  **Ontology Embedding:** Every canonical term and all of its known synonyms in the Bioquora master ontology are passed through a biological embedding model (like `SapBERT`), generating a high-dimensional dense vector for every concept in the graph. These vectors are loaded into a fast Vector Database (Qdrant).
2.  **Mention Embedding:** When the NER pipeline extracts a term (e.g., "HER2") from a paper, the Entity Linker embeds that specific mention *along with its surrounding sentence context*.
3.  **Vector Search:** The system executes a highly optimized Approximate Nearest Neighbor (ANN) search (using HNSW) in the vector database to find the closest ontology concept.

**Solving Polysemy via Contextual Coreference:**
Because the mention embedding (Step 2) includes the surrounding sentence, Bioquora easily solves the "APC" polysemy problem. 
*   If the sentence is: *"The APC mutation drives colorectal cancer,"* the embedding mathematically gravitates towards the region of the vector space representing Genes.
*   If the sentence is: *"The APC presented the peptide to the T-cell,"* the embedding gravitates towards the Immunology/Cell Type sector of the vector space.

### 5.4 Deduplication of Relational Databases (Crosswalks)
Entity Resolution is not just for unstructured text; it is also required when ingesting highly structured relational databases. 

If Database A uses `PubChem: 1234` for a drug, and Database B uses `ChEMBL: 5678` for the exact same chemical, the system must merge them.
Bioquora achieves this via **Crosswalk Tables** (mapping dictionaries provided by the databases themselves). 

To ensure absolute consistency, Bioquora generates an internal **Canonical UUID** (e.g., `MDNX-CHEM-8821`) that acts as the primary key in the Neo4j Graph. The source IDs (`PubChem: 1234`, `ChEMBL: 5678`) are appended to the node as a `source_identifiers` string array. This guarantees that any query hitting the graph—regardless of which external ID the user searched with—will resolve to the singular, deduplicated canonical node.

---
*End of Chapter 5. Proceed to Chapter 6: Semantic Search.*
