# Volume II: Biomedical Infrastructure

## Chapter 3: Data Engineering & ELT Pipelines

Aggregating the 100+ sources detailed in Chapter 2 requires a Data Engineering pipeline capable of industrial-scale computation. The Bioquora architecture completely abandons traditional, fragile ETL (Extract, Transform, Load) paradigms in favor of a modern, distributed ELT (Extract, Load, Transform) Lakehouse architecture.

### 3.1 The ELT Architecture vs. Traditional ETL
In legacy healthcare systems (ETL), data is downloaded, transformed in memory on a middle-tier server, and then loaded into a strict relational database. This is a catastrophic design for biomedicine:
1.  If the external server (e.g., NCBI) changes a column name, the in-memory transformation crashes, and the data is lost.
2.  If data scientists realize they need a column that was discarded during the transformation phase, the engineering team must re-download terabytes of data from slow external FTP servers.

**The Bioquora ELT Lakehouse Paradigm:**
1.  **Extract:** Python workers download raw data (XML, CSV, VCF) from external APIs and FTP servers.
2.  **Load:** The raw data is dumped immediately into the `Raw Zone` of the Cloud Data Lake (AWS S3) as immutable blobs. No validation or schema checking is performed at this stage.
3.  **Transform:** Once safely stored in S3, distributed computing engines (Apache Spark) read the raw data, apply transformations, normalize schemas, execute Entity Resolution (Vol I, Ch 5), and write the cleaned data back into S3 into the `Processed Zone` using highly optimized columnar formats (Parquet).

### 3.2 The Transformation Engine (Apache Spark & dbt)
To transform a 500GB raw XML file from UniProt into queryable tables, a single Python script on a single server will run out of memory and crash.

**Distributed Processing with Apache Spark:**
Bioquora utilizes PySpark for heavy data wrangling. Spark distributes the XML parsing across a cluster of 50 worker nodes. It processes the data in parallel, applies the transformation logic (e.g., extracting protein domains), and saves the results.

**Data Transformation with dbt (Data Build Tool):**
Once the data is converted to flat Parquet tables, Bioquora uses `dbt` to manage the SQL transformation logic. 
*   Instead of hiding transformation logic inside unreadable stored procedures, `dbt` allows engineers to write modular `SELECT` statements.
*   `dbt` compiles these statements, builds the dependency graph (e.g., Table C depends on Table A and Table B), and executes them in the correct order using the computational power of the underlying data warehouse (like DuckDB or Snowflake).

### 3.3 Batch Processing vs. Event-Driven Streaming
Bioquora data pipelines are bifurcated into two temporal tracks:

**Track A: Batch Processing (The Global Graph)**
The majority of foundational biological databases (Ensembl, ChEMBL) update on monthly or quarterly release cycles. These do not require real-time streaming.
*   They are handled via scheduled batch pipelines orchestrated by Apache Airflow. A DAG (Directed Acyclic Graph) kicks off at midnight, downloads the new releases, computes the deltas, and updates the Neo4j Knowledge Graph by morning.

**Track B: Real-Time Streaming (The Patient Digital Twin)**
When a patient is connected to Bioquora Phase 5 (Digital Twin), clinical telemetry (Heart Rate, SpO2, Continuous Glucose Monitors) and hospital HL7 EHR feeds arrive continuously.
*   Batch processing is useless here; a 24-hour delay in heart rate data is fatal.
*   Bioquora uses **Apache Kafka** to handle streaming data. The telemetry hits a Kafka topic, and consumer microservices instantly parse the data, update the Redis cache for UI visualization, and trigger the AI Planner (Phase 4) if an anomaly is detected.

### 3.4 Data Quality and Great Expectations
Garbage In, Garbage Out (GIGO) is the death of clinical AI. Before any transformed data is promoted to the Neo4j Graph or the ML training sets, it must pass rigorous, automated quality gates.

Bioquora integrates the **Great Expectations** Python framework directly into the Airflow pipelines to execute assertion tests on the dataframes:
*   **Null Checks:** Assert that the `gene_symbol` column has 0% null values.
*   **Biological Bounds:** Assert that the `patient_age` column is between 0 and 130. Assert that `SpO2` is never > 100%.
*   **Referential Integrity:** Assert that every `disease_id` in the drug-target table actually exists in the Disease Ontology table.

If a dataset fails an Expectation, the Airflow DAG immediately halts. The corrupt data is quarantined, and the engineering team is alerted via Slack. The production Knowledge Graph remains pristine and mathematically sound.

---
*End of Chapter 3. Proceed to Chapter 4: Storage Layer.*
