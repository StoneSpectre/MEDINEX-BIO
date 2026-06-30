# Volume II: Biomedical Infrastructure

## Chapter 9: Search Infrastructure (Elasticsearch & Qdrant)

While the mathematical theories underlying Hybrid Semantic Search were extensively covered in Volume I (Chapter 6), this chapter defines the physical infrastructure required to execute those theories in milliseconds across a corpus of 40 million research papers and billions of clinical documents.

To achieve the Alpha-Weighted Hybrid Search (merging Sparse Lexical and Dense Vector results), Bioquora deploys a dual-engine architecture.

### 9.1 The Sparse Text Engine (Elasticsearch / OpenSearch)
Elasticsearch is utilized for exact keyword matching (BM25), which is mathematically required for retrieving highly specific identifiers (e.g., Clinical Trial NCT IDs, genomic SNP rsIDs) that Vector engines blur together.

#### Architectural Tuning for Biomedicine
Deploying off-the-shelf Elasticsearch for a biomedical platform will result in catastrophic search failures. The default English tokenizers destroy chemical and genomic nomenclature.
*   **The Tokenization Problem:** If a paper mentions the chemical `1,2-dichloroethane`, the standard tokenizer splits this on the comma and the hyphen, indexing `1`, `2`, and `dichloroethane` as separate words. If a user searches for the exact chemical, the BM25 algorithm fails to score it correctly.
*   **Custom Analyzers:** Bioquora deploys heavily customized Lucene Analyzers. These analyzers contain regex patterns specifically engineered to recognize IUPAC chemical names, HGNC gene symbols (which often contain hyphens, like `HLA-DRB1`), and complex protein isoforms.
*   **Synonym Graphs:** While the core entity resolution happens upstream, the Elasticsearch cluster is loaded with a massive Synonym Graph Filter generated from the UMLS CUI tables. This ensures that a lexical search for "Heart Attack" expands at query time to include "Myocardial Infarction".

#### Cluster Infrastructure
*   The OpenSearch cluster is deployed across multiple availability zones for high availability. 
*   It utilizes a **Hot-Warm-Cold** index lifecycle architecture. Recent, highly cited papers and active clinical trials are kept on expensive SSD-backed "Hot" nodes for sub-millisecond retrieval. Decade-old, low-impact papers are seamlessly rolled over to cheaper HDD-backed "Warm/Cold" nodes.

### 9.2 The Dense Vector Engine (Qdrant / Milvus)
To execute the conceptual similarity matching (e.g., finding papers conceptually similar to a query even if they share zero keywords), Bioquora requires a Vector Database. Traditional relational databases (PostgreSQL) cannot mathematically execute Cosine Similarity searches across 768-dimensional vectors at scale.

Bioquora utilizes **Qdrant** (written in Rust) for extreme performance.

#### The HNSW Algorithm (Hierarchical Navigable Small World)
When Bioquora ingests 40 million PubMed abstracts, the BioLinkBERT model generates 40 million dense vectors. If a user queries the system, calculating the exact distance between the user's query vector and all 40 million document vectors (K-Nearest Neighbors, or KNN) would take seconds to minutes.

*   Qdrant solves this using **HNSW**. HNSW builds a multi-layered graph of the vectors in memory. 
*   Instead of scanning every vector, the search starts at the top, sparse layer of the graph and greedily navigates down through the layers toward the cluster of vectors that closest match the query.
*   This transforms an $O(N)$ linear scan into an $O(log(N))$ search, returning the nearest neighbors in under 10 milliseconds.

#### Quantization Strategies
Storing 40 million 768-dimensional float32 arrays requires immense amounts of RAM, driving up infrastructure costs exponentially.
*   Bioquora employs **Scalar Quantization**. Qdrant compresses the 32-bit floats down to 8-bit integers. While this introduces a tiny margin of precision loss, it slashes RAM usage by 75%, allowing massive vector indexes to fit comfortably entirely in memory on standard EC2 instances.

### 9.3 The Execution Pipeline (API Gateway)
When a clinician types a query into the Bioquora Dashboard:
1.  The query hits the FastAPI Search Microservice.
2.  The API immediately passes the query string to the local `BioLinkBERT` embedding model to generate the Query Vector (Latency: ~15ms).
3.  The API utilizes Python `asyncio` to execute two parallel network calls:
    *   `GET` request to OpenSearch (Sparse Query).
    *   `POST` request to Qdrant (Dense Query).
4.  Both engines return their top 100 hits. The API normalizes the scores using **Reciprocal Rank Fusion (RRF)**.
5.  The merged list is finally passed to the Cross-Encoder model (running on a dedicated GPU worker) for final, deep-contextual re-ranking before the JSON response is fired back to the React UI.
