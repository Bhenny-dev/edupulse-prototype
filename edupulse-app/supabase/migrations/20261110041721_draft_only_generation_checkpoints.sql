-- A direct authenticated workspace RPC must respect the same draft-only boundary
-- as the API. Checkpoints remain private workspace data, never learner releases.
CREATE FUNCTION edupulse_private.validate_generation_checkpoints() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF EXISTS (
  SELECT 1 FROM jsonb_each(coalesce(NEW.data->'content','{}'::jsonb)) item
  WHERE item.value ? 'generationCheckpoint' AND item.value->>'status' IS DISTINCT FROM 'draft'
 ) THEN
  RAISE EXCEPTION 'Unfinished generation must remain a draft' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.validate_generation_checkpoints() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER edupulse_validate_generation_checkpoints BEFORE INSERT OR UPDATE ON public.edupulse_workspaces
 FOR EACH ROW EXECUTE FUNCTION edupulse_private.validate_generation_checkpoints();
