import test from 'node:test'
import assert from 'node:assert/strict'
import { coursewarePlan,plannedCoursewareTypes } from '../src/lib/rag/coursewarePlan.js'
import { courseInput,courseOutput } from '../server/contracts.js'
import { buildCourseInput } from '../src/utils/courseInput.js'
import { draftCoursewareAgents,draftCoursewareStep,assembleCourseware } from '../src/lib/rag/courseware.js'
import { mergeGeneratedWeek } from '../src/utils/contentUpdates.js'
import { loopLesson,loopDiscussion,outlineCoursewareSyllabus } from './outline-courseware-data.js'
const input=buildCourseInput(outlineCoursewareSyllabus,5,'Only from the syllabus. Preserve the planned discussion.')
const abort=()=>AbortSignal.timeout(10000)

test('outline plans group every topic and add only the specified delivery formats',()=>{
  const plan=coursewarePlan(input)
  assert.deepEqual(plan.map(part=>part.type),['material','material','activity'])
  assert.deepEqual(plan.filter(part=>part.type==='material').flatMap(part=>part.topics),input.topics)
  assert.ok(plan.filter(part=>part.type==='material').every(part=>part.topics.length<=3))
  assert.deepEqual(plannedCoursewareTypes(outlineCoursewareSyllabus.courseOutline[0]!),['material','activity'])
  assert.deepEqual(coursewarePlan({...input,plan:{...input.plan,activities:'',assessments:'Learning'}}).map(part=>part.type),['material','material'])
  assert.equal(coursewarePlan({...input,plan:{...input.plan,activities:'Hands-on activity',assessments:'Lab Output'}}).at(-1)!.format,'laboratory')
  assert.equal(coursewarePlan({...input,plan:{...input.plan,assessments:'True / false quiz'}}).at(-1)!.format,'true_false')
  assert.equal(coursewarePlan({...input,plan:{...input.plan,assessments:'Written response test'}}).at(-1)!.format,'short_answer')
})
test('all forty supported topics and supplied institutional policies reach the request',()=>{
  const syllabus={...outlineCoursewareSyllabus,courseOutline:[{...outlineCoursewareSyllabus.courseOutline[0]!,contents:Array.from({length:40},(_,i)=>`Outline topic ${i+1}`)}]}
  assert.equal(courseInput.parse(buildCourseInput(syllabus,5)).topics.length,40)
  assert.match(buildCourseInput(syllabus,5).referenceText,/institutional grading policies were not supplied/)
  assert.throws(()=>buildCourseInput({...syllabus,courseOutline:[{...syllabus.courseOutline[0]!,contents:Array(41).fill('Topic')}]},5),/No topics were silently omitted/)
})
test('complete topic groups are assembled into one substantive lesson and discussion, with item-specific reviews',async()=>{
  const requested:any[]=[]
  const result=await draftCoursewareAgents(input,abort(),{provider:'controlled fixture',search:async()=>({evidence:[]}),generate:async(_system,prompt)=>{
    const part=JSON.parse(prompt);requested.push(part)
    return JSON.stringify(part.generationStep==='activity'?{activity:loopDiscussion}:{material:loopLesson})
  }})
  assert.equal(requested.length,3);assert.equal(result.content.assessment,undefined)
  assert.ok(result.content.material.sections.map(section=>section.body).join(' ').split(/\s+/).length>600)
  assert.ok(result.content.activity);assert.equal(result.content.material.sections.filter(section=>section.heading==='References').length,1)
  assert.equal(result.reviews.material!.coverage.items.filter(item=>item.kind==='topic').length,5)
  assert.equal(result.reviews.activity!.coverage.items.filter(item=>item.kind==='topic').length,0,'a discussion is not misrepresented as the entire teaching lesson')
})
test('wrong or incomplete steps cannot become saved courseware',async()=>{
  const deps={provider:'fixture',search:async()=>({evidence:[]}),generate:async()=>JSON.stringify({material:loopLesson})}
  await assert.rejects(draftCoursewareStep({...input,stepKey:'assessment'},abort(),deps),{code:'INVALID_COURSEWARE_STEP'})
  const one=await draftCoursewareStep({...input,stepKey:'lesson-1'},abort(),deps)
  assert.throws(()=>assembleCourseware(input,[one]),{code:'INCOMPLETE_COURSEWARE'})
  await assert.rejects(draftCoursewareStep({...input,stepKey:'lesson-1'},abort(),{...deps,generate:async()=>JSON.stringify({material:{title:'Short overview',sections:[{heading:'Overview',body:'A loop repeats the statements in its body.'},{heading:'Practice',body:'Write and check a simple loop in class.'}]}})}),{code:'INVALID_GENERATION'})
})
test('regeneration removes obsolete unreviewed AI quizzes but retains manual and reviewed records',()=>{
  const base={syllabusId:'s',week:1,status:'draft',type:'assessment',content:{ai:{requestId:'old'}}}
  const before={obsolete:base,manual:{...base,content:{}},reviewed:{...base,status:'checked'},other:{...base,week:2}}
  const scope={syllabusId:'s',week:1,types:['material','activity']}
  const after=mergeGeneratedWeek(before,{},before,scope)
  assert.equal(after.obsolete,undefined);assert.equal(after.manual,before.manual);assert.equal(after.reviewed,before.reviewed);assert.equal(after.other,before.other)
  assert.equal(mergeGeneratedWeek(before,{},before,{...scope,missingOnly:true}).obsolete,before.obsolete)
})
test('a review completed during generation is protected and stale unreviewed edits reject the atomic save',()=>{
  const old={syllabusId:'s',week:1,status:'draft',type:'material',content:{title:'Original'}}
  const update={...old,content:{title:'Generated'}},scope={syllabusId:'s',week:1,types:['material']}
  const checked={...old,status:'checked'}
  assert.equal(mergeGeneratedWeek({item:checked},{item:update},{item:old},scope).item,checked)
  const changed={...old,content:{title:'Instructor edit'}}
  assert.throws(()=>mergeGeneratedWeek({item:changed},{item:update},{item:old},scope),/newer work was preserved/)
  assert.equal(changed.content.title,'Instructor edit')
})
test('written and true/false question formats are validated without inventing four choices',()=>{
  const document={title:'Guide',sections:[{heading:'First',body:'A sufficiently detailed supplied source paragraph.'},{heading:'Second',body:'Another sufficiently detailed source paragraph.'}]}
  const question={type:'short_answer' as const,text:'Explain how the loop reaches its stopping condition.',options:[],explanation:'The instructor checks the trace, stopping condition and state update.'}
  assert(courseOutput.safeParse({material:document,activity:document,assessment:{title:'Written test',questions:[question,question,question]}}).success)
  assert(!courseOutput.safeParse({material:document,activity:document,assessment:{title:'True/false test',questions:Array(3).fill({...question,type:'true_false',options:['True','False','Maybe']})}}).success)
})
