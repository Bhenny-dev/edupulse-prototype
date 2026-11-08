-- Hosted RLS canary. Entire transaction rolls back, including Auth users,
-- notices, support audits, publications, attempts and memory. Never seed real progress.
BEGIN;
CREATE TEMP TABLE support_canary_ids(kind text PRIMARY KEY,id uuid,email text);
INSERT INTO support_canary_ids SELECT 'admin',id,email FROM auth.users WHERE lower(email)='riverabenlor461@gmail.com';
INSERT INTO support_canary_ids SELECT kind,gen_random_uuid(),'edupulse-canary-'||gen_random_uuid()::text||'@example.invalid' FROM unnest(ARRAY['instructor','student','outsider','associate_dean']) kind;
GRANT SELECT ON support_canary_ids TO authenticated;
CREATE FUNCTION pg_temp.canary_assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(ok,false) THEN RAISE EXCEPTION 'Canary failed: %',label; END IF; END $$;
SELECT pg_temp.canary_assert((SELECT count(*)=5 FROM support_canary_ids),'existing verified admin account required');
INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 SELECT '00000000-0000-0000-0000-000000000000',id,'authenticated','authenticated',email,'',now(),jsonb_build_object('role',CASE WHEN kind='outsider' THEN 'student' ELSE kind END,'provider','email','providers',jsonb_build_array('email')),jsonb_build_object('full_name','Synthetic rollback canary'),now(),now() FROM support_canary_ids WHERE kind<>'admin';
INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,full_name,year_level,department,program)
 SELECT 'CANARY-'||id::text,id,email,'Canary','Synthetic','Synthetic rollback learner',1,'Synthetic department','Synthetic program' FROM support_canary_ids WHERE kind IN ('student','outsider');
CREATE TEMP TABLE support_canary_snapshot(data jsonb);
INSERT INTO support_canary_snapshot SELECT jsonb_build_object(
 'syllabi',jsonb_build_array(jsonb_build_object('id','canary','courseCode','SYN-CANARY','courseTitle','Synthetic rollback delivery','status','active','approvedFile',jsonb_build_object('approvalAttested',true),'courseOutline',jsonb_build_array(jsonb_build_object('week',1,'ilos','Explain variables','contents',jsonb_build_array('Variables'))))),
 'content',jsonb_build_object('lesson',jsonb_build_object('syllabusId','canary','week',1,'type','material','status','checked','content',jsonb_build_object('title','Synthetic rollback lesson','sections',jsonb_build_array(jsonb_build_object('heading','Variables','body','Variables store named values.')))),
 'quiz',jsonb_build_object('syllabusId','canary','week',1,'type','assessment','status','checked','content',jsonb_build_object('title','Synthetic rollback assessment','questions',(SELECT jsonb_agg(jsonb_build_object('text','Synthetic question '||n,'topic','Variables','options',jsonb_build_array('A','B','C','D'),'correctIndex',n,'explanation','Reviewed synthetic explanation.')) FROM generate_series(0,2) n)))),
 'registrations',jsonb_build_array(jsonb_build_object('courseCode','SYN-CANARY','blockSection','SYN-CANARY-A','status','active','students',jsonb_build_array(jsonb_build_object('Name','Synthetic rollback learner','Email',(SELECT email FROM support_canary_ids WHERE kind='student'),'StudentID','CANARY')))));
GRANT SELECT,UPDATE ON support_canary_snapshot TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM support_canary_ids WHERE kind='admin'),true),set_config('request.jwt.claims',(SELECT jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('role','admin'))::text FROM support_canary_ids WHERE kind='admin'),true);
SELECT public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='instructor'),'workspace.save',jsonb_build_object('revision',0,'data',(SELECT data FROM support_canary_snapshot)));
SELECT pg_temp.canary_assert(jsonb_array_length(public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='student'),'academic.read')->'publications')=0,'checked content remains hidden');
UPDATE support_canary_snapshot SET data=jsonb_set(jsonb_set(data,'{content,lesson,status}','"published"'),'{content,quiz,status}','"published"');
SELECT public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='instructor'),'workspace.save',jsonb_build_object('revision',1,'data',(SELECT data FROM support_canary_snapshot)));
SELECT pg_temp.canary_assert(jsonb_array_length(public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='student'),'academic.read')->'publications')=2,'enrolled learner receives released items');
SELECT pg_temp.canary_assert(jsonb_array_length(public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='outsider'),'academic.read')->'publications')=0,'outsider remains denied');
SELECT pg_temp.canary_assert(auth.uid()=(SELECT id FROM support_canary_ids WHERE kind='admin'),'principal restored after support read');
CREATE TEMP TABLE support_canary_publications AS SELECT p.* FROM jsonb_populate_recordset(NULL::public.edupulse_publications,public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='student'),'academic.read')->'publications') p;
SELECT pg_temp.canary_assert(NOT EXISTS(SELECT 1 FROM support_canary_publications p, jsonb_array_elements(p.content->'questions') q WHERE q ? 'correctIndex' OR q ? 'explanation'),'student answer keys stay private');
SELECT public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='student'),'academic.command',jsonb_build_object('operation','open','publication',(SELECT id FROM support_canary_publications WHERE type='material'),'version',(SELECT source_version FROM support_canary_publications WHERE type='material')));
SELECT pg_temp.canary_assert(jsonb_array_length(public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='instructor'),'academic.read')->'accesses')=0,'support preview does not create student activity');
DO $$ BEGIN
 BEGIN
  PERFORM public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='student'),'academic.command',jsonb_build_object('operation','start'));
  RAISE EXCEPTION 'Canary failed: support assessment start accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM pg_temp.canary_assert(auth.uid()=(SELECT id FROM support_canary_ids WHERE kind='admin'),'principal restored after error');
END $$;
INSERT INTO public.edupulse_pulse_threads(id,owner_id,title) SELECT gen_random_uuid(),id,'Synthetic rollback memory' FROM support_canary_ids WHERE kind='admin';
INSERT INTO public.edupulse_agent_memory(owner_id,thread_id,subject_id,task,outcome,summary) SELECT owner_id,id,(SELECT id FROM support_canary_ids WHERE kind='student'),'answer','generated','Synthetic handoff' FROM public.edupulse_pulse_threads WHERE title='Synthetic rollback memory';
SELECT pg_temp.canary_assert((SELECT count(*)=1 FROM public.edupulse_agent_memory WHERE summary='Synthetic handoff'),'owner memory persists');
-- Only the isolated learner now performs genuine learner commands.
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM support_canary_ids WHERE kind='student'),true),set_config('request.jwt.claims',(SELECT jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('role','student'))::text FROM support_canary_ids WHERE kind='student'),true);
SELECT pg_temp.canary_assert((SELECT count(*)=0 FROM public.edupulse_agent_memory),'selected learner cannot read admin memory');
SELECT pg_temp.canary_assert((SELECT count(*)=2 FROM public.edupulse_notices),'release notices delivered');
SELECT public.edupulse_academic_action(id,source_version,'[]','open') FROM support_canary_publications WHERE type='material';
SELECT public.edupulse_academic_action(id,source_version,'[0,1,2]','submit') FROM support_canary_publications WHERE type='assessment';
DO $$ BEGIN
 BEGIN PERFORM public.edupulse_support_action((SELECT id FROM support_canary_ids WHERE kind='outsider'),'academic.read'); RAISE EXCEPTION 'Canary failed: student impersonation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM support_canary_ids WHERE kind='instructor'),true),set_config('request.jwt.claims',(SELECT jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('role','instructor'))::text FROM support_canary_ids WHERE kind='instructor'),true);
SELECT pg_temp.canary_assert((SELECT count(*)=1 AND max(score)=3 FROM public.edupulse_attempts),'instructor receives persisted score');
SELECT pg_temp.canary_assert((SELECT count(*)=1 FROM public.edupulse_material_access),'instructor receives actual material access');
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM support_canary_ids WHERE kind='associate_dean'),true),set_config('request.jwt.claims',(SELECT jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('role','associate_dean'))::text FROM support_canary_ids WHERE kind='associate_dean'),true);
SELECT pg_temp.canary_assert((SELECT count(*)=0 FROM public.edupulse_attempts),'associate dean receives no scores');
ROLLBACK;
SELECT 'passed: rolled-back support, RLS, release, notices, access, assessment and instructor statistics canary' AS validation;
