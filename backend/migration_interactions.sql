-- Migration: 0012_user_paper_interactions.sql
-- Run this against your Bioquora Postgres database

CREATE TABLE IF NOT EXISTS user_paper_interactions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id    UUID        NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    event_type  TEXT        NOT NULL
                              CHECK (event_type IN
                                ('read','dwell','share','save','cite','downvote')),
    weight      FLOAT       NOT NULL,
    metadata    JSONB       DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite unique: one row per (user, paper, event_type)
CREATE UNIQUE INDEX IF NOT EXISTS uq_interaction
    ON user_paper_interactions (user_id, paper_id, event_type);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_interactions_user
    ON user_paper_interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_paper
    ON user_paper_interactions (paper_id);
CREATE INDEX IF NOT EXISTS idx_interactions_event
    ON user_paper_interactions (event_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created
    ON user_paper_interactions (created_at DESC);

-- Row-Level Security: users see only their own rows
ALTER TABLE user_paper_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS own_rows ON user_paper_interactions
    USING (user_id = current_setting('app.user_id')::UUID);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interactions_updated_at
    BEFORE UPDATE ON user_paper_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
