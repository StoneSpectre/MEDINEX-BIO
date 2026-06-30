# Volume II: Biomedical Infrastructure

## Chapter 7: API Architecture & Data Serving

The immense computational power of the Bioquora Data Lake and the Neo4j Knowledge Graph is useless if it cannot be accessed rapidly and securely by end-users. The API Layer acts as the highly optimized membrane through which frontends (like the Bioquora React Dashboard), external hospital systems, and AI Copilots interact with the internal engines.

Because Bioquora handles both massive graph traversals and real-time clinical streaming, a single API protocol is insufficient. Bioquora deploys a multi-protocol API architecture.

### 7.1 REST (Representational State Transfer)
**Purpose:** High-throughput, flat resource retrieval and basic CRUD (Create, Read, Update, Delete) operations.
*   **Implementation:** Built using **FastAPI** (Python). FastAPI utilizes the modern ASGI standard (`uvicorn`), allowing asynchronous execution. If an API request requires fetching data from the PostgreSQL database, the Python worker does not block while waiting for the database to respond; it immediately handles other incoming requests.
*   **Use Cases:** Used for fetching static user profiles, authentication tokens, and basic tabular data (e.g., `GET /api/v1/patients/123/lab-history`).

### 7.2 GraphQL: The Primary Data Engine
**Purpose:** Solving the massive "N+1" querying problem inherent to deep biological networks.
*   **The Problem with REST in Biology:** If a React UI needs to display a patient, their genetic variants, the genes those variants affect, the pathways those genes belong to, and the drugs targeting those pathways, a REST architecture would require the frontend to make dozens of sequential API calls. This results in catastrophic network latency (the N+1 problem) and severe "over-fetching" (downloading megabytes of unused JSON data).
*   **The GraphQL Solution:** Bioquora utilizes **Strawberry** (a Python GraphQL library) connected directly to Neo4j via neo4j-graphql adapters. 
*   **Execution:** The frontend sends a single, highly specific GraphQL query string describing the exact nested shape of the data it needs. The Bioquora GraphQL server translates this incoming query directly into a highly optimized Neo4j Cypher query, executes the deep graph traversal in a single database hit, and returns exactly the JSON requested—nothing more, nothing less.

### 7.3 Streaming APIs (WebSockets & gRPC)
**Purpose:** Real-time, ultra-low latency telemetry for the Patient Digital Twin (Phase 5).
*   **WebSockets:** When a physician is viewing the 3D Digital Twin avatar, polling a REST API every second for heart rate updates is violently inefficient. Bioquora establishes a persistent, bi-directional WebSocket connection. When the internal Kafka broker receives a new vitals reading from an ICU monitor, the Bioquora backend instantly pushes that data packet over the WebSocket to the React UI, updating the charts in milliseconds.
*   **gRPC:** While WebSockets handle backend-to-frontend communication, internal microservices (e.g., the ML Inference Worker talking to the Graph Builder) use **gRPC**. Built by Google, gRPC uses Protocol Buffers (`protobuf`), a strictly typed, binary serialization format that is vastly faster and smaller than JSON, allowing microservices to communicate at near native-memory speeds.

### 7.4 Security, Authentication, & API Gateway
Healthcare APIs are prime targets for cyberattacks and must adhere strictly to HIPAA/GDPR regulations.
1.  **The API Gateway (Kong / AWS API Gateway):** All incoming traffic hits the Gateway first. The Gateway acts as a shield, handling SSL termination, IP whitelisting, and protection against DDoS attacks.
2.  **Rate Limiting & Throttling:** Graph traversals are computationally expensive. A malicious actor could easily crash the Neo4j cluster by sending a deeply nested, unbounded GraphQL query. The API Gateway enforces strict rate limits (e.g., 100 requests per minute) and the GraphQL server executes Query Complexity Analysis to reject queries that demand too much CPU time before they even reach the database.
3.  **Authentication (OAuth2 & OIDC):** Bioquora uses OpenID Connect (OIDC) with JSON Web Tokens (JWT). When a user logs in, they receive a cryptographically signed JWT. Every API request must include this token in the `Authorization` header.
4.  **Authorization (RBAC & ABAC):** Fast API middleware validates the JWT and enforces Role-Based Access Control (RBAC). Furthermore, Bioquora uses Attribute-Based Access Control (ABAC). Even if a researcher has the role `DataScientist`, ABAC ensures they can only query data where the `patient_consent_status` attribute equals `TRUE`.

---
*End of Chapter 7. Proceed to Chapter 8: Pipeline Orchestration.*
