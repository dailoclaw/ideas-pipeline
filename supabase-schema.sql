-- Ideas Pipeline — Supabase schema
-- Run this in your Supabase SQL Editor before first deploy

-- ── Ideas ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id           integer PRIMARY KEY,
  name         text    NOT NULL,
  status       text    NOT NULL DEFAULT 'idea',
  time         text,
  plat         text,
  pitch        text    DEFAULT '',
  target       text    DEFAULT '',
  pain         text    DEFAULT '',
  mvp          text[]  DEFAULT '{}',
  win          text    DEFAULT '',
  notes        text    DEFAULT '',
  added_at     date,
  is_seed      boolean DEFAULT true,
  is_v2        boolean DEFAULT false,
  original_id  integer,
  score_adjust integer NOT NULL DEFAULT 0,
  is_priority  boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Keep existing installations aligned when this schema is run as an upgrade.
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS score_adjust integer NOT NULL DEFAULT 0;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS is_priority boolean NOT NULL DEFAULT false;

-- ── Status overrides (for seed ideas — keeps them immutable) ─────────────────
CREATE TABLE IF NOT EXISTS status_overrides (
  idea_id  integer PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
  status   text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ── Status history ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_history (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idea_id     integer NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  status      text    NOT NULL,
  changed_at  date    NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now()
);

-- ── Sprint planning ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sprint_assignments (
  idea_id     integer PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
  week_num    integer NOT NULL CHECK (week_num BETWEEN 1 AND 8),
  updated_at  timestamptz DEFAULT now()
);

-- ── Workspace assignments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idea_group_assignments (
  idea_id     integer PRIMARY KEY REFERENCES ideas(id) ON DELETE CASCADE,
  group_key   text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

-- ── Activity & decision timeline ────────────────────────────────────────────
-- Stores the richer audit trail shown in the idea detail Activity tab. Payload
-- contains event-specific before/after values without duplicating idea content.
CREATE TABLE IF NOT EXISTS idea_activity (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idea_id      integer NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor        text NOT NULL DEFAULT 'You',
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ideas_status   ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_history_idea   ON status_history(idea_id);
CREATE INDEX IF NOT EXISTS idx_activity_idea  ON idea_activity(idea_id, occurred_at DESC);

-- ── Row Level Security (disable for personal tool — single user, no auth) ────
ALTER TABLE ideas           DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_history   DISABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE idea_group_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE idea_activity    DISABLE ROW LEVEL SECURITY;
