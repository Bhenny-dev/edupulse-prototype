import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('teaching attachment storage stays private, immutable, scoped by release/enrollment and the publication instructor', async () => {
 const db=new PGlite(),ids=[1,2,3,4,5].map(n=>`${n}`.repeat(8)+'-1111-4111-8111-111111111111')
 const roles=['instructor','instructor','instructor','student','admin']
 try {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
   CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz DEFAULT now(),banned_until timestamptz,created_at timestamptz DEFAULT now(),last_sign_in_at timestamptz);
   CREATE TABLE auth.identities(user_id uuid,provider text);CREATE TABLE auth.audit_log_entries(id uuid,created_at timestamptz,payload jsonb);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
   GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
  for(let i=0;i<ids.length;i++)await db.query('INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES($1,$2,$3,$4)',[ids[i],i===4?'riverabenlor461@gmail.com':`share${i}@example.invalid`,JSON.stringify({role:roles[i]}),JSON.stringify({full_name:`Instructor ${i}`})])
  await db.query("INSERT INTO auth.identities VALUES($1,'google')",[ids[4]])
  for(const file of ['20260915042129_persistent_workspace','20261004054136_system_admin_audit_roles','20261024064532_academic_projection','20261024071459_academic_record_labels','20261024073036_academic_lint_cleanup','20261024163740_pulse_conversations','20261024213422_pulse_history_privileges','20261028130000_baseline_workflows','20261028130100_assessment_workflows','20261028130200_delivery_notices','20261028130300_offline_review_requests','20261102074226_student_directory','20261107050829_safe_workspace_roster_refresh','20261107131810_instructor_roster_overrides','20261107141745_validate_course_membership_decisions','20261108055904_pulse_support_context','20261109221703_labelled_pipeline_activity','20261111201348_instructor_syllabus_sharing','20261111222305_instructor_monitoring_progress','20261112025514_instructor_monitoring_session_policy','20261112035656_student_assigned_course_metadata'])await db.exec(await readFile(`supabase/migrations/${file}.sql`,'utf8'))

  await db.exec(`CREATE SCHEMA storage;
   CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
   CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text REFERENCES storage.buckets(id),name text,UNIQUE(bucket_id,name));
   CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(regexp_replace(name,'/[^/]*$',''),'/') $$;
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
   GRANT USAGE ON SCHEMA storage TO authenticated,anon;
   GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
   GRANT SELECT ON storage.buckets TO authenticated;`)
  await db.exec(await readFile('supabase/migrations/20261114100000_private_teaching_files.sql','utf8'))
  const bucket=(await db.query<{public:boolean;file_size_limit:number}>("SELECT * FROM storage.buckets WHERE id='edupulse-teaching-files'")).rows[0]
  assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),4_000_000)
  const as=async(i:number)=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[ids[i],JSON.stringify({sub:ids[i],email:i===4?'riverabenlor461@gmail.com':`share${i}@example.invalid`,app_metadata:{role:roles[i]}})]);await db.exec('SET ROLE authenticated')}
  const path=`${ids[0]}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/lesson.bin`, own=`${ids[1]}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/private.txt`
  await as(0);await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('edupulse-teaching-files',$1)",[path])
  await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('edupulse-teaching-files',$1)",[own]),{code:'42501'})
  await as(1);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0)
  await db.exec('RESET ROLE')
  await db.query("INSERT INTO public.edupulse_courses(id,instructor_id,syllabus_id,course_code,course_title,active,source_revision) VALUES('course',$1,'syllabus','IT 102','Programming',true,1)",[ids[0]])
  await db.query("INSERT INTO public.edupulse_enrollments(course_id,instructor_id,student_email,display_name,block_section) VALUES('course',$1,'share3@example.invalid','Learner','BSIT-1A')",[ids[0]])
  await db.query("INSERT INTO public.edupulse_publications(id,course_id,instructor_id,workspace_item_id,week,type,title,content,source_version,active,release_at) VALUES('release','course',$1,'lesson',1,'material','Lesson',$2,'v1',true,now()+interval '1 day')",[ids[0],JSON.stringify({attachments:[{path}]})])
  await as(3);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0,'future release remains private')
  await db.exec('RESET ROLE');await db.exec("UPDATE public.edupulse_publications SET release_at=NULL")
  await as(3);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,1,'enrolled learner can read released attachment')
  assert.equal((await db.query("UPDATE storage.objects SET name='changed' RETURNING id")).rows.length,0,'released bytes cannot be replaced')
  assert.equal((await db.query('DELETE FROM storage.objects RETURNING id')).rows.length,0)
  await db.exec('RESET ROLE');await db.exec('UPDATE public.edupulse_enrollments SET suspended=true')
  await as(3);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0,'suspension revokes fresh signed-url authority')
  await db.exec('RESET ROLE');await db.exec('UPDATE public.edupulse_enrollments SET suspended=false');await db.query('UPDATE public.edupulse_publications SET instructor_id=$1',[ids[1]])
  await as(3);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0,'another instructor cannot expose a guessed private file path')
  await as(4);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,1,'authorized actual Admin supports the owner')
  await as(0);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,1,'original instructor retains their private file')
 } finally {await db.close()}
})
