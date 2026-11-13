import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {monitoringCohorts,cohortRecords,assessmentRows,materialRows} from '../src/components/academic/monitoringModel'
import {changeCourseMembership,updateCourseMember,courseMemberships} from '../src/utils/courseRoster'
import type {AcademicData} from '../src/components/academic/academicData'

test('independent monitoring excludes scripted attempts, opens, reading and sessions while retaining true zero and missing results',()=>{
 const data:AcademicData={courses:[{id:'course',course_code:'IT 104',course_title:'Research Methods',instructor_id:'owner',active:true}],enrollments:[{course_id:'course',student_email:'learner@example.invalid',block_section:'BSIT-1B'}],publications:[{id:'quiz',course_id:'course',type:'assessment',title:'Quiz',week:1,active:true,source_version:'current'},{id:'reading',course_id:'course',type:'material',title:'Reading',week:1,active:true,source_version:'current',content:{sections:[{}]}}],attempts:[{publication_id:'quiz',source_version:'current',student_email:'learner@example.invalid',score:0,max_score:5,submitted_at:'2026-11-13',is_test:false},{publication_id:'quiz',source_version:'current',student_email:'learner@example.invalid',score:5,max_score:5,submitted_at:'2026-11-14',is_test:true}],accesses:[{publication_id:'reading',student_email:'learner@example.invalid',first_opened_at:'2026-11-13',is_test:true}],reading:[{publication_id:'reading',student_email:'learner@example.invalid',source_version:'current',sections_read:1,total_sections:1,updated_at:'2026-11-13',is_test:true}],sessions:[{id:'s',attempt_no:1,publication_id:'quiz',student_email:'learner@example.invalid',source_version:'current',started_at:'2026-11-13',is_test:true}]}
 const scope=cohortRecords(data,monitoringCohorts(data,{registrations:[]},'owner')[0])
 assert.equal(assessmentRows(scope)[0].average,0)
 assert.equal(scope.attempts.length,1);assert.equal(scope.accesses.length,0);assert.equal(scope.sessions!.length,0);assert.equal(scope.reading!.length,0)
 assert.equal(materialRows(scope)[0].completed,0)
 assert.equal(data.attempts.length,2,'audit records are not removed or relabelled')
 data.attempts[0].is_test=true
 assert.equal(assessmentRows(cohortRecords(data,monitoringCohorts(data,{registrations:[]},'owner')[0]))[0].average,null,'no independent submission is not a zero score')
})

test('monitoring never mixes course/block students, distinguishes a true zero and requires section evidence',()=>{
 const data:AcademicData={courses:[{id:'c1',course_code:'IT 102',course_title:'Programming',instructor_id:'owner',active:true},{id:'c2',course_code:'IT 202',course_title:'Networking',instructor_id:'owner',active:true}],enrollments:[{course_id:'c1',student_email:'a@example.invalid',display_name:'A',block_section:'BSIT-1A',year_level:1},{course_id:'c1',student_email:'b@example.invalid',display_name:'B',block_section:'BSIT-1B',year_level:1},{course_id:'c2',student_email:'c@example.invalid',display_name:'C',block_section:'BSIT-2A',year_level:2}],publications:[{id:'q',course_id:'c1',active:true,type:'assessment',title:'Quiz',source_version:'v',week:1},{id:'m',course_id:'c1',active:true,type:'material',title:'Lesson',source_version:'v',week:1,content:{sections:[{},{}]}}],attempts:[{publication_id:'q',source_version:'v',student_email:'a@example.invalid',score:0,max_score:3,submitted_at:'2026-11-12'},{publication_id:'q',source_version:'v',student_email:'b@example.invalid',score:3,max_score:3,submitted_at:'2026-11-12'}],accesses:[{publication_id:'m',student_email:'a@example.invalid',first_opened_at:'2026-11-12'}],reading:[{publication_id:'m',source_version:'old',student_email:'a@example.invalid',sections_read:2,total_sections:2,updated_at:'2026-11-11'}]}
 const workspace={registrations:[]},cohorts=monitoringCohorts(data,workspace,'owner')
 assert.deepEqual(cohorts.map(c=>c.year),['1','1','2']);const scope=cohortRecords(data,cohorts[0])
 assert.deepEqual(scope.enrollments.map(e=>e.student_email),['a@example.invalid']);assert.equal(scope.attempts.length,1)
 assert.equal(assessmentRows(scope)[0].average,0);assert.equal(materialRows(scope)[0].average,0);assert.equal(materialRows(scope)[0].completed,0,'an open and old-version completion do not prove current reading')
 scope.reading=[{...data.reading![0],source_version:'v',sections_read:1}];assert.equal(materialRows(scope)[0].average,50)
 const member=courseMemberships(workspace,data as any,'owner')[0]
 assert.throws(()=>changeCourseMembership(workspace,member,'owner',null),/Suspend/)
 const cleared=updateCourseMember(workspace,member,{studentRef:''},'owner');assert.equal(courseMemberships(cleared,data as any,'owner')[0].student.StudentID,'')
 const suspended=updateCourseMember(workspace,member,{suspended:true},'owner');assert.equal(courseMemberships(suspended,data as any,'owner')[0].suspended,true)
 assert.equal(courseMemberships(changeCourseMembership(suspended,{...member,suspended:true},'owner',null),data as any,'owner').some(m=>m.student.Email==='a@example.invalid'),false)
})

test('monitoring persistence enforces suspend-before-remove, real versioned reading, and role isolation',async()=>{
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
  for(const file of ['20260915042129_persistent_workspace','20261004054136_system_admin_audit_roles','20261024064532_academic_projection','20261024071459_academic_record_labels','20261024073036_academic_lint_cleanup','20261024163740_pulse_conversations','20261024213422_pulse_history_privileges','20261028130000_baseline_workflows','20261028130100_assessment_workflows','20261028130200_delivery_notices','20261028130300_offline_review_requests','20261102074226_student_directory','20261107050829_safe_workspace_roster_refresh','20261107131810_instructor_roster_overrides','20261107141745_validate_course_membership_decisions','20261108055904_pulse_support_context','20261109221703_labelled_pipeline_activity','20261111201348_instructor_syllabus_sharing','20261111222305_instructor_monitoring_progress','20261112025514_instructor_monitoring_session_policy','20261112035656_student_assigned_course_metadata'])await db.exec(await readFile(`supabase/migrations/${file}.sql`,'utf8'))
  assert.equal((await db.query("SELECT * FROM pg_policies WHERE tablename='edupulse_assessment_sessions' AND cmd='SELECT'")).rows.length,1,'session reads use one permissive policy')
  const as=async(i:number)=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[ids[i],JSON.stringify({sub:ids[i],email:i===4?'riverabenlor461@gmail.com':`share${i}@example.invalid`,app_metadata:{role:roles[i]}})]);await db.exec('SET ROLE authenticated')}

  const snapshot:any={syllabi:[{id:'owned',courseCode:'IT 102',courseTitle:'Programming',status:'active',approvedFile:{approvalAttested:true}}],content:{m:{syllabusId:'owned',week:1,type:'material',status:'checked',content:{title:'Lesson',sections:[{heading:'First',body:'Read first.'},{heading:'Last',body:'Read last.'}]}},q:{syllabusId:'owned',week:1,type:'assessment',status:'checked',content:{title:'Quiz',questions:[0,1,2].map(n=>({text:`Question ${n}`,options:['A','B','C','D'],correctIndex:n}))}}},registrations:[{courseCode:'IT 102',courseTitle:'Programming',blockSection:'BSIT-1A',status:'active',uploadedBy:ids[0],students:[{Name:'Student',StudentID:'student',Email:'share3@example.invalid',YearLevel:'1'}]}],enrollmentOverrides:[]}
  let revision=0
  const save=async()=>{await db.query('SELECT * FROM public.edupulse_save_workspace($1,$2)',[revision,JSON.stringify(snapshot)]);revision++}
  await as(0);await save();await assert.rejects(db.query('SELECT public.edupulse_student_course_loads()'),{code:'42501'});await as(3);const assigned=(await db.query<any>('SELECT public.edupulse_student_course_loads() r')).rows[0].r;assert.equal(assigned.length,1);assert.equal(assigned[0].active,true);assert.equal('outline' in assigned[0],false);assert.equal('content' in assigned[0],false);await as(0);snapshot.content.m.status='published';snapshot.content.q.status='published';await save()
  const publications=(await db.query<any>('SELECT * FROM public.edupulse_publications')).rows,m=publications.find(p=>p.type==='material'),q=publications.find(p=>p.type==='assessment')
  const read=async(section:number,version=m.source_version)=>(await db.query<any>('SELECT public.edupulse_read_material_section($1,$2,$3) r',[m.id,version,section])).rows[0].r
  await as(3);await assert.rejects(read(0),{code:'42501'})
  await db.query("SELECT public.edupulse_academic_action($1,$2,'[]','open')",[m.id,m.source_version])
  await assert.rejects(read(1),{code:'22023'});assert.equal((await read(0)).sections_read,1);assert.equal((await read(0)).sections_read,1,'duplicate confirmation is idempotent');assert.equal((await read(1)).sections_read,2)
  assert.ok((await read(1)).completed_at);await assert.rejects(read(0,'stale'),{code:'42501'})
  await assert.rejects(db.query('UPDATE public.edupulse_material_progress SET sections_read=0'),{code:'42501'})
  await db.query('SELECT public.edupulse_assessment_command($1)',[JSON.stringify({operation:'start',publication:q.id,version:q.source_version})])
  assert.equal((await db.query('SELECT * FROM public.edupulse_assessment_sessions')).rows.length,1,'student retains own session read')
  await as(0);assert.equal((await db.query<any>('SELECT student_email FROM public.edupulse_assessment_sessions')).rows[0].student_email,'share3@example.invalid')
  snapshot.enrollmentOverrides=[{courseCode:'IT 102',studentEmail:'share3@example.invalid',excluded:true,blockSection:'BSIT-1A'}]
  await assert.rejects(save(),{code:'22023'});snapshot.enrollmentOverrides[0].suspended=true;await assert.rejects(save(),{code:'22023'},'suspend and remove cannot be combined to bypass the precondition');snapshot.enrollmentOverrides[0]={...snapshot.enrollmentOverrides[0],excluded:false,suspended:true};await save()
  assert.equal((await db.query<any>('SELECT suspended FROM public.edupulse_enrollments')).rows[0].suspended,true)
  await as(3);assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length,0)
  await assert.rejects(read(0),{code:'42501'});await assert.rejects(db.query("SELECT public.edupulse_academic_action($1,$2,'[]','open')",[m.id,m.source_version]),{code:'42501'})
  await assert.rejects(db.query('SELECT public.edupulse_assessment_command($1)',[JSON.stringify({operation:'start',publication:q.id,version:q.source_version})]),{code:'42501'})
  await as(1);assert.equal((await db.query('SELECT * FROM public.edupulse_material_progress')).rows.length,0);assert.equal((await db.query('SELECT * FROM public.edupulse_assessment_sessions')).rows.length,0)
  await as(4);const supported=(await db.query<any>("SELECT public.edupulse_support_action($1,'academic.read','{}') r",[ids[0]])).rows[0].r;assert.equal(supported.reading.length,1);assert.equal(supported.sessions.length,1)
  await assert.rejects(db.query("SELECT public.edupulse_support_action($1,'academic.command',$2)",[ids[3],JSON.stringify({operation:'read-section',publication:m.id,version:m.source_version,section:0})]),{code:'42501'})
  await as(0);snapshot.enrollmentOverrides[0].excluded=true;snapshot.registrations=[];await save();assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length,0);assert.equal((await db.query('SELECT * FROM public.edupulse_material_progress')).rows.length,1,'removal preserves reading history')
 }finally{await db.close()}
})
