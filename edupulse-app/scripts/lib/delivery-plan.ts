import {authoredWeek,authoredVersion,type AuthoredInput} from './authored-weeks-plan.js'
import {completeSyllabus,teachingChoices} from './complete-syllabus.js'
import {demoAssessment} from './demo-assessments.js'
import {workspaceData} from '../../server/workspace.js'
export const deliveryVersion='owner-course-delivery-demonstration-2026-11-12'
export type DeliveryInput=AuthoredInput&{courses:{id:string;instructor_id:string;syllabus_id:string;course_code:string;active:boolean}[];members:{course:string;student:string;email:string;block:string;year:number}[];activeStudents:number}
/** Three actual members of each class exercise the pipes; untouched learners remain available. */
export function demonstrationCohort<T extends {course:string;student:string;block:string}>(members:T[]):T[]{
 const counts=new Map<string,number>(),seen=new Set<string>()
 return [...members].sort((a,b)=>a.student.localeCompare(b.student)||a.course.localeCompare(b.course)||a.block.localeCompare(b.block)).filter(m=>{const key=m.course+':'+m.block,identity=m.course+':'+m.student,n=counts.get(key)||0;if(seen.has(identity)||n>=3)return false;seen.add(identity);counts.set(key,n+1);return true})
}
export function deliveryPlan(input:DeliveryInput){
 const owners=structuredClone(input.owners).sort((a,b)=>a.name.localeCompare(b.name)),summary={owners:owners.length,preparedSyllabi:0,activeOfferings:0,publishedItems:0,newShares:owners.length*2,memberships:input.members.length,students:new Set(input.members.map(m=>m.student)).size,protectedLaterAssessments:0}
 if(owners.length!==7||summary.students!==input.activeStudents)throw new Error('All seven active instructors and every active student must be represented')
 const shares:{sender:string;recipient:string;syllabus:string}[]=[]
 for(const [ownerIndex,owner] of owners.entries()){
  if(owner.role!=='instructor'||owner.workspace.data.syllabi.filter(s=>s.status!=='archived').length<8)throw new Error('At least eight existing owned assignments required')
  const choices=Object.entries(teachingChoices).find(([name])=>owner.name.startsWith(name))?.[1]
  if(!choices)throw new Error('Teaching-set mapping missing')
  const active=owner.workspace.data.syllabi.filter(s=>s.status==='active')
  if(active.length+choices.own.length!==4||choices.draft.length!==2)throw new Error('Teaching set requires four own and two complete drafts')
  for(const s of active)s.teachingSetRole='own'
  for(const [role,codes] of [['own',choices.own],['draft',choices.draft]] as const)for(const code of codes){
   const index=owner.workspace.data.syllabi.findIndex(s=>s.courseCode===code)
   if(index<0)throw new Error('Expected assigned course missing')
   const current=owner.workspace.data.syllabi[index]
   if(current.teachingSetVersion!==deliveryVersion){
    owner.workspace.data.syllabi[index]={...completeSyllabus(current),status:role==='own'?'checked':'drafted',teachingSetRole:role,teachingSetVersion:deliveryVersion,reviewedBy:role==='own'?'Codex agent for owner-authorized preparation':undefined}
    summary.preparedSyllabi++
   }
  }
  for(const syllabus of active){
   const projected=input.courses.find(c=>c.instructor_id===owner.id&&c.syllabus_id===syllabus.id&&c.active)
   if(!projected||!syllabus.approvedFile)throw new Error('Existing approved active offering required; never synthesize approval')
   summary.activeOfferings++
   for(let week=1;week<=5;week++)for(const [type,prefix] of [['material','mat'],['activity','act'],['assessment','assess']] as const){
    const id=`gen-${prefix}-${syllabus.id}-w${week}`,item=owner.workspace.data.content[id]
    if(!item||item.syllabusId!==syllabus.id||item.week!==week||item.type!==type||item.generationCheckpoint||item.attachedAt)throw new Error('Expected completed generated item missing or protected')
    if(type==='assessment'&&week>3)summary.protectedLaterAssessments++
    if(item.content.ai&&typeof item.content.ai==='object'&&(item.content.ai as Record<string,unknown>).deliveryVersion===deliveryVersion){summary.publishedItems++;continue}
    if(item.status!=='draft')throw new Error('Do not replace newer checked/published instructor work')
    const ai=item.content.ai as Record<string,unknown>|undefined
    const legacy=ai?.authoringVersion!==authoredVersion
    if(legacy&&(!ai||!['browser','openrouter','openai'].includes(String(ai.provider))))throw new Error('Manual content is protected')
    // Two old, unreviewed orientation drafts are replaced by the reviewed original pack.
    const content=legacy?{...authoredWeek(syllabus.courseCode,week)[type],subtitle:'Authored practice courseware',viewMode:type==='assessment'?'assessment':'document'}:item.content
    const assessment=type==='assessment'?demoAssessment(syllabus.courseCode,week):null
    if(assessment){
     const row=syllabus.courseOutline.find(r=>r.week===week)!,terms=new Set(assessment.questions[0].topic?.toLowerCase().match(/[a-z0-9]{3,}/g)||[])
     const topic=[...row.contents].filter(t=>t.trim()).sort((a,b)=>[...terms].filter(t=>b.toLowerCase().includes(t)).length-[...terms].filter(t=>a.toLowerCase().includes(t)).length)[0]
     if(!topic)throw new Error('Assessment requires an actual approved weekly topic')
     assessment.questions=assessment.questions.map(q=>({...q,topic}))
    }
    item.content={...content,...assessment,ai:{...(legacy?{}:ai),provider:'coding-session',model:'Codex-authored original draft',authoringVersion:authoredVersion,deliveryVersion,reviewRequired:false,reviewer:'Codex agent for the owner-authorized demonstration',sources:[],warning:'Original practice content reviewed by Codex for this owner-authorized demonstration; no retained-source RAG verification or independent human approval is asserted.'}}
    item.status='published';item.outOfAlignment=false
    delete item.releaseAt;delete item.dueAt
    summary.publishedItems++
   }
  }
  for(let n=0;n<2;n++)shares.push({sender:owner.id,recipient:owners[(ownerIndex+n+1)%owners.length].id,syllabus:active[n].id})
  workspaceData.parse(owner.workspace.data)
  if(Buffer.byteLength(JSON.stringify(owner.workspace.data))>2_985_000)throw new Error(`Insufficient workspace headroom: ${owner.name}`)
 }
 return {owners,shares,summary}
}
