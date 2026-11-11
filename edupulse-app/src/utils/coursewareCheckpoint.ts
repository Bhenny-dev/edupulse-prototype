import type { CourseInput } from '../../server/contracts.js'
import { courseOutput } from '../../server/contracts.js'
import { coursewarePlan } from '../lib/rag/coursewarePlan.js'
import type { StepResult } from '../lib/rag/courseware.js'
import { jsonValue } from './jsonValue.js'

export type CoursewareCheckpoint={version:1;fingerprint:string;types:('material'|'activity'|'assessment')[];results:StepResult[];total:number;expected:Record<string,unknown>}
export const checkpointId=(syllabusId:string,week:number)=>`generation-${syllabusId}-w${week}`
export async function coursewareFingerprint(input:CourseInput,types:CoursewareCheckpoint['types']) {
  const bytes=new TextEncoder().encode(jsonValue({version:1,input,types,plan:coursewarePlan(input)}))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('')
}
/** Stored checkpoints are data, not permission to skip a changed plan or trust malformed content. */
export async function checkpointResults(input:CourseInput,saved:CoursewareCheckpoint|undefined,fingerprint:string) {
  if(saved?.version!==1||saved.fingerprint!==fingerprint||!Array.isArray(saved.results)||!Array.isArray(saved.types))return []
  const {teachingContentIssues}=await import('../lib/rag/courseware.js')
  const plan=coursewarePlan(input).filter(part=>saved.types.includes(part.type))
  const seen=new Set<string>()
  return saved.results.filter(result=>{
    const part=plan.find(part=>part.key===result?.step?.key)
    if(!part||seen.has(part.key)||jsonValue(part)!==jsonValue(result.step))return false
    if(!courseOutput.shape[part.type].safeParse(result.content?.[part.type]).success||teachingContentIssues(result.content,part).length||!Array.isArray(result.sources)||!Array.isArray(result.trace)||!Array.isArray(result.coverage?.items)||!Array.isArray(result.verification?.claims)||!result.answerKey)return false
    seen.add(part.key);return true
  })
}
export async function checkpointItem(input:CourseInput,syllabusId:string,saved:CoursewareCheckpoint) {
  const {assembleCourseware}=await import('../lib/rag/courseware.js')
  const assembled=assembleCourseware(input,saved.results,saved.types,true)
  const title=`Week ${input.week}: unfinished draft (${saved.results.length}/${saved.total} parts)`
  const sections=[...(assembled.content.material?.sections||[]),...(assembled.content.activity?.sections||[])]
  for(const assessment of assembled.content.assessments|| (assembled.content.assessment?[assembled.content.assessment]:[]))sections.push({heading:assessment.title,body:assessment.questions.map((q,i)=>`${i+1}. ${q.text}`).join('\n\n')})
  return {syllabusId,week:input.week,type:'material',status:'draft',title,generationCheckpoint:saved,content:{title,subtitle:'Unfinished AI draft — resume generation before review or release',sections,viewMode:'document'}}
}
