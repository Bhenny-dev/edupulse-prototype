import {createHash} from 'node:crypto'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {sharingCommand,syllabusSharing} from '../server/domains/syllabusSharing'

test('syllabus sharing delivers only an owned saved snapshot, preserves provenance and enforces recipient RLS',async()=>{
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
  for(const file of ['20260915042129_persistent_workspace','20261004054136_system_admin_audit_roles','20261024064532_academic_projection','20261024071459_academic_record_labels','20261024073036_academic_lint_cleanup','20261024163740_pulse_conversations','20261024213422_pulse_history_privileges','20261028130000_baseline_workflows','20261028130100_assessment_workflows','20261028130200_delivery_notices','20261028130300_offline_review_requests','20261102074226_student_directory','20261107050829_safe_workspace_roster_refresh','20261107131810_instructor_roster_overrides','20261107141745_validate_course_membership_decisions','20261108055904_pulse_support_context','20261109221703_labelled_pipeline_activity','20261111201348_instructor_syllabus_sharing','20261112211931_syllabus_sharing_adoption_suspension'])await db.exec(await readFile(`supabase/migrations/${file}.sql`,'utf8'))
  const as=async(i:number)=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[ids[i],JSON.stringify({sub:ids[i],email:i===4?'riverabenlor461@gmail.com':`share${i}@example.invalid`,app_metadata:{role:roles[i]}})]);await db.exec('SET ROLE authenticated')}
  const command=async(input:object)=>(await db.query<{r:any}>('SELECT public.edupulse_syllabus_share($1) r',[JSON.stringify(input)])).rows[0]!.r
  const read=async()=>(await db.query<any>('SELECT * FROM public.edupulse_syllabus_shares')).rows
  const support=async(operation:string,input:object={})=>(await db.query<{r:any}>('SELECT public.edupulse_support_action($1,$2,$3) r',[ids[0],operation,JSON.stringify(input)])).rows[0]!.r
  const syllabus={id:'owned',courseCode:'IT 102',courseTitle:'Programming',status:'drafted',courseOutline:[{week:1,ilos:'Explain variables.',contents:['Variables'],sections:[{id:'scope',ilos:'Explain variables.',contents:['Variables'],activities:'Discuss',assessments:'Quiz',assessmentTypes:['Essay'],privateCopy:'SECRET'}]}],approvedFile:{base64:'SECRET'},versions:[{privateCopy:'SECRET'}],books:[{title:'Book',sourceId:'SECRET'}],sourceEvidence:[{text:'SECRET'}]}
  await as(0);await db.query('SELECT * FROM public.edupulse_save_workspace(0,$1)',[JSON.stringify({syllabi:[syllabus],content:{},registrations:[]})])
  const sent=await command({operation:'send',syllabus:'owned',revision:1,email:'SHARE1@example.invalid'})
  assert.equal((await read()).length,1);assert.equal(sent.recipient,'Instructor 1')
  const snapshot=(await read())[0].snapshot;assert.doesNotMatch(JSON.stringify(snapshot),/SECRET|approvedFile|sourceEvidence|versions/);assert.equal(snapshot.courseOutline[0].sections[0].id,'scope')
  await assert.rejects(command({operation:'send',syllabus:'owned',revision:0,email:'share1@example.invalid'}),{code:'40001'})
  await assert.rejects(command({operation:'send',syllabus:'stolen',revision:1,email:'share1@example.invalid'}),{code:'42501'})
  await assert.rejects(command({operation:'send',syllabus:'owned',revision:1,email:'share3@example.invalid'}),{code:'22023'})
  await assert.rejects(command({operation:'send',syllabus:'owned',revision:1,email:'share0@example.invalid'}),{code:'22023'})
  assert.equal((await command({operation:'send',syllabus:'owned',revision:1,email:'share1@example.invalid'})).id,sent.id,'repeated sharing updates one delivery')
  await as(1);assert.equal((await read())[0].sender_name,'Instructor 0');assert.equal((await db.query('SELECT * FROM public.edupulse_workspaces')).rows.length,0,'sharing does not grant workspace access')
  await assert.rejects(db.query('UPDATE public.edupulse_syllabus_shares SET sender_name=$1 WHERE id=$2',['forged',sent.id]),{code:'42501'})
  await as(2);assert.equal((await read()).length,0);await assert.rejects(command({operation:'remove',id:sent.id}),{code:'42501'})
  await as(3);assert.equal((await read()).length,0);await assert.rejects(command({operation:'remove',id:sent.id}),{code:'42501'})
  await as(4);assert((await support('syllabi.recipients')).some((u:any)=>u.id===ids[1]));assert.equal((await support('syllabi.read'))[0].courseCode,'IT 102');assert.equal((await support('syllabi.read'))[0].snapshot,undefined);assert.equal((await support('syllabi.open',{id:sent.id})).courseCode,'IT 102')
  await as(4);await support('syllabi.command',{operation:'send',syllabus:'owned',revision:1,email:'share1@example.invalid'});assert.equal((await db.query('SELECT * FROM public.edupulse_support_events')).rows.length,1,'support writes record the actual admin actor')
  await as(0)
  const directory=(await db.query<{r:any}>('SELECT public.edupulse_syllabus_recipients() r')).rows[0]!.r
  assert.deepEqual(directory.map((u:any)=>u.id).sort(),[ids[1],ids[2]].sort())
  await assert.rejects(command({operation:'remove',id:sent.id}),{code:'22023'})
  await as(1)
  await assert.rejects(command({operation:'adopt',id:sent.id,mode:'approved',revision:0}),{code:'22023'})
  await assert.rejects(command({operation:'adopt',id:sent.id,mode:'approved',revision:0,approvalAttested:true}),{code:'22023'})
  const draft=await command({operation:'adopt',id:sent.id,mode:'draft',revision:0})
  assert.equal((await command({operation:'adopt',id:sent.id,mode:'draft',revision:0})).id,draft.id,'retry cannot duplicate an adopted draft')
  let owned=(await db.query<any>('SELECT data,revision FROM public.edupulse_workspaces')).rows[0]
  assert.equal(owned.data.syllabi[0].status,'drafted');assert.equal(owned.data.syllabi[0].approvedFile,undefined)
  assert.equal(owned.data.syllabi[0].courseOutline[0].sections[0].id,'scope')
  await assert.rejects(db.query('SELECT * FROM public.edupulse_save_workspace($1,$2)',[owned.revision,JSON.stringify({...owned.data,syllabi:[]})]),{code:'22023'})
  await as(0)
  const approved={...syllabus,status:'active',approvedFile:{name:'approved.pdf',base64:Buffer.from('%PDF-approved sample').toString('base64'),size:Buffer.byteLength('%PDF-approved sample'),sha256:createHash('sha256').update('%PDF-approved sample').digest('hex'),approvalAttested:true,uploadedAt:new Date().toISOString()}}
  await db.query('SELECT * FROM public.edupulse_save_workspace(1,$1)',[JSON.stringify({syllabi:[approved],content:{},registrations:[]})])
  await command({operation:'send',syllabus:'owned',revision:2,recipient:ids[1]})
  await as(1)
  const accepted=await command({operation:'adopt',id:sent.id,mode:'approved',revision:1,approvalAttested:true})
  owned=(await db.query<any>('SELECT data,revision FROM public.edupulse_workspaces')).rows[0]
  assert.equal(owned.data.syllabi.find((s:any)=>s.id===accepted.id).status,'active')
  assert((await db.query<any>('SELECT * FROM public.edupulse_courses WHERE instructor_id=$1 AND syllabus_id=$2',[ids[1],accepted.id])).rows[0].active,'adoption projects the recipient course in the same transaction')
  assert.equal(owned.data.syllabi.find((s:any)=>s.id===accepted.id).approvedFile.base64,approved.approvedFile.base64)
  assert.equal((await command({operation:'adopt',id:sent.id,mode:'approved',revision:1,approvalAttested:true})).id,accepted.id)
  const suspended={...owned.data,syllabi:owned.data.syllabi.map((s:any)=>({...s,suspended:true,status:'archived'}))}
  await db.query('SELECT * FROM public.edupulse_save_workspace($1,$2)',[owned.revision,JSON.stringify(suspended)])
  await db.query('SELECT * FROM public.edupulse_save_workspace($1,$2)',[owned.revision+1,JSON.stringify({...suspended,syllabi:[]})])
  await as(1);await command({operation:'suspend',id:sent.id});await command({operation:'remove',id:sent.id});assert.equal((await read()).length,0)
  await as(0);assert.equal((await read()).length,1,'recipient removal retains sender repository');await command({operation:'send',syllabus:'owned',revision:2,email:'share1@example.invalid'})
  await as(1);assert.equal((await read()).length,1)
  await as(0);await command({operation:'suspend',id:sent.id});await command({operation:'remove',id:sent.id});assert.equal((await read()).length,0)
  await as(1);assert.equal((await read()).length,0)
 }finally{await db.close()}
})
test('sharing API refuses local, guest and non-author roles before reading data and validates input',async()=>{
 for(const role of ['guest','student','dean','associate_dean'])await assert.rejects(syllabusSharing({id:'x',role:role as any,local:false},{operation:'list'}),{code:'FORBIDDEN'})
 await assert.rejects(syllabusSharing({id:'x',role:'instructor',local:true},{operation:'list'}),{code:'FORBIDDEN'})
 assert.equal(sharingCommand.safeParse({operation:'send',syllabus:'owned',revision:1,email:'bad'}).success,false)
 assert.equal(sharingCommand.safeParse({operation:'send',syllabus:'owned',revision:1,recipient:'not-an-id'}).success,false)
})

test('shared summaries page below the PostgREST cap and reject oversized lists rather than truncating',async()=>{
 const original=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_PUBLISHABLE_KEY
 process.env.SUPABASE_URL='https://sharing.example.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='synthetic-publishable-key'
 let size=1000;const ranges:number[]=[]
 globalThis.fetch=async(url,_options)=>{
  const target=new URL(String(url));assert.ok(target.searchParams.get('select')?.includes('snapshot->>courseCode'));assert.ok(!target.searchParams.get('select')?.includes('snapshot,'))
  const offset=Number(target.searchParams.get('offset')||0),limit=Number(target.searchParams.get('limit')||500);ranges.push(offset)
  return Response.json(Array.from({length:Math.max(0,Math.min(limit,size-offset))},(_,i)=>({id:`share-${offset+i}`})))
 }
 try{
  const identity={id:'owner',role:'instructor' as const,local:false,token:'synthetic-token'}
  assert.equal((await syllabusSharing(identity,{operation:'list'}) as any).shares.length,1000);assert.deepEqual(ranges,[0,500,1000])
  size=1001;await assert.rejects(syllabusSharing(identity,{operation:'list'}),{code:'SHARING_CAPACITY'})
 }finally{globalThis.fetch=original;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_PUBLISHABLE_KEY;else process.env.SUPABASE_PUBLISHABLE_KEY=oldKey}
})
