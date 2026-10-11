-- One-shot live rollout; execute the entire file once, as database administrator.
-- Explicit user authorization: migrate without backup (2026-10-11).
-- No existing application row is inserted, updated or deleted.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.ideas,public.status_overrides,public.status_history,public.idea_activity,public.idea_group_assignments,public.sprint_assignments IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE rollout_before(table_name text PRIMARY KEY,row_count bigint,row_hash text) ON COMMIT DROP;
DO $$
DECLARE t text; n bigint; h text;
BEGIN
  IF to_regclass('app_private.idea_members') IS NOT NULL OR to_regprocedure('public.can_access_ideas()') IS NOT NULL THEN
    RAISE EXCEPTION 'Existing rollout detected; inspect rather than re-run'; END IF;
  FOREACH t IN ARRAY ARRAY['ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments'] LOOP
    EXECUTE format('SELECT count(*),md5(coalesce(string_agg(row_value,E''\n'' ORDER BY row_value),'''')) FROM (SELECT (to_jsonb(r)-''client_request_id'')::text AS row_value FROM public.%I r) rows',t) INTO n,h;
    INSERT INTO rollout_before VALUES(t,n,h);
  END LOOP;
END $$;
-- Missing legacy group FK: validation fails safely if orphan records exist.
ALTER TABLE public.idea_group_assignments ADD CONSTRAINT groups_idea_cascade_fk FOREIGN KEY(idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;
ALTER TABLE public.sprint_assignments ADD CONSTRAINT sprints_valid_week CHECK(week_num IS NOT NULL AND week_num BETWEEN 1 AND 8);
-- Source: database/security/001-account-allowlist.sql
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS app_private.idea_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.idea_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.idea_members FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_access_ideas()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_private.idea_members m WHERE m.user_id = (SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_ideas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_ideas() TO authenticated;


-- Source: database/security/001b-private-dataset-access.sql
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
    FOR policy_row IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=table_name LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',policy_row.policyname,table_name);
    END LOOP;
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',table_name);
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

-- Source: database/integrity/002-transaction-integrity.sql
LOCK TABLE public.ideas IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (VALUES ('ideas'), ('status_overrides'), ('status_history'),
      ('idea_activity'), ('idea_group_assignments'), ('sprint_assignments')) AS t(name)
    LEFT JOIN pg_catalog.pg_class c ON c.oid = pg_catalog.to_regclass('public.' || t.name)
    WHERE c.oid IS NULL OR NOT c.relrowsecurity
  ) THEN RAISE EXCEPTION 'Install and verify six-table RLS before transaction integrity'; END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES ('status_overrides'), ('status_history'), ('idea_activity'),
      ('idea_group_assignments'), ('sprint_assignments')) t(name)
    WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint c
      WHERE c.conrelid = pg_catalog.to_regclass('public.' || t.name)
        AND c.confrelid = 'public.ideas'::regclass AND c.contype = 'f' AND c.confdeltype = 'c'
        AND c.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.conrelid AND attname = 'idea_id')]
        AND c.confkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.confrelid AND attname = 'id')])
  ) THEN RAISE EXCEPTION 'All five child tables need cascading idea foreign keys'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.ideas'::regclass AND attname = 'id' AND attidentity <> '')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attrdef d JOIN pg_catalog.pg_attribute a
      ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      WHERE a.attrelid = 'public.ideas'::regclass AND a.attname = 'id')
    THEN RAISE EXCEPTION 'ID default already exists: inspect instead of resetting allocation'; END IF;
  IF (SELECT max(id) FROM public.ideas) >= 2147483647
    THEN RAISE EXCEPTION 'Integer ID range exhausted; migrate parent and child types first'; END IF;
END $$;
ALTER TABLE public.ideas ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
DO $$
DECLARE next_id bigint;
BEGIN
  SELECT greatest(coalesce(max(id)::bigint + 1, 1), 1) INTO next_id FROM public.ideas;
  EXECUTE format('ALTER SEQUENCE %s RESTART WITH %s',
    pg_catalog.pg_get_serial_sequence('public.ideas', 'id'), next_id);
  EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated',
    pg_catalog.pg_get_serial_sequence('public.ideas', 'id'));
END $$;

CREATE TABLE app_private.idea_mutation_requests (
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  operation text NOT NULL,
  payload jsonb NOT NULL,
  result jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, request_id)
);
ALTER TABLE app_private.idea_mutation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.idea_mutation_requests FROM PUBLIC, anon, authenticated;

CREATE FUNCTION app_private.replay_idea_request(p_request_id uuid, p_operation text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE existing app_private.idea_mutation_requests%ROWTYPE;
BEGIN
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'A request ID is required' USING ERRCODE = '22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || p_request_id::text, 0));
  SELECT * INTO existing FROM app_private.idea_mutation_requests
    WHERE actor_id = auth.uid() AND request_id = p_request_id;
  IF FOUND THEN
    IF existing.operation <> p_operation OR existing.payload <> p_payload THEN
      RAISE EXCEPTION 'This request was already saved with different values. Refresh before starting a new action.' USING ERRCODE = '23505';
    END IF;
    RETURN existing.result || jsonb_build_object('replayed', true);
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION app_private.replay_idea_request(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_idea(p_request_id uuid, p_fields jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea public.ideas%ROWTYPE; history public.status_history%ROWTYPE;
  activity public.idea_activity%ROWTYPE; result jsonb;
BEGIN
  IF auth.uid() IS NULL OR public.can_access_ideas() IS NOT TRUE
    THEN RAISE EXCEPTION 'Dataset access denied' USING ERRCODE = '42501'; END IF;
  IF p_fields IS NULL OR jsonb_typeof(p_fields) <> 'object'
    OR jsonb_typeof(p_fields->'name') <> 'string' OR jsonb_typeof(p_fields->'pitch') <> 'string'
    OR EXISTS (SELECT 1 FROM jsonb_each(p_fields) e WHERE e.key <> 'mvp' AND e.value <> 'null'::jsonb AND jsonb_typeof(e.value) <> 'string')
    OR coalesce(btrim(p_fields->>'name'), '') = ''
    OR coalesce(btrim(p_fields->>'pitch'), '') = ''
    OR jsonb_typeof(coalesce(p_fields->'mvp', '[]'::jsonb)) <> 'array'
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p_fields->'mvp', '[]'::jsonb)) v WHERE jsonb_typeof(v) <> 'string')
    OR p_fields - ARRAY['name','time','plat','pitch','target','pain','mvp','win','notes'] <> '{}'::jsonb
    THEN RAISE EXCEPTION 'Invalid idea fields' USING ERRCODE = '22023'; END IF;
  result := app_private.replay_idea_request(p_request_id, 'create', p_fields);
  IF result IS NOT NULL THEN RETURN result; END IF;
  INSERT INTO public.ideas(name, status, time, plat, pitch, target, pain, mvp, win, notes, added_at, is_seed)
    VALUES (p_fields->>'name', 'idea', coalesce(p_fields->>'time', '1-2w'), coalesce(p_fields->>'plat', 'html'),
      p_fields->>'pitch', coalesce(p_fields->>'target',''), coalesce(p_fields->>'pain',''),
      ARRAY(SELECT jsonb_array_elements_text(coalesce(p_fields->'mvp','[]'::jsonb))),
      coalesce(p_fields->>'win',''), coalesce(p_fields->>'notes',''), CURRENT_DATE, false)
    RETURNING * INTO idea;
  INSERT INTO public.status_history(idea_id, status) VALUES (idea.id, idea.status) RETURNING * INTO history;
  INSERT INTO public.idea_activity(idea_id, event_type, payload, actor)
    VALUES (idea.id, 'created', jsonb_build_object('name', idea.name), auth.uid()::text) RETURNING * INTO activity;
  result := jsonb_build_object('idea', to_jsonb(idea), 'override', NULL, 'history', to_jsonb(history), 'activity', to_jsonb(activity), 'replayed', false);
  INSERT INTO app_private.idea_mutation_requests(actor_id, request_id, operation, payload, result)
    VALUES (auth.uid(), p_request_id, 'create', p_fields, result);
  RETURN result;
END $$;

CREATE FUNCTION public.change_idea_status(p_request_id uuid, p_idea_id integer, p_status text, p_expected_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE idea public.ideas%ROWTYPE; history public.status_history%ROWTYPE;
  activity public.idea_activity%ROWTYPE; previous_status text; effective_status text;
  override_status text; payload jsonb; result jsonb;
BEGIN
  IF auth.uid() IS NULL OR public.can_access_ideas() IS NOT TRUE
    THEN RAISE EXCEPTION 'Dataset access denied' USING ERRCODE = '42501'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('idea','researching','ready','building','done','shelved')
    THEN RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023'; END IF;
  payload := jsonb_build_object('ideaId', p_idea_id, 'status', p_status, 'expectedStatus', p_expected_status);
  result := app_private.replay_idea_request(p_request_id, 'status', payload);
  IF result IS NOT NULL THEN RETURN result; END IF;
  SELECT * INTO idea FROM public.ideas WHERE id = p_idea_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Idea no longer exists' USING ERRCODE = 'P0002'; END IF;
  SELECT status INTO override_status FROM public.status_overrides WHERE idea_id = idea.id;
  previous_status := CASE WHEN idea.is_seed IS TRUE THEN coalesce(override_status, idea.status) ELSE idea.status END;
  IF previous_status IS DISTINCT FROM p_expected_status
    THEN RAISE EXCEPTION 'Status changed elsewhere. Refresh the dataset before retrying.' USING ERRCODE = '40001'; END IF;
  IF idea.is_seed IS NOT TRUE AND p_status IS NULL
    THEN RAISE EXCEPTION 'Choose a status for this idea' USING ERRCODE = '22023'; END IF;
  effective_status := coalesce(p_status, idea.status);
  IF idea.is_seed IS TRUE THEN
    IF p_status IS NULL THEN
      DELETE FROM public.status_overrides WHERE idea_id = idea.id;
      override_status := NULL;
    ELSE
      INSERT INTO public.status_overrides(idea_id, status) VALUES (idea.id, p_status)
        ON CONFLICT (idea_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();
      override_status := p_status;
    END IF;
  ELSE
    UPDATE public.ideas SET status = p_status, updated_at = now() WHERE id = idea.id RETURNING * INTO idea;
  END IF;
  IF previous_status IS DISTINCT FROM effective_status THEN
    INSERT INTO public.status_history(idea_id, status) VALUES (idea.id, effective_status) RETURNING * INTO history;
    INSERT INTO public.idea_activity(idea_id, event_type, payload, actor)
      VALUES (idea.id, 'status_changed', jsonb_build_object('from', previous_status, 'to', effective_status), auth.uid()::text)
      RETURNING * INTO activity;
  END IF;
  result := jsonb_build_object('idea', to_jsonb(idea), 'override', override_status, 'history',
    CASE WHEN history.id IS NOT NULL THEN to_jsonb(history) ELSE NULL END, 'activity',
    CASE WHEN activity.id IS NOT NULL THEN to_jsonb(activity) ELSE NULL END, 'replayed', false);
  INSERT INTO app_private.idea_mutation_requests(actor_id, request_id, operation, payload, result)
    VALUES (auth.uid(), p_request_id, 'status', payload, result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_idea(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_idea_status(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_idea(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_idea_status(uuid, integer, text, text) TO authenticated;

-- Source: database/history/003-activity-outbox.sql
DO $$ BEGIN
  IF to_regprocedure('app_private.replay_idea_request(uuid,text,jsonb)') IS NULL
    OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments') AND c.relrowsecurity) <> 6 THEN
    RAISE EXCEPTION 'Install migrations 001/002 and six-table authorization prerequisites first';
  END IF;
END $$;
ALTER TABLE public.idea_activity ADD COLUMN client_request_id uuid;
CREATE UNIQUE INDEX idea_activity_client_request ON public.idea_activity(actor,client_request_id);
CREATE FUNCTION app_private.activity_integer(value jsonb,low numeric,high numeric)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT CASE WHEN jsonb_typeof(value)='number' AND value::text ~ '^-?[0-9]+$'
    THEN value::text::numeric BETWEEN low AND high ELSE false END
$$;
REVOKE ALL ON FUNCTION app_private.activity_integer(jsonb,numeric,numeric) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.record_idea_activity(p_request_id uuid,p_idea_id integer,p_type text,p_payload jsonb,p_occurred_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE request_payload jsonb; prior jsonb; saved public.idea_activity%ROWTYPE; result jsonb;
BEGIN
  IF NOT public.can_access_ideas() THEN RAISE EXCEPTION 'Dataset access denied' USING ERRCODE='42501'; END IF;
  IF p_type NOT IN ('priority_changed','score_adjusted','group_changed','sprint_scheduled','notes_updated','idea_updated')
    OR p_type IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
    OR p_occurred_at IS NULL OR NOT isfinite(p_occurred_at) OR p_occurred_at > clock_timestamp() THEN
    RAISE EXCEPTION 'Invalid activity event' USING ERRCODE='22023';
  END IF;
  IF (CASE p_type
    WHEN 'priority_changed' THEN jsonb_typeof(p_payload->'from')='boolean' AND jsonb_typeof(p_payload->'to')='boolean'
    WHEN 'score_adjusted' THEN app_private.activity_integer(p_payload->'from',-99,99) AND app_private.activity_integer(p_payload->'to',-99,99)
    WHEN 'group_changed' THEN jsonb_typeof(p_payload->'from')='string' AND jsonb_typeof(p_payload->'to')='string'
    WHEN 'sprint_scheduled' THEN
      (jsonb_typeof(p_payload->'from')='null' OR app_private.activity_integer(p_payload->'from',1,8)) AND
      (jsonb_typeof(p_payload->'to')='null' OR app_private.activity_integer(p_payload->'to',1,8))
    WHEN 'notes_updated' THEN app_private.activity_integer(p_payload->'fromLength',0,9007199254740991) AND app_private.activity_integer(p_payload->'toLength',0,9007199254740991)
    WHEN 'idea_updated' THEN CASE WHEN jsonb_typeof(p_payload->'changedFields')='array' THEN
      NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'changedFields') AS fields(value) WHERE jsonb_typeof(value)<>'string') ELSE false END
    ELSE false END) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Invalid activity payload' USING ERRCODE='22023';
  END IF;
  request_payload=jsonb_build_object('idea_id',p_idea_id,'type',p_type,'payload',p_payload,'occurred_at',extract(epoch FROM p_occurred_at));
  prior=app_private.replay_idea_request(p_request_id,'record_activity',request_payload);
  IF prior IS NOT NULL THEN RETURN prior; END IF;
  PERFORM 1 FROM public.ideas WHERE id=p_idea_id FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Idea no longer exists' USING ERRCODE='23503'; END IF;
  INSERT INTO public.idea_activity(idea_id,event_type,payload,actor,occurred_at,client_request_id)
    VALUES(p_idea_id,p_type,p_payload,auth.uid()::text,p_occurred_at,p_request_id) RETURNING * INTO saved;
  result=jsonb_build_object('activity',to_jsonb(saved),'replayed',false);
  INSERT INTO app_private.idea_mutation_requests(actor_id,request_id,operation,payload,result)
    VALUES(auth.uid(),p_request_id,'record_activity',request_payload,result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.record_idea_activity(uuid,integer,text,jsonb,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_idea_activity(uuid,integer,text,jsonb,timestamptz) TO authenticated;

-- Source: database/live/004-legacy-compatible-validation.sql
CREATE FUNCTION app_private.valid_mvp_steps(steps text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT steps IS NOT NULL AND cardinality(steps) <= 100 AND NOT EXISTS
    (SELECT 1 FROM unnest(steps) item WHERE item IS NULL OR char_length(item) > 2000
      OR item !~ '[^[:space:]]');
$$;
ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_valid_name CHECK (name IS NOT NULL AND name ~ '[^[:space:]]' AND char_length(name) <= 200) NOT VALID,
  ADD CONSTRAINT ideas_valid_pitch CHECK (pitch IS NOT NULL AND pitch ~ '[^[:space:]]' AND char_length(pitch) <= 10000) NOT VALID,
  ADD CONSTRAINT ideas_valid_text_lengths CHECK (char_length(coalesce(target,'')) <= 10000 AND char_length(coalesce(pain,'')) <= 10000 AND char_length(coalesce(win,'')) <= 10000 AND char_length(coalesce(notes,'')) <= 100000) NOT VALID,
  ADD CONSTRAINT ideas_valid_mvp CHECK (app_private.valid_mvp_steps(mvp)) NOT VALID,
  ADD CONSTRAINT ideas_valid_adjustment CHECK (score_adjust IS NOT NULL AND score_adjust BETWEEN -99 AND 99) NOT VALID;
ALTER TABLE public.idea_group_assignments ADD CONSTRAINT groups_valid_key CHECK (group_key IS NOT NULL AND group_key IN ('pay','awards','registers','intel','workforce','lifecycle','infra')) NOT VALID;
ALTER TABLE public.status_overrides ADD CONSTRAINT overrides_valid_status CHECK (status IS NOT NULL AND status IN ('idea','researching','ready','building','done','shelved')) NOT VALID;

CREATE FUNCTION app_private.enforce_idea_classification() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.time IS DISTINCT FROM OLD.time THEN
    IF NEW.time IS NULL OR NEW.time NOT IN ('1w','1-2w','2-4w') THEN
      RAISE EXCEPTION 'Invalid idea time' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_OP='INSERT' OR NEW.plat IS DISTINCT FROM OLD.plat THEN
    IF NEW.plat IS NULL OR NEW.plat NOT IN ('html','pay','hub') THEN
      RAISE EXCEPTION 'Invalid idea platform' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IS NULL OR NEW.status NOT IN ('idea','researching','ready','building','done','shelved') THEN
      RAISE EXCEPTION 'Invalid idea status' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.enforce_idea_classification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER idea_classification_guard BEFORE INSERT OR UPDATE ON public.ideas
FOR EACH ROW EXECUTE FUNCTION app_private.enforce_idea_classification();
DO $$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY['ideas_valid_name','ideas_valid_pitch','ideas_valid_text_lengths','ideas_valid_mvp','ideas_valid_adjustment'] LOOP
    EXECUTE format('ALTER TABLE public.ideas VALIDATE CONSTRAINT %I',item);
  END LOOP;
END $$;
ALTER TABLE public.idea_group_assignments VALIDATE CONSTRAINT groups_valid_key;
ALTER TABLE public.status_overrides VALIDATE CONSTRAINT overrides_valid_status;

-- Source: database/audit/005-trusted-mutation-audit.sql
DO $$
DECLARE t text;
BEGIN
  IF to_regclass('app_private.idea_mutation_requests') IS NULL
    OR to_regprocedure('public.record_idea_activity(uuid,integer,text,jsonb,timestamp with time zone)') IS NULL THEN
    RAISE EXCEPTION 'Install reviewed authorization/transaction/outbox prerequisites first';
  END IF;
  FOREACH t IN ARRAY ARRAY['ideas','status_overrides','idea_group_assignments','sprint_assignments'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||t) AND relrowsecurity AND relkind='r') THEN
      RAISE EXCEPTION 'Missing RLS-protected audit source: %',t;
    END IF;
    IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||t)
      AND (pg_has_role('anon',relowner,'MEMBER') OR pg_has_role('authenticated',relowner,'MEMBER'))) THEN
      RAISE EXCEPTION 'Client must not assume audit source ownership';
    END IF;
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',t);
  END LOOP;
  IF pg_has_role('anon',current_user,'MEMBER') OR pg_has_role('authenticated',current_user,'MEMBER') THEN
    RAISE EXCEPTION 'Client must not assume audit installer ownership';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE (rolsuper OR rolbypassrls OR rolcreaterole)
    AND (pg_has_role('anon',oid,'MEMBER') OR pg_has_role('authenticated',oid,'MEMBER'))) THEN
    RAISE EXCEPTION 'Client must not inherit privileged roles';
  END IF;
  IF has_schema_privilege('anon','app_private','USAGE,CREATE') OR has_schema_privilege('authenticated','app_private','USAGE,CREATE') THEN
    RAISE EXCEPTION 'Unexpected private schema access';
  END IF;
END $$;
CREATE TABLE app_private.idea_change_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_table text NOT NULL,
  operation text NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  idea_id integer NOT NULL,
  actor_id uuid,
  occurred_at timestamptz NOT NULL,
  changed_fields text[] NOT NULL,
  before_values jsonb,
  after_values jsonb
);
ALTER TABLE app_private.idea_change_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.idea_change_audit FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE app_private.idea_change_audit_id_seq FROM PUBLIC,anon,authenticated;
CREATE INDEX idea_change_audit_idea_time ON app_private.idea_change_audit(idea_id,occurred_at,id);
CREATE FUNCTION app_private.stamp_idea_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'updated_at') IS NOT DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN
    NEW.updated_at=OLD.updated_at;
  ELSE NEW.updated_at=clock_timestamp(); END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.stamp_idea_mutation() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION app_private.audit_idea_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE before_row jsonb; after_row jsonb; changed text[]; affected_id integer;
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME NOT IN ('ideas','status_overrides','idea_group_assignments','sprint_assignments') THEN
    RAISE EXCEPTION 'Unsupported audit source';
  END IF;
  IF TG_OP<>'INSERT' THEN before_row=to_jsonb(OLD)-'updated_at'; END IF;
  IF TG_OP<>'DELETE' THEN after_row=to_jsonb(NEW)-'updated_at'; END IF;
  IF TG_OP='UPDATE' AND before_row IS NOT DISTINCT FROM after_row THEN RETURN NULL; END IF;
  SELECT array_agg(k ORDER BY k) INTO changed FROM
    (SELECT jsonb_object_keys(coalesce(before_row,'{}'::jsonb)) AS k
      UNION SELECT jsonb_object_keys(coalesce(after_row,'{}'::jsonb))) AS keys
    WHERE (before_row->k) IS DISTINCT FROM (after_row->k);
  affected_id=(coalesce(after_row,before_row)->>CASE WHEN TG_TABLE_NAME='ideas' THEN 'id' ELSE 'idea_id' END)::integer;
  SELECT jsonb_object_agg(k,v) INTO before_row FROM jsonb_each(before_row) AS fields(k,v)
    WHERE k IN ('id','idea_id','status','is_seed','is_v2','original_id','score_adjust','is_priority','group_key','week_num');
  SELECT jsonb_object_agg(k,v) INTO after_row FROM jsonb_each(after_row) AS fields(k,v)
    WHERE k IN ('id','idea_id','status','is_seed','is_v2','original_id','score_adjust','is_priority','group_key','week_num');
  INSERT INTO app_private.idea_change_audit(source_table,operation,idea_id,actor_id,occurred_at,changed_fields,before_values,after_values)
    VALUES(TG_TABLE_NAME,TG_OP,affected_id,auth.uid(),clock_timestamp(),coalesce(changed,'{}'),before_row,after_row);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION app_private.audit_idea_mutation() FROM PUBLIC,anon,authenticated;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ideas','status_overrides','idea_group_assignments','sprint_assignments'] LOOP
    EXECUTE format('CREATE TRIGGER idea_server_stamp BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION app_private.stamp_idea_mutation()',t);
    EXECUTE format('CREATE TRIGGER idea_canonical_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION app_private.audit_idea_mutation()',t);
  END LOOP;
  IF has_table_privilege('anon','app_private.idea_change_audit','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege('authenticated','app_private.idea_change_audit','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege('anon','app_private.idea_change_audit','SELECT,INSERT,UPDATE,REFERENCES')
    OR has_any_column_privilege('authenticated','app_private.idea_change_audit','SELECT,INSERT,UPDATE,REFERENCES')
    OR has_function_privilege('anon','app_private.audit_idea_mutation()','EXECUTE')
    OR has_function_privilege('authenticated','app_private.audit_idea_mutation()','EXECUTE')
    OR has_function_privilege('anon','app_private.stamp_idea_mutation()','EXECUTE')
    OR has_function_privilege('authenticated','app_private.stamp_idea_mutation()','EXECUTE')
    OR has_sequence_privilege('anon','app_private.idea_change_audit_id_seq','USAGE,SELECT,UPDATE')
    OR has_sequence_privilege('authenticated','app_private.idea_change_audit_id_seq','USAGE,SELECT,UPDATE') THEN
    RAISE EXCEPTION 'Unexpected inherited audit privileges';
  END IF;
END $$;
-- Abort the entire rollout if existing data differs, including timestamps.
DO $$
DECLARE r record; n bigint; h text;
BEGIN
  FOR r IN SELECT * FROM rollout_before LOOP
    EXECUTE format('SELECT count(*),md5(coalesce(string_agg(row_value,E''\n'' ORDER BY row_value),'''')) FROM (SELECT (to_jsonb(v)-''client_request_id'')::text AS row_value FROM public.%I v) rows',r.table_name) INTO n,h;
    IF n<>r.row_count OR h IS DISTINCT FROM r.row_hash THEN
      RAISE EXCEPTION 'Existing data changed on %; aborting rollout',r.table_name; END IF;
  END LOOP;
END $$;
SELECT table_name,row_count AS preserved_rows,true AS contents_unchanged FROM rollout_before ORDER BY table_name;
COMMIT;
