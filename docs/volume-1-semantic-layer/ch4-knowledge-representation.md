# Volume I: Biomedical Semantic Layer & Knowledge Representation

## Chapter 4: Knowledge Representation

To compute over biological relationships, Bioquora must encode knowledge using formal mathematical and logical structures. If a computer merely stores the text "Imatinib treats CML", it cannot *reason* about it. The foundation of the Bioquora semantic engine rests on advanced Graph Theory heavily influenced by Semantic Web technologies, specifically engineered to support Description Logic operations at scale.

### 4.1 RDF, OWL, and Semantic Web Standards
The World Wide Web Consortium (W3C) Semantic Web stack was designed to make data machine-readable. Bioquora leans heavily on these standards for data ingestion and interoperability.

#### RDF (Resource Description Framework)
In RDF, all data is modeled as atomic 'Triples' comprising a **Subject**, a **Predicate**, and an **Object**. 
*   **Example Triple:** `<http://identifiers.org/drugbank/DB00619>` (Imatinib) $\rightarrow$ `<http://purl.obolibrary.org/obo/RO_0002449>` (inhibits) $\rightarrow$ `<http://identifiers.org/uniprot/P00519>` (ABL1).
Because every element is a URI, the statement is globally unambiguous.

#### OWL (Web Ontology Language)
OWL is a highly expressive logic language built on top of RDF. It allows Bioquora to declare complex mathematical axioms about the data.
*   **Transitivity:** If Disease A is a subclass of Disease B, and Disease B is a subclass of Disease C, OWL logic allows the system to automatically infer that A is a subclass of C.
*   **Inverse Properties:** Bioquora can declare in OWL that the predicate `inhibits` is the exact logical inverse of `is_inhibited_by`. 
*   **Disjointness:** Bioquora can declare that the class `Disease` is disjoint from the class `Drug`. If a messy external database attempts to classify a node as both, the Bioquora ingestion pipeline will mathematically reject the transaction as a logical contradiction.

### 4.2 The Bioquora Hybrid Graph Architecture: Property Graphs vs. RDF Triplestores
While pure RDF and OWL are academically perfect for standardization and logical inference, querying billions of RDF triples using the SPARQL query language becomes computationally crippling when traversing deep biological pathways. 

Furthermore, as discussed in Chapter 1 (Biomedical Information Theory), biological edges require massive amounts of context (Evidence Type, Confidence Score, PubMed citations). In pure RDF, adding properties to an edge requires a workaround called **Reification** (creating a new dummy node just to represent the edge, and drawing links to it). This explodes the size of the graph and destroys query traversal speed.

**Bioquora utilizes a Hybrid Architecture to solve this:**
1.  **The Ingestion Layer (RDF/OWL):** All external ontologies and databases are ingested in their native RDF, OWL, or OBO formats to preserve their strict Description Logic.
2.  **The Serving Layer (Labeled Property Graph):** The RDF triples are programmatically transformed and materialized into a **Neo4j Property Graph**.

In a Neo4j Labeled Property Graph, both Nodes and Edges are first-class citizens that can hold arbitrary Key-Value attributes (properties). 
Bioquora models the hyperedge `[Drug] -[TREATS]-> [Disease]` with embedded properties:
*   `evidence_level`: "Phase III Trial"
*   `confidence_score`: 0.95
*   `pmid`: ["12345678"]

This allows the Neo4j Cypher query engine to perform deep traverses (e.g., finding a path from a drug to a disease via 5 intermediate protein nodes) while filtering on edge attributes (e.g., `WHERE edge.confidence_score > 0.8`) in sub-milliseconds, a feat impossible in standard SPARQL triplestores.

### 4.3 Knowledge Inference and Automated Reasoners
Because Bioquora enforces formal OWL ontologies at the ingestion layer, it can utilize **Description Logic Reasoners** (e.g., ELK, HermiT) to perform automated inference before the data ever reaches the Neo4j serving layer.

A Reasoner is an algorithm that parses the declared axioms and deduces new facts that were not explicitly stated in the source data.

**A Real-World Inference Example in Bioquora:**
1.  **Explicit Fact 1 (From ChEMBL):** `Drug X` inhibits `Protein Y`.
2.  **Explicit Fact 2 (From Protein Ontology):** `Protein Y` is a subclass of the `Tyrosine Kinase` receptor family.
3.  **Explicit Fact 3 (From Disease Ontology):** `Disease Z` is driven by hyperactive `Tyrosine Kinase` receptors.
4.  **Inferred Fact (Deduced by the Reasoner):** `Drug X` belongs to the class `Tyrosine Kinase Inhibitor` and is a *candidate therapeutic* for `Disease Z`.

#### The Materialization Strategy
Running Reasoners is computationally expensive (often NP-hard depending on the OWL profile). Bioquora does not run these algorithms in real-time when a doctor queries the system.
Instead, Bioquora uses an **Offline Materialization Strategy**. During the weekly data build pipeline (orchestrated by Airflow), the Reasoner runs over the massive graph, calculates every possible inferred fact, and physically writes (materializes) those inferred edges into the Neo4j database. 

When a clinician executes a query in the Bioquora React Dashboard, the API simply reads the pre-calculated materialized edges, resulting in lightning-fast response times while benefiting from deep logical deduction.

---
*End of Chapter 4. Proceed to Chapter 5: Entity Resolution.*
