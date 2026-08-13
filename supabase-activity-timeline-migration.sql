-- IdeaFlow v1.5.0 — Activity & Decision Timeline
-- Safe to run once in the Supabase SQL editor for an existing deployment.

CREATE TABLE IF NOT EXISTS idea_activity (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idea_id      integer NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor        text NOT NULL DEFAULT 'You',
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_idea
  ON idea_activity(idea_id, occurred_at DESC);

ALTER TABLE idea_activity DISABLE ROW LEVEL SECURITY;
