-- LOCAL rollout candidate. Requires migrations 001/002 and coordinated six-table
-- authorization. Do not install before backup/staging acceptance.
BEGIN;
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
COMMIT;
