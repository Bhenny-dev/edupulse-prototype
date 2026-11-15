import test from 'node:test'
import assert from 'node:assert/strict'
import {weekSections,normalizeOutlineSections,editOutlineSection,addOutlineSection,shareOutlineSection,aggregateSections,weekRuns,weekRangeLabel,outlineSpans,spansKeepWeekOrder} from '../src/utils/outlineSections.js'
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

const printed=(weeks:number[],id:string,topic:string)=>({id,ilos:`Outcomes for ${topic}`,contents:[topic,`A. Overview of ${topic}`],activities:'Group dynamics',assessments:'Journal',assessmentTypes:[],resources:[]})
test('a section the original prints once for weeks 2 to 8 is one entry with a range label',()=>{
 const comprised=printed([2],'feasibility','III. Feasibility of the study')
 const outline=[1,...Array.from({length:7},(_,i)=>i+2),9].map(week=>week===1?aggregateSections({week},[printed([1],'intro','I. Introduction')]):week===9?aggregateSections({week},[{...printed([9],'exam',''),ilos:'',contents:[],activities:'',assessments:'Midterm Examination'}]):aggregateSections({week},[comprised]))
 const spans=outlineSpans(outline)
 assert.deepEqual(spans.map(span=>[span.label,span.exam]),[['1',false],['2–8',false],['9',true]])
 assert.deepEqual(spans[1]!.weeks,[2,3,4,5,6,7,8])
 assert.equal(outline.length,9,'calendar weeks stay separate rows in the data')
 assert.deepEqual([weekRuns([2,3,4,6,8,9]),weekRangeLabel([6,2,3,4]),weekRangeLabel([5]),weekRangeLabel([1,2,4,5,6])],[[[2,3,4],[6],[8,9]],'2–4, 6','5','1–2, 4–6'])
})

test('an exported comprised section is written once as a week range and reads back as one shared section',async()=>{
 const {syllabusBlocks}=await import('../src/utils/syllabusFiles.js')
 const {parseSyllabusText}=await import('../src/utils/syllabusParser.js')
 const comprised=printed([2],'feasibility','III. Feasibility of the study'),extra={...printed([5],'pilot','Pilot data gathering')}
 const outline=[1,2,3,4,5,6,7,8].map(week=>aggregateSections({week},week===1?[printed([1],'intro','I. Introduction')]:week===5?[comprised,extra]:[comprised]))
 const text=syllabusBlocks({courseCode:'CP 1',courseTitle:'Capstone 1',courseOutline:outline}).map((block:{text:string})=>block.text)
 assert.deepEqual(text.filter(line=>/^Week /.test(line)),['Week 1','Week 2–8','Week 5'])
 assert.equal(text.filter(line=>line==='Content: III. Feasibility of the study').length,1)
 const parsed=parseSyllabusText(text.join('\n')).sections[4].parsed.courseOutline
 assert.deepEqual(parsed.map(row=>row.week),[1,2,3,4,5,6,7,8])
 assert.deepEqual(weekSections(parsed[4]!).map(section=>section.contents[0]),['III. Feasibility of the study','Pilot data gathering'])
 const ids=new Set(parsed.filter(row=>row.week>=2).map(row=>weekSections(row)[0]!.id));assert.equal(ids.size,1,'weeks 2 to 8 read back as one shared section')
})

test('a week range that is not consecutive is written as separate consecutive ranges so no week is lost',async()=>{
 const {syllabusBlocks}=await import('../src/utils/syllabusFiles.js')
 const {parseSyllabusText}=await import('../src/utils/syllabusParser.js')
 const shared=printed([2],'review','Review sessions'),other=printed([3],'own','Own topic')
 const outline=[aggregateSections({week:2},[shared]),aggregateSections({week:3},[other]),aggregateSections({week:4},[shared])]
 const text=syllabusBlocks({courseCode:'X 1',courseTitle:'X',courseOutline:outline}).map((block:{text:string})=>block.text)
 assert.deepEqual(text.filter(line=>/^Week /.test(line)),['Week 2','Week 4','Week 3'])
 const parsed=parseSyllabusText(text.join('\n')).sections[4].parsed.courseOutline
 assert.deepEqual(parsed.map(row=>row.week).sort(),[2,3,4])
 assert.equal(weekSections(parsed.find(row=>row.week===2)!)[0]!.id,weekSections(parsed.find(row=>row.week===4)!)[0]!.id)
})

test('sections shared in a different order from week to week keep each week own order in the export',async()=>{
 const {syllabusBlocks}=await import('../src/utils/syllabusFiles.js')
 const first=printed([2],'a','Topic A'),second=printed([2],'b','Topic B')
 const outline=[aggregateSections({week:2},[first,second]),aggregateSections({week:3},[second,first])]
 assert.equal(spansKeepWeekOrder(outline,outlineSpans(outline)),false)
 const order=syllabusBlocks({courseCode:'X 1',courseTitle:'X',courseOutline:outline}).map((block:{text:string})=>block.text).filter(line=>/^Content: Topic [AB]$/.test(line))
 assert.deepEqual(order,['Content: Topic A','Content: Topic B','Content: Topic B','Content: Topic A'])
})
