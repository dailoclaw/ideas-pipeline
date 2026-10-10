-- LOCAL ONLY: requires backup, inspected/restored staging and step 2 RLS rollout.
-- Run once as administrator after 001-account-allowlist.sql and six-table RLS.
-- Existing IDs remain unchanged. Never reset this sequence or re-run legacy seed scripts.
BEGIN;
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

-- No FK to ideas: retries remain deduplicated even after the idea is deleted.
-- Keep private: request payloads/results may contain idea text. Retention is a rollout decision.
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
  -- Serialize retries, including overlapping requests with the same token.
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
  -- All status writers lock the parent first, then the child, then audit rows.
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
COMMIT;
