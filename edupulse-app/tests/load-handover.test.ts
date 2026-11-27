import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {createHash} from 'node:crypto'

test('a Dean block handover copies teaching independently, retains scores/access/schedules and survives remove then replacement',async()=>{
 const db=new PGlite(),ids=Array.from({length:7},(_,i)=>`${i+1}`.repeat(8)+'-1111-4111-8111-111111111111')
 const roles=['instructor','instructor','dean','student','admin','student','associate_dean'],email=(i:number)=>i===4?'riverabenlor461@gmail.com':`handover${i}@example.invalid`
 try{
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
  const as=async(i:number)=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[ids[i],JSON.stringify({sub:ids[i],email:email(i),app_metadata:{role:roles[i]}})]);await db.exec('SET ROLE authenticated')}
  const rpc=async(fn:string,command:object)=>(await db.query<{r:any}>(`SELECT public.${fn}($1) r`,[JSON.stringify(command)])).rows[0].r
  const dean=(command:object)=>rpc('edupulse_dean_command',command)
  const key=(block:string)=>`IT 102|${block}|1st Semester|2026-2027`
  const load=(block:string,instructor=ids[0])=>({course_code:'IT 102',instructor_id:instructor,block,semester:'1st Semester',academic_year:'2026-2027'})
  await as(2)
  await db.query("SELECT public.edupulse_import_records('courses',$1,'catalog.csv')",[JSON.stringify([{CourseCode:'IT 102',CourseTitle:'Programming'}])])
  await db.query("SELECT public.edupulse_import_records('rosters',$1,'roster.csv')",[JSON.stringify([3,5].map((i,n)=>({StudentID:`S-${i}`,Name:`Student ${i}`,Email:email(i),Block:`BSIT-1${'AB'[n]}`})))])
  await dean({action:'load.assign',loads:[load('BSIT-1A'),load('BSIT-1B')]})
  const path=`${ids[0]}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/lesson.txt`
  await as(0);await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('edupulse-teaching-files',$1)",[path])
  const sourceId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',sourceUrl='https://example.invalid/variables'
  await db.query(`INSERT INTO public.edupulse_source_archives(id,owner_id,reference_key,reference,url,sha256,name,mime,size,text,base64,pages) VALUES($1,$2,$3,$4,$5,$6,'variables.txt','text/plain',100,$7,$8,0)`,[sourceId,ids[0],'a'.repeat(64),JSON.stringify({kind:'link',title:'Variables handbook',url:sourceUrl,authors:'',year:'',publisher:''}),sourceUrl,'b'.repeat(64),'A retained variables source. '.repeat(5),Buffer.from('Retained source fixture').toString('base64')])
  const original=Buffer.from('%PDF-1.4\nFixture approved source\n%%EOF')
  const snapshot:any={syllabi:[{id:'s1',courseCode:'IT 102',courseTitle:'Programming',status:'active',courseInfo:{academicYear:'2026-2027',periodOffered:'1'},approvedFile:{approvalAttested:true,name:'approved.pdf',size:original.length,sha256:createHash('sha256').update(original).digest('hex'),base64:original.toString('base64')},courseOutline:[{week:1,contents:['Variables'],ilos:'Explain variables'}]},{id:'private',courseCode:'OTHER',courseTitle:'Unrelated course',status:'drafted',courseOutline:[]}],content:{
   material:{syllabusId:'s1',week:1,type:'material',status:'checked',content:{title:'Variables',courseItemId:'material',ai:{sources:[{retained:{id:sourceId}}]},attachments:[{path,name:'lesson.txt'}],sections:[{heading:'Variables',body:'A variable stores a value.'}]}},
   quiz:{syllabusId:'s1',week:1,type:'assessment',status:'checked',content:{title:'Variable quiz',courseItemId:'quiz',coverage:{materialIds:['material']},assessmentPolicy:{maxAttempts:3,durationSeconds:0},questions:[1,2,3].map(i=>({text:`Variable statement ${i}`,type:'true_false',options:['True','False'],correctIndex:0,topic:'Variables'}))}},
   private:{syllabusId:'private',week:1,type:'material',status:'draft',content:{title:'PRIVATE OTHER MATERIAL'}}},registrations:[]}
  await db.query('SELECT public.edupulse_save_workspace(0,$1)',[JSON.stringify(snapshot)])
  snapshot.content.material.status='published';snapshot.content.quiz.status='published'
  await db.query('SELECT public.edupulse_save_workspace(1,$1)',[JSON.stringify(snapshot)])
  const sourcePubs=(await db.query<{id:string;type:string;source_version:string;course_id:string}>('SELECT * FROM public.edupulse_publications ORDER BY type')).rows
  const material=sourcePubs.find(p=>p.type==='material')!,quiz=sourcePubs.find(p=>p.type==='assessment')!
  await as(3)
  const session=await rpc('edupulse_assessment_command',{operation:'start',publication:quiz.id,version:quiz.source_version})
  assert.equal((await rpc('edupulse_assessment_command',{operation:'submit',publication:quiz.id,version:quiz.source_version,session:session.id,responses:[0,1,0]})).score,2)
  await db.query("SELECT public.edupulse_academic_action($1,$2,'[]','open')",[material.id,material.source_version])
  await db.query('SELECT public.edupulse_read_material_section($1,$2,0)',[material.id,material.source_version])
  await as(5)
  const other=await rpc('edupulse_assessment_command',{operation:'start',publication:quiz.id,version:quiz.source_version})
  await rpc('edupulse_assessment_command',{operation:'submit',publication:quiz.id,version:quiz.source_version,session:other.id,responses:[0,0,0]})
  await db.exec('RESET ROLE')
  await db.exec(await readFile('supabase/migrations/20261115220621_block_week_delivery_schedule.sql','utf8'))
  await db.exec(await readFile('supabase/migrations/20261117104340_instructor_load_continuity.sql','utf8'))
  await db.exec(await readFile('supabase/migrations/20261117113517_handover_file_inspection.sql','utf8'))
  // Capacity failure must roll back the load, bundle link and every recipient write.
  await as(1)
  const receiverDrafts={syllabi:Array.from({length:50},(_,n)=>({id:`receiver-${n}`,courseCode:`OTHER-${n}`,courseTitle:'Receiver private course',status:'drafted',courseOutline:[]})),content:{},registrations:[]}
  await db.query('SELECT public.edupulse_save_workspace(0,$1)',[JSON.stringify(receiverDrafts)])
  await as(2)
  await assert.rejects(dean({action:'load.update',key:key('BSIT-1A'),expected_instructor:ids[0],instructor_id:ids[1],block:'BSIT-1A',semester:'1st Semester'}),{code:'22023'})
  assert.equal((await db.query<{data:any}>("SELECT data FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=$1",[key('BSIT-1A')])).rows[0].data.InstructorID,ids[0])
  await db.exec('RESET ROLE');assert.equal((await db.query('SELECT * FROM edupulse_private.teaching_handover_writes')).rows.length,0)
  await as(1)
  await db.query('SELECT public.edupulse_save_workspace(1,$1)',[JSON.stringify({...receiverDrafts,syllabi:receiverDrafts.syllabi.map(s=>({...s,status:'archived',suspended:true,suspendedStatus:'drafted'}))})])
  await db.query('SELECT public.edupulse_save_workspace(2,$1)',[JSON.stringify({syllabi:[],content:{},registrations:[]})])
  await db.exec('RESET ROLE')
  for(const block of ['BSIT-1A','BSIT-1B'])await db.query("INSERT INTO public.edupulse_delivery_schedules VALUES($1,$2,'s1',$3,1,'[{\"week\":1,\"opens_at\":\"2020-01-01T00:00:00Z\",\"closes_at\":null}]',now())",[quiz.course_id,ids[0],block])
  await as(0)
  snapshot.content.material.deliveryMode='block_schedule';snapshot.content.quiz.deliveryMode='block_schedule'
  await db.query('SELECT public.edupulse_save_workspace(2,$1)',[JSON.stringify(snapshot)])
  await as(3);await assert.rejects(dean({action:'load.update',key:key('BSIT-1A'),expected_instructor:ids[0],instructor_id:ids[1],block:'BSIT-1A',semester:'1st Semester'}),{code:'42501'})
  await as(0)
  const oldSnapshot=(await db.query<{data:any}>('SELECT data FROM public.edupulse_workspaces WHERE owner_id=$1',[ids[0]])).rows[0].data
  assert.ok((await db.query("SELECT * FROM public.edupulse_enrollments WHERE block_section='BSIT-1A'")).rows.length>0,'before the handover the instructor reads the block roster')
  assert.ok(oldSnapshot.syllabi.some((s:any)=>s.id==='s1'))
  await as(2)
  await dean({action:'load.update',key:key('BSIT-1A'),expected_instructor:ids[0],instructor_id:ids[1],block:'BSIT-1A',semester:'1st Semester'})
  await as(1)
  const target=(await db.query<{data:any;revision:number}>('SELECT data,revision FROM public.edupulse_workspaces')).rows[0]
  assert.equal(target.data.syllabi.length,1);assert.notEqual(target.data.syllabi[0].id,'s1');assert.equal(target.data.syllabi[0].status,'active')
  assert.doesNotMatch(JSON.stringify(target.data),/PRIVATE OTHER MATERIAL|Unrelated course/)
  assert.deepEqual(target.data.syllabi[0].approvedFile,snapshot.syllabi[0].approvedFile)
  const targetPubs=(await db.query<{id:string;type:string;source_version:string}>('SELECT * FROM public.edupulse_publications')).rows
  assert.equal(targetPubs.length,2);assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length,1)
  const transferred=(await db.query<{score:number;max_score:number;submitted_at:string;is_test:boolean}>('SELECT * FROM public.edupulse_attempts')).rows
  assert.equal(transferred.length,1);assert.equal(transferred[0].score,2);assert.equal(transferred[0].max_score,3);assert.equal(transferred[0].is_test,false)
  assert.equal((await db.query('SELECT * FROM public.edupulse_material_access')).rows.length,1)
  assert.equal((await db.query<{sections_read:number}>('SELECT * FROM public.edupulse_material_progress')).rows[0].sections_read,1)
  assert.equal((await db.query<{handover_origin:{publication_id:string}}>('SELECT * FROM public.edupulse_attempts')).rows[0].handover_origin.publication_id,quiz.id)
  assert.equal((await db.query('SELECT * FROM public.edupulse_delivery_schedules')).rows.length,1)
  assert.equal((await db.query('SELECT name FROM storage.objects')).rows.length,1,'private inherited files are readable by the assigned replacement')
  const retained=(await db.query<{id:string}>('SELECT id FROM public.edupulse_source_archives')).rows
  assert.equal(retained.length,1);assert.notEqual(retained[0].id,sourceId)
  assert.equal(Object.values(target.data.content).find((v:any)=>v.type==='material') && (Object.values(target.data.content).find((v:any)=>v.type==='material') as any).content.ai.sources[0].retained.id,retained[0].id)
  await assert.rejects(db.query('SELECT * FROM edupulse_private.teaching_handover_bundles'),{code:'42501'})
  // R-D3 (G8): the former instructor keeps their syllabus copy but can no longer open the handed-over block.
  await as(0)
  assert.equal((await db.query("SELECT * FROM public.edupulse_enrollments WHERE block_section='BSIT-1A'")).rows.length,0,'the former instructor no longer reads the handed-over block roster')
  assert.equal((await db.query('SELECT * FROM public.edupulse_attempts WHERE id=$1',[(transferred[0] as any).id])).rows.length,0,'the former instructor cannot read the transferred score')
  const formerSyllabi=(await db.query<{data:any}>('SELECT data FROM public.edupulse_workspaces WHERE owner_id=$1',[ids[0]])).rows[0]?.data.syllabi||[]
  assert.ok(formerSyllabi.some((s:any)=>s.id==='s1'),'the former instructor keeps their syllabus copy on their Syllabus page')
  await as(2)
  assert.equal((await db.query('SELECT name FROM storage.objects')).rows.length,1,'management can inspect the inherited original teaching file')
  const scan=await dean({action:'load.inspect',key:key('BSIT-1A'),expected_instructor:ids[1]})
  assert.equal(scan.syllabus.id,target.data.syllabi[0].id)
  await as(1)
  // A normal post-handover save must use the same publication IDs and retain marks.
  await db.query('SELECT public.edupulse_save_workspace($1,$2)',[target.revision,JSON.stringify(target.data)])
  assert.deepEqual((await db.query('SELECT id FROM public.edupulse_publications ORDER BY id')).rows,targetPubs.map(p=>({id:p.id})).sort((a,b)=>a.id.localeCompare(b.id)))
  assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length,1)
  // The continued class is operational: keys, versions and attempt limits allow
  // the enrolled student to take the next real attempt. Roll back only this check.
  const continuedQuiz=targetPubs.find(p=>p.type==='assessment')!
  const versionCheck=(await db.query<{source_version:string;attempts:unknown}>("SELECT p.source_version,(SELECT jsonb_agg(a.source_version) FROM public.edupulse_attempts a WHERE a.publication_id=p.id) attempts FROM public.edupulse_publications p WHERE p.id=$1",[continuedQuiz.id])).rows[0]
  assert.equal(continuedQuiz.source_version,versionCheck.source_version,JSON.stringify({initial:continuedQuiz.source_version,current:versionCheck.source_version,attempts:versionCheck.attempts}))
  assert.deepEqual(versionCheck.attempts,[continuedQuiz.source_version],JSON.stringify(versionCheck))
  await as(3);await db.exec('BEGIN')
  const nextSession=await rpc('edupulse_assessment_command',{operation:'start',publication:continuedQuiz.id,version:continuedQuiz.source_version,retake:true})
  assert.equal(nextSession.attempt_no,2)
  const continuedResult=await rpc('edupulse_assessment_command',{operation:'submit',publication:continuedQuiz.id,version:continuedQuiz.source_version,session:nextSession.id,responses:[0,0,0]})
  assert.equal(continuedResult.score,3);assert.equal(continuedResult.max_score,3)
  await db.exec('ROLLBACK');await as(1)
  target.data.content.followup={syllabusId:target.data.syllabi[0].id,week:1,type:'material',status:'checked',content:{title:'Replacement follow-up',sections:[{heading:'New example',body:'Only the replacement adds this example.'}]}}
  await db.query('SELECT public.edupulse_save_workspace($1,$2)',[target.revision+1,JSON.stringify(target.data)])
  target.data.content.followup.status='published';target.data.content.followup.deliveryMode='block_schedule'
  await db.query('SELECT public.edupulse_save_workspace($1,$2)',[target.revision+2,JSON.stringify(target.data)])
  await as(0)
  assert.deepEqual((await db.query<{data:any}>('SELECT data FROM public.edupulse_workspaces')).rows[0].data,oldSnapshot,'the remaining block keeps its independent workspace')
  assert.deepEqual((await db.query<{block_section:string}>('SELECT DISTINCT block_section FROM public.edupulse_enrollments')).rows.map(r=>r.block_section),['BSIT-1B'])
  // Remove then reassign captures the continued basis without erasing prior evidence.
  await as(6);await dean({action:'load.remove',keys:[key('BSIT-1A')]})
  await as(1);assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length,0)
  await db.query('SELECT public.edupulse_save_workspace($1,$2)',[target.revision+3,JSON.stringify(target.data)])
  assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length,0,'saving a stale registration cannot restore a removed load')
  assert.equal((await db.query('SELECT name FROM storage.objects')).rows.length,0,'removed load revokes inherited file access')
  await as(6);await dean({action:'load.assign',loads:[load('BSIT-1A',ids[1])]})
  await as(1);assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length,1,'restoring the same teacher never duplicates scores')
  await db.exec('RESET ROLE')
  for(const table of ['edupulse_attempts','edupulse_material_access','edupulse_assessment_sessions'])await db.query(`UPDATE public.${table} SET is_test=true,admin_actor_id=$1 WHERE publication_id IN (SELECT id FROM public.edupulse_publications WHERE instructor_id=$2)`,[ids[4],ids[1]])
  await as(6);await dean({action:'load.remove',keys:[key('BSIT-1A')]})
  await dean({action:'load.assign',loads:[load('BSIT-1A',ids[0])]})
  await as(0)
  const returned=(await db.query<{data:any}>('SELECT data FROM public.edupulse_workspaces')).rows[0].data
  assert.equal(returned.syllabi.length,3,'the returned block receives its own continued basis alongside the remaining block and private repository')
  assert.deepEqual(returned.syllabi.find((s:any)=>s.id==='s1'),oldSnapshot.syllabi[0])
  assert.equal((await db.query('SELECT * FROM public.edupulse_attempts WHERE publication_id<>$1',[quiz.id])).rows.length,1,'continued scores return under the independent copied course')
  const copiedOrigin=(await db.query<{is_test:boolean;admin_actor_id:string}>('SELECT * FROM public.edupulse_attempts WHERE publication_id<>$1',[quiz.id])).rows[0]
  assert.equal(copiedOrigin.is_test,true);assert.equal(copiedOrigin.admin_actor_id,ids[4],'a handover never relabels Admin work as independent student work')
  await db.exec('RESET ROLE')
  assert.equal((await db.query('SELECT * FROM edupulse_private.teaching_handover_writes')).rows.length,0)
 }finally{await db.close()}
})
