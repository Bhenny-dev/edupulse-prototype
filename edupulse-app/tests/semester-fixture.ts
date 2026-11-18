import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
export async function semesterDatabase(){
 const db=new PGlite(),ids=Array.from({length:7},(_,i)=>`${i+1}`.repeat(8)+'-1111-4111-8111-111111111111')
 const roles=['instructor','instructor','dean','student','admin','student','associate_dean'],email=(i:number)=>i===4?'riverabenlor461@gmail.com':`handover${i}@example.invalid`

  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
   CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz DEFAULT now(),banned_until timestamptz,created_at timestamptz DEFAULT now(),last_sign_in_at timestamptz,updated_at timestamptz);
   CREATE TABLE auth.identities(user_id uuid,provider text);CREATE TABLE auth.audit_log_entries(id uuid,created_at timestamptz,payload jsonb);CREATE TABLE auth.sessions(user_id uuid);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
   GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
  for(let i=0;i<ids.length;i++)await db.query('INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES($1,$2,$3,$4)',[ids[i],email(i),JSON.stringify({role:roles[i]}),JSON.stringify({full_name:`Handover account ${i}`})])
  await db.query("INSERT INTO auth.identities VALUES($1,'google')",[ids[4]])
  const migrations=['20260915042129_persistent_workspace','20261004054136_system_admin_audit_roles','20261024064532_academic_projection','20261024071459_academic_record_labels','20261024073036_academic_lint_cleanup','20261024163740_pulse_conversations','20261024213422_pulse_history_privileges','20261028130000_baseline_workflows','20261028130100_assessment_workflows','20261028130200_delivery_notices','20261028130300_offline_review_requests','20261102074226_student_directory','20261107050829_safe_workspace_roster_refresh','20261107131810_instructor_roster_overrides','20261107141745_validate_course_membership_decisions','20261108055904_pulse_support_context','20261109221703_labelled_pipeline_activity','20261110033603_protect_learner_publication_metadata','20261111201348_instructor_syllabus_sharing','20261111222305_instructor_monitoring_progress','20261112025514_instructor_monitoring_session_policy','20261112035656_student_assigned_course_metadata','20261113052000_student_practice','20261113052500_practice_input_guards']
  for(const name of migrations)await db.exec(await readFile(`supabase/migrations/${name}.sql`,'utf8'))
  await db.exec(await readFile('supabase/migrations/20261109100000_retained_syllabus_sources.sql','utf8'))
  for(const name of ['20261110041721_draft_only_generation_checkpoints','20261111093735_assessment_student_labels','20261112211931_syllabus_sharing_adoption_suspension','20261113051000_admin_student_demonstration'])await db.exec(await readFile(`supabase/migrations/${name}.sql`,'utf8'))
  await db.exec(`CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
   CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text REFERENCES storage.buckets(id),name text,UNIQUE(bucket_id,name));
   CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(regexp_replace(name,'/[^/]*$',''),'/') $$;
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO authenticated,anon;
   GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;GRANT SELECT ON storage.buckets TO authenticated;`)
  for(const name of ['20261114100000_private_teaching_files','20261114080000_dean_course_loads_and_accounts','20261114090000_dean_support_directory_fix','20261115080000_program_coordinator_dean_parity','20261115131427_unified_dean_courses','20261117073840_teaching_load_document_intake','20261117083004_teaching_load_source_context','20261117094641_active_teaching_load_accounts'])await db.exec(await readFile(`supabase/migrations/${name}.sql`,'utf8'))
  await db.exec(await readFile('supabase/migrations/20261118000521_course_catalog_actions.sql','utf8'))

 for(const name of ['20261115220621_block_week_delivery_schedule','20261117104340_instructor_load_continuity','20261117113517_handover_file_inspection','20261118010055_semester_course_catalog','20261118011308_instructor_course_assignment_classes','20261118014224_completed_semester_history'])await db.exec(await readFile('supabase/migrations/'+name+'.sql','utf8'))
 const as=async(i:number)=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[ids[i],JSON.stringify({sub:ids[i],email:email(i),app_metadata:{role:roles[i]}})]);await db.exec('SET ROLE authenticated')}
 const command=async(input:object)=>(await db.query<{result:Record<string,any>}>('SELECT public.edupulse_dean_command($1) result',[JSON.stringify(input)])).rows[0].result
 return {db,ids,email,roles,as,command}
}
