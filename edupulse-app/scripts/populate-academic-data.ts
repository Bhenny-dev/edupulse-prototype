// Owner-authorized persistent population. Private plans/backups never enter source control.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve, join, sep } from 'node:path'
import { populationPlan, availableAccount } from './lib/academic-population-plan.js'
import { populationVersion, populationTerm, hash } from './lib/population-content.js'
import { planTeaching } from './lib/academic-population-teaching.js'
import { populationActivitySql } from './lib/academic-population-activity.js'

const args=process.argv.slice(2), option=(name:string)=>args.includes(name)?args[args.indexOf(name)+1]:undefined
const dir=resolve(option('--output')||'.data/population-20261125'), privateRoot=resolve('.data')
if(!dir.startsWith(privateRoot+sep))throw Error('Keep snapshots and plans under the ignored .data directory.')
if((await readFile('supabase/.temp/project-ref','utf8')).trim()!=='xyziepdkdvvuhgkymooo')throw Error('The linked project must be EduPulse.')
await mkdir(dir,{recursive:true})
const phase=option('--phase')||'plan', apply=args.includes('--apply'), rollback=args.includes('--check-transaction')
if(apply&&rollback)throw Error('Choose apply or transaction rehearsal, not both.')
const before=JSON.parse(await readFile(join(dir,'before.json'),'utf8'))
const plan=populationPlan(before)
const retainedPlan=await readFile(join(dir,'plan.json'),'utf8').then(JSON.parse,()=>null)
if(retainedPlan&&hash(retainedPlan)!==hash(plan))throw Error('This directory contains a different population plan. Keep its receipts and use a fresh private snapshot/output directory.')
await writeFile(join(dir,'plan.json'),JSON.stringify(plan),{mode:0o600})
const cli=join(process.env.APPDATA||'','npm/node_modules/supabase/dist/supabase.js')
const text=(v:unknown)=>"'"+String(v).replaceAll("'","''")+"'"
const json=(v:unknown)=>text(JSON.stringify(v))+'::jsonb'
const claims=(account:any)=>`SELECT set_config('request.jwt.claims',${json({sub:account.id,email:account.email,role:'authenticated',app_metadata:account.app_metadata})}::text,true);\nSET LOCAL ROLE authenticated;`
function query(sql:string,label:string){
 const file=join(dir,`${label}.sql`)
 return writeFile(file,sql,{mode:0o600}).then(async()=>{
  try {
   const output=execFileSync(process.execPath,[cli,'db','query','--linked','--file',file,'--output','json'],{encoding:'utf8',maxBuffer:150_000_000,stdio:['ignore','pipe','pipe']})
   await writeFile(join(dir,`${label}.result.json`),output,{mode:0o600});return JSON.parse(output)
  }catch(error:any){await writeFile(join(dir,`${label}.error.log`),String(error.stderr||'No diagnostic'),{mode:0o600});throw Error(`Population stopped at ${label}. Inspect the private diagnostic; no success is claimed.`)}
 })
}
const actor=before.accounts.find((a:any)=>a.app_metadata.role==='admin'&&availableAccount(a))
const dean=before.accounts.find((a:any)=>a.app_metadata.role==='dean'&&availableAccount(a))
if(!actor||!dean)throw Error('Existing active Admin and Dean accounts are required.')

if(phase==='plan')console.log(JSON.stringify({dryRun:true,...plan.summary},null,2))
else if(phase==='classes'){
 if(!apply&&!rollback)throw Error('Review the plan, then use --check-transaction or --apply.')
 for(const [index,ownerId]of plan.owners.entries()){
  if(args.includes('--owner')&&option('--owner')!==ownerId)continue
  const courses=plan.courses.filter(c=>c.owner===ownerId), original=before.edupulse_workspaces.find((w:any)=>w.owner_id===ownerId)
  let expectedRevision=original?.revision||0
  for(const [courseIndex,course] of courses.entries()){
   if(args.includes('--course')&&option('--course')!==course.code)continue
   const receipt=join(dir,`classes-${index}-${courseIndex}.receipt.json`)
   const retained=apply?await readFile(receipt,'utf8').then(JSON.parse,()=>null):null
   if(retained){expectedRevision=retained.revision;continue}
   const commands=[{...course,blocks:course.blocks.map((block:any,blockIndex:number)=>({...block,days:['M','T','W','TH','F','S'][(courseIndex*3+blockIndex)%6],time:`${String(8+Math.floor((courseIndex*3+blockIndex)/6)%5*2).padStart(2,'0')}:00 - ${String(10+Math.floor((courseIndex*3+blockIndex)/6)%5*2).padStart(2,'0')}:00`,room:`Learning Room ${index+1}${String(blockIndex+1).padStart(2,'0')}`}))}]
   const body=`DECLARE course jsonb; block jsonb; result jsonb; parent_key text;
BEGIN
 FOR course IN SELECT value FROM jsonb_array_elements(${json(commands)}) LOOP
  result:=public.edupulse_dean_command(jsonb_build_object('action','course-load.assign','course_code',course->>'code','instructor_id',${text(ownerId)},'academic_year',${text(populationTerm.academic_year)},'semester',${text(populationTerm.semester)}));
  parent_key:=result->>'key';
  FOR block IN SELECT value FROM jsonb_array_elements(course->'blocks') LOOP
   IF jsonb_array_length(block->'students')>0 THEN
    PERFORM public.edupulse_dean_command(jsonb_build_object('action','block.add','assignment',parent_key,'expected_instructor',${text(ownerId)},'block',block->>'block','students',block->'students')||CASE WHEN (block->>'schedule')::boolean THEN jsonb_build_object('days',block->>'days','time',block->>'time','room',block->>'room') ELSE '{}'::jsonb END);
   END IF;
  END LOOP;
 END LOOP;
END;`
   const guard=`BEGIN IF coalesce((SELECT revision FROM public.edupulse_workspaces WHERE owner_id=${text(ownerId)}::uuid),0)<>${expectedRevision} THEN RAISE EXCEPTION 'Workspace changed; create a fresh population plan';END IF;END;`
   const sql=`BEGIN;\nDO ${text(guard)};\n${claims(dean)}\nDO ${text(body)};\nRESET ROLE;\nINSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail) VALUES(${text(actor.id)}::uuid,'admin','workspace_save','success',${text(`${populationVersion}: generated class/roster; course=${course.code}; access restrictions preserved.`)});\nINSERT INTO edupulse_private.population_batches(id,actor_id,provenance,manifest,completed_at) VALUES(${text(`${populationVersion}:classes:${index}:${courseIndex}`)},${text(actor.id)}::uuid,'owner-authorized-generated-population',${json({owner:ownerId,course:course.code,blocks:course.blocks.map((b:any)=>({block:b.block,students:b.students.map((s:any)=>s.StudentID)})),beforeRevision:expectedRevision})},now()) ON CONFLICT(id) DO NOTHING;\nSELECT revision FROM public.edupulse_workspaces WHERE owner_id=${text(ownerId)}::uuid;\n${rollback?'ROLLBACK':'COMMIT'};`
   const result=await query(sql,`classes-${index}-${courseIndex}-${rollback?'rehearsal':'apply'}`)
   if(apply){expectedRevision=Number(result.rows[0]?.revision||0);await writeFile(receipt,JSON.stringify({populationVersion,owner:ownerId,course:course.code,revision:expectedRevision,planHash:hash(course)}),{mode:0o600})}
   console.log(JSON.stringify({phase,owner:index+1,course:courseIndex+1,courses:courses.length,classes:course.blocks.length,rollback,applied:apply}))
  }
 }
}else if(phase==='teaching'){
 if(rollback)throw Error('Teaching saves use the application HTTP API; use a dry run before applying. Class and activity batches support SQL rollback rehearsals.')
 const origin=option('--origin')
 if(apply&&(!origin||!['127.0.0.1','localhost','edupulse-prototype.vercel.app'].includes(new URL(origin).hostname)))throw Error('Teaching application requires --origin for the isolated API or canonical EduPulse origin.')
 const sessions=apply?JSON.parse(await readFile(join(dir,'live-sessions.json'),'utf8')):[]
 for(const [index,ownerId]of plan.owners.entries()){
  if(args.includes('--owner')&&option('--owner')!==ownerId)continue
  const receipt=join(dir,`teaching-${index}.receipt.json`)
  if(apply&&await readFile(receipt,'utf8').then(()=>true,()=>false)){console.log(JSON.stringify({phase,owner:index+1,retained:true}));continue}
  const owner=before.accounts.find((a:any)=>a.id===ownerId)
  const live=await query(`SELECT revision,data FROM public.edupulse_workspaces WHERE owner_id=${text(ownerId)}::uuid;`,`teaching-${index}-before`)
  const teaching=await planTeaching(owner,live.rows[0],plan.courses.filter(c=>c.owner===ownerId),dir)
  await writeFile(join(dir,`teaching-${index}.plan.json`),JSON.stringify(teaching),{mode:0o600})
  if(!apply&&!rollback){console.log(JSON.stringify({phase,owner:index+1,dryRun:true,bytes:teaching.bytes,items:teaching.created.length,pdfs:teaching.files.length}));continue}
  const scheduleBody=`DECLARE course jsonb; block text; windows jsonb; prior bigint;
BEGIN
 FOR course IN SELECT value FROM jsonb_array_elements(${json(teaching.prepared)}) LOOP
  SELECT jsonb_agg(jsonb_build_object('week',w::int,'date',(date '2026-11-02'+((w::int-1)*7))::text,'start','08:00','end','')) INTO windows FROM jsonb_array_elements_text(course->'weeks') w;
  FOR block IN SELECT jsonb_array_elements_text(course->'blocks') LOOP
   SELECT revision INTO prior FROM public.edupulse_delivery_schedules WHERE instructor_id=auth.uid() AND syllabus_id=course->>'syllabus' AND block_section=block;
   IF prior IS NULL THEN PERFORM public.edupulse_delivery_schedule(jsonb_build_object('syllabus',course->>'syllabus','block',block,'revision',0,'windows',windows));END IF;
  END LOOP;
 END LOOP;
END;`
  const session=sessions.find((s:any)=>s.id===ownerId)
  if(!session)throw Error('An existing authorized instructor session is required.')
  let revision=teaching.expectedRevision
  for(const [step,data] of [teaching.checked,teaching.published].entries()){
   const response=await fetch(`${origin}/api/ai?action=workspace`,{method:'PUT',headers:{Authorization:`Bearer ${session.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({revision,data})})
   const saved=await response.json().catch(()=>null)
   if(!response.ok){await writeFile(join(dir,`teaching-${index}-http.error.json`),JSON.stringify({status:response.status,error:saved?.error}),{mode:0o600});throw Error(`Application workspace save stopped (${response.status}/${saved?.error?.code||'invalid-response'}); inspect the private diagnostic.`)}
   revision=Number(saved.revision)
   if(step===0)await query(`BEGIN;\n${claims(owner)}\nDO ${text(scheduleBody)};\nRESET ROLE;\nCOMMIT;`,`teaching-${index}-schedules`)
  }
  const sql=`BEGIN;\nINSERT INTO edupulse_private.population_batches(id,actor_id,provenance,manifest,completed_at) VALUES(${text(`${populationVersion}:teaching:${index}`)},${text(actor.id)}::uuid,'owner-authorized-generated-population',${json({owner:ownerId,items:teaching.created,syllabi:teaching.prepared.map(c=>c.syllabus),pdfs:teaching.files.length,beforeRevision:teaching.expectedRevision,afterRevision:revision})},now()) ON CONFLICT(id) DO NOTHING;\nCOMMIT;`
  await query(sql,`teaching-${index}-${rollback?'rehearsal':'apply'}`)
  if(apply)await writeFile(receipt,JSON.stringify({populationVersion,owner:ownerId,items:teaching.created.length,bytes:teaching.bytes,syllabi:teaching.prepared.length,pdfs:teaching.files.length}),{mode:0o600})
  console.log(JSON.stringify({phase,owner:index+1,items:teaching.created.length,bytes:teaching.bytes,rollback,applied:apply}))
 }
}else if(phase==='activity'){
 if(!apply&&!rollback)throw Error('Activity requires --check-transaction or --apply after teaching is published.')
 for(const [index,ownerId]of plan.owners.entries()){
  if(args.includes('--owner')&&option('--owner')!==ownerId)continue
  const teaching=JSON.parse(await readFile(join(dir,`teaching-${index}.plan.json`),'utf8'))
  for(const [courseIndex,course]of teaching.prepared.entries()){
   if(args.includes('--course')&&option('--course')!==course.code)continue
   for(const [blockIndex,block]of course.blocks.entries()){
   if(args.includes('--block')&&option('--block')!==block)continue
   const receipt=join(dir,`activity-${index}-${courseIndex}-${blockIndex}.receipt.json`)
   if(apply&&await readFile(receipt,'utf8').then(()=>true,()=>false))continue
   const id=hash([ownerId,course.syllabus]).slice(0,32)
   // Course identifiers use Postgres md5, not the plan's SHA-256 identifiers.
   const {createHash}=await import('node:crypto')
   const courseId=createHash('md5').update(`${ownerId}:${course.syllabus}`).digest('hex')
   const sql=populationActivitySql({courseId,ownerId,actorId:actor.id,batchId:`${populationVersion}:activity:${index}:${courseIndex}:${blockIndex}`,items:teaching.created,rollback,block,memberLimit:option('--members')?Number(option('--members')):undefined})
   await query(sql,`activity-${index}-${courseIndex}-${blockIndex}-${rollback?'rehearsal':'apply'}`)
   if(apply)await writeFile(receipt,JSON.stringify({populationVersion,courseId,plan:id}),{mode:0o600})
   console.log(JSON.stringify({phase,owner:index+1,course:courseIndex+1,block:blockIndex+1,blocks:course.blocks.length,rollback,applied:apply}))
   }
  }
 }
}else if(phase==='announcements'){
 if(!apply&&!rollback)throw Error('Choose --check-transaction or --apply.')
 for(const [index,ownerId]of plan.owners.entries()){
  const owner=before.accounts.find((a:any)=>a.id===ownerId),courses=plan.courses.filter(c=>c.owner===ownerId)
  const receipt=join(dir,`announcements-${index}.receipt.json`)
  if(apply&&await readFile(receipt,'utf8').then(()=>true,()=>false))continue
  const teaching=JSON.parse(await readFile(join(dir,`teaching-${index}.plan.json`),'utf8'))
  const body=`DECLARE course jsonb; BEGIN
   FOR course IN SELECT value FROM jsonb_array_elements(${json(courses)}) LOOP
    PERFORM public.edupulse_announcement_command(jsonb_build_object('action','save','course_code',course->>'code','academic_year',${text(populationTerm.academic_year)},'semester',${text(populationTerm.semester)},'title','Weekly learning plan','body','Read the worked examples, complete the concept checks and submit your applied explanation in the topic activity. Check the class schedule for opening dates and use the feedback before another attempt.'));
    PERFORM public.edupulse_announcement_command(jsonb_build_object('action','save','course_code',course->>'code','academic_year',${text(populationTerm.academic_year)},'semester',${text(populationTerm.semester)},'week',2,'title','Consultation and feedback','body','Bring one question about your reading and one example from your applied work. Use the private discussion when your question concerns an individual submission or score.'));
   END LOOP;
   PERFORM public.edupulse_syllabus_share(jsonb_build_object('operation','send','syllabus',${text(teaching.prepared[0].syllabus)},'recipient',${text(plan.owners[(index+1)%plan.owners.length])},'revision',(SELECT revision FROM public.edupulse_workspaces WHERE owner_id=auth.uid())));
  END;`
  const sql=`BEGIN;\n${claims(owner)}\nDO ${text(body)};\nRESET ROLE;\nINSERT INTO edupulse_private.population_batches(id,actor_id,provenance,manifest,completed_at) VALUES(${text(`${populationVersion}:announcements:${index}`)},${text(actor.id)}::uuid,'owner-authorized-generated-population',${json({owner:ownerId,courses:courses.map(c=>c.code)})},now()) ON CONFLICT(id) DO NOTHING;\n${rollback?'ROLLBACK':'COMMIT'};`
  await query(sql,`announcements-${index}-${rollback?'rehearsal':'apply'}`)
  if(apply)await writeFile(receipt,JSON.stringify({populationVersion,courses:courses.length}),{mode:0o600})
  console.log(JSON.stringify({phase,owner:index+1,rollback,applied:apply}))
 }
}else throw Error('Unknown phase. Use plan, classes, teaching, activity or announcements.')
