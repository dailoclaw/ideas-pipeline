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
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

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

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ideas_status   ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_history_idea   ON status_history(idea_id);

-- ── Row Level Security (disable for personal tool — single user, no auth) ────
ALTER TABLE ideas           DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_history   DISABLE ROW LEVEL SECURITY;
