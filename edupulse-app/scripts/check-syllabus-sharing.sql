-- Rolled-back hosted SQL/RLS canary. No real account or syllabus is changed.
BEGIN;
CREATE TEMP TABLE sharing_canary_ids(kind text PRIMARY KEY,id uuid,email text);
INSERT INTO sharing_canary_ids SELECT 'admin',id,email FROM auth.users WHERE lower(email)='riverabenlor461@gmail.com';
INSERT INTO sharing_canary_ids SELECT kind,gen_random_uuid(),'edupulse-share-canary-'||gen_random_uuid()::text||'@example.invalid' FROM unnest(ARRAY['sender','recipient','outsider']) kind;
GRANT SELECT ON sharing_canary_ids TO authenticated;
CREATE FUNCTION pg_temp.sharing_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT coalesce(ok,false) THEN RAISE EXCEPTION 'Sharing canary failed: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.sharing_as(account text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 PERFORM set_config('request.jwt.claim.sub',(SELECT id::text FROM sharing_canary_ids WHERE kind=account),true);
 PERFORM set_config('request.jwt.claims',(SELECT jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',jsonb_build_object('role',CASE WHEN kind='admin' THEN 'admin' WHEN kind='outsider' THEN 'student' ELSE 'instructor' END))::text FROM sharing_canary_ids WHERE kind=account),true);
END $$;
SELECT pg_temp.sharing_assert((SELECT count(*)=4 FROM sharing_canary_ids),'existing verified admin required');
INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 SELECT '00000000-0000-0000-0000-000000000000',id,'authenticated','authenticated',email,'',now(),jsonb_build_object('role',CASE WHEN kind='outsider' THEN 'student' ELSE 'instructor' END,'provider','email','providers',jsonb_build_array('email')),jsonb_build_object('full_name','Synthetic sharing '||kind),now(),now() FROM sharing_canary_ids WHERE kind<>'admin';
CREATE TEMP TABLE sharing_canary_delivery(id uuid);
GRANT SELECT,INSERT ON sharing_canary_delivery TO authenticated;
SET LOCAL ROLE authenticated;
SELECT pg_temp.sharing_as('sender');
SELECT public.edupulse_save_workspace(0,jsonb_build_object('syllabi',jsonb_build_array(jsonb_build_object('id','canary','courseCode','SYN-SHARE','courseTitle','Synthetic sharing outline','status','drafted','approvedFile',jsonb_build_object('base64','PRIVATE-COPY'),'courseOutline',jsonb_build_array(jsonb_build_object('week',1,'ilos','Explain a value','contents',jsonb_build_array('Variables'),'sections',jsonb_build_array(jsonb_build_object('id','scope','ilos','Explain a value','contents',jsonb_build_array('Variables'),'privateCopy','PRIVATE-COPY')))))),'content','{}'::jsonb,'registrations','[]'::jsonb));
INSERT INTO sharing_canary_delivery SELECT (public.edupulse_syllabus_share(jsonb_build_object('operation','send','syllabus','canary','revision',1,'email',(SELECT email FROM sharing_canary_ids WHERE kind='recipient')))->>'id')::uuid;
SELECT pg_temp.sharing_assert((SELECT count(*)=1 FROM public.edupulse_syllabus_shares WHERE id IN(SELECT id FROM sharing_canary_delivery)),'sender repository persisted');
SELECT pg_temp.sharing_as('recipient');
SELECT pg_temp.sharing_assert((SELECT count(*)=1 FROM public.edupulse_syllabus_shares WHERE id IN(SELECT id FROM sharing_canary_delivery) AND sender_name='Synthetic sharing sender' AND snapshot->>'courseCode'='SYN-SHARE' AND snapshot::text NOT LIKE '%PRIVATE-COPY%'),'recipient copy with safe fields and sender provenance');
SELECT pg_temp.sharing_assert((SELECT count(*)=0 FROM public.edupulse_workspaces),'recipient cannot read sender workspace');
SELECT pg_temp.sharing_as('outsider');
SELECT pg_temp.sharing_assert((SELECT count(*)=0 FROM public.edupulse_syllabus_shares WHERE id IN(SELECT id FROM sharing_canary_delivery)),'outsider cannot read delivery');
DO $$ BEGIN BEGIN PERFORM public.edupulse_syllabus_share(jsonb_build_object('operation','remove','id',(SELECT id FROM sharing_canary_delivery))); RAISE EXCEPTION 'Outsider removal accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
SELECT pg_temp.sharing_as('sender');
SELECT public.edupulse_save_workspace(1,'{"syllabi":[],"content":{},"registrations":[]}'::jsonb);
SELECT pg_temp.sharing_assert((SELECT count(*)=1 FROM public.edupulse_syllabus_shares WHERE id IN(SELECT id FROM sharing_canary_delivery)),'owned deletion preserves independent shared snapshot');
SELECT pg_temp.sharing_as('recipient');
SELECT public.edupulse_syllabus_share(jsonb_build_object('operation','remove','id',(SELECT id FROM sharing_canary_delivery)));
SELECT pg_temp.sharing_assert((SELECT count(*)=0 FROM public.edupulse_syllabus_shares WHERE id IN(SELECT id FROM sharing_canary_delivery)),'recipient removal persists');
SELECT pg_temp.sharing_as('admin');
SELECT pg_temp.sharing_assert(jsonb_array_length(public.edupulse_support_action((SELECT id FROM sharing_canary_ids WHERE kind='sender'),'syllabi.read'))=1,'authorized support reads sender repository');
SELECT public.edupulse_support_action((SELECT id FROM sharing_canary_ids WHERE kind='sender'),'syllabi.command',jsonb_build_object('operation','remove','id',(SELECT id FROM sharing_canary_delivery)));
SELECT pg_temp.sharing_assert((SELECT count(*)=1 FROM public.edupulse_support_events WHERE actor_id=(SELECT id FROM sharing_canary_ids WHERE kind='admin') AND subject_id=(SELECT id FROM sharing_canary_ids WHERE kind='sender') AND operation='syllabi.command'),'support mutation attributed to actual admin');
ROLLBACK;
SELECT 'passed: rolled-back sharing, sender/recipient ownership, private-copy exclusion, deletion and audited support canary' AS validation;
