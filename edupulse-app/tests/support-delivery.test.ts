import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('support gateway rechecks owner, adopts target RLS, restores claims, audits changes and never fabricates learner activity', async () => {
  const db = new PGlite()
  const ids = [1,2,3,4,5].map(n => `${n}`.repeat(8)+'-1111-4111-8111-111111111111')
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz DEFAULT now(),banned_until timestamptz,created_at timestamptz DEFAULT now(),last_sign_in_at timestamptz);
      CREATE TABLE auth.identities(user_id uuid,provider text);
      CREATE TABLE auth.audit_log_entries(id uuid,created_at timestamptz,payload jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon;`)
    for (let i=0;i<ids.length;i++) await db.query(`INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES($1,$2,$3,$4)`, [ids[i],i===0?'riverabenlor461@gmail.com':`canary${i}@example.invalid`,JSON.stringify({role:['admin','instructor','student','student','associate_dean'][i]}),JSON.stringify({full_name:`Synthetic account ${i}`})])
    await db.query(`INSERT INTO auth.identities VALUES($1,'google')`,[ids[0]])
    for (const file of ['20260915042129_persistent_workspace','20261004054136_system_admin_audit_roles','20261024064532_academic_projection','20261024071459_academic_record_labels','20261024073036_academic_lint_cleanup','20261024163740_pulse_conversations','20261024213422_pulse_history_privileges','20261028130000_baseline_workflows','20261028130100_assessment_workflows','20261028130200_delivery_notices','20261028130300_offline_review_requests','20261102074226_student_directory','20261107050829_safe_workspace_roster_refresh','20261107131810_instructor_roster_overrides','20261107141745_validate_course_membership_decisions','20261108055904_pulse_support_context','20261109221703_labelled_pipeline_activity']) await db.exec(await readFile(`supabase/migrations/${file}.sql`,'utf8'))
    for (const i of [2,3]) await db.query(`INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,full_name,year_level,department,program) VALUES($1,$2,$3,'Canary','Synthetic',$4,$5,'College of IT','BSIT')`, [`SYN-${i}`,ids[i],`canary${i}@example.invalid`,`Synthetic account ${i}`,i===2?1:2])
    const as = async (i:number) => {
      await db.exec('RESET ROLE')
      await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`, [ids[i],JSON.stringify({sub:ids[i],email:i===0?'riverabenlor461@gmail.com':`canary${i}@example.invalid`,app_metadata:{role:['admin','instructor','student','student','associate_dean'][i]}})])
      await db.exec('SET ROLE authenticated')
    }
    const call = async (subject:string|null,operation:string,input:object={}) => (await db.query<{r:any}>(`SELECT public.edupulse_support_action($1,$2,$3) r`,[subject,operation,JSON.stringify(input)])).rows[0].r
    await db.exec(await readFile('supabase/migrations/20261111114904_second_google_admin.sql','utf8'))
    const second='66666666-1111-4111-8111-111111111111'
    await db.query(`INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,'2024-1-0262.botay@kcp.edu.ph','{"role":"admin"}')`,[second])
    await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`,[second,JSON.stringify({sub:second,app_metadata:{role:'admin'}})])
    await db.exec('SET ROLE authenticated')
    await assert.rejects(call(ids[2],'subject'),{code:'42501'},'pre-registration alone cannot bypass Google verification')
    await db.exec('RESET ROLE');await db.query(`INSERT INTO auth.identities VALUES($1,'google')`,[second]);await db.exec('SET ROLE authenticated')
    assert.equal((await call(ids[2],'subject')).id,ids[2])
    assert.equal((await db.query<{r:any}>('SELECT public.edupulse_admin_overview() r')).rows[0].r.accounts.filter((a:any)=>a.role==='admin').length,2)
    await assert.rejects(call(ids[0],'subject'),{code:'42501'},'the second admin cannot impersonate the protected original admin')
    for(const mutation of ["raw_app_meta_data='{}'","email_confirmed_at=NULL","banned_until=now()+interval '1 day'","email='outsider@kcp.edu.ph'"]){
      await db.exec('RESET ROLE');await db.query(`UPDATE auth.users SET ${mutation} WHERE id=$1`,[second]);await db.exec('SET ROLE authenticated')
      await assert.rejects(call(ids[2],'subject'),{code:'42501'},'fresh account state overrides stale admin claims')
      await db.exec('RESET ROLE');await db.query(`UPDATE auth.users SET email='2024-1-0262.botay@kcp.edu.ph',raw_app_meta_data='{"role":"admin"}',email_confirmed_at=now(),banned_until=NULL WHERE id=$1`,[second]);await db.exec('SET ROLE authenticated')
    }
    await as(0)
    const snapshot:any={syllabi:[{id:'canary-syllabus',courseCode:'SYN 101',courseTitle:'Synthetic delivery check',status:'active',approvedFile:{approvalAttested:true},courseOutline:[{week:1,ilos:'Explain variables',contents:['Variables']}]}],content:{quiz:{syllabusId:'canary-syllabus',week:1,type:'assessment',status:'checked',content:{title:'Synthetic variables assessment',questions:[0,1,2].map(i=>({text:`Question ${i}`,topic:'Variables',options:['A','B','C','D'],correctIndex:i,explanation:'Reviewed explanation.'}))}}},registrations:[{courseCode:'SYN 101',blockSection:'SYN-1A',status:'active',students:[{Name:'Synthetic account 2',Email:'canary2@example.invalid',StudentID:'SYN-2'}]}]}
    snapshot.content.lesson={syllabusId:'canary-syllabus',week:1,type:'material',status:'checked',content:{title:'Synthetic variables lesson',sections:[{heading:'Variables',body:'Variables store named values.'}]}}
    await as(1); await db.query('SELECT public.edupulse_save_workspace(0,$1)',[JSON.stringify(snapshot)])
    await as(2);assert.equal((await db.query('SELECT * FROM public.edupulse_publications')).rows.length,0,'checked is not released')
    await assert.rejects(call(ids[3],'academic.read'),{code:'42501'},'a student cannot impersonate another account')
    await as(1);snapshot.content.quiz.status='published';snapshot.content.lesson.status='published';await db.query('SELECT public.edupulse_save_workspace(1,$1)',[JSON.stringify(snapshot)])
    const publication=(await db.query<{id:string;source_version:string;content:any}>("SELECT * FROM public.edupulse_publications WHERE type='assessment'")).rows[0]
    assert.equal('correctIndex' in publication.content.questions[0],false)
    await as(0)
    const accounts=await call(null,'accounts',{role:'student',year:1,q:'SYN-2'})
    assert.equal(accounts.total,1);assert.equal(accounts.accounts[0].id,ids[2])
    assert.equal((await call(null,'accounts',{role:'student',year:2})).accounts[0].id,ids[3])
    const publicSnapshot = async () => {
      await db.exec('RESET ROLE')
      try {
        const tables=(await db.query<{tablename:string}>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows
        const rows:Record<string,unknown>={}
        for(const {tablename} of tables) rows[tablename]=(await db.query(`SELECT to_jsonb(t) row FROM public."${tablename.replaceAll('"','""')}" t ORDER BY to_jsonb(t)::text`)).rows
        return rows
      } finally { await db.exec('SET ROLE authenticated') }
    }
    const beforeResolve=await publicSnapshot()
    const claimsBefore=(await db.query("SELECT auth.uid() uid,auth.jwt() claims,current_setting('request.jwt.claim.email',true) email")).rows
    for(let attempt=0;attempt<2;attempt++) {
      const subject=await call(ids[2],'subject',{operation:'enter',data:{syllabi:[]}})
      assert.deepEqual(subject,{id:ids[2],role:'student',name:'Synthetic account 2',email:'canary2@example.invalid',department:'College of IT',yearLevel:1,program:'BSIT'},'subject resolution exposes only the account DTO, never internal claims or credentials')
    }
    assert.deepEqual((await db.query("SELECT auth.uid() uid,auth.jwt() claims,current_setting('request.jwt.claim.email',true) email")).rows,claimsBefore,'resolving does not adopt subject claims')
    assert.deepEqual(await publicSnapshot(),beforeResolve,'repeated resolution does not enter/leave, audit, or mutate any public business table')
    await db.exec('RESET ROLE');await db.query("UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('role','instructor') WHERE id=$1",[ids[2]])
    await as(0);assert.equal((await call(ids[2],'subject')).role,'instructor','the subject role is read freshly instead of replaying the saved view')
    await db.exec('RESET ROLE');await db.query("UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('role','student') WHERE id=$1",[ids[2]])
    await db.query("UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('role','student') WHERE id=$1",[ids[0]])
    await as(0);await assert.rejects(call(ids[2],'subject'),{code:'42501'},'stale admin JWT claims cannot bypass a live owner role revocation')
    await db.exec('RESET ROLE');await db.query("UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('role','admin') WHERE id=$1",[ids[0]])
    await db.query("DELETE FROM auth.identities WHERE user_id=$1 AND provider='google'",[ids[0]])
    await as(0);await assert.rejects(call(ids[2],'subject'),{code:'42501'},'the owner must still have the required Google identity')
    await db.exec('RESET ROLE');await db.query("INSERT INTO auth.identities VALUES($1,'google')",[ids[0]])
    await as(0);await assert.rejects(call(ids[0],'subject'),{code:'42501'},'the admin account cannot be selected as an academic subject')
    await assert.rejects(call('99999999-1111-4111-8111-111111111111','subject'),{code:'42501'},'unknown subjects cannot be restored')
    assert.deepEqual(await publicSnapshot(),beforeResolve,'denied resolutions also leave audit and business records unchanged')
    await call(ids[2],'enter')
    const selected=await call(ids[2],'academic.read')
    assert.equal(selected.courses.length,1);assert.equal(selected.enrollments.length,1);assert.equal(selected.publications.length,2)
    assert.equal((await db.query<{uid:string}>('SELECT auth.uid() uid')).rows[0].uid,ids[0],'subject claims restored on success')
    assert.equal((await call(ids[3],'academic.read')).publications.length,0,'outsider stays denied even to admin support view')
    await call(ids[2],'academic.command',{operation:'open',publication:publication.id,version:publication.source_version})
    await assert.rejects(call(ids[2],'academic.command',{operation:'start',publication:publication.id,version:publication.source_version}),{code:'42501'})
    assert.equal((await db.query<{uid:string}>('SELECT auth.uid() uid')).rows[0].uid,ids[0],'subject claims restored on error')
    const supported=await call(ids[1],'academic.read');assert.equal(supported.accesses.length,0);assert.equal(supported.attempts.length,0)
    assert.equal((await db.query('SELECT * FROM public.edupulse_support_events')).rows.length,2,'enter and preview are audited as admin')
    const material=supported.publications.find((row:any)=>row.type==='material')
    await as(2)
    await assert.rejects(db.query('SELECT public.edupulse_authorize_pipeline_test($1,$2,$3)',[publication.id,publication.source_version,ids[2]]),{code:'42501'},'learners cannot label their own activity as a pipeline test')
    await as(1)
    await assert.rejects(db.query('SELECT public.edupulse_authorize_pipeline_test($1,$2,$3)',[publication.id,publication.source_version,ids[3]]),{code:'42501'},'outsiders cannot be added through test authorization')
    await assert.rejects(db.query('SELECT public.edupulse_authorize_pipeline_test($1,$2,$3)',[publication.id,'old-version',ids[2]]),{code:'42501'})
    await db.query('SELECT public.edupulse_authorize_pipeline_test($1,$2,$3)',[publication.id,publication.source_version,ids[2]])
    await as(2)
    await assert.rejects(db.query('SELECT * FROM edupulse_private.pipeline_activity_grants'),{code:'42501'},'private allowances are not exposed to learners')
    assert.equal((await db.query('SELECT * FROM public.edupulse_notices')).rows.length,2,'release notices reach the enrolled student')
    await db.query(`SELECT public.edupulse_academic_action($1,$2,'[]','open')`,[material.id,material.source_version])
    const session=(await db.query<{r:{id:string}}>('SELECT public.edupulse_assessment_command($1) r',[JSON.stringify({operation:'start',publication:publication.id,version:publication.source_version})])).rows[0].r
    const attempt=(await db.query<{r:{score:number;is_test:boolean}}>('SELECT public.edupulse_assessment_command($1) r',[JSON.stringify({operation:'submit',publication:publication.id,version:publication.source_version,session:session.id,responses:[0,1,2]})])).rows[0].r
    assert.equal(attempt.score,3)
    assert.equal(attempt.is_test,true,'the real scoring transaction persistently labels authorized test activity')
    assert.equal((await db.query<{is_test:boolean}>('SELECT is_test FROM public.edupulse_material_access')).rows[0].is_test,false,'an unmarked material open remains genuine')
    await as(1);assert.equal((await db.query('SELECT * FROM public.edupulse_attempts')).rows.length,1);assert.equal((await db.query('SELECT * FROM public.edupulse_material_access')).rows.length,1,'actual student activity reaches instructor statistics')
    await assert.rejects(db.query('SELECT public.edupulse_authorize_pipeline_test($1,$2,$3)',[material.id,material.source_version,ids[2]]),{code:'22023'},'existing genuine opens cannot be relabelled')
    await as(0);assert.equal((await call(ids[4],'academic.read')).attempts.length,0,'associate dean never gets scores')
    const thread='aaaaaaaa-1111-4111-8111-111111111111'
    await db.query('INSERT INTO public.edupulse_pulse_threads(id,owner_id,title) VALUES($1,$2,$3)',[thread,ids[0],'Synthetic support conversation'])
    await db.query('INSERT INTO public.edupulse_agent_memory(owner_id,thread_id,subject_id,task,outcome,summary) VALUES($1,$2,$3,$4,$5,$6)',[ids[0],thread,ids[2],'answer','generated','Verified outcome and reference provenance'])
    await as(2);assert.equal((await db.query('SELECT * FROM public.edupulse_agent_memory')).rows.length,0,'private handoffs are not shared with the selected student')
    await assert.rejects(db.query('INSERT INTO public.edupulse_agent_memory(owner_id,thread_id,subject_id,task,outcome,summary) VALUES($1,$2,$3,$4,$5,$6)',[ids[0],thread,ids[2],'answer','generated','forged']),{code:'42501'})
    await as(0);await db.query('DELETE FROM public.edupulse_pulse_threads WHERE id=$1',[thread]);assert.equal((await db.query('SELECT * FROM public.edupulse_agent_memory')).rows.length,0,'forget conversation cascades to handoffs')
    await db.exec('RESET ROLE');await db.query(`UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id=$1`,[ids[2]])
    await as(0);await assert.rejects(call(ids[2],'subject'),{code:'42501'},'live account revocation is enforced')
  } finally { await db.close() }
})
