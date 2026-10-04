-- Keep academic workspaces available to the separately assigned academic leaders.
ALTER POLICY workspace_insert ON public.edupulse_workspaces
  WITH CHECK (owner_id = (SELECT auth.uid()) AND ((SELECT auth.jwt())->'app_metadata'->>'role') IN ('admin', 'dean', 'associate_dean', 'instructor'));
ALTER POLICY workspace_update ON public.edupulse_workspaces
  USING (owner_id = (SELECT auth.uid()) AND ((SELECT auth.jwt())->'app_metadata'->>'role') IN ('admin', 'dean', 'associate_dean', 'instructor'))
  WITH CHECK (owner_id = (SELECT auth.uid()) AND ((SELECT auth.jwt())->'app_metadata'->>'role') IN ('admin', 'dean', 'associate_dean', 'instructor'));

CREATE OR REPLACE FUNCTION public.edupulse_save_workspace(expected_revision bigint, snapshot jsonb)
RETURNS TABLE(revision bigint, data jsonb, updated_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR coalesce(auth.jwt()->'app_metadata'->>'role','') NOT IN ('admin', 'dean', 'associate_dean', 'instructor') THEN
    RAISE EXCEPTION 'Academic account required' USING ERRCODE = '42501';
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

CREATE TABLE public.edupulse_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('admin', 'dean', 'associate_dean', 'instructor', 'student')),
  action text NOT NULL CHECK (action IN ('sign_in', 'sign_out', 'view_switch', 'navigation', 'workspace_save', 'ai_connection', 'role_change')),
  outcome text NOT NULL CHECK (outcome IN ('success', 'failure')),
  detail text NOT NULL DEFAULT '' CHECK (length(detail) <= 160)
);
CREATE INDEX edupulse_audit_events_recent_idx ON public.edupulse_audit_events (occurred_at DESC);
CREATE INDEX edupulse_audit_events_actor_idx ON public.edupulse_audit_events (actor_id);
ALTER TABLE public.edupulse_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_audit_events FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.edupulse_audit_events TO authenticated;
GRANT USAGE ON SEQUENCE public.edupulse_audit_events_id_seq TO authenticated;
CREATE POLICY audit_self_insert ON public.edupulse_audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = (SELECT auth.uid()) AND actor_role = ((SELECT auth.jwt())->'app_metadata'->>'role'));

-- The private function uses elevated access only after checking the live Auth record.
-- It emits selected fields, never raw Auth payloads or the owner's email.
CREATE SCHEMA IF NOT EXISTS edupulse_private;
REVOKE ALL ON SCHEMA edupulse_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA edupulse_private TO authenticated;
CREATE FUNCTION edupulse_private.admin_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND lower(u.email) = 'riverabenlor461@gmail.com'
      AND u.raw_app_meta_data->>'role' = 'admin'
      AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'google')
  ) THEN
    RAISE EXCEPTION 'System admin required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'accounts', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'name', coalesce(u.raw_user_meta_data->>'full_name', initcap(replace(u.raw_app_meta_data->>'role', '_', ' '))),
      'email', CASE WHEN u.raw_app_meta_data->>'role' = 'admin' THEN NULL ELSE u.email END,
      'role', u.raw_app_meta_data->>'role', 'confirmed', u.email_confirmed_at IS NOT NULL,
      'lastSignIn', u.last_sign_in_at
    ) ORDER BY u.created_at), '[]'::jsonb) FROM auth.users u WHERE u.raw_app_meta_data->>'role' IN ('admin', 'dean', 'associate_dean', 'instructor', 'student')),
    'appEvents', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'at', e.occurred_at, 'actorRole', e.actor_role,
      'action', e.action, 'outcome', e.outcome, 'detail', e.detail
    ) ORDER BY e.occurred_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.edupulse_audit_events ORDER BY occurred_at DESC LIMIT 100) e),
    'authEvents', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'at', a.created_at,
      'action', coalesce(a.payload->>'action', 'auth_event'),
      'outcome', CASE WHEN coalesce(a.payload->>'error', '') <> '' OR coalesce(a.payload->>'status', '') = 'failure' THEN 'failure' ELSE 'success' END
    ) ORDER BY a.created_at DESC), '[]'::jsonb)
      FROM (SELECT id, created_at, payload FROM auth.audit_log_entries ORDER BY created_at DESC LIMIT 100) a)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION edupulse_private.admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION edupulse_private.admin_overview() TO authenticated;

CREATE FUNCTION public.edupulse_admin_overview()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT edupulse_private.admin_overview();
$$;
REVOKE ALL ON FUNCTION public.edupulse_admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edupulse_admin_overview() TO authenticated;
