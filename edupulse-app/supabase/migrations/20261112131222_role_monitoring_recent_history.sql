-- Read-only role windows; never seed or reclassify audit/AI outcomes.
CREATE INDEX IF NOT EXISTS edupulse_audit_role_time_idx ON public.edupulse_audit_events(actor_role,occurred_at DESC);
CREATE INDEX IF NOT EXISTS edupulse_runs_role_time_idx ON public.edupulse_agent_runs(actor_role,occurred_at DESC);
CREATE OR REPLACE FUNCTION edupulse_private.admin_role_monitoring()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE since_at timestamptz:=now()-interval '7 days'; role_name text; result jsonb:='{}'; row_data jsonb;
BEGIN
 IF NOT edupulse_private.is_system_admin() THEN RAISE EXCEPTION 'System admin required' USING ERRCODE='42501'; END IF;
 FOREACH role_name IN ARRAY ARRAY['dean','associate_dean','instructor','student'] LOOP
  WITH audit AS MATERIALIZED (SELECT * FROM public.edupulse_audit_events WHERE actor_role=role_name AND occurred_at>=since_at),
  runs AS MATERIALIZED (SELECT * FROM public.edupulse_agent_runs WHERE actor_role=role_name AND occurred_at>=since_at),
  support AS MATERIALIZED (SELECT s.* FROM public.edupulse_support_events s JOIN auth.users u ON u.id=s.subject_id WHERE u.raw_app_meta_data->>'role'=role_name AND s.occurred_at>=since_at)
  SELECT jsonb_build_object(
   'since',since_at,'asOf',now(),
   'totals',jsonb_build_object('events',(SELECT count(*) FROM audit),'success',(SELECT count(*) FROM audit WHERE outcome='success'),'failure',(SELECT count(*) FROM audit WHERE outcome='failure'),
     'runs',(SELECT count(*) FROM runs),'answered',(SELECT count(*) FROM runs WHERE outcome IN ('answered','references')),'quoted',(SELECT count(*) FROM runs WHERE outcome='quoted-sources'),
     'aiFailed',(SELECT count(*) FROM runs WHERE outcome='failed'),'stopped',(SELECT count(*) FROM runs WHERE outcome IN ('declined','insufficient-evidence')),'support',(SELECT count(*) FROM support)),
   'actions',(SELECT coalesce(jsonb_agg(jsonb_build_array(action,n) ORDER BY n DESC,action),'[]') FROM (SELECT action,count(*) n FROM audit GROUP BY action) g),
   'outcomes',(SELECT coalesce(jsonb_agg(jsonb_build_array(outcome,n) ORDER BY n DESC,outcome),'[]') FROM (SELECT outcome,count(*) n FROM runs GROUP BY outcome) g),
   'events',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'at',occurred_at,'actorRole',actor_role,'action',action,'outcome',outcome,'detail',detail) ORDER BY occurred_at DESC,id DESC),'[]') FROM (SELECT * FROM audit ORDER BY occurred_at DESC,id DESC LIMIT 100) e),
   'runs',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'at',occurred_at,'role',actor_role,'workflow',workflow,'task',task,'outcome',outcome,'ms',duration_ms,'agents',agents) ORDER BY occurred_at DESC,id DESC),'[]') FROM (SELECT * FROM runs ORDER BY occurred_at DESC,id DESC LIMIT 30) r),
   'supportEvents',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'at',occurred_at,'operation',operation) ORDER BY occurred_at DESC,id DESC),'[]') FROM (SELECT * FROM support ORDER BY occurred_at DESC,id DESC LIMIT 30) s)
  ) INTO row_data;
  result:=result||jsonb_build_object(role_name,row_data);
 END LOOP;
 RETURN jsonb_build_object('roles',result,'asOf',now());
END; $$;
REVOKE ALL ON FUNCTION edupulse_private.admin_role_monitoring() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.admin_role_monitoring() TO authenticated;
CREATE OR REPLACE FUNCTION public.edupulse_admin_role_monitoring()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.admin_role_monitoring(); $$;
REVOKE ALL ON FUNCTION public.edupulse_admin_role_monitoring() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_admin_role_monitoring() TO authenticated;
