import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('baseline shared imports, scheduled publication, topic scoring, timed attempts, teacher marking and notices enforce role boundaries', async () => {
 const db=new PGlite();const ids=['11111111-1111-4111-8111-111111111111','22222222-1111-4111-8111-111111111111','33333333-1111-4111-8111-111111111111','44444444-1111-4111-8111-111111111111'];
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb NOT NULL DEFAULT '{}',raw_user_meta_data jsonb NOT NULL DEFAULT '{}'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$; GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
  for(const id of ids)await db.query('INSERT INTO auth.users(id) VALUES($1)',[id]);
  for(const file of ['20260915042129_persistent_workspace','20261004054136_system_admin_audit_roles','20261024064532_academic_projection','20261024065254_request_leases','20261024071459_academic_record_labels','20261024073036_academic_lint_cleanup'])await db.exec(await readFile(`supabase/migrations/${file}.sql`,'utf8'));
  await db.query("UPDATE auth.users SET raw_app_meta_data='{\"role\":\"instructor\"}' WHERE id=$1",[ids[0]]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[ids[0],JSON.stringify({email:'user0@example.invalid',app_metadata:{role:'instructor'}})]);await db.exec('SET ROLE authenticated');
  const legacy={syllabi:[{id:'legacy',courseCode:'LEGACY',courseTitle:'Existing Programming',status:'active',approvedFile:{approvalAttested:true},courseOutline:[{week:1,ilos:'Explain variables',contents:['Variables']}],onlineReferences:[{title:'Programming source',url:'https://example.org/programming'},'https://example.org/legacy',{url:'javascript:bad()'}]}],content:{},registrations:[]};
  await db.query('SELECT public.edupulse_save_workspace(0,$1)',[JSON.stringify(legacy)]);await db.exec('RESET ROLE');
  for(const file of ['20261028130000_baseline_workflows','20261028130100_assessment_workflows','20261028130200_delivery_notices','20261028130300_offline_review_requests'])await db.exec(await readFile(`supabase/migrations/${file}.sql`,'utf8'));
  const restored=(await db.query<{syllabus_status:string,outline:unknown[],source_links:string[]}>("SELECT syllabus_status,outline,source_links FROM public.edupulse_courses WHERE course_code='LEGACY'")).rows[0];assert.equal(restored.syllabus_status,'active');assert.equal(restored.outline.length,1);assert.deepEqual(restored.source_links,['https://example.org/programming','https://example.org/legacy']);assert.equal((await db.query<{revision:number}>('SELECT revision FROM public.edupulse_workspaces')).rows[0].revision,1,'backfill does not create an instructor edit');
  const as=async(index:number,role:string)=>{await db.exec('RESET ROLE');await db.query(`UPDATE auth.users SET email=$2,raw_app_meta_data=jsonb_build_object('role',$3::text) WHERE id=$1`,[ids[index],`user${index}@example.invalid`,role]);await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`,[ids[index],JSON.stringify({email:`user${index}@example.invalid`,app_metadata:{role}})]);await db.exec('SET ROLE authenticated')};
  const command=async(input:object)=>(await db.query<{r:Record<string,any>}>('SELECT public.edupulse_assessment_command($1) r',[JSON.stringify(input)])).rows[0].r;
  await as(0,'instructor');await as(1,'student');await as(2,'associate_dean');
  const imp=(kind:string,rows:object[])=>db.query('SELECT public.edupulse_import_records($1,$2,$3)',[kind,JSON.stringify(rows),'test.csv']);
  await imp('courses',[{CourseCode:'IT 102',CourseTitle:'Programming'}]);
  await imp('loads',[{InstructorID:ids[0],CourseCode:'IT 102',Block:'BSIT-1A',Semester:'1'}]);
  await imp('rosters',[{StudentID:'S1',Name:'Synthetic learner',Email:'user1@example.invalid',Block:'BSIT-1A'}]);
  assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length,0);
  const content={title:'Mapped quiz',assessmentPolicy:{maxAttempts:2,durationSeconds:600},questions:[{text:'Question one',options:['A','B','C','D'],correctIndex:0,topic:'Variables'},{text:'Functions can only be called once.',type:'true_false',options:['True','False'],correctIndex:1,topic:'Functions'},{text:'Explain a variable',type:'short_answer',topic:'Variables'}]};
  const snapshot={syllabi:[{id:'s1',courseCode:'IT 102',courseTitle:'Programming',status:'active',approvedFile:{approvalAttested:true},courseOutline:[{week:1,contents:['Variables','Functions'],ilos:'Use functions'}]}],content:{q1:{syllabusId:'s1',week:1,type:'assessment',status:'checked',content,releaseAt:new Date(Date.now()+86400000).toISOString()}},registrations:[]};
  await as(0,'instructor');const save=(rev:number)=>db.query('SELECT public.edupulse_save_workspace($1,$2)',[rev,JSON.stringify(snapshot)]);await save(1);snapshot.content.q1.status='published';await save(2);
  let p=(await db.query<{id:string,source_version:string,content:typeof content}>('SELECT * FROM public.edupulse_publications')).rows[0];assert.equal(p.content.questions[0].correctIndex,undefined);
  await as(1,'student');assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length,0);
  await assert.rejects(command({operation:'start',publication:p.id,version:p.source_version}),{code:'42501'});
  await as(0,'instructor');snapshot.content.q1.releaseAt=new Date(Date.now()-1000).toISOString();await save(3);
  const remind=async()=>(await db.query<{r:{sent:number}}>("SELECT public.edupulse_notice_action('remind','{}',$1) r",[p.id])).rows[0].r;
  assert.equal((await remind()).sent,1,'publication notice does not suppress the first instructor reminder');assert.equal((await remind()).sent,0,'duplicate reminder within a day is excluded');
  await as(1,'student');assert.equal((await db.query('SELECT * FROM public.edupulse_enrollments')).rows.length,1);
  const s=await command({operation:'start',publication:p.id,version:p.source_version});
  await assert.rejects(command({operation:'submit',publication:p.id,version:p.source_version,session:s.id,responses:[0,2,'Invalid true/false choice.']}),{code:'22023'});
  const a=await command({operation:'submit',publication:p.id,version:p.source_version,session:s.id,responses:[0,1,'A variable stores a value.']});assert.equal(a.grading_status,'pending_review');assert.deepEqual(a.topic_scores,[]);
  assert.equal((await command({operation:'submit',publication:p.id,version:p.source_version,session:s.id,responses:[0,1,'A variable stores a value.']})).id,a.id,'retry is idempotent');
  await assert.rejects(command({operation:'grade',attempt:a.id,points:[1,1,1],reason:'Forged student mark'}),{code:'42501'});
  await command({operation:'appeal',attempt:a.id,reason:'Please review the explanation.'});
  await as(0,'instructor');const graded=await command({operation:'grade',attempt:a.id,points:[1,0,1],reason:'Reviewed each response against the syllabus.'});assert.equal(graded.score,2);assert.equal(graded.topic_scores.find((x:any)=>x.topic==='Variables').score,2);
  await as(3,'dean');await db.query('SELECT public.edupulse_request_revision($1,$2)',[(await db.query<{id:string}>('SELECT id FROM public.edupulse_courses')).rows[0].id,'Clarify the learning outcomes.']);assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length,1);await assert.rejects(command({operation:'grade',attempt:a.id,points:[1,1,1],reason:'Dean cannot mark'}),{code:'42501'});
  await as(2,'associate_dean');await assert.rejects(db.query('SELECT public.edupulse_request_revision($1,$2)',[p.id,'Cannot review as Dean']),{code:'42501'});assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length,0);await assert.rejects(command({operation:'grade',attempt:a.id,points:[1,1,1],reason:'No score access'}),{code:'42501'});
  await as(1,'student');const second=await command({operation:'start',publication:p.id,version:p.source_version,retake:true});assert.equal(second.attempt_no,2);assert.equal((await db.query("SELECT * FROM public.edupulse_notices WHERE title LIKE 'Assessment reviewed:%'")).rows.length,1);
  await db.exec('RESET ROLE');await db.query("UPDATE public.edupulse_assessment_sessions SET started_at=now()-interval '11 minutes' WHERE id=$1",[second.id]);await db.exec('SET ROLE authenticated');
  await assert.rejects(command({operation:'submit',publication:p.id,version:p.source_version,session:second.id,responses:[0,1,'Too late.']}),{code:'22023'});
  await db.exec('RESET ROLE');await db.query('UPDATE public.edupulse_assessment_sessions SET started_at=now() WHERE id=$1',[second.id]);await db.exec('SET ROLE authenticated');
  const retaken=await command({operation:'submit',publication:p.id,version:p.source_version,session:second.id,responses:[0,1,'Second written response.']});assert.equal(retaken.attempt_no,2);
  await as(0,'instructor');await command({operation:'grade',attempt:retaken.id,points:[1,1,1],reason:'Reviewed second attempt.'});
  await as(1,'student');await assert.rejects(command({operation:'start',publication:p.id,version:p.source_version,retake:true}),{code:'22023'});
  await as(2,'associate_dean');await assert.rejects(imp('rosters',Array.from({length:36},(_,i)=>({StudentID:`CAP-${i}`,Name:`Synthetic ${i}`,Email:`cap${i}@example.invalid`,Block:'OVER-CAP'}))),{code:'22023'});
  assert.equal((await db.query("SELECT * FROM public.edupulse_institutional_records WHERE kind='rosters' AND data->>'Block'='OVER-CAP'")).rows.length,0,'failed import is atomic');
  await as(1,'student');await assert.rejects(db.query("SELECT edupulse_private.academic_action($1,$2,'[]','submit')",[p.id,p.source_version]),{code:'42501'});
  await as(0,'instructor');await assert.rejects(imp('courses',[{CourseCode:'X',CourseTitle:'Forged'}]),{code:'42501'});
  snapshot.syllabi[0].status='archived';await save(4);assert.equal((await db.query<{active:boolean}>('SELECT active FROM public.edupulse_publications WHERE id=$1',[p.id])).rows[0].active,false,'archiving withdraws previously published content without a failed save');await save(5);
  await as(1,'student');assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length,0);

 }finally{await db.close()}
})
