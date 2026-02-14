-- Early access signups table
CREATE TABLE public.early_access_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT,
  institution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interaction events for analytics
CREATE TABLE public.interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  module TEXT,
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback responses
CREATE TABLE public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.early_access_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- Public insert policies (no auth required for signups/feedback)
CREATE POLICY "Anyone can sign up for early access"
  ON public.early_access_signups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can log interaction events"
  ON public.interaction_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback_responses FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_interaction_events_type ON public.interaction_events(event_type);
CREATE INDEX idx_interaction_events_module ON public.interaction_events(module);
CREATE INDEX idx_interaction_events_created ON public.interaction_events(created_at DESC);