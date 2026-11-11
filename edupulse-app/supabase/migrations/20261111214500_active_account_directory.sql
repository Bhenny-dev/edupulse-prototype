-- Retired accounts stay preserved but leave active account totals and management.
CREATE OR REPLACE FUNCTION edupulse_private.admin_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT edupulse_private.is_system_admin() THEN
    RAISE EXCEPTION 'System admin required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'accounts', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'name', coalesce(u.raw_user_meta_data->>'full_name', initcap(replace(u.raw_app_meta_data->>'role', '_', ' '))),
      'email', CASE WHEN u.raw_app_meta_data->>'role' = 'admin' THEN NULL ELSE u.email END,
      'role', u.raw_app_meta_data->>'role', 'confirmed', u.email_confirmed_at IS NOT NULL,
      'lastSignIn', u.last_sign_in_at
    ) ORDER BY u.created_at), '[]'::jsonb) FROM auth.users u WHERE (u.banned_until IS NULL OR u.banned_until<=now()) AND u.raw_app_meta_data->>'role' IN ('admin', 'dean', 'associate_dean', 'instructor', 'student')),
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
