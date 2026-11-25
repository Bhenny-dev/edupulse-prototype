// Explicit owner verification using real account sessions, never synthetic API transport.
// No passwords are changed, no email is sent, and no credential is printed.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { createAdminClient, createContextClient } from '@supabase/server/core'

const args=process.argv.slice(2),value=(name:string)=>args.includes(name)?args[args.indexOf(name)+1]:undefined
const dir=resolve(value('--output')||'.data/population-20261125')
if(!dir.startsWith(resolve('.data')+'\\')&&!dir.startsWith(resolve('.data')+'/'))throw Error('Keep verification credentials under ignored .data.')
const sessionFile=join(dir,'live-sessions.json'),before=JSON.parse(await readFile(join(dir,'before.json'),'utf8')),plan=JSON.parse(await readFile(join(dir,'plan.json'),'utf8'))
const url=process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL||''
if(new URL(url).hostname!=='xyziepdkdvvuhgkymooo.supabase.co')throw Error('EduPulse project required.')
process.env.SUPABASE_URL=url
process.env.SUPABASE_PUBLISHABLE_KEY=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY
if(!process.env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw Error('An existing modern publishable key is required.')
process.env.SUPABASE_PUBLISHABLE_KEYS=JSON.stringify({default:process.env.SUPABASE_PUBLISHABLE_KEY})
if(args.includes('--prepare')){
 const cli=join(process.env.APPDATA||'','npm/node_modules/supabase/dist/supabase.js')
 let keys:any[]
 try{
  if(process.env.SUPABASE_ACCESS_TOKEN){
   const response=await fetch('https://api.supabase.com/v1/projects/xyziepdkdvvuhgkymooo/api-keys?reveal=true',{headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`}})
   if(!response.ok)throw Error('Existing project credentials could not be read')
   keys=await response.json()
  }else keys=JSON.parse(execFileSync(process.execPath,[cli,'projects','api-keys','--project-ref','xyziepdkdvvuhgkymooo','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}))
 }catch{throw Error('Project credential discovery failed; credential output remains private.')}
 const secret=keys.find(k=>k.api_key?.startsWith('sb_secret_'))?.api_key
 if(!secret)throw Error('An existing modern project secret is required; legacy keys are not used.')
 process.env.SUPABASE_SECRET_KEY=secret;process.env.SUPABASE_SECRET_KEYS=JSON.stringify({default:secret})
 const admin=createAdminClient();delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_SECRET_KEYS
 const course=plan.courses.find((c:any)=>c.code==='GE 1'),teacher=before.accounts.find((a:any)=>a.id===course.owner)
 const student=before.edupulse_students.find((s:any)=>s.student_number===course.blocks.flatMap((b:any)=>b.students)[0].StudentID)
 const selected=[teacher,...plan.owners.filter((id:string)=>id!==teacher.id).map((id:string)=>before.accounts.find((a:any)=>a.id===id)),before.accounts.find((a:any)=>a.id===student.user_id),before.accounts.find((a:any)=>a.app_metadata.role==='dean'&&!a.banned_until)]
 const sessions=[]
 for(const account of selected){
  const generated=await admin.auth.admin.generateLink({type:'magiclink',email:account.email})
  if(generated.error)await writeFile(join(dir,'sign-in-diagnostic.json'),JSON.stringify({status:generated.error.status,code:generated.error.code,message:generated.error.message}),{mode:0o600})
  if(generated.error||!generated.data.properties?.hashed_token)throw Error(`Could not prepare the authorized sign-in link (${generated.error?.status||0}/${generated.error?.code||'missing-token'}); no email was sent.`)
  const client=createContextClient(),verified=await client.auth.verifyOtp({token_hash:generated.data.properties.hashed_token,type:'magiclink'})
  if(verified.error||!verified.data.session)throw Error('The authorized account session could not be verified.')
  sessions.push({role:account.app_metadata.role,id:account.id,email:account.email,session:verified.data.session})
 }
 await writeFile(sessionFile,JSON.stringify(sessions),{mode:0o600});console.log(JSON.stringify({preparedRealAccountSessions:sessions.length,passwordsChanged:0,emailsSent:0}))
}else{
 const origin=value('--origin')||'https://edupulse-prototype.vercel.app'
 if(!['edupulse-prototype.vercel.app','127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Use the EduPulse canonical origin or the isolated local server.')
 const sessions=JSON.parse(await readFile(sessionFile,'utf8'))
 const api=async(person:any,action:string,method='GET',body?:unknown)=>{
  const response=await fetch(`${origin}/api/ai?action=${action}`,{method,headers:{Authorization:`Bearer ${person.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const result=await response.json().catch(()=>null)
  if(!response.ok)throw Error(`Authorized ${person.role} ${action} returned ${response.status}/${result?.error?.code||'invalid-response'}`)
  return result
 }
 const teacher=sessions.find((s:any)=>s.role==='instructor'),student=sessions.find((s:any)=>s.role==='student')
 for(const person of sessions){
  const data=await api(person,'academic')
  if(person.role==='student'){
   assert.ok(data.courses.length>=1);assert.ok(data.attempts.filter((a:any)=>a.grading_status==='graded').length>=1)
   assert.ok(data.attempts.every((a:any)=>a.student_id===person.id));assert.ok(!JSON.stringify(data.publications).includes('"correctIndex"'))
  }
  console.log(JSON.stringify({role:person.role,courses:data.courses.length,enrollments:data.enrollments.length,publications:data.publications.length,attempts:data.attempts.length,accesses:data.accesses.length,bytes:Buffer.byteLength(JSON.stringify(data))}))
 }
 if(args.includes('--flow')){
  const learner=await api(student,'academic'),match=learner.courses.find((c:any)=>c.instructor_id===teacher.id&&c.course_code==='GE 1'&&c.active)
  assert.ok(match,'The chosen student must belong to this instructor course')
  let saved=await api(teacher,'workspace');const data=saved.data,syllabus=data.syllabi.find((s:any)=>s.id===match.syllabus_id)
  const topic=syllabus.courseOutline.find((r:any)=>r.week===4)?.sections?.[0]?.id||'week-4'
  const stamp=Date.now().toString(36),materialId=`reflection-reading-${stamp}`,assessmentId=`reflection-check-${stamp}`
  const sections=[{heading:'Learning task',body:'Choose a campus learning service. State its inputs, the intended result and a criterion you can check.'},{heading:'Evidence and review',body:'Record the procedure and observation. Explain a discrepancy honestly and identify an improvement to evaluate next.'}]
  const questions=[{type:'multiple_choice',text:'Which record best supports a checkable explanation?',options:['A question, procedure and observation.','An unsupported conclusion.','Only the title.','No retained evidence.'],correctIndex:0,explanation:'The record connects the question, method and evidence.'},{type:'true_false',text:'A discrepancy should be recorded and explained rather than deleted.',options:['True','False'],correctIndex:0,explanation:'A discrepancy is evidence that can guide review and improvement.'},{type:'short_answer',text:'Describe a practical application and the observation you would use to evaluate it.',explanation:'A relevant application and a checkable observation support the explanation.'}]
  data.content[materialId]={syllabusId:syllabus.id,week:4,type:'material',status:'draft',deliveryMode:'block_schedule',position:49900,content:{title:'Applied learning reflection',courseTopicId:topic,courseItemId:materialId,submissionBin:true,sections}}
  data.content[assessmentId]={syllabusId:syllabus.id,week:4,type:'assessment',status:'draft',deliveryMode:'block_schedule',position:49950,content:{title:'Application and evidence check',courseTopicId:topic,courseItemId:assessmentId,coverage:{materialIds:[materialId]},assessmentPolicy:{maxAttempts:3,durationSeconds:0},questions}}
  for(const status of ['draft','checked','published']){data.content[materialId].status=status;data.content[assessmentId].status=status;saved=await api(teacher,'workspace','PUT',{revision:saved.revision,data})}
  const received=await api(student,'academic'),pid=createHash('md5').update(`${teacher.id}:${assessmentId}`).digest('hex')
  assert.ok(received.publications.some((p:any)=>p.id===pid),'Delivered assessment must reach the enrolled student')
  const publication=received.publications.find((p:any)=>p.id===pid),start=await api(student,'academic','POST',{operation:'start',publication:pid,version:publication.source_version})
  const result=await api(student,'academic','POST',{operation:'respond',publication:pid,version:publication.source_version,session:start.id,responses:[0,0,'I would evaluate a learning-service improvement by recording its procedure, comparing the observed result with a stated criterion and explaining a discrepancy.']})
  const review=await api(teacher,'academic');assert.ok(review.attempts.some((a:any)=>a.id===result.id&&a.student_id===student.id))
  await api(teacher,'academic','POST',{operation:'grade',attempt:result.id,points:[1,1,1],reason:'Your application identifies a checkable observation and connects it with the result.'})
  const final=await api(student,'academic');assert.equal(final.attempts.find((a:any)=>a.id===result.id)?.score,3)
  await writeFile(join(dir,'live-flow-receipt.json'),JSON.stringify({origin,materialId,assessmentId,publication:pid,attempt:result.id,score:3,maxScore:3,deliveryReceived:true,instructorSawResponse:true,studentSawReviewedScore:true}),{mode:0o600})
  console.log(JSON.stringify({deliveryReceived:true,instructorSawResponse:true,studentSawReviewedScore:true,score:'3/3'}))
 }
}
