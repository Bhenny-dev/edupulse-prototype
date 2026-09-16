CREATE TABLE public.edupulse_workspaces (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND data ?& ARRAY['syllabi','content'] AND jsonb_typeof(data->'syllabi') = 'array' AND jsonb_typeof(data->'content') = 'object' AND octet_length(data::text) <= 3500000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.edupulse_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_workspaces FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.edupulse_workspaces TO authenticated;
CREATE POLICY workspace_read ON public.edupulse_workspaces FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));
CREATE POLICY workspace_insert ON public.edupulse_workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) AND (SELECT auth.jwt()->'app_metadata'->>'role') IN ('instructor','admin'));
CREATE POLICY workspace_update ON public.edupulse_workspaces FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) AND (SELECT auth.jwt()->'app_metadata'->>'role') IN ('instructor','admin'))
  WITH CHECK (owner_id = (SELECT auth.uid()) AND (SELECT auth.jwt()->'app_metadata'->>'role') IN ('instructor','admin'));

CREATE FUNCTION public.edupulse_save_workspace(expected_revision bigint, snapshot jsonb)
RETURNS TABLE(revision bigint, data jsonb, updated_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR coalesce(auth.jwt()->'app_metadata'->>'role','') NOT IN ('instructor','admin') THEN
    RAISE EXCEPTION 'Instructor account required' USING ERRCODE = '42501';
  END IF;
  IF expected_revision IS NULL OR expected_revision < 0 OR snapshot IS NULL OR octet_length(snapshot::text) > 3500000 THEN
    RAISE EXCEPTION 'Invalid workspace' USING ERRCODE = '22023';
  END IF;
  IF expected_revision = 0 THEN
    RETURN QUERY INSERT INTO public.edupulse_workspaces AS w(owner_id, revision, data)
      VALUES(auth.uid(), 1, snapshot) ON CONFLICT(owner_id) DO NOTHING
      RETURNING w.revision, w.data, w.updated_at;
  ELSE
    RETURN QUERY UPDATE public.edupulse_workspaces AS w SET data = snapshot, revision = w.revision+1, updated_at = now()
      WHERE w.owner_id = auth.uid() AND w.revision = expected_revision
      RETURNING w.revision, w.data, w.updated_at;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace revision conflict' USING ERRCODE = '40001'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.edupulse_save_workspace(bigint,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edupulse_save_workspace(bigint,jsonb) TO authenticated;
