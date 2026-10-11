-- Post-installation checks only; no application writes or synthetic Auth users.
BEGIN TRANSACTION READ ONLY;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM count(*) FROM public.ideas;
    RAISE EXCEPTION 'Anonymous read unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.can_access_ideas() OR (SELECT count(*) FROM public.ideas)<>0 THEN
    RAISE EXCEPTION 'Unenrolled identity unexpectedly has access'; END IF;
  BEGIN
    PERFORM public.create_idea('00000000-0000-0000-0000-000000000001','{}'::jsonb);
    RAISE EXCEPTION 'Unenrolled create unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.change_idea_status('00000000-0000-0000-0000-000000000001',101,'idea','idea');
    RAISE EXCEPTION 'Unenrolled status unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.record_idea_activity('00000000-0000-0000-0000-000000000001',101,'notes_updated','{}'::jsonb,now());
    RAISE EXCEPTION 'Unenrolled activity unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM count(*) FROM app_private.idea_members;
    RAISE EXCEPTION 'Client membership read unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'ideas' AS check_name,count(*)::bigint AS result FROM public.ideas
UNION ALL SELECT 'max_idea_id',max(id) FROM public.ideas
UNION ALL SELECT 'protected_public_tables',count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments') AND c.relrowsecurity
UNION ALL SELECT 'anonymous_table_grants',count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments') AND (has_table_privilege('anon','public.'||tablename,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege('anon','public.'||tablename,'SELECT,INSERT,UPDATE,REFERENCES'))
UNION ALL SELECT 'canonical_audit_triggers',count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('idea_server_stamp','idea_canonical_audit') AND tgenabled='O'
UNION ALL SELECT 'classification_guard',count(*) FROM pg_trigger WHERE tgname='idea_classification_guard' AND tgenabled='O'
UNION ALL SELECT 'validated_rollout_constraints',count(*) FROM pg_constraint WHERE convalidated AND conname IN ('ideas_valid_name','ideas_valid_pitch','ideas_valid_text_lengths','ideas_valid_mvp','ideas_valid_adjustment','groups_valid_key','overrides_valid_status','groups_idea_cascade_fk','sprints_valid_week')
UNION ALL SELECT 'auth_users',count(*) FROM auth.users
UNION ALL SELECT 'dataset_members',count(*) FROM app_private.idea_members
UNION ALL SELECT 'canonical_audit_rows',count(*) FROM app_private.idea_change_audit;
COMMIT;
-- This checks SQL roles with no identity, not real JWT/PostgREST/browser acceptance.
