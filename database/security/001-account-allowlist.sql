-- LOCAL DRAFT: do not deploy before backup, restored staging and coordinated rollout.
-- This installs the gate's membership RPC only. Six-table RLS/audit work is still pending.
-- Run as an administrator. Empty membership denies everyone; enroll by Auth user UUID.
BEGIN;
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS app_private.idea_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.idea_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.idea_members FROM PUBLIC, anon, authenticated;

-- No arguments: callers cannot probe other accounts. Fully qualified names and locked path.
CREATE OR REPLACE FUNCTION public.can_access_ideas()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_private.idea_members m WHERE m.user_id = (SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_ideas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_ideas() TO authenticated;
COMMIT;

-- Administrator enrollment, after confirming the exact existing Auth user UUID:
-- INSERT INTO app_private.idea_members(user_id) VALUES ('<approved-auth-user-uuid>');
-- Never add policies allowing client roles to edit membership.
