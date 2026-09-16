-- Cache the JWT function itself, then inspect its trusted role claim.
ALTER POLICY workspace_insert ON public.edupulse_workspaces
  WITH CHECK (owner_id = (SELECT auth.uid()) AND ((SELECT auth.jwt())->'app_metadata'->>'role') IN ('instructor','admin'));
ALTER POLICY workspace_update ON public.edupulse_workspaces
  USING (owner_id = (SELECT auth.uid()) AND ((SELECT auth.jwt())->'app_metadata'->>'role') IN ('instructor','admin'))
  WITH CHECK (owner_id = (SELECT auth.uid()) AND ((SELECT auth.jwt())->'app_metadata'->>'role') IN ('instructor','admin'));
