import test from 'node:test'
import assert from 'node:assert/strict'
import {outlineDraftProgress,keepOutlineDraft} from '../src/agents/draftProgress.js'
import {registerEditor,previewEditorOutline,type EditorSnapshot} from '../src/agents/editorTools.js'
import {relatedSyllabi,referenceWindow} from '../src/agents/relatedSyllabi.js'
import {operatorInput,planValidatedTool,type PlannerExecution} from '../src/agents/toolPlanner.js'
import {ApiError} from '../server/contracts.js'

const blank=(week:number)=>({week,ilos:'',contents:[''],activities:'',assessments:'',teachingMaterials:[],assessmentTypes:[],resources:[]})
const filled=(week:number)=>({...blank(week),ilos:'Analyze research questions using stated evidence.',contents:['Research questions'],activities:'Compare two research questions and explain their scope.',assessments:'Written comparison using stated criteria.',teachingMaterials:['Case studies'],assessmentTypes:['Written work']})
const baseline=()=>[blank(1),blank(2),{...blank(3),assessments:'Final Examination'}]
const editor=():EditorSnapshot=>({instance:'outline-progress-test',kind:'syllabus',label:'Research outline',data:{courseCode:'IT 104',courseTitle:'Research Methods',courseOutline:baseline()}})

test('outline previews expose completed teaching weeks only and confirmed placement preserves manual edits and exams',()=>{
 const before=baseline(),current=structuredClone(before);current[1]!.ilos='Manually reviewed outcome'
 const progress=outlineDraftProgress({courseOutline:[filled(1),filled(2),filled(3),filled(4)]},editor())!
 assert.deepEqual(progress.rows.map(r=>r.week),[1,2]);assert.equal(progress.total,2)
 const result=keepOutlineDraft(current,before,progress.rows)
 assert.equal(result.kept,1);assert.equal(result.conflicts,1);assert.equal(result.rows.length,3)
 assert.equal(result.rows[0]!.ilos,filled(1).ilos);assert.equal(result.rows[1]!.ilos,'Manually reviewed outcome');assert.deepEqual(result.rows[2],before[2]);assert.deepEqual(before,baseline())
 assert.equal(outlineDraftProgress({courseOutline:[blank(1)]},editor()),null)
})

test('progress preview reaches only the same mounted instructor editor and never invokes apply or save',()=>{
 let shown=0,writes=0;const snapshot=editor(),progress=outlineDraftProgress({courseOutline:[filled(1)]},snapshot)!
 const unregister=registerEditor(snapshot.instance,{read:()=>snapshot,apply:()=>{writes++},save:async()=>{writes++},previewOutline:()=>{shown++}})
 try{assert.equal(previewEditorOutline(snapshot,progress,'instructor'),true);assert.equal(shown,1);assert.equal(writes,0);assert.throws(()=>previewEditorOutline(snapshot,progress,'student'));assert.throws(()=>previewEditorOutline({...snapshot,data:{...snapshot.data,courseCode:'OTHER'}},progress,'instructor'))}finally{unregister()}
 assert.throws(()=>previewEditorOutline(snapshot,progress,'instructor'))
})

test('same-course reference selection ranks usable syllabus versions and excludes rosters and unrelated courses',()=>{
 const source=(id:string,status:string)=>({id,courseCode:'IT104',courseTitle:'Research Methods',version:2,status,courseOutline:[filled(1),filled(2)],registrations:['private roster'],approvedFile:{base64:'private original bytes'}})
 const references=relatedSyllabi([source('draft','drafted'),source('approved','active'),{...source('unrelated','active'),courseCode:'IT202',courseTitle:'Networking'}],editor().data)
 assert.deepEqual(references.map(s=>s.id),['approved','draft']);assert(!JSON.stringify(references).includes('private'))
 const window=referenceWindow(references,[2]);assert.deepEqual(window[0]!.selectedWeeks.map(r=>r.week),[2]);assert.equal(window[0]!.version,'2')
})

test('a later failed week retains its validated prefix, can resume, and complete existing rows are not regenerated',async()=>{
 const input=operatorInput.parse({operation:'revise',viewRole:'instructor',section:'courseOutline',message:'Complete the course outline without web research',editor:editor()})
 let execution:PlannerExecution={initialize:true},calls=0
 const generate=async(_system:string,prompt:string)=>{calls++;const request=JSON.parse(prompt);assert.equal(request.editor.data.courseOutline.length,1);const week=request.editor.data.courseOutline[0].week;if(week===2)throw new ApiError(502,'INCOMPLETE_RESPONSE','Interrupted test model');return JSON.stringify({courseOutline:[filled(week)]})}
 for(let n=0;n<3;n++){const result=await planValidatedTool(input,{id:'test',role:'instructor',local:true},AbortSignal.timeout(1000),generate,6000,undefined,execution);assert('pending' in result&&result.pending);execution={initialize:false,...result.pending}}
 assert.deepEqual(outlineDraftProgress(execution.draft!.patch,input.editor!)!.rows.map(r=>r.week),[1])
 await assert.rejects(planValidatedTool(input,{id:'test',role:'instructor',local:true},AbortSignal.timeout(1000),generate,6000,undefined,execution),{code:'INCOMPLETE_RESPONSE'})
 const resumed=await planValidatedTool(input,{id:'test',role:'instructor',local:true},AbortSignal.timeout(1000),async(_s,p)=>JSON.stringify({courseOutline:[filled(JSON.parse(p).editor.data.courseOutline[0].week)]}),6000,undefined,execution)
 assert('patch' in resumed&&resumed.patch&&'courseOutline' in resumed.patch);assert.deepEqual(resumed.patch.courseOutline?.map(r=>r.week),[1,2,3])
 const keep=operatorInput.parse({...input,editor:{...editor(),data:{...editor().data,courseOutline:[filled(1),blank(2),baseline()[2]]}}})
 let regenerated=0;const done=await planValidatedTool(keep,{id:'test',role:'instructor',local:true},AbortSignal.timeout(1000),async(_s,p)=>{regenerated++;assert.equal(JSON.parse(p).editor.data.courseOutline[0].week,2);return JSON.stringify({courseOutline:[filled(2)]})},6000)
 assert('patch' in done&&done.patch);assert.equal(regenerated,1);assert.equal(calls,3)
})

test('same-course syllabus examples precede web lookup, while an explicit Internet request may supplement them',async()=>{
 const references=relatedSyllabi([{id:'source',courseCode:'IT104',courseTitle:'Research Methods',status:'active',courseOutline:[filled(1),filled(2)]}],editor().data)
 for(const external of [false,true]){
  let lookups=0,calls=0
  const input=operatorInput.parse({operation:'revise',viewRole:'instructor',section:'courseOutline',message:'Complete the course outline'+(external?' and search the internet for references':''),editor:editor(),referenceSyllabi:references})
  const result=await planValidatedTool(input,{id:'test',role:'instructor',local:true},AbortSignal.timeout(1000),async(_s,p)=>{const request=JSON.parse(p);assert.equal(request.referenceSyllabi[0].id,'source');assert.equal(request.referenceSyllabi[0].selectedWeeks.length,1);calls++;return JSON.stringify({courseOutline:[filled(request.editor.data.courseOutline[0].week)]})},6000,async()=>{lookups++;return {evidence:[]}})
  assert('patch' in result&&result.patch);assert.equal(calls,2);assert.equal(lookups,external?1:0)
 }
})

test('on-device output-limit errors repair one week instead of restarting the whole outline',async()=>{
 const snapshot=editor();snapshot.data.courseOutline=[blank(1)]
 const input=operatorInput.parse({operation:'revise',viewRole:'instructor',section:'courseOutline',message:'Complete the course outline without web research',editor:snapshot})
 const initial=await planValidatedTool(input,{id:'browser',role:'instructor',local:true},AbortSignal.timeout(1000),async()=>{throw Error('Model should not run during initialization')},6000,undefined,{initialize:true})
 assert('pending' in initial&&initial.pending)
 const pending=await planValidatedTool(input,{id:'browser',role:'instructor',local:true},AbortSignal.timeout(1000),async()=>{throw Error('The on-device model reached its output limit. Nothing was applied.')},6000,undefined,{initialize:false,...initial.pending})
 assert('pending' in pending&&pending.pending);assert.equal(pending.pending.draft.repair?.code,'INCOMPLETE_RESPONSE');assert.equal(pending.pending.draft.next,0)
 const result=await planValidatedTool(input,{id:'browser',role:'instructor',local:true},AbortSignal.timeout(1000),async(_s,p)=>{assert.equal(JSON.parse(p).editor.data.courseOutline.length,1);return JSON.stringify({courseOutline:[filled(1)]})},6000,undefined,{initialize:false,...pending.pending})
 assert('patch' in result&&result.patch&&'courseOutline' in result.patch);assert.equal(result.patch.courseOutline?.length,1)
})


test('placing a whole-week preview replaces its canonical blank section and preserves shared scopes',async()=>{
 const {normalizeOutlineSections,weekSections,shareOutlineSection}=await import('../src/utils/outlineSections.js')
 const before=normalizeOutlineSections([blank(1),blank(2)])
 const placed=keepOutlineDraft(before,before,[filled(1)])
 const current=normalizeOutlineSections(placed.rows as typeof before)
 assert.equal(weekSections(current[0]!)[0]!.contents[0],filled(1).contents[0])
 const shared=shareOutlineSection(before,weekSections(before[0]!)[0]!,[1,2])
 const blocked=keepOutlineDraft(shared,shared,[filled(1)])
 assert.equal(blocked.kept,0);assert.equal(blocked.conflicts,1);assert.deepEqual(blocked.rows,shared)
})
