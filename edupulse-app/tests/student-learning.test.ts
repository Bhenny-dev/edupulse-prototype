import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
test('student practice and explicit Admin demonstrations preserve keys, ownership and independent results',async()=>{
 const db=new PGlite(),ids=[1,2,3,4,5].map(n=>`${n}`.repeat(8)+'-1111-4111-8111-111111111111')
 const roles=['instructor','instructor','instructor','student','admin']
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
   CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz DEFAULT now(),banned_until timestamptz,created_at timestamptz DEFAULT now(),last_sign_in_at timestamptz);
   CREATE TABLE auth.identities(user_id uuid,provider text);CREATE TABLE auth.audit_log_entries(id uuid,created_at timestamptz,payload jsonb);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
   GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
  for(let i=0;i<ids.length;i++)await db.query('INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES($1,$2,$3,$4)',[ids[i],i===4?'riverabenlor461@gmail.com':`share${i}@example.invalid`,JSON.stringify({role:roles[i]}),JSON.stringify({full_name:`Instructor ${i}`})])
  await db.query("INSERT INTO auth.identities VALUES($1,'google')",[ids[4]])
  for(const file of ['20260915042129_persistent_workspace','20261004054136_system_admin_audit_roles','20261024064532_academic_projection','20261024071459_academic_record_labels','20261024073036_academic_lint_cleanup','20261024163740_pulse_conversations','20261024213422_pulse_history_privileges','20261028130000_baseline_workflows','20261028130100_assessment_workflows','20261028130200_delivery_notices','20261028130300_offline_review_requests','20261102074226_student_directory','20261107050829_safe_workspace_roster_refresh','20261107131810_instructor_roster_overrides','20261107141745_validate_course_membership_decisions','20261108055904_pulse_support_context','20261109221703_labelled_pipeline_activity','20261111201348_instructor_syllabus_sharing','20261111222305_instructor_monitoring_progress','20261112025514_instructor_monitoring_session_policy','20261112035656_student_assigned_course_metadata','20261113051000_admin_student_demonstration','20261113052000_student_practice','20261113052500_practice_input_guards'])await db.exec(await readFile(`supabase/migrations/${file}.sql`,'utf8'))
  assert.equal((await db.query("SELECT * FROM pg_policies WHERE tablename='edupulse_assessment_sessions' AND cmd='SELECT'")).rows.length,1,'session reads use one permissive policy')
  const as=async(i:number)=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[ids[i],JSON.stringify({sub:ids[i],email:i===4?'riverabenlor461@gmail.com':`share${i}@example.invalid`,app_metadata:{role:roles[i]}})]);await db.exec('SET ROLE authenticated')}

  const snapshot:any={syllabi:[{id:'owned',courseCode:'IT 102',courseTitle:'Programming',status:'active',approvedFile:{approvalAttested:true}}],content:{m:{syllabusId:'owned',week:1,type:'material',status:'checked',content:{title:'Lesson',sections:[{heading:'First',body:'Read first.'},{heading:'Last',body:'Read last.'}]}},q:{syllabusId:'owned',week:1,type:'assessment',status:'checked',content:{title:'Quiz',questions:[0,1,2].map(n=>({text:`Question ${n}`,options:['A','B','C','D'],correctIndex:n}))}}},registrations:[{courseCode:'IT 102',courseTitle:'Programming',blockSection:'BSIT-1A',status:'active',uploadedBy:ids[0],students:[{Name:'Student',StudentID:'student',Email:'share3@example.invalid',YearLevel:'1'}]}],enrollmentOverrides:[]}
  let revision=0
  const save=async()=>{await db.query('SELECT * FROM public.edupulse_save_workspace($1,$2)',[revision,JSON.stringify(snapshot)]);revision++}
  await as(0);await save();await assert.rejects(db.query('SELECT public.edupulse_student_course_loads()'),{code:'42501'});await as(3);const assigned=(await db.query<any>('SELECT public.edupulse_student_course_loads() r')).rows[0].r;assert.equal(assigned.length,1);assert.equal(assigned[0].active,true);assert.equal('outline' in assigned[0],false);assert.equal('content' in assigned[0],false);await as(0);snapshot.content.m.status='published';snapshot.content.q.status='published';await save()
  const publications=(await db.query<any>('SELECT * FROM public.edupulse_publications')).rows,m=publications.find(p=>p.type==='material'),q=publications.find(p=>p.type==='assessment')
  await as(4)
  const support=async(command:any)=>(await db.query<any>('SELECT public.edupulse_support_action($1,$2,$3) r',[ids[3],'academic.command',JSON.stringify(command)])).rows[0].r
  await assert.rejects(support({operation:'start',publication:q.id,version:q.source_version}),{code:'42501'})
  const session=await support({operation:'start',publication:q.id,version:q.source_version,adminTest:true})
  assert.equal(session.is_test,true);assert.equal(session.admin_actor_id,ids[4])
  const result=await support({operation:'respond',publication:q.id,version:q.source_version,session:session.id,responses:[0,1,2],adminTest:true})
  assert.equal(result.score,3);assert.equal(result.is_test,true);assert.equal(result.admin_actor_id,ids[4])
  assert.equal((await db.query<any>('SELECT auth.uid() uid')).rows[0].uid,ids[4])
  await support({operation:'open',publication:m.id,version:m.source_version,adminTest:true})
  const reading=await support({operation:'read-section',publication:m.id,version:m.source_version,section:0,adminTest:true});assert.equal(reading.is_test,true)
  await as(3)
  const practice=async(input:any)=>(await db.query<any>('SELECT public.edupulse_practice_action($1) r',[JSON.stringify(input)])).rows[0].r
  const set=await practice({operation:'create',publication:m.id,version:m.source_version,title:'Advanced practice',questions:[0,1,2].map(i=>({text:'Apply reading concept '+i,options:['A','B','C','D'],correctIndex:i}))})
  assert.equal(set.questions[0].correctIndex,undefined)
  await assert.rejects(db.query('SELECT * FROM edupulse_private.practice_keys'),{code:'42501'})
  const submission='77777777-1111-4111-8111-111111111111'
  const first=await practice({operation:'submit',set:set.id,submission,responses:[0,1,2]});assert.equal(first.score,3);assert.equal(first.is_test,false)
  assert.deepEqual(await practice({operation:'submit',set:set.id,submission,responses:[0,1,2]}),first)
  await assert.rejects(practice({operation:'submit',set:set.id,submission,responses:[1,1,2]}),{code:'22023'})
  assert.equal((await practice({operation:'submit',set:set.id,submission:'88888888-1111-4111-8111-111111111111',responses:[0,0,0]})).score,1)
  assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length,1,'practice never overwrites instructor assessment')
  await as(1);await assert.rejects(practice({operation:'submit',set:set.id,submission,responses:[0,1,2]}),{code:'42501'});assert.equal((await db.query('SELECT * FROM public.edupulse_practice_sets')).rows.length,0)
  await as(4)
  const listed=(await db.query<any>("SELECT public.edupulse_support_action($1,'practice.list') r",[ids[3]])).rows[0].r;assert.equal(listed.attempts.length,2)
  await assert.rejects(db.query("SELECT public.edupulse_support_action($1,'practice.command',$2)",[ids[3],JSON.stringify({operation:'submit',set:set.id,submission,responses:[0,1,2]})]),{code:'42501'})
  const adminPractice=(await db.query<any>("SELECT public.edupulse_support_action($1,'practice.command',$2) r",[ids[3],JSON.stringify({operation:'submit',set:set.id,submission:'99999999-1111-4111-8111-111111111111',responses:[0,1,2],adminTest:true})])).rows[0].r
  assert.equal(adminPractice.admin_actor_id,ids[4]);assert.equal(adminPractice.is_test,true)
 }finally{await db.close()}
})
