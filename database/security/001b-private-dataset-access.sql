-- LOCAL CANDIDATE: inspect/backup/restore staging before approved installation.
-- Order: schema, 001 membership, this candidate, 002 transactions, 003 outbox, 004 constraints.
-- One administrator-maintained private dataset; workspaces are not ownership boundaries.
BEGIN;
DO $$
DECLARE table_name text; policy_row record; column_list text; sequence_name text;
BEGIN
  IF to_regprocedure('public.can_access_ideas()') IS NULL
    OR to_regclass('app_private.idea_members') IS NULL THEN
    RAISE EXCEPTION 'Install and review membership migration 001 first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid='public.can_access_ideas()'::regprocedure
    AND prosecdef AND proconfig @> ARRAY['search_path=""']) THEN
    RAISE EXCEPTION 'Membership helper must use reviewed SECURITY DEFINER and empty search_path';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid='public.can_access_ideas()'::regprocedure
    AND (pg_has_role('anon',p.proowner,'MEMBER') OR pg_has_role('authenticated',p.proowner,'MEMBER'))) THEN
    RAISE EXCEPTION 'Client role can assume membership helper ownership';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles r WHERE (rolsuper OR rolbypassrls OR rolcreaterole)
    AND (pg_has_role('anon',r.oid,'MEMBER') OR pg_has_role('authenticated',r.oid,'MEMBER'))) THEN
    RAISE EXCEPTION 'Client roles must not be privileged or bypass RLS';
  END IF;
  FOREACH table_name IN ARRAY ARRAY['ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=table_name AND c.relkind='r') THEN
      RAISE EXCEPTION 'Missing or unsupported application table: %', table_name;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class c WHERE c.oid=to_regclass('public.'||table_name)
      AND (pg_has_role('authenticated',c.relowner,'MEMBER') OR pg_has_role('anon',c.relowner,'MEMBER'))) THEN
      RAISE EXCEPTION 'Client role can assume table ownership: %', table_name;
    END IF;
  END LOOP;
  REVOKE ALL ON SCHEMA app_private FROM PUBLIC,anon,authenticated;
  FOREACH table_name IN ARRAY ARRAY['idea_members','idea_mutation_requests'] LOOP
    IF to_regclass('app_private.'||table_name) IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM pg_class c WHERE c.oid=to_regclass('app_private.'||table_name)
      AND (pg_has_role('anon',c.relowner,'MEMBER') OR pg_has_role('authenticated',c.relowner,'MEMBER'))) THEN
      RAISE EXCEPTION 'Client role can assume private table ownership';
    END IF;
    EXECUTE format('LOCK TABLE app_private.%I IN ACCESS EXCLUSIVE MODE',table_name);
    EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',table_name);
    FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='app_private' AND tablename=table_name LOOP
      EXECUTE format('DROP POLICY %I ON app_private.%I',policy_row.policyname,table_name);
    END LOOP;
    EXECUTE format('REVOKE ALL ON TABLE app_private.%I FROM PUBLIC,anon,authenticated',table_name);
    SELECT string_agg(quote_ident(attname),',') INTO column_list FROM pg_attribute
      WHERE attrelid=to_regclass('app_private.'||table_name) AND attnum>0 AND NOT attisdropped;
    EXECUTE format('REVOKE ALL (%s) ON TABLE app_private.%I FROM PUBLIC,anon,authenticated',column_list,table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments'] LOOP
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    -- A remaining permissive policy would OR with membership and reopen access.
    FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=table_name LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',policy_row.policyname,table_name);
    END LOOP;
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',table_name);
    -- Table-level REVOKE does not remove previously granted column privileges.
    SELECT string_agg(quote_ident(attname),',') INTO column_list FROM pg_attribute
      WHERE attrelid=to_regclass('public.'||table_name) AND attnum>0 AND NOT attisdropped;
    EXECUTE format('REVOKE ALL (%s) ON TABLE public.%I FROM PUBLIC,anon,authenticated',column_list,table_name);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated',table_name);
    EXECUTE format('CREATE POLICY dataset_member_read ON public.%I FOR SELECT TO authenticated USING ((SELECT public.can_access_ideas()))',table_name);
    FOR sequence_name IN SELECT pg_get_serial_sequence('public.'||table_name,attname) FROM pg_attribute
      WHERE attrelid=to_regclass('public.'||table_name) AND attnum>0 AND NOT attisdropped
      AND pg_get_serial_sequence('public.'||table_name,attname) IS NOT NULL LOOP
      EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC,anon,authenticated',sequence_name);
    END LOOP;
  END LOOP;
END $$;
GRANT UPDATE(name,time,plat,pitch,target,pain,mvp,win,notes,score_adjust,is_priority,updated_at)
  ON public.ideas TO authenticated;
GRANT DELETE ON public.ideas TO authenticated;
CREATE POLICY dataset_member_edit ON public.ideas FOR UPDATE TO authenticated
  USING ((SELECT public.can_access_ideas())) WITH CHECK ((SELECT public.can_access_ideas()));
CREATE POLICY dataset_member_delete ON public.ideas FOR DELETE TO authenticated
  USING ((SELECT public.can_access_ideas()) AND is_seed IS FALSE);

-- Upsert may assign idea_id again on conflict; parent visibility and FKs guard it.
GRANT INSERT(idea_id,group_key,updated_at),UPDATE(idea_id,group_key,updated_at),DELETE
  ON public.idea_group_assignments TO authenticated;
GRANT INSERT(idea_id,week_num,updated_at),UPDATE(idea_id,week_num,updated_at),DELETE
  ON public.sprint_assignments TO authenticated;
CREATE POLICY dataset_member_assignment ON public.idea_group_assignments FOR ALL TO authenticated
  USING ((SELECT public.can_access_ideas()) AND EXISTS(SELECT 1 FROM public.ideas WHERE id=idea_id))
  WITH CHECK ((SELECT public.can_access_ideas()) AND EXISTS(SELECT 1 FROM public.ideas WHERE id=idea_id));
CREATE POLICY dataset_member_assignment ON public.sprint_assignments FOR ALL TO authenticated
  USING ((SELECT public.can_access_ideas()) AND EXISTS(SELECT 1 FROM public.ideas WHERE id=idea_id))
  WITH CHECK ((SELECT public.can_access_ideas()) AND EXISTS(SELECT 1 FROM public.ideas WHERE id=idea_id));
-- Reject inherited privileges we cannot safely revoke from an unrelated role.
DO $$
DECLARE table_name text; column_name text; sequence_name text;
BEGIN
  IF has_schema_privilege('anon','app_private','USAGE,CREATE') OR has_schema_privilege('authenticated','app_private','USAGE,CREATE') THEN
    RAISE EXCEPTION 'Unexpected inherited private-schema privileges';
  END IF;
  FOREACH table_name IN ARRAY ARRAY['idea_members','idea_mutation_requests'] LOOP
    IF to_regclass('app_private.'||table_name) IS NOT NULL AND
      (has_any_column_privilege('anon','app_private.'||table_name,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_any_column_privilege('authenticated','app_private.'||table_name,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_table_privilege('anon','app_private.'||table_name,'DELETE,TRUNCATE,TRIGGER')
      OR has_table_privilege('authenticated','app_private.'||table_name,'DELETE,TRUNCATE,TRIGGER')) THEN
      RAISE EXCEPTION 'Unexpected inherited private-table privileges';
    END IF;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments'] LOOP
    IF has_table_privilege('anon','public.'||table_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_any_column_privilege('anon','public.'||table_name,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_table_privilege('authenticated','public.'||table_name,'TRUNCATE,REFERENCES,TRIGGER')
      OR has_any_column_privilege('authenticated','public.'||table_name,'REFERENCES') THEN
      RAISE EXCEPTION 'Unexpected inherited client privileges on %; inspect role grants',table_name;
    END IF;
    IF table_name IN ('status_overrides','status_history','idea_activity') AND
      (has_any_column_privilege('authenticated','public.'||table_name,'INSERT,UPDATE,REFERENCES')
      OR has_table_privilege('authenticated','public.'||table_name,'DELETE')) THEN
      RAISE EXCEPTION 'Unexpected inherited audit/status write privileges on %',table_name;
    END IF;
    FOR sequence_name IN SELECT pg_get_serial_sequence('public.'||table_name,attname) FROM pg_attribute
      WHERE attrelid=to_regclass('public.'||table_name) AND attnum>0 AND NOT attisdropped
      AND pg_get_serial_sequence('public.'||table_name,attname) IS NOT NULL LOOP
      IF has_sequence_privilege('anon',sequence_name,'USAGE,SELECT,UPDATE')
        OR has_sequence_privilege('authenticated',sequence_name,'USAGE,SELECT,UPDATE') THEN
        RAISE EXCEPTION 'Unexpected inherited client sequence privileges: %',sequence_name;
      END IF;
    END LOOP;
  END LOOP;
  IF has_any_column_privilege('authenticated','public.ideas','INSERT') THEN
    RAISE EXCEPTION 'Unexpected inherited idea insertion privileges';
  END IF;
  FOREACH column_name IN ARRAY ARRAY['id','status','is_seed','is_v2','original_id','created_at','added_at'] LOOP
    IF has_column_privilege('authenticated','public.ideas',column_name,'UPDATE') THEN
      RAISE EXCEPTION 'Unexpected inherited protected-column privilege: %',column_name;
    END IF;
  END LOOP;
END $$;
-- No client INSERT into ideas or writes to override/history/activity tables.
-- Reviewed SECURITY DEFINER RPCs from 002/003 are the authorized mutation paths.
COMMIT;
