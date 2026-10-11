-- LOCAL CANDIDATE ONLY. After reviewed 001/001b/002/003/004, backup and staging.
-- Private canonical change metadata, separate from caller-reported UI activity.
BEGIN;
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
-- One-time installation: existing audit objects cause failure, never replace history.
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
-- No parent/Auth FK: a deletion must not erase its evidence.
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
  -- Record changed field names, never duplicate private free-text or entire notes.
  -- Values are limited to operational fields needed for audit reconciliation.
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
COMMIT;
