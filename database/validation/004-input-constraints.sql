-- LOCAL ROLLOUT CANDIDATE. Back up and inspect legacy rows before deployment.
-- NOT VALID preserves legacy reads; every subsequent insert/update is checked.
-- Correct a legacy row's invalid fields together before updating it, then VALIDATE.
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
  ADD CONSTRAINT ideas_valid_classification CHECK (time IS NOT NULL AND time IN ('1w','1-2w','2-4w') AND plat IS NOT NULL AND plat IN ('html','pay','hub') AND status IS NOT NULL AND status IN ('idea','researching','ready','building','done','shelved')) NOT VALID,
  ADD CONSTRAINT ideas_valid_text_lengths CHECK (char_length(coalesce(target,'')) <= 10000 AND char_length(coalesce(pain,'')) <= 10000 AND char_length(coalesce(win,'')) <= 10000 AND char_length(coalesce(notes,'')) <= 100000) NOT VALID,
  ADD CONSTRAINT ideas_valid_mvp CHECK (app_private.valid_mvp_steps(mvp)) NOT VALID,
  ADD CONSTRAINT ideas_valid_adjustment CHECK (score_adjust IS NOT NULL AND score_adjust BETWEEN -99 AND 99) NOT VALID;
ALTER TABLE public.idea_group_assignments ADD CONSTRAINT groups_valid_key CHECK (group_key IS NOT NULL AND group_key IN ('pay','awards','registers','intel','workforce','lifecycle','infra')) NOT VALID;
ALTER TABLE public.status_overrides ADD CONSTRAINT overrides_valid_status CHECK (status IS NOT NULL AND status IN ('idea','researching','ready','building','done','shelved')) NOT VALID;
COMMIT;
-- After explicit legacy repair and staging/JWT/RLS acceptance:
-- ALTER TABLE public.ideas VALIDATE CONSTRAINT ... (each constraint above).
-- Also validate groups_valid_key and overrides_valid_status.
-- sprint_assignments already has a native integer and week_num 1..8 CHECK.
