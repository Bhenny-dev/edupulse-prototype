GRANT USAGE ON SCHEMA edupulse_private TO authenticated;

-- Account support is an explicit transaction-scoped delegation by the Google owner.
-- No target login, password, refresh token, provider key or private conversation is shared.
CREATE FUNCTION edupulse_private.support_account(subject uuid DEFAULT NULL, filters jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; page_offset integer := greatest(0,least(100000,coalesce((filters->>'offset')::integer,0)));
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users u JOIN auth.identities i ON i.user_id=u.id AND i.provider='google'
   WHERE u.id=auth.uid() AND lower(u.email)='riverabenlor461@gmail.com' AND u.raw_app_meta_data->>'role'='admin')
 THEN RAISE EXCEPTION 'System admin required' USING ERRCODE='42501'; END IF;
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

CREATE TABLE public.edupulse_support_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, operation text NOT NULL CHECK(length(operation)<=80),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.edupulse_support_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.edupulse_support_events TO authenticated;
REVOKE ALL ON public.edupulse_support_events FROM PUBLIC,anon;
CREATE INDEX edupulse_support_actor_time_idx ON public.edupulse_support_events(actor_id,occurred_at DESC);
CREATE INDEX edupulse_support_subject_idx ON public.edupulse_support_events(subject_id);
CREATE POLICY support_events_owner ON public.edupulse_support_events FOR SELECT TO authenticated USING(actor_id=(SELECT auth.uid()) AND (SELECT edupulse_private.academic_role())='admin');
CREATE POLICY support_events_insert ON public.edupulse_support_events FOR INSERT TO authenticated WITH CHECK(actor_id=(SELECT auth.uid()) AND (SELECT edupulse_private.academic_role())='admin');

-- SECURITY INVOKER is essential: the selected subject's ordinary RLS applies to
-- every SELECT and existing business RPC. Never make this gateway a definer.
CREATE FUNCTION public.edupulse_support_action(subject uuid, operation text, input jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE account jsonb; actor uuid:=auth.uid(); claims text:=current_setting('request.jwt.claims',true);
 old_sub text:=current_setting('request.jwt.claim.sub',true); old_email text:=current_setting('request.jwt.claim.email',true);
 result jsonb; subject_role text; pub public.edupulse_publications;
BEGIN
 account:=edupulse_private.support_account(subject,input);
 IF operation='accounts' AND subject IS NULL THEN RETURN account; END IF;
 IF subject IS NULL THEN RAISE EXCEPTION 'Select an account' USING ERRCODE='22023'; END IF;
 IF operation='subject' THEN RETURN account-'claims'; END IF;
 IF operation NOT IN ('enter','leave','academic.read','workspace.read','workspace.save','academic.command','students.read') THEN RAISE EXCEPTION 'Unsupported operation' USING ERRCODE='42501'; END IF;
 -- Audit before adopting the subject. Failures roll back the transaction.
 IF operation IN ('enter','leave','workspace.save','academic.command') THEN
  INSERT INTO public.edupulse_support_events(actor_id,subject_id,operation) VALUES(actor,subject,operation);
  INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail) VALUES(actor,'admin','view_switch','success',left(operation||' subject='||subject::text,160));
 END IF;
 PERFORM set_config('request.jwt.claims',(account->'claims')::text,true);
 PERFORM set_config('request.jwt.claim.sub',subject::text,true);
 PERFORM set_config('request.jwt.claim.email',account->>'email',true);
 subject_role:=account->>'role';
 CASE operation
 WHEN 'enter','leave' THEN result:=account-'claims';
 WHEN 'workspace.read' THEN
  SELECT to_jsonb(w)-'owner_id' INTO result FROM public.edupulse_workspaces w WHERE owner_id=subject;
 WHEN 'workspace.save' THEN
  IF subject_role NOT IN ('instructor','dean','associate_dean') THEN RAISE EXCEPTION 'Academic account required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(w)),'[]') INTO result FROM public.edupulse_save_workspace((input->>'revision')::bigint,input->'data') w;
 WHEN 'academic.read' THEN
  result:=jsonb_build_object('mode','cloud',
   'courses',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.edupulse_courses t),
   'enrollments',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY course_id,student_email,block_section),'[]') FROM public.edupulse_enrollments t),
   'publications',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.edupulse_publications t),
   'notices',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY created_at DESC,id),'[]') FROM public.edupulse_notices t),
   'events',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY created_at DESC,id),'[]') FROM public.edupulse_academic_events t),
   'attempts',CASE WHEN subject_role='associate_dean' THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.edupulse_attempts t) END,
   'accesses',CASE WHEN subject_role='associate_dean' THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY publication_id,student_id),'[]') FROM public.edupulse_material_access t) END,
   'institutional',CASE WHEN subject_role='student' THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY kind,record_key),'[]') FROM public.edupulse_institutional_records t) END,
   'faculty',CASE WHEN subject_role IN ('dean','associate_dean') THEN public.edupulse_faculty() ELSE '[]'::jsonb END);
 WHEN 'students.read' THEN
  WITH matches AS (SELECT student_number,email,full_name,year_level,department,program FROM public.edupulse_students WHERE active
   AND (coalesce(input->>'q','')='' OR strpos(lower(full_name||' '||student_number),lower(input->>'q'))>0)
   AND (coalesce(input->>'year','')='' OR year_level=(input->>'year')::integer)
   AND (coalesce(input->>'department','')='' OR department=input->>'department')
   AND (coalesce(input->>'program','')='' OR program=input->>'program'))
  SELECT jsonb_build_object('students',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM matches ORDER BY student_number OFFSET greatest(0,coalesce((input->>'offset')::integer,0)) LIMIT 50) t),'[]'),
   'total',(SELECT count(*) FROM matches),'offset',coalesce((input->>'offset')::integer,0),'pageSize',50) INTO result;
 WHEN 'academic.command' THEN
  IF subject_role='student' AND input->>'operation'<>'read' THEN
   -- Preview the same RLS-filtered publication, without claiming that the student opened it.
   IF input->>'operation'<>'open' THEN RAISE EXCEPTION 'Student sign-in required for activity and assessment submissions' USING ERRCODE='42501'; END IF;
   SELECT * INTO pub FROM public.edupulse_publications WHERE id=input->>'publication' AND source_version=input->>'version';
   IF pub.id IS NULL THEN RAISE EXCEPTION 'Publication unavailable' USING ERRCODE='42501'; END IF;
   result:=jsonb_build_object('opened',true,'supportPreview',true);
  ELSE
   CASE input->>'operation'
   WHEN 'sync' THEN PERFORM public.edupulse_sync_academic_workspace(); result:='{"synced":true}';
   WHEN 'read' THEN result:=public.edupulse_notice_action('read',ARRAY(SELECT jsonb_array_elements_text(input->'ids'))::uuid[]);
   WHEN 'remind' THEN result:=public.edupulse_notice_action('remind','{}',input->>'publication');
   WHEN 'revise' THEN result:=public.edupulse_request_revision(input->>'course',input->>'comment');
   WHEN 'import' THEN result:=public.edupulse_import_records(input->>'kind',input->'rows',input->>'filename');
   WHEN 'grade' THEN result:=public.edupulse_assessment_command(input);
   ELSE RAISE EXCEPTION 'Unsupported support action' USING ERRCODE='42501';
   END CASE;
  END IF;
 END CASE;
 PERFORM set_config('request.jwt.claims',coalesce(claims,''),true);
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claim.email',coalesce(old_email,''),true);
 RETURN result;
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('request.jwt.claims',coalesce(claims,''),true);
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claim.email',coalesce(old_email,''),true);
 RAISE;
END $$;
REVOKE ALL ON FUNCTION public.edupulse_support_action(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_support_action(uuid,text,jsonb) TO authenticated;

-- Concise durable agent handoffs; not hidden reasoning or a cross-user memory pool.
CREATE TABLE public.edupulse_agent_memory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL DEFAULT auth.uid(), thread_id uuid NOT NULL,
 subject_id uuid NOT NULL, task text NOT NULL CHECK(length(task)<=40), outcome text NOT NULL CHECK(length(outcome)<=40),
 summary text NOT NULL CHECK(length(summary)<=1200), sources jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_array_length(sources)<=12),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(thread_id,owner_id) REFERENCES public.edupulse_pulse_threads(id,owner_id) ON DELETE CASCADE
);
ALTER TABLE public.edupulse_agent_memory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_agent_memory FROM PUBLIC,anon;
GRANT SELECT,INSERT,DELETE ON public.edupulse_agent_memory TO authenticated;
CREATE INDEX edupulse_agent_memory_scope_idx ON public.edupulse_agent_memory(owner_id,thread_id,subject_id,created_at DESC);
CREATE POLICY agent_memory_owner ON public.edupulse_agent_memory TO authenticated USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
COMMENT ON TABLE public.edupulse_agent_memory IS 'Scoped run outcomes and source provenance, never authorization or proof of an unverified action. Deleted with its conversation.';
