# Volume II: Biomedical Infrastructure

## Chapter 8: Pipeline Orchestration & Asynchronous Messaging

Managing the execution of hundreds of concurrent, interdependent data pipelines—ranging from nightly 500GB genomic batch dumps to sub-second real-time HL7 clinical event processing—requires an industrial-grade master orchestration engine. 

Attempting to run a biomedical platform using simple `cron` jobs is a guaranteed path to catastrophic failure. If the ontology pipeline fails to download an update on step 1, a `cron` job will blindly execute step 2, corrupting the production database with malformed data. Bioquora implements a highly decoupled, state-aware orchestration architecture.

### 8.1 The Master Orchestrator (Apache Airflow)
For all batch processing (Track A from Chapter 3), Bioquora utilizes **Apache Airflow**. Airflow allows engineers to author workflows programmatically in Python as **Directed Acyclic Graphs (DAGs)**.

#### The Anatomy of a Bioquora DAG
A DAG explicitly defines the mathematical dependencies between tasks.
1.  **Task A (Sensor):** Wait until the external ClinVar FTP server drops the new monthly XML file.
2.  **Task B (Extract):** Download the 100GB XML file to the S3 Raw Zone. (Requires Task A).
3.  **Task C (Transform):** Spin up an ephemeral Apache Spark cluster, parse the XML into Parquet, and execute Entity Resolution. (Requires Task B).
4.  **Task D (Data Quality):** Execute the *Great Expectations* validation suite against the Parquet file. (Requires Task C).
5.  **Task E (Load):** Execute Cypher `UNWIND` to upsert the clean data into Neo4j. (Requires Task D to pass).

#### Fault Tolerance & Idempotency
*   **Idempotency:** Every task in Airflow is designed to be idempotent. If Task E fails halfway through due to a Neo4j timeout, the engineer can safely click "Restart Task E". The code is written such that running it twice yields the exact same result as running it once (no duplicated graph nodes).
*   **Alerting:** If Task D (Quality Gate) fails, Airflow immediately halts the pipeline, preventing Neo4j corruption, and pings the DevOps on-call engineer via PagerDuty/Slack with the exact stack trace.

### 8.2 Asynchronous Event Brokers (Apache Kafka)
While Airflow excels at scheduled batch processing, it cannot handle real-time streaming. For continuous clinical data (e.g., Patient Digital Twin telemetry), Bioquora utilizes **Apache Kafka**, the industry standard for distributed event streaming.

#### The Kafka Architecture
Kafka operates as a distributed, highly available, immutable commit log.
*   **Decoupling:** When a new patient lab result arrives via the FHIR API, the API does not try to write it directly to Neo4j, PostgreSQL, and Qdrant. Doing so would cause the API to block and timeout under heavy load.
*   **Publish / Subscribe:** Instead, the API instantly publishes a tiny JSON event to a Kafka Topic (e.g., `topic_clinical_observations`). 
*   **Independent Consumers:** Multiple microservices subscribe to this topic. 
    *   The *Graph Builder Worker* consumes the event and updates Neo4j.
    *   The *ML Inference Worker* consumes the event and recalculates the patient's Phase 1 risk score.
    *   The *Audit Logger* consumes the event and writes an immutable record to S3 for HIPAA compliance.

If the Neo4j database goes down for 5 minutes, the *Graph Builder Worker* simply pauses. The events stack up safely in Kafka. When Neo4j comes back online, the worker consumes the backlog, ensuring zero clinical data is ever lost.

### 8.3 Distributed Task Queues (Celery)
While Kafka handles massive data streams, Bioquora uses **Celery** (backed by Redis or RabbitMQ) for executing heavy, background computational tasks triggered directly by user interactions in the Bioquora UI.

*   **Example:** A physician clicks "Generate 3D Trajectory" in the Phase 5 dashboard.
*   This triggers a complex ML inference script (XGBoost SHAP value calculation) that takes 15 seconds to run.
*   The FastAPI web server cannot wait 15 seconds; it would freeze the UI. Instead, the API pushes a task to the Celery queue and immediately returns a `202 Accepted` status with a `TaskID` to the frontend.
*   A fleet of background Celery workers picks up the task, executes the heavy ML math, and pushes the result back to the Redis cache, which is then streamed to the UI via WebSockets.

---
*End of Chapter 8. Proceed to Chapter 9: Search Infrastructure.*
