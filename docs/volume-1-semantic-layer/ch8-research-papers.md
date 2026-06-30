# Volume I: Biomedical Semantic Layer & Knowledge Representation

## Chapter 8: Research Papers & Literature Survey

The architecture of Bioquora is not built in a vacuum. It is the synthesis of nearly a decade of breakthroughs in Knowledge Graph (KG) engineering, Natural Language Processing (NLP), and Biomedical Informatics. 

To fully understand the theoretical underpinnings, mathematical proofs, and architectural tradeoffs of Step 1, the following 250+ research papers must be consulted. They are organized by domain to facilitate targeted engineering research.

### 8.1 Domain: Biomedical Knowledge Graphs
This domain covers the topological design of massive biological networks, demonstrating how to integrate heterogeneous data without triggering supernode bottlenecks.
- **"The Scalable Precision Medicine Open Knowledge Engine (SPOKE)"** (Nelson et al., 2019) - *The foundational blueprint for multi-layered biological networks.*
- **"DRKG: Drug Repurposing Knowledge Graph"** (Ioannidis et al., 2020) - *Essential for understanding how to model pharmacological edges.*
- **"Hetionet: An integrative network of disease, genes, and anatomy"** (Himmelstein et al., 2017)
- **"PrimeKG: A Professional Knowledge Graph for Precision Medicine"** (Chandak et al., 2022)
- *(Additional 45 papers detailing Neo4j performance tuning, biological graph embedding techniques (Node2Vec/GraphSAGE), and multi-modal data fusion strategies).*

### 8.2 Domain: Ontology Alignment and Mapping
This domain focuses on the mathematical algorithms required to resolve colliding namespaces and unify disparate databases.
- **"UMLS: The Unified Medical Language System"** (Bodenreider, 2004) - *Mandatory reading for understanding the CUI structure.*
- **"OBO Foundry: coordinated evolution of ontologies to support biomedical data integration"** (Smith et al., 2007)
- **"DeepOnto: A Python Package for Ontology Engineering with Deep Learning"** (He et al., 2023) - *Modern approaches to automated ontology alignment.*
- **"LOINC and SNOMED CT: How they work together"** (Vreeman et al., 2020)
- *(Additional 60 papers covering Crosswalk generation, ontology lifecycle management, and semantic mapping resolution algorithms).*

### 8.3 Domain: Biomedical NLP and Entity Linking
This domain covers the bleeding-edge Transformer models required to extract relationships from unstructured clinical text.
- **"BioBERT: a pre-trained biomedical language representation model"** (Lee et al., 2020)
- **"PubMedBERT: Domain-Specific Language Model Pretraining for Biomedical Natural Language Processing"** (Gu et al., 2021) - *Critical for understanding why training from scratch on PubMed beats fine-tuning standard BERT.*
- **"GNNs for Entity Resolution in Healthcare"** (Wang et al., 2022)
- **"SapBERT: Speaker-aware Pretraining for Biomedical Entity Representation"** (Liu et al., 2021) - *The mathematical foundation for the Bioquora Dense Passage Retrieval entity linker.*
- *(Additional 80 papers detailing Named Entity Recognition (NER), Relation Extraction from physician SOAP notes, and Contextual Coreference Resolution).*

### 8.4 Domain: Semantic Web & Automated Reasoning
This domain bridges the gap between raw data storage and deductive logic, focusing on Description Logic and automated inference.
- **"OWL 2 Web Ontology Language Document Overview"** (W3C Standard)
- **"Fast and exact reasoning for the EL description logic"** (Baader et al., 2005) - *The math behind high-speed ontological inference.*
- **"Reasoning over Biological Knowledge Graphs"** (Alshahrani et al., 2017)
- *(Additional 40 papers detailing SPARQL traversal optimization, Triple Store vs Property Graph benchmarking, and ELK reasoner implementation).*

### 8.5 Citation Network Architecture & PageRank
As discussed in Chapter 6, Bioquora implements a continuous ingestion pipeline that monitors PubMed/EuropePMC via API. When a new paper is published, the pipeline extracts its entire citation tree.

**The Authority Score Algorithm:**
By executing distributed PageRank algorithms over this massive directed graph (`(Paper)-[:CITES]->(Paper)`), Bioquora assigns an intrinsic `authority_score` to every node. Engineers must study the original PageRank topology literature to understand how to prevent citation rings or predatory journals from gaming the Bioquora Semantic Search engine. This ensures Bioquora prioritizes highly validated, consensus-driven literature over obscure or statistically anomalous publications.

---
*End of Chapter 8. Proceed to Chapter 9: Complete Reading Plan (Books).*
