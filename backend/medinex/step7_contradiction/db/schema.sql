-- Step 7: Claim store schema (Postgres / matches db/postgres_client.py)
-- Run with: psql $POSTGRES_DSN -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS papers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT NOT NULL,
    doi         TEXT UNIQUE,
    pubmed_id   TEXT UNIQUE,
    abstract    TEXT,
    full_text   TEXT,
    published_at DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claims (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id        UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,

    subject         TEXT NOT NULL,
    relation        TEXT NOT NULL,
    object          TEXT NOT NULL,
    population      TEXT,

    evidence_text   TEXT NOT NULL,
    confidence      FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

    -- normalized entity ids, filled in by an entity-linking pass (Step 5/6)
    subject_entity_id  TEXT,
    object_entity_id   TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_paper_id    ON claims(paper_id);
CREATE INDEX IF NOT EXISTS idx_claims_subject      ON claims(subject);
CREATE INDEX IF NOT EXISTS idx_claims_object       ON claims(object);
CREATE INDEX IF NOT EXISTS idx_claims_relation     ON claims(relation);
CREATE INDEX IF NOT EXISTS idx_claims_subj_obj     ON claims(subject_entity_id, object_entity_id);

CREATE TABLE IF NOT EXISTS contradictions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_a_id      UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    claim_b_id      UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    nli_label       TEXT NOT NULL CHECK (nli_label IN ('contradiction', 'entailment', 'neutral')),
    nli_confidence  FLOAT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (claim_a_id, claim_b_id)
);

CREATE INDEX IF NOT EXISTS idx_contradictions_claim_a ON contradictions(claim_a_id);
CREATE INDEX IF NOT EXISTS idx_contradictions_claim_b ON contradictions(claim_b_id);

CREATE TABLE IF NOT EXISTS research_opportunities (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_entity_id   TEXT NOT NULL,
    object_entity_id    TEXT NOT NULL,
    novelty             FLOAT NOT NULL,
    impact              FLOAT NOT NULL,
    graph_centrality    FLOAT NOT NULL,
    evidence_support    FLOAT NOT NULL,
    score               FLOAT NOT NULL,
    rationale           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_score ON research_opportunities(score DESC);

CREATE TABLE IF NOT EXISTS hypotheses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id          TEXT NOT NULL,
    hypothesis_text     TEXT NOT NULL,
    supporting_claim_ids UUID[] NOT NULL,
    contradicting_claim_ids UUID[] NOT NULL,
    generated_by_model  TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
