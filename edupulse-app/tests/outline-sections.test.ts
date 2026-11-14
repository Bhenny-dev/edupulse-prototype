import test from 'node:test'
import assert from 'node:assert/strict'
import {weekSections,normalizeOutlineSections,editOutlineSection,addOutlineSection,shareOutlineSection,aggregateSections} from '../src/utils/outlineSections.js'
import {swapTeachingWeeks} from '../src/utils/outlineEditing.js'
import {buildCourseInput} from '../src/utils/courseInput.js'
import {coursewarePlan,missingCoursewareCount} from '../src/lib/rag/coursewarePlan.js'
import {ASSESSMENT_FORMATS,writtenFormat} from '../src/data/assessmentFormats.js'
import {courseOutput} from '../server/contracts.js'
import {workspaceData} from '../server/workspace.js'
import {collectSyllabusReferences} from '../src/lib/rag/syllabusReferences.js'
const rows=normalizeOutlineSections([{week:1,ilos:'Explain variables.',contents:['Variable declarations','Assignment'],activities:'Discussion',assessments:'Practice'},{week:2,ilos:'',contents:[],activities:'',assessments:''},{week:9,ilos:'',contents:[],activities:'',assessments:'Midterm Examination'}])

test('canonical section references reach source preparation and generation without stale weekly projections',()=>{
 const link=(name:string)=>({name,url:`https://sources.example.org/${name}`})
 const shared={...weekSections(rows[0]!)[0]!,id:'shared',resources:[link('shared')]}
 const second={...shared,id:'second',resources:[link('second'),link('shared')]}
 const syllabus={courseCode:'IT 102',courseTitle:'Programming',onlineReferences:[{title:'Overall reference',url:'https://sources.example.org/overall'}],courseOutline:[
  {week:1,resources:[link('removed')],sections:[shared,second]},
  {week:2,sections:[shared,{...second,id:'later',resources:[link('later')]}]},
  {week:3,ilos:'Legacy scope',contents:['Legacy topic'],resources:[link('legacy')]},
 ]}
 const before=JSON.stringify(syllabus),urls=(week?:number)=>collectSyllabusReferences(syllabus,week).map(ref=>ref.url)
 assert.deepEqual(urls(1),['overall','shared','second'].map(name=>link(name).url))
 assert.deepEqual(urls(2),['overall','shared','later'].map(name=>link(name).url))
 assert.deepEqual(urls(),['overall','shared','second','later','legacy'].map(name=>link(name).url))
 const input=buildCourseInput(syllabus,1)
 assert.deepEqual(input.syllabusReferences.map(ref=>ref.url),urls(1))
 assert(!JSON.stringify(input).includes('/removed'))
 assert.equal(JSON.stringify(syllabus),before)
 const excessive={courseOutline:[{week:1,sections:Array.from({length:3},(_,scope)=>({...shared,id:`scope-${scope}`,resources:Array.from({length:27},(_,index)=>link(`source-${scope}-${index}`))}))}]}
 assert.throws(()=>collectSyllabusReferences(excessive),/80 distinct references/)
})
test('multiple sections and shared weeks preserve unique calendar slots, content, exams and scoped edits',()=>{
 const added=addOutlineSection(rows,1,'extra'),section=weekSections(added[0]!)[0]!
 const shared=shareOutlineSection(added,section,[1,2])
 assert.equal(weekSections(shared[0]!).length,2);assert.equal(weekSections(shared[1]!).length,1)
 const edited=editOutlineSection(shared,1,section.id,{contents:['A multiline contents field','Keeps every topic']})
 assert.deepEqual(edited[0]!.contents,edited[1]!.contents)
 assert.equal(edited[2]!.assessments,'Midterm Examination')
 assert.throws(()=>shareOutlineSection(rows,section,[9]),/Examination/)
 assert.equal(swapTeachingWeeks(edited,0,1),edited,'shared scopes cannot silently move a second week')
})
test('every supported assessment format reaches generation and validates its objective or instructor-marked response',()=>{
 for(const format of ASSESSMENT_FORMATS){
  const section={...weekSections(rows[0]!)[0]!,assessmentTypes:[format.label]}
  const syllabus={courseCode:'IT 102',courseTitle:'Programming',courseOutline:[aggregateSections(rows[0]!,[section])]}
  const input=buildCourseInput(syllabus,1),plan=coursewarePlan(input)
  assert.equal(plan.at(-1)!.format,format.id)
  assert.ok(plan.some(part=>part.type==='material'));assert.ok(plan.some(part=>part.type==='assessment'))
  const question={text:'Which concept is demonstrated by this variable declaration?',topic:'Variable declarations',explanation:'Instructor verifies the declared name and stated value.',...(writtenFormat(format.id)?{type:'short_answer',responseFormat:format.id,options:[]}:{type:format.id,options:format.id==='true_false'?['True','False']:['First','Second','Third','Fourth'],correctIndex:0})}
  assert.ok(courseOutput.shape.assessment.safeParse({title:'Assessment',questions:[question,question,question]}).success)
 }
 const input=buildCourseInput({courseCode:'IT 102',courseTitle:'Programming',courseOutline:rows},1,'Make the assessment an essay')
 assert.equal(coursewarePlan(input).at(-1)!.format,'essay')
 assert.equal(input.research,'sources','a format request keeps the retained-reference scope')
})
test('workspace boundary rejects inconsistent shared sections',()=>{
 const shared=shareOutlineSection(rows,weekSections(rows[0]!)[0]!,[1,2])
 const data={syllabi:[{id:'s',courseCode:'IT 102',courseTitle:'Programming',status:'drafted',courseOutline:shared}],content:{},registrations:[]}
 assert.ok(workspaceData.safeParse(data).success)
 const broken=JSON.parse(JSON.stringify(data));broken.syllabi[0]!.courseOutline[1]!.sections![0]!.ilos='Different scope'
 assert.equal(workspaceData.safeParse(broken).success,false)
})

test('each section keeps its own assessment format and reviewed section steps can be excluded',()=>{
 const first={...weekSections(rows[0]!)[0]!,assessmentTypes:['Multiple choice']},second={...first,id:'second',ilos:'Evaluate a variable trace.',contents:['Trace a variable'],assessmentTypes:['Essay']}
 const input=buildCourseInput({courseCode:'IT 102',courseTitle:'Programming',courseOutline:[aggregateSections(rows[0]!,[first,second])]},1)
 const assessments=coursewarePlan(input).filter(part=>part.type==='assessment')
 assert.deepEqual(assessments.map(part=>[part.key,part.format,part.sectionId]),[['assessment-1','multiple_choice',first.id],['assessment-2','essay','second']])
 assert.deepEqual(coursewarePlan({...input,skipSteps:['assessment-1']}).filter(part=>part.type==='assessment').map(part=>part.key),['assessment-2'])
 const items=[{type:'material'},{type:'activity'},{type:'assessment',content:{outlineSectionId:first.id}}]
 assert.equal(missingCoursewareCount({contents:input.topics,sections:input.sections},items),1)
 assert.equal(missingCoursewareCount({contents:input.topics,sections:input.sections},[...items,{type:'assessment',content:{outlineSectionId:'second'}}]),0)
})


test('exported scope labels preserve multiline fields and shared membership on import',async()=>{
 const {syllabusBlocks}=await import('../src/utils/syllabusFiles.js')
 const {parseSyllabusText}=await import('../src/utils/syllabusParser.js')
 const first={...weekSections(rows[0]!)[0]!,ilos:'Explain variables.\nTrace their values.',activities:'Read the example.\nDiscuss the trace.',assessments:'Complete the questions.\nExplain each answer.'}
 const second={...first,id:'second',contents:['A second scope'],assessmentTypes:['Essay']}
 const source=shareOutlineSection([aggregateSections(rows[0]!,[first,second]),rows[1]!],first,[1,2])
 const parsed=parseSyllabusText(syllabusBlocks({courseCode:'IT 102',courseTitle:'Programming',courseOutline:source}).map(block=>block.text).join('\n')).sections[4].parsed.courseOutline
 assert.equal(weekSections(parsed[0]!)[0]!.ilos,first.ilos)
 assert.equal(weekSections(parsed[0]!)[0]!.activities,first.activities)
 assert.equal(weekSections(parsed[0]!)[0]!.assessments,first.assessments)
 assert.equal(weekSections(parsed[0]!).length,2)
 assert.equal(weekSections(parsed[0]!)[0]!.id,weekSections(parsed[1]!)[0]!.id)
})
