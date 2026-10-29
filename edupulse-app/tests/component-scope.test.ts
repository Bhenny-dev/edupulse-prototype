import { swapTeachingWeeks } from '../src/utils/outlineEditing.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { editableField, scopedEditorPatch } from '../src/agents/componentScope.js'
import { applyEditorProposal, registerEditor, type EditorSnapshot } from '../src/agents/editorTools.js'
import { focusedFields, focusedSection } from '../src/agents/pageContext.js'
import { parseSyllabusText } from '../src/utils/syllabusParser.js'
import { workProposal } from '../src/agents/workTools.js'

test('field edits preserve every neighboring item and reject unsafe or moved targets', async () => {
 const snapshot:EditorSnapshot={instance:crypto.randomUUID(),kind:'syllabus',label:'Research',data:{courseCode:'IT 104',programOutcomes:['Keep first','Before'],coursePolicy:['Keep policy'],courseOutline:[{week:1,ilos:'Keep outcome',contents:['Keep topic']},{week:2,ilos:'Before',contents:['Other topic']}]}}
 const changes={programOutcomes:['Attempted unrelated change','After'],coursePolicy:['Attempted policy change']}
 const narrowed=scopedEditorPatch(snapshot,changes,'programOutcomes.1')
 assert.deepEqual(narrowed,{programOutcomes:['Keep first','After']})
 assert.deepEqual(scopedEditorPatch(snapshot,{courseOutline:[{week:1,ilos:'Attempted change',contents:[]},{week:2,ilos:'New outcome',contents:[]}]},'courseOutline.1.ilos'),{courseOutline:[(snapshot.data.courseOutline as unknown[])[0],{week:2,ilos:'New outcome',contents:['Other topic']}]})
 for(const path of ['__proto__.polluted','courseCode','status','programOutcomes.99','courseOutline.0.week'])assert.equal(editableField(snapshot,path),false)
 assert.throws(()=>scopedEditorPatch(snapshot,{courseOutline:[{week:2,ilos:'Wrong week',contents:[]}]},'courseOutline.0.ilos'),/moved/)
 let next:unknown
 const unregister=registerEditor(snapshot.instance,{read:()=>snapshot,apply:data=>{next=data}})
 try{await applyEditorProposal(snapshot,narrowed,'instructor');assert.deepEqual(next,{...snapshot.data,programOutcomes:['Keep first','After']})}finally{unregister()}
})

test('scoped question wording retains question type, topic and private author answer settings',()=>{
 const questions=[{id:'q1',text:'Before',type:'true_false',topic:'Variables',options:['True','False'],correctIndex:1},{id:'q2',text:'Explain',type:'short_answer',topic:'Functions',options:[],explanation:'Rubric'}]
 const snapshot:EditorSnapshot={instance:'quiz',kind:'content',label:'Quiz',data:{questions}}
 const result=scopedEditorPatch(snapshot,{questions:questions.map(q=>({...q,text:'After',topic:'Wrong topic'}))},'questions.0.text')
 assert.deepEqual(result,{questions:[{...questions[0],text:'After'},questions[1]]})
 assert.equal(editableField(snapshot,'questions.0.correctIndex'),false)
})

test('a focused writing request uses an editor proposal even with a retained syllabus source',()=>{
 const target={path:'programOutcomes.1',label:'Program outcome 2'}
 const proposal=workProposal({message:'Make this more accurate',role:'instructor',editor:{instance:'s',kind:'syllabus',label:'Test',data:{}},target,attachments:[{syllabus:parseSyllabusText('')}],registrations:[],catalog:[]})
 assert.equal(proposal?.type,'editor-edit');assert.deepEqual(proposal?.target,target)
 const sourceEdit=workProposal({message:'Make it accurate to the uploaded file',role:'instructor',editor:{instance:'s',kind:'syllabus',label:'Test',data:{}},target,attachments:[{syllabus:parseSyllabusText('')}],registrations:[],catalog:[]})
 assert.equal(sourceEdit?.type,'syllabus-import');assert.deepEqual(sourceEdit?.target,target);assert.equal(sourceEdit?.editor?.instance,'s')
 assert.equal(workProposal({message:'Draft two examples',role:'instructor',editor:{instance:'c',kind:'content',label:'Test',data:{}},target:{path:'sections.0.body',label:'Lesson'},attachments:[],registrations:[],catalog:[]})?.type,'editor-edit')
 assert.equal(workProposal({message:'Draft this field',role:'student',editor:{instance:'s',kind:'syllabus',label:'Test',data:{}},target,attachments:[],registrations:[],catalog:[]})?.type,'notice')
})


test('multi-field sections keep their sibling fields while explicit all-fields requests broaden the scope',()=>{
 const focus={section:'6'}
 assert.equal(focusedSection(focus,'Draft this section'),'all')
 const fields=focusedFields(focus,'Draft this section')
 assert.deepEqual(fields,['courseRequirements','gradingSystem','coursePolicy'])
 assert.equal(focusedFields(focus,'Generate all fields in this syllabus'),undefined)
 const snapshot:EditorSnapshot={instance:'section',kind:'syllabus',label:'Policy',data:{}}
 assert.deepEqual(scopedEditorPatch(snapshot,{programOutcomes:['Outside'],coursePolicy:['Proposed policy']},undefined,fields),{coursePolicy:['Proposed policy']})
})


test('outline content moves between calendar slots while exam rows, week labels and source data stay intact',()=>{
 const rows=[{week:1,ilos:'First',resources:[{name:'First source'}]},{week:2,ilos:'Second',resources:[]},{week:9,ilos:'Exam',resources:[]}]
 const swapped=swapTeachingWeeks(rows,0,1)
 assert.deepEqual(swapped.map(row=>row.week),[1,2,9])
 assert.equal(swapped[1]!.ilos,'First');assert.deepEqual(swapped[1]!.resources,rows[0]!.resources)
 assert.equal(swapped[2],rows[2]);assert.equal(rows[0]!.ilos,'First')
 assert.equal(swapTeachingWeeks(rows,0,2),rows);assert.equal(swapTeachingWeeks(rows,0,-1),rows)
})
