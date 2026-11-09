import { readInstitutionalContext, readCourseInformation, readCourseDetails, pdfPathBoxes, readRuledOutline } from '../src/utils/pdfTableLayout.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { parseSyllabusFile, parseSyllabusText, parsedToFormState } from '../src/utils/syllabusParser.js'
import { APPROVED_FILE_LIMIT, retainApprovedFile } from '../src/utils/syllabusFiles.js'
import { approvedSyllabusCandidate } from '../src/utils/approvedSyllabus.js'
import { workspaceData } from '../server/workspace.js'
import { makePdf, makeRuledSyllabusPdf } from './fixtures.js'

test('PDF text with numbered headings, paired fields and outline columns retains the course and week', () => {
  const parsed = parseSyllabusText('I. Course Information\nCourse Code: IT 102\tCourse Title: Computer Programming 1\nV. Course Outline\nWeek\tLearning Outcomes\tContents\tActivities\tAssessment\n1\tExplain variables\tVariables and assignment\tTrace values\tShort quiz\n2-3\tReview arrays\tArrays\tLab\tQuiz')
  assert.equal(parsed.courseMatch?.code, 'IT 102')
  assert.equal(parsed.sections[0].parsed.courseTitle, 'Computer Programming 1')
  assert.equal(parsed.sections[4].parsed.courseOutline.length, 1, 'ambiguous week ranges are never invented')
  assert.deepEqual(parsed.sections[4].parsed.courseOutline[0].contents, ['Variables and assignment'])
  assert.equal(parsed.sections[4].parsed.courseOutline[0].activities, 'Trace values')
})

test('PDF import reads a real text-layer file and approved retention preserves its bytes and checksum', async () => {
  const bytes = makePdf([['Section 1: Course Information', 'Course Code: IT 102', 'Section 5: Course Outline', 'Week 1', 'ILOs: Explain variables', 'Topics: Variables and assignment']])
  const file = new File([new Uint8Array(bytes)], 'approved-syllabus.pdf', { type: 'application/pdf' })
  const parsed = await parseSyllabusFile(file)
  assert.equal(parsed.courseMatch?.code, 'IT 102')
  assert.deepEqual(parsed.sections[4].parsed.courseOutline[0].contents, ['Variables and assignment'])
  const retained = await retainApprovedFile(file)
  assert.equal(retained.sha256, createHash('sha256').update(bytes).digest('hex'))
  assert.deepEqual(Buffer.from(retained.base64, 'base64'), Buffer.from(bytes))
  await assert.rejects(retainApprovedFile(new File(['not a PDF'], 'wrong.pdf')), /does not match/)
})

test('ruled PDF cells preserve wrapped lines, page continuations and explicit shared week ranges', async () => {
  const parsed=await parseSyllabusFile(new File([new Uint8Array(makeRuledSyllabusPdf())],'sample-syllabus.pdf'))
  const rows=parsed.sections[4].parsed.courseOutline
  assert.equal(parsed.courseMatch?.code,'IT 102')
  assert.deepEqual(rows.map(row=>row.week),[1,2,3,4])
  assert.match(rows[0]!.ilos,/their role in a program.*Trace a complete example/)
  assert.ok(rows[0]!.contents.includes('a. Variable declaration and assignment'))
  assert.match(rows[1]!.ilos,/nested conditions using a trace table/)
  assert.ok(rows[1]!.contents.includes('b. Nested conditions and complete examples'))
  assert.deepEqual(rows[2]!.contents,rows[3]!.contents)
  assert.deepEqual(parsed.provenance?.find(row=>row.weeks[0]===2)?.pages,[1,2])
})

test('institutional columns retain the college mission continuation without mixing objectives into it',()=>{
  const item=(x:number,y:number,str:string)=>({str,width:str.length*4,transform:[1,0,0,1,x,y]})
  const extracted=readInstitutionalContext([
    {number:1,edges:[[40,100,40.5,200],[300,100,300.5,200],[600,100,600.5,200]],items:[item(50,190,'Mission'),item(310,190,'Objectives'),item(50,175,'Develop computing professionals through'),item(50,160,'active participation and'),item(310,175,'1. Build responsible systems.'),item(310,160,'2. Work collaboratively.')]},
    {number:2,edges:[[40,400,40.5,450],[300,400,300.5,450],[600,400,600.5,450]],items:[item(50,435,'community involvement.'),item(310,435,'3. Share computing knowledge.'),item(40,370,'IV. PROGRAM OUTCOMES')]},
  ])
  assert.equal(extracted?.cit.mission,'Develop computing professionals through active participation and community involvement.')
  assert.deepEqual(extracted?.cit.objectives,['Build responsible systems.','Work collaboratively.','Share computing knowledge.'])
  assert.equal(extracted?.kcp.mission,'')
})

test('scaled PDF paths, segmented row borders and worded week ranges preserve all cells and continuations',async()=>{
 const parsed=await parseSyllabusFile(new File([new Uint8Array(makeRuledSyllabusPdf({transformed:true,wordRange:true,segmentedRules:true}))],'scaled-syllabus.pdf'))
 const rows=parsed.sections[4].parsed.courseOutline
 assert.deepEqual(rows.map(row=>row.week),[1,2,3,4]);assert.match(rows[1]!.ilos,/nested conditions.*trace table/);assert.deepEqual(rows[2]!.contents,rows[3]!.contents)
 assert.ok(rows[0]!.contents.includes('a. Variable declaration and assignment'));assert.equal(rows[2]!.assessments,'Working program')
 const OPS={save:1,restore:2,transform:3,constructPath:4}
 const boxes=pdfPathBoxes({fnArray:[1,3,4,2,4],argsArray:[[],[.75,0,0,-.75,40,550],[null,null,[10,20,10.5,120]],[],[null,null,[1,2,3,4]]]},OPS)
 assert.deepEqual(boxes,[[47.5,460,47.875,535],[1,2,3,4]])
 const gap=await parseSyllabusFile(new File([new Uint8Array(makeRuledSyllabusPdf({transformed:true,segmentedRules:true,missingWeek:true}))],'missing-week.pdf'))
 assert.deepEqual(gap.sections[4].parsed.courseOutline.map(r=>r.week),[1,3,4]);assert.match(gap.warnings?.join(' ')||'',/II\. Decisions.*no week was inferred/)
 assert.doesNotMatch(gap.sections[4].parsed.courseOutline[0]!.contents.join(' '),/Decisions/)
})

test('ruled identity cells retain split labels, complete titles and the actual offered year',()=>{
 const item=(x:number,y:number,str:string)=>({str,width:str.length*4,transform:[1,0,0,1,x,y]})
 const xs=[40,115,180,255,440,520,680]
 const info=readCourseInformation([{number:1,edges:xs.map(x=>[x,400,x+.5,450]),rules:xs.slice(0,-1).flatMap((x,i)=>[[x,400,xs[i+1]!,400.5],[x,450,xs[i+1]!,450.5]]),items:[item(45,435,'I. Course'),item(45,422,'Code:'),item(120,435,'SYN 101'),item(185,435,'Course Title:'),item(260,435,'Web Application'),item(260,422,'Development Elective'),item(445,435,'Period Offered:'),item(525,435,'First Semester,'),item(525,422,'A.Y. 2025-2026'),item(40,350,'III. VISION, MISSION, OBJECTIVES')]}])
 assert.deepEqual(info,{courseCode:'SYN 101',courseTitle:'Web Application Development Elective',periodOffered:'First Semester',academicYear:'2025-2026'})
})

test('ruled descriptions and stacked metadata read written numbers without filling a blank description with neighboring fields',()=>{
 const item=(x:number,y:number,str:string)=>({str,width:str.length*4,transform:[1,0,0,1,x,y]})
 const xs=[40,115,250,325,460,535,680]
 const metadata=[item(45,435,'Credit Units:'),item(45,410,'Classification:'),item(120,435,'Three (3) Units'),item(120,410,'Major Course'),item(255,435,'Number of Hours:'),item(330,435,'Ninety (90) Hours'),item(465,435,'Prerequisites:'),item(540,435,'CIT 105')]
 const page={number:1,edges:[[40,450,40.5,500],[115,450,115.5,500],[680,450,680.5,500],...xs.map(x=>[x,380,x+.5,450])],rules:[380,450,500].map(y=>[40,y,680,y+.5]),items:[item(45,485,'II. Course'),item(45,473,'Description'),item(120,485,'A source-specific course overview.'),...metadata,item(40,350,'III. VISION, MISSION, OBJECTIVES')]}
 const details=readCourseDetails([page])
 assert.deepEqual(details,{description:'A source-specific course overview.',creditUnits:3,classification:'Major Course',noOfHours:90,prerequisites:['CIT 105']})
 assert.equal(readCourseDetails([{...page,items:page.items.filter(i=>i.str!=='A source-specific course overview.')}]).description,'')
})

test('a clipped row waits for its printed next-page week, while a genuinely unnumbered row never becomes an examination or guessed week',()=>{
 const xs=[40,100,240,380,500,620]
 const sheet=(number:number,rows:{top:number;bottom:number;cells:string[]}[],header=false)=>{
  const top=Math.max(...rows.map(r=>r.top))+(header?50:0),bottom=Math.min(...rows.map(r=>r.bottom))
  const items=rows.flatMap(row=>row.cells.flatMap((str,i)=>str?[{str,width:Math.min(xs[i+1]!-xs[i]!-12,str.length*4),transform:[1,0,0,1,xs[i]!+5,row.top-15]}]:[]))
  if(header)items.push(...['Week','Learning Outcomes','Contents','Activities','Assessments'].map((str,i)=>({str,width:str.length*4,transform:[1,0,0,1,xs[i]!+5,top-20]})))
  return {number,items,edges:xs.map(x=>[x,bottom,x+.5,top]),rules:[top,...rows.flatMap(r=>[r.top,r.bottom])].map(y=>[xs[0]!,y,xs.at(-1)!,y+.5])}
 }
 const parsed=readRuledOutline([
  sheet(1,[{top:600,bottom:500,cells:['1','Orient','Course introduction','Discussion','Learning']},{top:500,bottom:475,cells:['Week 9: Midterm Examination','','','','']},{top:475,bottom:400,cells:['','Explain node-based data structures, including','IV. Node-based data structures','Classroom discussion','Quizzes']}],true),
  sheet(2,[{top:650,bottom:400,cells:['10-17','their use in applications.','Trees and graphs','Lab','Working program']}]),
 ])
 const ten=parsed.outline.find(r=>r.week===10)!
 assert.match(ten.ilos,/Explain node-based.*their use/);assert.match(ten.contents.join(' '),/IV\. Node-based.*Trees/)
 assert.doesNotMatch(parsed.outline.find(r=>r.week===9)!.contents.join(' '),/Node/)
 assert.deepEqual(parsed.provenance.find(r=>r.weeks.includes(10))?.pages,[1,2]);assert.deepEqual(parsed.warnings,[])
 const gap=readRuledOutline([sheet(1,[{top:600,bottom:580,cells:['','After engaging in each topic, students must have:','','','']},{top:580,bottom:550,cells:['Week 9: Midterm Examination','','','','']},{top:550,bottom:500,cells:['','Formulate hypotheses','Hypothesis testing','','']},{top:500,bottom:450,cells:['11','Apply t-tests','t-Test','Lecture','Assignment']},{top:450,bottom:430,cells:['','','VIII.','','']},{top:430,bottom:400,cells:['12','Analyze relationships','Correlation','','Quiz']}],true)])
 assert.deepEqual(gap.outline.map(r=>r.week),[9,11,12]);assert.equal(gap.warnings.length,1)
 assert.match(gap.warnings[0]!,/Hypothesis testing.*no week was inferred/)
 assert.doesNotMatch(gap.outline.find(r=>r.week===9)!.contents.join(' '),/Hypothesis/)
})

test('the shared intake keeps original bytes above 500 KB, rejects oversize input and never substitutes catalog identity',async()=>{
 const bytes=new Uint8Array(650000).fill(32);bytes.set(makeRuledSyllabusPdf())
 const file=new File([bytes],'larger-approved.pdf'),retained=await retainApprovedFile(file),parsed=await parseSyllabusFile(file)
 parsed.courseMatch={code:'OTHER',title:'Wrong catalog title',units:3}
 assert.equal(parsedToFormState(parsed).courseTitle,'Computer Programming 1')
 const candidate=approvedSyllabusCandidate(parsed,retained,'source-intake-test')
 assert.equal(candidate.courseCode,'IT 102');assert.equal(candidate.courseTitle,'Computer Programming 1');assert.equal(retained.size,650000)
 assert.deepEqual(Buffer.from(retained.base64,'base64'),Buffer.from(bytes));assert.equal(retained.sha256,createHash('sha256').update(bytes).digest('hex'))
 assert.equal(workspaceData.safeParse({syllabi:[{...candidate,status:'active',approvedFile:{...retained,approvalAttested:true}}],content:{},registrations:[]}).success,true)
 await assert.rejects(retainApprovedFile(new File([new Uint8Array(APPROVED_FILE_LIMIT+1)],'too-large.pdf')),/750 KB/)
 assert.equal(workspaceData.safeParse({syllabi:[{...candidate,status:'active',approvedFile:{...retained,size:APPROVED_FILE_LIMIT+1,approvalAttested:true}}],content:{}}).success,false)
})
