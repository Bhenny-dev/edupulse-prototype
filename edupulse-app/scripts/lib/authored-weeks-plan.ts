import {createHash} from 'node:crypto'
import {authoredCatalog} from './authored-weeks-catalog.js'
import {curriculumKey} from '../../src/utils/curriculumMetadata.js'
import {weekSections,aggregateSections,isOutlineExam,type OutlineWeek} from '../../src/utils/outlineSections.js'
import {workspaceData,type WorkspaceData} from '../../server/workspace.js'
import {courseOutput} from '../../server/contracts.js'
import {teachingContentIssues} from '../../src/lib/rag/courseware.js'

export const authoredVersion='curriculum-authored-weeks-2026-11-12'
export const authoredAt=new Date().toISOString()
export const authoredDigest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
export type AuthoredInput={actor:string;owners:{id:string;name:string;role:string;workspace:{revision:number;data:WorkspaceData}}[]}
const criteria='Instructor marking: award the item point only when the response correctly applies the stated principle, gives the requested reasoning or artifact, and acknowledges relevant assumptions. Accept equivalent justified explanations. Return incomplete work for feedback; do not manufacture a numeric result before a real response is reviewed.'
export function authoredWeek(code:string,week:number){
 const course=authoredCatalog[curriculumKey(code)],lesson=course?.lessons[week-1]
 if(!lesson)throw new Error(`No authored pack for ${code}, week ${week}`)
 const material={title:`Week ${week}: ${lesson.title}`,sections:[
  {heading:'Context and principle',body:course.context+'\n\n'+lesson.concept},
  {heading:'Worked case',body:lesson.problem+'\n\n'+lesson.answer},
  {heading:'Apply and check',body:lesson.task+'\n\nBefore comparing your work with the example, state the assumptions and predict the result. Explain why the principle supports your conclusion. Check a changed condition or a plausible alternative; describe what additional evidence would be needed before generalizing beyond this case.'},
  ...(course.references.length?[{heading:'Further reading',body:course.references.map(r=>`- [${r.name}](${r.url})`).join('\n')+'\n\nThese are reading links, not retained passage citations. Consult the actual source and record the relevant section before using it as evidence.'}]:[]),
 ]}
 const activity={title:`Week ${week} guided activity: ${lesson.title}`,sections:[
  {heading:'Purpose and task',body:lesson.concept+'\n\n'+lesson.task},
  {heading:'Working procedure',body:'1. Read the principle and worked case. Identify the question, inputs, context and assumptions.\n2. Complete the stated task using fictional information or the explicitly permitted source. Follow the actual instructor\'s boundaries for practical work.\n3. Keep a trace, annotated diagram, table or short explanation showing your reasoning and the requested artifact. Separate a proposed action from a genuinely executed observation.\n4. Compare the result with the stated principle and consider a changed condition or counterexample. Identify one limit or unresolved question.\n5. Discuss the evidence with the instructor, revise a specific issue and retain the original and revised work. Do not invent observations, participation or approvals.'},
  {heading:'Review criteria',body:'Review the correctness of the principle, completeness of the requested artifact, traceability of reasoning, appropriate source attribution and explicit limitations. '+criteria},
 ]}
 const assessment={title:`Week ${week} applied assessment: ${lesson.title}`,questions:[
  {type:'short_answer' as const,responseFormat:'essay' as const,text:`Explain the principle in “${lesson.title}” in your own words. Identify one assumption, boundary or misuse that matters when applying it.`,topic:lesson.title,options:[] as string[],explanation:lesson.concept+' '+criteria},
  {type:'short_answer' as const,responseFormat:'essay' as const,text:lesson.problem+' Show your reasoning and state any assumption needed for your answer.',topic:lesson.title,options:[] as string[],explanation:lesson.answer+' '+criteria},
  {type:'short_answer' as const,responseFormat:'follow_along' as const,text:lesson.task+' Document your steps or decision criteria and distinguish observed evidence from a proposal.',topic:lesson.title,options:[] as string[],explanation:'Required evidence: '+lesson.task+' Use the principle: '+lesson.concept+' '+criteria},
 ]}
 const draft=courseOutput.parse({material,activity,assessment}),issues=teachingContentIssues(draft)
 if(issues.length)throw new Error(`${code} week ${week}: ${issues.join('; ')}`)
 return draft
}

/** Adds only missing items and genuinely blank draft outline rows. Existing bytes win. */
export function authoredPlan(input:AuthoredInput){
 const owners=structuredClone(input.owners),summary={offerings:0,courseWeeks:0,addedItems:0,preservedItems:0,filledOutlineWeeks:0,unchangedOwners:0}
 const seenOwners=new Set<string>()
 for(const owner of owners){
  if(owner.role!=='instructor'||seenOwners.has(owner.id))throw new Error('Unique instructor owners required')
  seenOwners.add(owner.id)
  const before=authoredDigest(owner.workspace.data)
  for(const syllabus of owner.workspace.data.syllabi){
   if(syllabus.status==='archived')continue
   const course=authoredCatalog[curriculumKey(syllabus.courseCode)]
   if(!course)throw new Error(`Unmapped curriculum offering: ${syllabus.courseCode}`)
   summary.offerings++
   for(let week=1;week<=5;week++){
    const lesson=course.lessons[week-1],index=syllabus.courseOutline.findIndex(r=>r.week===week)
    if(index<0)throw new Error(`Missing calendar week: ${syllabus.courseCode}/${week}`)
    let row=syllabus.courseOutline[index] as OutlineWeek
    if(isOutlineExam(row))throw new Error(`Exam row requires explicit authoring scope: ${syllabus.courseCode}/${week}`)
    const sections=weekSections(row)
    if(sections.length!==1)throw new Error('Author separate section mappings before applying this catalogue to multi-section weeks')
    const section=sections[0]
    const blank=!section.ilos.trim()&&!section.contents.some(t=>t.trim())&&!section.activities.trim()&&!section.assessments.trim()&&!section.resources?.length
    if(blank){
     if(syllabus.status!=='drafted')throw new Error('Only blank drafted outlines may be filled')
     row=aggregateSections(row,[{...section,ilos:`Explain ${lesson.title.toLowerCase()}, apply it to the stated case, and document assumptions and evidence.`,contents:[lesson.title],activities:lesson.task,assessments:'Three instructor-marked items: explained principle, worked case and documented application.',assessmentTypes:['Essay','Follow-along / Step-by-step documentation guide or criteria'],resources:course.references}])
     syllabus.courseOutline[index]=row as typeof syllabus.courseOutline[number]
     summary.filledOutlineWeeks++
    }
    const scope=weekSections(row)[0],scopeDigest=authoredDigest(scope)
    const draft=authoredWeek(syllabus.courseCode,week)
    summary.courseWeeks++
    for(const [type,prefix] of [['material','mat'],['activity','act'],['assessment','assess']] as const){
     const id=`gen-${prefix}-${syllabus.id}-w${week}`
     const existing=Object.entries(owner.workspace.data.content).filter(([,item])=>item.syllabusId===syllabus.id&&item.week===week&&item.type===type)
     if(existing.length){summary.preservedItems+=existing.length;continue}
     if(owner.workspace.data.content[id])throw new Error('Courseware ID collision; no existing record may be replaced')
     const raw=draft[type]
     const content={...raw,title:raw.title.slice(0,240),subtitle:'Authored draft — instructor review required',viewMode:type==='assessment'?'assessment':'document',
      ...(type==='assessment'?{outlineSectionId:scope.id,description:'Open-book written assessment. Verify the answer guidance and mark real student responses before recording a score.',questions:draft.assessment.questions.map((q,i)=>({...q,id:`q${i+1}`,options:[]})),totalPoints:3,timeLimit:'No time limit specified'}:{}),
      ai:{provider:'coding-session',model:'Codex-authored original draft',requestId:`${authoredVersion}:${syllabus.id}:w${week}`,reviewRequired:true,planBased:true,authoringVersion:authoredVersion,outlineDigest:scopeDigest,sources:[],warning:'Authored directly in the coding session; no connected-provider run or retained-source RAG verification was performed. Review the full weekly scope, subject facts, source locations and answer guidance before checking. Written responses require instructor marking.'}}
     owner.workspace.data.content[id]={syllabusId:syllabus.id,week,type,status:'draft',createdAt:authoredAt,content}
     summary.addedItems++
    }
   }
  }
  workspaceData.parse(owner.workspace.data)
  if(Buffer.byteLength(JSON.stringify(owner.workspace.data))>2_950_000)throw new Error(`Workspace size requires review: ${owner.name}`)
  if(authoredDigest(owner.workspace.data)===before)summary.unchangedOwners++
 }
 return {owners,summary}
}
