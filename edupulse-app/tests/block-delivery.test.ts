import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { deliveryState, localDeliveryTime, scheduleDates, validateDeliveryDates, weeklyDeliveryDates } from '../src/utils/blockDelivery'
import { academicCommand } from '../server/domains/academic'

test('weekly dates retain actual week slots and Philippine time; openings are required and closings optional', () => {
 const rows=weeklyDeliveryDates([3,1,2,9],'2026-11-20','07:30','10:00')
 assert.deepEqual(rows.map(row=>row.date),['2026-11-20','2026-11-27','2026-12-04','2027-01-15'])
 assert.deepEqual(localDeliveryTime('2026-11-19T23:30:00Z'),{date:'2026-11-20',time:'07:30'})
 assert.deepEqual(scheduleDates([1],undefined),[{week:1,date:'',start:'',end:''}])
 validateDeliveryDates(weeklyDeliveryDates([1,2],'2026-11-20','07:30'))
 for(const [date,start,end] of [['2026-02-30','07:30',''],['2026-11-20','',''],['2026-11-20','07:30','07:30'],['2026-11-20','07:30','24:00']])assert.throws(()=>weeklyDeliveryDates([1],date,start,end))
 const scheduled={delivery_mode:'block_schedule',delivery_open_at:'2026-11-19T23:30:00Z',delivery_close_at:'2026-11-20T02:00:00Z'}
 assert.equal(deliveryState(scheduled,Date.parse('2026-11-19T23:29:59Z')),'scheduled')
 assert.equal(deliveryState(scheduled,Date.parse(scheduled.delivery_open_at)),'open')
 assert.equal(deliveryState(scheduled,Date.parse(scheduled.delivery_close_at)),'closed')
 assert.equal(deliveryState({...scheduled,delivery_close_at:null},Date.parse('2027-01-01Z')),'open')
 const command={operation:'delivery-schedule',syllabus:'s1',block:'BSIT-1A',revision:0,windows:rows}
 assert.equal(academicCommand.safeParse(command).success,true)
 assert.equal(academicCommand.safeParse({...command,windows:[{week:1,date:'2026-11-20',start:'',end:''}]}).success,false)
})

test('block delivery persists with revision guards and enforces RLS, files, reading, assessment sessions and support roles without losing scores', async () => {
 const db=new PGlite(),ids=Array.from({length:8},(_,i)=>`${i+1}`.repeat(8)+'-1111-4111-8111-111111111111')
 const roles=['instructor','instructor','dean','student','admin','student','student','associate_dean']
 const email=(i:number)=>i===4?'riverabenlor461@gmail.com':`schedule${i}@example.invalid`
 try {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
   CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz DEFAULT now(),banned_until timestamptz,created_at timestamptz DEFAULT now(),last_sign_in_at timestamptz);
   CREATE TABLE auth.identities(user_id uuid,provider text);CREATE TABLE auth.audit_log_entries(id uuid,created_at timestamptz,payload jsonb);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
   GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
  for(let i=0;i<ids.length;i++)await db.query('INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES($1,$2,$3,$4)',[ids[i],email(i),JSON.stringify({role:roles[i]}),JSON.stringify({full_name:`Schedule account ${i}`})])
  await db.query("INSERT INTO auth.identities VALUES($1,'google')",[ids[4]])
  for(const file of ['20260915042129_persistent_workspace','20261004054136_system_admin_audit_roles','20261024064532_academic_projection','20261024071459_academic_record_labels','20261024073036_academic_lint_cleanup','20261024163740_pulse_conversations','20261024213422_pulse_history_privileges','20261028130000_baseline_workflows','20261028130100_assessment_workflows','20261028130200_delivery_notices','20261028130300_offline_review_requests','20261102074226_student_directory','20261107050829_safe_workspace_roster_refresh','20261107131810_instructor_roster_overrides','20261107141745_validate_course_membership_decisions','20261108055904_pulse_support_context','20261109221703_labelled_pipeline_activity','20261110033603_protect_learner_publication_metadata','20261111201348_instructor_syllabus_sharing','20261111222305_instructor_monitoring_progress','20261112025514_instructor_monitoring_session_policy','20261112035656_student_assigned_course_metadata','20261113052000_student_practice','20261113052500_practice_input_guards'])await db.exec(await readFile(`supabase/migrations/${file}.sql`,'utf8'))
  await db.exec(`CREATE SCHEMA storage;
   CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint);
   CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text REFERENCES storage.buckets(id),name text,UNIQUE(bucket_id,name));
   CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(regexp_replace(name,'/[^/]*$',''),'/') $$;
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO authenticated,anon;
   GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;GRANT SELECT ON storage.buckets TO authenticated;`)
  await db.exec(await readFile('supabase/migrations/20261114100000_private_teaching_files.sql','utf8'))
  const as=async(i:number)=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[ids[i],JSON.stringify({sub:ids[i],email:email(i),app_metadata:{role:roles[i]}})]);await db.exec('SET ROLE authenticated')}
  const rpc=async(fn:string,command:object)=>(await db.query<{value:any}>(`SELECT public.${fn}($1) value`,[JSON.stringify(command)])).rows[0].value
  const list=async()=> (await db.query<{value:any[]}>('SELECT public.edupulse_student_publications() value')).rows[0].value
  const support=async(i:number,op:string,input:object={})=>(await db.query<{value:any}>('SELECT public.edupulse_support_action($1,$2,$3) value',[ids[i],op,JSON.stringify(input)])).rows[0].value
  const path=`${ids[0]}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/lesson.txt`
  await as(0);await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('edupulse-teaching-files',$1)",[path])
  await as(2)
  for(const [kind,rows] of [
   ['courses',[{CourseCode:'IT 102',CourseTitle:'Programming'}]],
   ['loads',['A','B','C'].map(letter=>({InstructorID:ids[0],CourseCode:'IT 102',Block:`BSIT-1${letter}`,Semester:'1',AcademicYear:'2026-2027'}))],
   ['rosters',[3,5,6].map((i,j)=>({StudentID:`S-${i}`,Name:`Student ${i}`,Email:email(i),Block:`BSIT-1${'ABC'[j]}`}))],
  ] as const)await db.query('SELECT public.edupulse_import_records($1,$2,$3)',[kind,JSON.stringify(rows),'schedule-fixture.csv'])
  const snapshot={syllabi:[{id:'s1',courseCode:'IT 102',courseTitle:'Programming',status:'active',courseInfo:{academicYear:'2026-2027',periodOffered:'1'},approvedFile:{approvalAttested:true},courseOutline:[1,2].map(week=>({week,contents:['Variables'],ilos:'Explain named values'}))}],content:{
   legacy:{syllabusId:'s1',week:1,type:'material',status:'checked',content:{title:'Legacy lesson',sections:[{heading:'Legacy',body:'Retained original delivery.'}]}},
   material:{syllabusId:'s1',week:1,type:'material',status:'draft',content:{title:'Scheduled lesson',attachments:[{path}],sections:[{heading:'Variables',body:'A variable stores a value.'}],ai:{private:'teacher-only'}}},
   quiz:{syllabusId:'s1',week:1,type:'assessment',status:'draft',content:{title:'Scheduled quiz',assessmentPolicy:{maxAttempts:3,durationSeconds:600},questions:[1,2,3].map(i=>({text:`Variable statement ${i}`,type:'true_false',options:['True','False'],correctIndex:0,topic:'Variables'}))}},
  },registrations:[]}
  let revision=0
  const save=async()=>{const r=await db.query('SELECT public.edupulse_save_workspace($1,$2)',[revision,JSON.stringify(snapshot)]);revision++;return r}
  await as(0);await save();snapshot.content.legacy.status='published';await save()
  const legacyBefore=(await db.query('SELECT to_jsonb(p) value FROM public.edupulse_publications p')).rows
  await db.exec('RESET ROLE');await db.exec(await readFile('supabase/migrations/20261115220621_block_week_delivery_schedule.sql','utf8'));await db.exec(await readFile('supabase/migrations/20261127090000_practice_from_finished_quiz.sql','utf8'));await as(0)
  assert.deepEqual((await db.query("SELECT to_jsonb(p)-'delivery_mode' value FROM public.edupulse_publications p")).rows,legacyBefore,'DDL leaves all existing publications and versions intact')
  await save()
  snapshot.content.material.status='checked';snapshot.content.quiz.status='checked';await save()
  snapshot.content.material.status='published'
  await assert.rejects(save(),{code:'22023'});snapshot.content.material.status='checked'
  const today=(await db.query<{class_date:string}>("SELECT to_char(now() AT TIME ZONE 'Asia/Manila','YYYY-MM-DD') AS class_date")).rows[0].class_date
  const day=(offset:number)=>new Date(Date.parse(today+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10)
  const schedule=(block:string,date:string,start:string,end='',rev=0)=>({operation:'delivery-schedule',syllabus:'s1',block,revision:rev,windows:weeklyDeliveryDates([1,2],date,start,end)})
  const a=schedule('BSIT-1A',today,'00:00'),b=schedule('BSIT-1B',day(1),'07:30','10:00'),c=schedule('BSIT-1C',day(-1),'07:30','10:00')
  await assert.rejects(rpc('edupulse_delivery_schedule',{...a,block:'UNASSIGNED'}),{code:'42501'})
  await assert.rejects(rpc('edupulse_delivery_schedule',{...a,windows:a.windows.slice(1)}),{code:'40001'})
  await assert.rejects(rpc('edupulse_delivery_schedule',{...a,windows:a.windows.map(row=>({...row,end:'24:00'}))}),{code:'22023'})
  const saved=await rpc('edupulse_delivery_schedule',a);assert.equal(saved.revision,1)
  await assert.rejects(rpc('edupulse_delivery_schedule',a),{code:'40001'})
  for(const command of [b,c])await rpc('edupulse_delivery_schedule',command)
  assert.deepEqual(localDeliveryTime((await db.query<{windows:any[]}>('SELECT windows FROM public.edupulse_delivery_schedules WHERE block_section=$1',['BSIT-1B'])).rows[0].windows[0].opens_at),{date:day(1),time:'07:30'})
  await assert.rejects(db.exec('DELETE FROM public.edupulse_delivery_schedules'),{code:'42501'})
  await as(1);assert.equal((await db.query('SELECT * FROM public.edupulse_delivery_schedules')).rows.length,0);await assert.rejects(rpc('edupulse_delivery_schedule',a),{code:'42501'})
  await as(2);assert.equal((await db.query('SELECT * FROM public.edupulse_delivery_schedules')).rows.length,3);await assert.rejects(rpc('edupulse_delivery_schedule',a),{code:'42501'})
  await as(0)
  Object.assign(snapshot.content.material,{status:'published',deliveryMode:'block_schedule'});Object.assign(snapshot.content.quiz,{status:'published',deliveryMode:'block_schedule'});await save()
  const pubs=(await db.query<any>('SELECT * FROM public.edupulse_publications')).rows,material=pubs.find(p=>p.title==='Scheduled lesson'),quiz=pubs.find(p=>p.title==='Scheduled quiz')
  assert.equal(quiz.delivery_mode,'block_schedule');assert.equal(material.content.ai,undefined);assert.equal(quiz.content.questions[0].correctIndex,undefined)
  const action=(op:string,p:any=material)=>db.query('SELECT public.edupulse_academic_action($1,$2,$3,$4)',[p.id,p.source_version,'[]',op])
  const assess=(op:string,extra:object={})=>rpc('edupulse_assessment_command',{operation:op,publication:quiz.id,version:quiz.source_version,...extra})
  await as(3)
  assert.equal((await db.query('SELECT * FROM public.edupulse_delivery_schedules')).rows.length,1)
  assert.equal((await list()).find(p=>p.id===material.id).delivery_state,'open')
  await action('open')
  await db.query('SELECT public.edupulse_read_material_section($1,$2,0)',[material.id,material.source_version])
  const session=await assess('start'),result=await assess('submit',{session:session.id,responses:[0,0,1]});assert.equal(result.score,2)
  const before=(await db.query('SELECT to_jsonb(a) value FROM public.edupulse_attempts a')).rows
  for(const [i,state] of [[5,'scheduled'],[6,'closed']] as const){
   await as(i)
   assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length,1,'only legacy content is directly readable')
   const locked=(await list()).find(p=>p.id===material.id);assert.equal(locked.delivery_state,state);assert.equal(locked.content,null)
   assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0,'locked teaching bytes remain private')
   await assert.rejects(action('open'),{code:'42501'});await assert.rejects(assess('start'),{code:'42501'})
   await assert.rejects(db.query('SELECT public.edupulse_read_material_section($1,$2,0)',[material.id,material.source_version]),{code:'42501'})
   await assert.rejects(rpc('edupulse_practice_action',{operation:'create',publication:material.id,version:material.source_version}),{code:'42501'})
  }
  await as(4)
  const supportRead=await support(5,'academic.read');assert.equal(supportRead.publications.find((p:any)=>p.id===material.id).content,null)
  assert.equal((await support(5,'academic.command',{operation:'read-publication',publication:material.id,version:material.source_version}))[0].delivery_state,'scheduled')
  assert.equal((await support(0,'academic.command',{...a,revision:1,windows:weeklyDeliveryDates([1,2],day(-1),'07:30','10:00')})).revision,2)
  await as(3)
  assert.equal((await list()).find(p=>p.id===quiz.id).content,null)
  assert.deepEqual((await db.query('SELECT to_jsonb(a) value FROM public.edupulse_attempts a')).rows,before,'closing does not alter scores or their versions')
  const pastQuiz={operation:'create',publication:quiz.id,version:quiz.source_version,sourceKind:'assessment',title:'Quiz practice',questions:[0,1,2].map(i=>({text:'Apply the quiz topic '+i,options:['A','B','C','D'],correctIndex:i}))}
  const quizSet=await rpc('edupulse_practice_action',pastQuiz);assert.equal(quizSet.source_kind,'assessment','a submitted quiz past its window can seed practice');assert.equal(quizSet.publication_id,quiz.id);assert.equal(quizSet.questions[0].correctIndex,undefined)
  await assert.rejects(rpc('edupulse_practice_action',{...pastQuiz,sourceKind:'reading'}),{code:'42501'},'a quiz is never treated as reading')
  await assert.rejects(rpc('edupulse_practice_action',{...pastQuiz,publication:material.id,version:material.source_version}),{code:'42501'},'reading is not a finished quiz')
  await as(5);await assert.rejects(rpc('edupulse_practice_action',pastQuiz),{code:'42501'},'practice needs your own submitted attempt');await as(3)
  await assert.rejects(assess('submit',{session:session.id,responses:[0,0,1]}),{code:'42501'})
  await as(0);assert.equal((await db.query<{source_version:string}>('SELECT source_version FROM public.edupulse_publications WHERE id=$1',[quiz.id])).rows[0].source_version,quiz.source_version,'schedule changes never change the assessment hash')
  await rpc('edupulse_delivery_schedule',{...a,revision:2})
  await as(3);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,1,'no-close reopening restores authorized file access')
  await as(7);assert.equal((await db.query('SELECT * FROM public.edupulse_delivery_schedules')).rows.length,3);assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length,0,'coordinator retains its documented score boundary')
  await db.exec('RESET ROLE');await db.exec("UPDATE public.edupulse_enrollments SET block_section='UNCONFIGURED' WHERE student_email='schedule5@example.invalid'")
  await as(5);assert.equal((await list()).find(p=>p.id===material.id).delivery_state,'unconfigured');await assert.rejects(action('open'),{code:'42501'})
 }finally{await db.close()}
})
