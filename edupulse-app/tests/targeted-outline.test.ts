import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {resolveOutlineEdit,mergeOutlineEdits} from '../src/agents/outlineEdits.js'
import {aggregateSections,type OutlineSection} from '../src/utils/outlineSections.js'
import {operatorInput,planValidatedTool} from '../src/agents/toolPlanner.js'
import {scheduledSyllabusDraft} from '../src/agents/draftValidation.js'
import {workProposal} from '../src/agents/workTools.js'
import {registerEditor,applyEditorProposal,literalEdit,type EditorSnapshot} from '../src/agents/editorTools.js'
import {readWorkspace,saveWorkspace,workspaceInput} from '../server/workspace.js'
import {closeLocalDb} from '../server/database.js'
import {operatorRequest} from '../server/domains/operator.js'
import {invokeModel} from '../server/providers.js'
import {rememberReasoning} from '../server/reasoning.js'
import type {Connection} from '../server/connections.js'

const section=(id:string):OutlineSection=>({id,ilos:'Existing outcome',contents:['Keep topic','Second topic'],activities:'Existing activity',assessments:'Existing assessment',assessmentTypes:['Essay'],resources:[{name:'Source',url:'https://example.org/source'}]})
export const targetedEditor=():EditorSnapshot=>({instance:'targeted-outline',kind:'syllabus',label:'IT 104 outline',data:{courseCode:'IT 104',courseTitle:'Research Methods',courseDescription:'Academic inquiry.',programOutcomes:['Evaluate evidence.'],courseOutline:[aggregateSections({week:1},[section('stored-shared-id'),section('stored-other-id')]),aggregateSections({week:2},[section('stored-shared-id')]),{week:9,ilos:'',contents:[],assessments:'Midterm Examination'}]}})
export const completedSection={ilos:'Evaluate research questions against measurable criteria.',contents:['Research questions','Feasible scope'],activities:'Compare two research questions and justify their feasibility.',assessments:'Write a scoped question and justify it using the criteria.',assessmentTypes:['Essay']}
const request=(message='Complete Week 1 Section 1 only',editor=targetedEditor(),extra={})=>operatorInput.parse({operation:'revise',message,viewRole:'instructor',section:'courseOutline',editor,...extra})
const run=async(input:ReturnType<typeof request>,respond:(prompt:any,attempt:number)=>unknown)=>{let calls=0;const result=await planValidatedTool(input,{id:'instructor',role:'instructor',local:true},AbortSignal.timeout(10000),async(_s,p)=>JSON.stringify(respond(JSON.parse(p),++calls)),6000,async()=>({evidence:[]}));return {result,calls}}

test('Week/Section parsing has precedence over syllabus section numbers and uses the existing baseline IDs',()=>{
 const input=request('Complete Week 1 Section 1 and 2 only')
 const proposal=workProposal({message:input.message,editor:input.editor,role:'instructor',attachments:[],registrations:[],catalog:[],section:'all'})
 assert.equal(proposal?.section,'courseOutline');assert.equal(scheduledSyllabusDraft(input),false)
 assert.deepEqual(resolveOutlineEdit(input)?.targets.map(t=>t.id),['stored-shared-id','stored-other-id'])
 assert.equal(workProposal({message:'Replace "Week 1" with "Week 2" in course policy',editor:input.editor,role:'instructor',attachments:[],registrations:[],catalog:[],section:'all'})?.section,'coursePolicy')
 assert.throws(()=>resolveOutlineEdit(request('Complete Week 1 Section 3 only')),/week 1.section 3/)
})

test('one section completes without model IDs, preserves siblings and resources, and propagates shared content',async()=>{
 const input=request(),before=structuredClone(input.editor)
 const {result,calls}=await run(input,p=>{assert.equal(p.targets.length,1);assert.equal(p.targets[0].section,1);assert.deepEqual(p.targets[0].sharedWeeks,[1,2]);assert(!JSON.stringify(p).includes('stored-'));return {edits:[{target:1,changes:completedSection}]}})
 assert.equal(calls,1);assert('patch' in result&&result.patch&&'courseOutline' in result.patch&&result.patch.courseOutline)
 const rows=result.patch.courseOutline
 assert.equal(rows[0]!.sections![0]!.id,'stored-shared-id');assert.deepEqual(rows[0]!.sections![0],rows[1]!.sections![0])
 assert.deepEqual(rows[0]!.sections![1],(before!.data.courseOutline as any)[0].sections[1]);assert.deepEqual(rows[2],(before!.data.courseOutline as any)[2])
 assert.deepEqual(rows[0]!.sections![0]!.resources,section('stored-shared-id').resources);assert.deepEqual(input.editor,before)
})

test('a field path and a list item edit cannot touch any neighboring field or section',async()=>{
 for(const [targetPath,changes,expected] of [['courseOutline.0.sections.0.activities',{activities:'Discuss evidence.'},'Discuss evidence.'],['courseOutline.0.sections.0.contents.1',{contents:['New second topic']},'New second topic']] as const){
  const input=request('Edit the selected field only',targetedEditor(),{targetPath})
  const {result}=await run(input,p=>{assert.equal(p.targets[0].sectionContextPreview.ilos,'Existing outcome');return {edits:[{target:1,changes}]}});assert('patch' in result&&result.patch&&'courseOutline' in result.patch&&result.patch.courseOutline)
  const s=result.patch.courseOutline[0]!.sections![0]!
  assert.equal(targetPath.endsWith('1')?s.contents[1]:s.activities,expected);assert.equal(s.ilos,'Existing outcome');assert.equal(s.assessments,'Existing assessment')
  assert.deepEqual(result.patch.courseOutline[0]!.sections![1],section('stored-other-id'))
 }
})

test('multiple explicit sections use one atomic proposal and retain their positions and IDs',async()=>{
 const {result}=await run(request('Complete Week 1 Sections 1 and 2 only'),()=>({edits:[{target:2,changes:{...completedSection,contents:['Second section topic']}},{target:1,changes:completedSection}]}))
 assert('patch' in result&&result.patch&&'courseOutline' in result.patch&&result.patch.courseOutline);assert.deepEqual(result.patch.courseOutline[0]!.sections!.map(s=>s.id),['stored-shared-id','stored-other-id'])
 assert.deepEqual(result.patch.courseOutline[1]!.sections![0],result.patch.courseOutline[0]!.sections![0])
})

test('mixed section/field selectors remain distinct and whole-outline stages retain canonical IDs',async()=>{
 const input=request('Edit Week 1 Section 1 activities and Section 2 contents only')
 assert.deepEqual(resolveOutlineEdit(input)!.targets.map(t=>t.fields),[['activities'],['contents']])
 const {result}=await run(input,()=>({edits:[{target:1,changes:{activities:'Compare research questions.'}},{target:2,changes:{contents:['Sampling methods']}}]}))
 assert('patch' in result&&result.patch&&'courseOutline' in result.patch&&result.patch.courseOutline)
 assert.equal(result.patch.courseOutline[0]!.sections![0]!.contents[0],'Keep topic')
 const whole=await run(request('Generate a new course outline'),p=>({edits:p.targets.map((t:{target:number})=>({target:t.target,changes:completedSection}))}))
 assert('patch' in whole.result&&whole.result.patch&&'courseOutline' in whole.result.patch&&whole.result.patch.courseOutline)
 assert.deepEqual(whole.result.patch.courseOutline[0]!.sections!.map(s=>s.id),['stored-shared-id','stored-other-id'])
 assert.deepEqual(whole.result.patch.courseOutline[0]!.sections![0],whole.result.patch.courseOutline[1]!.sections![0])
})

test('strict updates reject forged IDs, unrelated fields, duplicate or missing targets and wrong types',()=>{
 const input=request(),scope=resolveOutlineEdit(input)!
 for(const raw of [{edits:[{target:1,id:'forged',changes:completedSection}]},{edits:[{target:1,changes:{...completedSection,id:'forged'}}]},{edits:[{target:1,changes:{...completedSection,activities:4}}]},{edits:[]},{edits:[{target:2,changes:completedSection}]},{edits:[{target:1,changes:{...completedSection,ilos:''}}]}])assert(mergeOutlineEdits(raw,input.editor!,scope).error)
 const fields=resolveOutlineEdit({...input,targetPath:'courseOutline.0.sections.0.activities'})!
 assert.match(mergeOutlineEdits({edits:[{target:1,changes:completedSection}]},input.editor!,fields).error!.details.join(';'),/outside the selected scope/)
 const multiple=resolveOutlineEdit(request('Complete Week 1 Section 1 and 2'))!
 assert.match(mergeOutlineEdits({edits:[{target:1,changes:completedSection},{target:1,changes:completedSection}]},input.editor!,multiple).error!.details.join(';'),/duplicate target/)
})

test('repair starts from the same baseline; invalid output never applies and reports the failed field',async()=>{
 const input=request(),before=structuredClone(input.editor)
 const {result,calls}=await run(input,(_p,attempt)=>({edits:[{target:1,changes:attempt===1?{...completedSection,contents:17}:completedSection}]}))
 assert.equal(calls,2);assert('patch' in result&&result.patch);assert.deepEqual(input.editor,before)
 await assert.rejects(run(input,()=>({edits:[{target:1,changes:{...completedSection,contents:17}}]})),/edits.0.changes.contents/)
 const exact=literalEdit(input.editor!,'Week 1 Section 2: replace "Existing" with "Revised"','courseOutline')!
 assert('courseOutline' in exact&&exact.courseOutline);assert.equal(exact.courseOutline![0]!.sections![0]!.ilos,'Existing outcome');assert('courseOutline' in exact&&exact.courseOutline);assert.equal(exact.courseOutline![0]!.sections![1]!.ilos,'Revised outcome')
})

test('hosted provider adapters and local inference use identical target aliases and strict edit validation',async()=>{
 const originalFetch=globalThis.fetch
 const task=request('Complete Week 1 Section 1 only without web research')
 const output=JSON.stringify({edits:[{target:1,changes:completedSection}]})
 const providers=['openrouter','anthropic','openai','ollama'] as const
 try{
  for(const provider of providers){
   const connection:Connection={provider,model:provider==='openai'?'gpt-synthetic':'synthetic-model',apiKey:'synthetic-not-a-real-credential',owner:'instructor',id:'synthetic-connection',expires:Date.now()+60000}
   rememberReasoning([{id:connection.model,supported_parameters:[]}])
   let calls=0
   globalThis.fetch=async(url,init)=>{
    calls++;const body=JSON.parse(String(init?.body)),prompt=body.messages?.at(-1)?.content||body.input?.[0]?.content?.[0]?.text
    assert.equal(JSON.parse(prompt).targets[0].target,1);assert(!prompt.includes('stored-'))
    if(provider==='ollama')return Response.json({done:true,done_reason:'stop',message:{content:output}})
    if(provider==='anthropic')return Response.json({stop_reason:'end_turn',content:[{type:'text',text:output}]})
    if(provider==='openai')return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:output}]}]})
    assert.match(String(url),/^https:\/\/openrouter.ai\/api\/v1\/chat\/completions/)
    return Response.json({choices:[{finish_reason:'stop',message:{content:output}}]})
   }
   const result=await operatorRequest(task,{id:'instructor',role:'instructor',local:true},connection,AbortSignal.timeout(10000))
   assert('patch' in result&&result.patch&&'courseOutline' in result.patch&&result.patch.courseOutline)
   assert.equal(result.patch.courseOutline[0]!.sections![0]!.id,'stored-shared-id');assert.equal(calls,1)
   // The browser runtime calls this same validator with its own generation
   // function; no alternate permissive local-model parsing is involved.
   const local=await planValidatedTool(task,{id:'on-device',role:'instructor',local:true},AbortSignal.timeout(10000),(s,p,signal,json)=>invokeModel(s,p,signal,json,connection),6000)
   assert('patch' in local&&local.patch);assert.deepEqual(local.patch,result.patch)
  }
 }finally{globalThis.fetch=originalFetch}
})

test('confirmed targeted proposal persists atomically; stale retries and invalid shared content leave the database intact',async()=>{
 const hosted=process.env.VERCEL;delete process.env.VERCEL;process.env.AI_VECTOR_STORE='local';process.env.AI_DATA_DIR=join(await mkdtemp(join(tmpdir(),'targeted-outline-')),'db')
 const identity={id:'targeted-owner',role:'instructor' as const,local:true},initial=targetedEditor(),data=workspaceInput.parse({revision:0,data:{syllabi:[{...initial.data,id:'persisted-syllabus',status:'drafted'}],content:{},registrations:[]}})
 try{
  await saveWorkspace(identity,data)
  const {result}=await run(request(),()=>({edits:[{target:1,changes:completedSection}]}));assert('patch' in result&&result.patch)
  let applied=0;const off=registerEditor(initial.instance,{read:()=>initial,apply:()=>{applied++},save:async next=>{const saved=await saveWorkspace(identity,workspaceInput.parse({revision:1,data:{...data.data,syllabi:[{...next,id:'persisted-syllabus',status:'drafted'}]}}));return {persisted:true,revision:saved.revision}}})
  try{const receipt=await applyEditorProposal(initial,result.patch,'instructor',true);assert.equal(receipt.persisted,true);assert.equal(applied,0)}finally{off()}
  const saved=await readWorkspace(identity);assert.equal(saved.revision,2);assert.equal(saved.data!.syllabi[0]!.courseOutline[0]!.sections![0]!.id,'stored-shared-id')
  await assert.rejects(saveWorkspace(identity,data),{code:'WORKSPACE_CONFLICT'})
  const broken=structuredClone(saved.data!);broken.syllabi[0]!.courseOutline[1]!.sections![0]!.ilos='Different shared content'
  await assert.rejects(saveWorkspace(identity,{revision:2,data:broken}),{code:'WORKSPACE_INVALID'})
  assert.deepEqual(await readWorkspace(identity),saved)
 }finally{await closeLocalDb();if(hosted===undefined)delete process.env.VERCEL;else process.env.VERCEL=hosted}
})
