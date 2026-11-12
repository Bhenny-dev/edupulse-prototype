import test from 'node:test'
import assert from 'node:assert/strict'
import {aggregateSections,type OutlineSection} from '../src/utils/outlineSections.js'
import {applySyllabusDraft,registerEditor,type EditorSnapshot} from '../src/agents/editorTools.js'
import {continueSyllabusTask,syllabusTask,syllabusEditorData,unfinishedSyllabusWeeks} from '../src/agents/syllabusConversation.js'
import {resolveOutlineEdit} from '../src/agents/outlineEdits.js'
import {focusedSection,focusedFields} from '../src/agents/pageContext.js'

const blank=(id:string):OutlineSection=>({id,ilos:'',contents:[''],activities:'',assessments:'',assessmentTypes:[]})
const filled={ilos:'Explain variables using a short trace.',contents:['Variables'],activities:'Trace a variable assignment.',assessments:'Explain the traced value.',assessmentTypes:['Essay']}
function form():EditorSnapshot{return {instance:'builder',kind:'syllabus',label:'Programming',data:{id:'saved-draft',courseCode:'IT 102',status:'checked',approvedFile:{sha256:'existing'},coursePolicy:['Keep policy'],programOutcomes:['Explain programs'],courseOutline:[aggregateSections({week:1},[blank('shared')]),aggregateSections({week:2},[blank('shared'),blank('second')]),aggregateSections({week:3},[blank('third')]),{week:9,ilos:'',contents:[],assessments:'Midterm Examination'}]}}}
test('validated direct placement keeps immutable IDs, shared relationships and independent manual work, with no save or approval',()=>{
 const before=form();let current=structuredClone(before),saves=0
 const detach=registerEditor('test',{read:()=>current,apply:data=>{current={...current,data}},save:async()=>{saves++}})
 try{
  current.data.coursePolicy=['Manual policy entered while generating']
  const row=aggregateSections({week:1},[{...blank('shared'),...filled}])
  const result=applySyllabusDraft(before,{courseOutline:[row]},'instructor')
  const rows=current.data.courseOutline as any[]
  assert.equal(rows[0].sections[0].id,'shared');assert.deepEqual(rows[0].sections[0],rows[1].sections[0]);assert.equal(rows[1].sections[1].id,'second');assert.deepEqual(rows[2],(before.data.courseOutline as any[])[2]);assert.deepEqual(current.data.coursePolicy,['Manual policy entered while generating'])
  assert.equal(current.data.status,'drafted');assert.equal(current.data.approvedFile,undefined);assert.equal(saves,0);assert.equal(result.saved,false)
  applySyllabusDraft(before,{courseOutline:[row]},'instructor');assert.equal(saves,0,'repeated progress cannot save or approve')
 }finally{detach()}
})
test('a conflicting target rejects the whole generated chunk without overwriting earlier progress or unrelated fields',()=>{
 const before=form();let current=structuredClone(before),applies=0
 current.data.courseOutline=(current.data.courseOutline as any[]).map(row=>row.week===1?aggregateSections(row,[{...row.sections[0],activities:'Manual activity'}]):row)
 const detach=registerEditor('conflict',{read:()=>current,apply:data=>{applies++;current={...current,data}}})
 try{assert.throws(()=>applySyllabusDraft(before,{programOutcomes:['New outcome'],courseOutline:[aggregateSections({week:1},[{...blank('shared'),...filled}])]},'instructor'),/changed during generation/);assert.equal(applies,0);assert.deepEqual(current.data.programOutcomes,before.data.programOutcomes)}finally{detach()}
})
test('invalid output, forged IDs, closed editors, changed courses and non-instructors cannot place content',()=>{
 const before=form();let current=structuredClone(before),applies=0
 const detach=registerEditor('guard',{read:()=>current,apply:()=>{applies++}})
 try{
  assert.throws(()=>applySyllabusDraft(before,{status:'active'},'instructor'))
  assert.throws(()=>applySyllabusDraft(before,{courseOutline:[aggregateSections({week:1},[{...blank('forged'),...filled}])]},'instructor'),/IDs/)
  assert.throws(()=>applySyllabusDraft(before,{programOutcomes:['New']},'student'),/authorized/)
  current.data.courseCode='IT 202';assert.throws(()=>applySyllabusDraft(before,{programOutcomes:['New']},'instructor'),/selected course changed/);assert.equal(applies,0)
 }finally{detach()}
 assert.throws(()=>applySyllabusDraft(before,{programOutcomes:['New']},'instructor'),/closed/)
})
test('week continuations bind to the same account, conversation, syllabus and course, and skip examination slots',()=>{
 const editor=form(),previous=syllabusTask(editor,'account:conversation','courseOutline')
 assert.match(continueSyllabusTask('Week 2 then',editor,previous,'account:conversation')!,/Week 2 only/)
 assert.match(continueSyllabusTask('can you provide week 2 then',editor,previous,'account:conversation')!,/Week 2 only/)
 assert.match(continueSyllabusTask('complete the remaining weeks',editor,previous,'account:conversation')!,/remaining unfinished/)
 assert.equal(continueSyllabusTask('Week 2 then',editor,previous,'another:conversation'),null)
 assert.equal(continueSyllabusTask('Week 2 then',{...editor,data:{...editor.data,id:'other'}},previous,'account:conversation'),null)
 assert.equal(continueSyllabusTask('What is a week?',editor,previous,'account:conversation'),null)
 assert.deepEqual(unfinishedSyllabusWeeks(editor),[1,2,3])
})
test('an explicit week overrides a previously selected field without changing the strict section target contract',()=>{
 const editor=form(),focus={field:'courseOutline.0.sections.0.activities',section:'5'}
 assert.equal(focusedSection(focus,'Complete Week 3 only'),'courseOutline');assert.equal(focusedFields(focus,'Complete Week 3 only'),undefined)
 const resolved=resolveOutlineEdit({editor,message:'Complete Week 3 only',section:'courseOutline',context:'',targetPath:focus.field})!
 assert.deepEqual(resolved.targets.map(target=>target.week),[3]);assert.deepEqual(resolved.targets[0]!.fields,['ilos','contents','activities','assessments','assessmentTypes'])
})

test('editable context excludes approval bytes, history and support permissions while retaining selected course identity',()=>{
 const before=form().data
 const context=syllabusEditorData({...before,history:[{secret:'private'}],versions:[{approvedFile:'private'}],permissions:['approve'],sharedBy:{id:'private'}})
 assert.equal(context.id,before.id);assert.equal(context.courseCode,'IT 102');assert.deepEqual(context.programOutcomes,before.programOutcomes)
 for(const key of ['approvedFile','status','history','versions','permissions','sharedBy'])assert.equal(key in context,false)
})
