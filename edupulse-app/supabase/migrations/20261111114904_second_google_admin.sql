-- Both designated admins need a live assigned role and confirmed Google identity.
CREATE OR REPLACE FUNCTION edupulse_private.is_system_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=auth.uid()
  AND lower(u.email) IN ('riverabenlor461@gmail.com','2024-1-0262.botay@kcp.edu.ph')
  AND u.raw_app_meta_data->>'role'='admin' AND u.email_confirmed_at IS NOT NULL
  AND (u.banned_until IS NULL OR u.banned_until<=now())
  AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id=u.id AND i.provider='google'));
$$;
REVOKE ALL ON FUNCTION edupulse_private.is_system_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION edupulse_private.is_system_admin() TO authenticated;

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

CREATE OR REPLACE FUNCTION edupulse_private.support_account(subject uuid DEFAULT NULL, filters jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; page_offset integer := greatest(0,least(100000,coalesce((filters->>'offset')::integer,0)));
BEGIN
 IF NOT edupulse_private.is_system_admin() THEN RAISE EXCEPTION 'System admin required' USING ERRCODE='42501'; END IF;
 IF subject IS NOT NULL THEN
  SELECT jsonb_build_object('id',u.id,'role',u.raw_app_meta_data->>'role','name',coalesce(u.raw_user_meta_data->>'full_name',s.full_name,u.email),
   'email',u.email,'department',coalesce(s.department,u.raw_user_meta_data->>'department',''),'yearLevel',s.year_level,'program',s.program,
   'claims',jsonb_build_object('sub',u.id,'role','authenticated','email',u.email,'app_metadata',u.raw_app_meta_data)) INTO result
  FROM auth.users u LEFT JOIN public.edupulse_students s ON s.user_id=u.id
  WHERE u.id=subject AND u.raw_app_meta_data->>'role' IN ('student','instructor','dean','associate_dean')
   AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<=now()) AND coalesce(s.active,true);
  IF result IS NULL THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
  RETURN result;
 END IF;
 WITH matches AS (
  SELECT u.id,u.raw_app_meta_data->>'role' role,coalesce(u.raw_user_meta_data->>'full_name',s.full_name,u.email) name,u.email,
   s.student_number,s.year_level,coalesce(s.department,u.raw_user_meta_data->>'department','') department,s.program
  FROM auth.users u LEFT JOIN public.edupulse_students s ON s.user_id=u.id
  WHERE u.raw_app_meta_data->>'role'=filters->>'role' AND u.email_confirmed_at IS NOT NULL
   AND (u.banned_until IS NULL OR u.banned_until<=now()) AND coalesce(s.active,true)
   AND (coalesce(filters->>'q','')='' OR strpos(lower(coalesce(s.full_name,'')||' '||coalesce(u.raw_user_meta_data->>'full_name','')||' '||u.email||' '||coalesce(s.student_number,'')),lower(filters->>'q'))>0)
   AND (coalesce(filters->>'year','')='' OR s.year_level=(filters->>'year')::integer)
   AND (coalesce(filters->>'department','')='' OR coalesce(s.department,u.raw_user_meta_data->>'department','')=filters->>'department')
   AND (coalesce(filters->>'program','')='' OR s.program=filters->>'program')
 ) SELECT jsonb_build_object('accounts',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM matches ORDER BY name,id OFFSET page_offset LIMIT 50) p),'[]'),
   'total',(SELECT count(*) FROM matches),'offset',page_offset,'pageSize',50,
   'departments',(SELECT coalesce(jsonb_agg(DISTINCT department ORDER BY department),'[]') FROM public.edupulse_students WHERE active),
   'programs',(SELECT coalesce(jsonb_agg(DISTINCT program ORDER BY program),'[]') FROM public.edupulse_students WHERE active)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.support_account(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.support_account(uuid,jsonb) TO authenticated;
