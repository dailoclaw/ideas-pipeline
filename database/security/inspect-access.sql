-- Step 2 / v1.8.3: metadata inspection only. Run on staging first.
-- No row contents, credentials, auth user identities or function bodies are returned.
BEGIN TRANSACTION READ ONLY;

-- Missing relations remain visible; RLS alone does not prove access is restricted.
WITH expected(name) AS (VALUES ('ideas'), ('status_overrides'), ('status_history'),
  ('sprint_assignments'), ('idea_group_assignments'), ('idea_activity'))
SELECT e.name AS table_name, c.oid IS NOT NULL AS exists,
  pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM expected e
LEFT JOIN pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = e.name
  AND c.relkind IN ('r', 'p')
ORDER BY e.name;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN
  ('ideas','status_overrides','status_history','sprint_assignments',
   'idea_group_assignments','idea_activity')
ORDER BY tablename, policyname;

-- ACL expansion includes PUBLIC and inherited owner defaults absent from simple grants views.
SELECT c.relname AS table_name,
  CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
  a.privilege_type, a.is_grantable
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
WHERE n.nspname = 'public' AND c.relname IN
  ('ideas','status_overrides','status_history','sprint_assignments',
   'idea_group_assignments','idea_activity') AND c.relkind IN ('r','p')
ORDER BY c.relname, grantee, a.privilege_type;

SELECT table_name, column_name, grantee, privilege_type, is_grantable
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name IN
  ('ideas','status_overrides','status_history','sprint_assignments',
   'idea_group_assignments','idea_activity')
ORDER BY table_name, column_name, grantee;

-- Effective privileges include role inheritance; missing roles are reported rather than failing.
WITH roles(name) AS (VALUES ('anon'), ('authenticated'), ('service_role')),
expected(name) AS (VALUES ('ideas'), ('status_overrides'), ('status_history'),
 ('sprint_assignments'), ('idea_group_assignments'), ('idea_activity'))
SELECT r.name AS role_name, e.name AS table_name, pr.oid IS NOT NULL AS role_exists,
 CASE WHEN pr.oid IS NOT NULL AND c.oid IS NOT NULL THEN has_table_privilege(pr.oid,c.oid,'SELECT') END AS can_select,
 CASE WHEN pr.oid IS NOT NULL AND c.oid IS NOT NULL THEN has_table_privilege(pr.oid,c.oid,'INSERT') END AS can_insert,
 CASE WHEN pr.oid IS NOT NULL AND c.oid IS NOT NULL THEN has_table_privilege(pr.oid,c.oid,'UPDATE') END AS can_update,
 CASE WHEN pr.oid IS NOT NULL AND c.oid IS NOT NULL THEN has_table_privilege(pr.oid,c.oid,'DELETE') END AS can_delete
FROM roles r CROSS JOIN expected e
LEFT JOIN pg_roles pr ON pr.rolname = r.name
LEFT JOIN pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = e.name AND c.relkind IN ('r','p')
ORDER BY r.name, e.name;

SELECT rolname, rolsuper, rolbypassrls, rolinherit
FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role');

SELECT c.relname AS table_name, con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN
 ('ideas','status_overrides','status_history','sprint_assignments',
  'idea_group_assignments','idea_activity')
ORDER BY c.relname, con.conname;

-- Review all public functions: RPCs can bypass table policies through SECURITY DEFINER.
SELECT p.oid::regprocedure AS function_name, p.prosecdef AS security_definer,
 pg_get_userbyid(p.proowner) AS owner, p.proconfig AS function_settings,
 CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
 a.privilege_type
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
WHERE n.nspname = 'public' ORDER BY p.oid::regprocedure::text, grantee;

SELECT c.relname AS table_name, t.tgname, t.tgfoid::regprocedure AS function_name, t.tgenabled
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname = 'public' AND c.relname IN
 ('ideas','status_overrides','status_history','sprint_assignments',
  'idea_group_assignments','idea_activity') ORDER BY c.relname, t.tgname;

SELECT n.nspname, d.defaclobjtype, pg_get_userbyid(d.defaclrole) AS owner,
 CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
 a.privilege_type
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) a
WHERE n.nspname = 'public' OR d.defaclnamespace = 0;

COMMIT;
