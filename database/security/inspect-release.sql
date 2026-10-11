-- Local step 2/12 inspection candidate. Administrator metadata only; no application rows.
-- Run only in an approved workflow after live backup/staging deferral is lifted.
BEGIN TRANSACTION READ ONLY;

-- Keep missing private relations visible, including audit rollout prerequisites.
WITH expected(schema_name,relation_name) AS (VALUES
 ('app_private','idea_members'),('app_private','idea_mutation_requests'),
 ('app_private','idea_change_audit'))
SELECT e.*, c.oid IS NOT NULL AS relation_exists, c.relkind,
 pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity AS rls_enabled,
 c.relforcerowsecurity AS rls_forced
FROM expected e LEFT JOIN pg_namespace n ON n.nspname=e.schema_name
LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=e.relation_name
ORDER BY e.relation_name;

-- Effective schema/table/column access includes inherited grants and owner privileges.
WITH roles(name) AS (VALUES ('anon'),('authenticated'),('service_role')),
expected(name) AS (VALUES ('idea_members'),('idea_mutation_requests'),('idea_change_audit'))
SELECT r.name AS role_name,e.name AS relation_name,pr.oid IS NOT NULL AS role_exists,
 CASE WHEN pr.oid IS NOT NULL AND n.oid IS NOT NULL THEN has_schema_privilege(pr.oid,n.oid,'USAGE') END AS schema_usage,
 CASE WHEN pr.oid IS NOT NULL AND n.oid IS NOT NULL THEN has_schema_privilege(pr.oid,n.oid,'CREATE') END AS schema_create,
 CASE WHEN pr.oid IS NOT NULL AND c.relkind IN ('r','p') THEN pg_has_role(pr.oid,c.relowner,'MEMBER') END AS can_assume_owner,
 CASE WHEN pr.oid IS NOT NULL AND c.relkind IN ('r','p') THEN has_table_privilege(pr.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') END AS any_table_privilege,
 CASE WHEN pr.oid IS NOT NULL AND c.relkind IN ('r','p') THEN has_any_column_privilege(pr.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') END AS any_column_privilege
FROM roles r CROSS JOIN expected e LEFT JOIN pg_roles pr ON pr.rolname=r.name
LEFT JOIN pg_namespace n ON n.nspname='app_private'
LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=e.name
ORDER BY r.name,e.name;

-- Helpers must have reviewed owners, definer mode, search paths and execution grants.
WITH expected(signature) AS (VALUES
 ('public.can_access_ideas()'),('public.create_idea(uuid,jsonb)'),
 ('public.change_idea_status(uuid,integer,text,text)'),
 ('public.record_idea_activity(uuid,integer,text,jsonb,timestamp with time zone)'),
 ('app_private.stamp_idea_mutation()'),('app_private.audit_idea_mutation()')),
roles(name) AS (VALUES ('anon'),('authenticated'),('service_role'))
SELECT e.signature,p.oid IS NOT NULL AS function_exists,pg_get_userbyid(p.proowner) AS owner,
 p.prosecdef AS security_definer,p.proconfig AS function_settings,r.name AS role_name,
 pr.oid IS NOT NULL AS role_exists,
 CASE WHEN p.oid IS NOT NULL AND pr.oid IS NOT NULL THEN has_function_privilege(pr.oid,p.oid,'EXECUTE') END AS can_execute,
 CASE WHEN p.oid IS NOT NULL AND pr.oid IS NOT NULL THEN pg_has_role(pr.oid,p.proowner,'MEMBER') END AS can_assume_owner
FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
CROSS JOIN roles r LEFT JOIN pg_roles pr ON pr.rolname=r.name
ORDER BY e.signature,r.name;

-- Report required trigger absence and actual timing/events/function settings.
WITH expected(table_name,trigger_name) AS (
 SELECT t,n FROM unnest(ARRAY['ideas','status_overrides','idea_group_assignments','sprint_assignments']) t
 CROSS JOIN unnest(ARRAY['idea_server_stamp','idea_canonical_audit']) n)
SELECT e.*,t.oid IS NOT NULL AS trigger_exists,t.tgenabled,
 CASE WHEN t.oid IS NOT NULL THEN pg_get_triggerdef(t.oid) END AS definition,
 p.oid::regprocedure AS function_name,pg_get_userbyid(p.proowner) AS function_owner,
 p.prosecdef AS security_definer,p.proconfig AS function_settings
FROM expected e LEFT JOIN pg_namespace ns ON ns.nspname='public'
LEFT JOIN pg_class c ON c.relnamespace=ns.oid AND c.relname=e.table_name
LEFT JOIN pg_trigger t ON t.tgrelid=c.oid AND t.tgname=e.trigger_name AND NOT t.tgisinternal
LEFT JOIN pg_proc p ON p.oid=t.tgfoid ORDER BY e.table_name,e.trigger_name;

-- Other triggers can interact with or bypass assumptions; report all, not only known names.
SELECT c.relname AS table_name,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition,
 p.oid::regprocedure AS function_name,pg_get_userbyid(p.proowner) AS function_owner,
 p.prosecdef AS security_definer,p.proconfig AS function_settings
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid
WHERE NOT t.tgisinternal AND n.nspname='public'
 AND c.relname IN ('ideas','status_overrides','idea_group_assignments','sprint_assignments')
ORDER BY c.relname,t.tgname;

-- Private sequences and inherited access must also remain closed.
SELECT c.relname AS sequence_name,pg_get_userbyid(c.relowner) AS owner,r.rolname AS role_name,
 has_sequence_privilege(r.oid,c.oid,'USAGE,SELECT,UPDATE') AS any_sequence_privilege
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN pg_roles r WHERE c.relkind='S' AND n.nspname='app_private'
 AND r.rolname IN ('anon','authenticated','service_role') ORDER BY c.relname,r.rolname;
COMMIT;
