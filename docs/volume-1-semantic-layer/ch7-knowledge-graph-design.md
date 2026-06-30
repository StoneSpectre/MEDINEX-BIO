# Volume I: Biomedical Semantic Layer & Knowledge Representation

## Chapter 7: Knowledge Graph Design & Metagraph Schema

The Neo4j Knowledge Graph serves as the central nervous system of Bioquora. While Chapter 4 detailed the transition from pure RDF to Labeled Property Graphs, this chapter focuses on the physical architectural schema—the Metagraph—required to accurately model the immense complexity of human biology without descending into computational chaos.

### 7.1 The Axioms of the Bioquora Metagraph
A poorly designed graph schema will result in exponentially slow traversal times (the "Supernode" problem). To prevent this, Bioquora adheres to strict design axioms:
1.  **Nodes represent immutable nouns.** A Node is a Gene, a Drug, or a Disease. It should never represent a verb or a transient state.
2.  **Edges represent verbs or structural hierarchies.** Edges define how nouns interact (`INHIBITS`, `EXPRESSES`, `PART_OF`).
3.  **Attributes provide the stochastic context.** If the relationship is probabilistic or conditional, that context is stored as Key-Value properties on the edge, not as structural nodes.

### 7.2 Node Taxonomy (Labels)
Every node in Bioquora must be instantiated with one or more Labels that map directly to the foundational superclasses defined in Chapter 1. Neo4j allows multiple labels per node, enabling polymorphic queries.

*   **`:Gene`** $\rightarrow$ Represents a physical DNA locus.
*   **`:Transcript`** $\rightarrow$ Represents an RNA sequence.
*   **`:Protein`** $\rightarrow$ Represents the translated functional unit.
*   **`:Variant`** $\rightarrow$ Represents a specific mutation (e.g., a Missense variant like `BRAF V600E`).
*   **`:Disease`** $\rightarrow$ Represents a clinical state (e.g., `Melanoma`).
*   **`:Drug`** $\rightarrow$ Represents an active pharmaceutical ingredient (e.g., `Vemurafenib`).
*   **`:Pathway`** $\rightarrow$ Represents a biological process (e.g., `MAPK signaling pathway`).
*   **`:Publication`** $\rightarrow$ Represents a source of evidence.

### 7.3 Edge Taxonomy (Relationships)
Edges in Bioquora follow a standardized, direction-aware ontology (frequently borrowing from the Relation Ontology - RO).

*   **(Drug)-[:INHIBITS $\rightarrow$ (Protein)**
*   **(Gene)-[:ASSOCIATED_WITH $\rightarrow$ (Disease)**
*   **(Protein)-[:PART_OF $\rightarrow$ (Pathway)**
*   **(Variant)-[:LOCATED_IN $\rightarrow$ (Gene)**
*   **(Publication)-[:MENTIONS $\rightarrow$ (Disease)**

By keeping the Edge taxonomy strictly constrained, Cypher queries remain highly performant. 

### 7.4 The Evidence Model & Traceable Provenance
A core tenet of Bioquora is **Absolute Traceability**. In healthcare, black-box AI hallucination is unacceptable. Therefore, every single edge representing a biological relationship must physically point to the evidence that supports it.

Bioquora models this using complex Neo4j edge attributes. When Bioquora ingests the fact that `Vemurafenib` inhibits `BRAF V600E` from an external database like OpenTargets, the `[:INHIBITS]` edge is enriched with the following properties:

*   **`source_db`:** `"OpenTargets"`
*   **`evidence_type`:** `"Phase III Clinical Trial"`
*   **`p_value`:** `1.5e-8` (Statistical significance of the association).
*   **`pmid_list`:** `["21325043", "22356324"]` (An array of PubMed IDs).

**The Diagnostic Workflow Impact:**
If the Bioquora AI Copilot recommends Vemurafenib to an oncologist, the physician can ask, *"Why this drug?"* 
The system instantly traverses the `[:INHIBITS]` edge, retrieves the `pmid_list`, executes a secondary query to fetch the `:Publication` nodes, and displays the exact Phase III clinical trial abstracts that justify the recommendation. The AI is mathematically grounded in the graph.

### 7.5 Temporal Dynamics and Multi-Modal Graph Projections
Biology is dynamic; a disease progresses over time, and a tumor evolves resistance to a drug. However, updating a massive, billion-node global graph in real-time is computationally unfeasible.

To support temporal reasoning without bloating the primary transactional graph, Bioquora utilizes **Graph Projections** via the Neo4j Graph Data Science (GDS) library.

#### Subgraph Instantiation
For specific machine learning tasks—such as predicting the next stage of Renal Decline for the Phase 1 Predictive ML Engine—Bioquora does not query the entire database.
1.  **Projection:** The API executes a Cypher projection, ripping a small, highly optimized, weighted sub-graph into RAM. This sub-graph might only contain the Patient, their specific lab results over the last 5 years, and the immediate biological pathways those labs represent.
2.  **Graph Embeddings:** Bioquora executes advanced graph algorithms (like FastRP or Node2Vec) directly on this in-memory projection to generate topological embeddings.
3.  **Inference:** These structural embeddings are fed into the downstream XGBoost predictive models.

This architecture ensures that the massive Global Knowledge Graph remains a stable, read-optimized source of truth, while temporal, patient-specific ML tasks are executed on ephemeral, lightning-fast projected subgraphs.

---
*End of Chapter 7. Proceed to Chapter 8: Research Papers & Literature Survey.*
