-- Validate at the database boundary too: the public workspace RPC is callable
-- independently of the Node API's Zod schema. No elevated privileges are needed.
CREATE FUNCTION edupulse_private.validate_roster_overrides() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE decision jsonb;
BEGIN
 IF NOT NEW.data ? 'enrollmentOverrides' THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.data->'enrollmentOverrides') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid course membership decisions' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(NEW.data->'enrollmentOverrides')>5000 THEN RAISE EXCEPTION 'Too many course membership decisions' USING ERRCODE='22023'; END IF;
 FOR decision IN SELECT value FROM jsonb_array_elements(NEW.data->'enrollmentOverrides') LOOP
  IF jsonb_typeof(decision) IS DISTINCT FROM 'object' OR jsonb_typeof(decision->'courseCode') IS DISTINCT FROM 'string'
    OR length(btrim(decision->>'courseCode')) NOT BETWEEN 1 AND 80
    OR jsonb_typeof(decision->'studentEmail') IS DISTINCT FROM 'string' OR length(decision->>'studentEmail')>254
    OR coalesce(decision->>'studentEmail','') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    OR jsonb_typeof(decision->'excluded') IS DISTINCT FROM 'boolean'
    OR (decision ? 'blockSection' AND (jsonb_typeof(decision->'blockSection') IS DISTINCT FROM 'string' OR length(btrim(decision->>'blockSection')) NOT BETWEEN 1 AND 80)) THEN
   RAISE EXCEPTION 'Invalid course membership decision' USING ERRCODE='22023';
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'enrollmentOverrides') value GROUP BY value->>'courseCode',lower(value->>'studentEmail') HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Duplicate course membership decision' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.validate_roster_overrides() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER edupulse_validate_roster_overrides BEFORE INSERT OR UPDATE ON public.edupulse_workspaces
 FOR EACH ROW EXECUTE FUNCTION edupulse_private.validate_roster_overrides();
