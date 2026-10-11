-- Live alternative to 004-input-constraints.sql; never install both.
-- User-authorized rollout without backup, 2026-10-11.
-- Legacy classification values remain unchanged; full classification CHECK is deferred.
BEGIN;
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

-- Preserve unchanged legacy codes; validate each newly supplied field independently.
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
COMMIT;
