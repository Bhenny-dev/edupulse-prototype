import {requestedAssessmentFormat} from '../../data/assessmentFormats.js'
import type { CourseInput } from '../../../server/contracts.js'

export type CoursewareStep = { key:string; type:'material'|'activity'|'assessment'; format:string; sectionId?:string; topics:string[]; planned:string }
export const COURSEWARE_PLAN_VERSION=3
/** One complete lesson, generated in small topic groups; additional items follow the actual outline. */
export function coursewarePlan(input:Pick<CourseInput,'topics'|'plan'|'request'|'sections'|'outcomes'|'skipSteps'>):CoursewareStep[] {
  if((input.sections?.length||0)>1){
   let lesson=0
   return input.sections!.flatMap((section,index)=>coursewarePlan({...input,skipSteps:undefined,sections:[section],topics:section.contents.filter(text=>text.trim()),outcomes:section.ilos,plan:{...input.plan,activities:section.activities,assessments:section.assessments,assessmentTypes:section.assessmentTypes,teachingMaterials:input.plan?.teachingMaterials||[],resources:input.plan?.resources||[]}}).map(part=>({...part,sectionId:section.id,key:part.type==='material'?`lesson-${++lesson}`:`${part.type}-${index+1}`}))).filter(part=>!input.skipSteps?.includes(part.key))
  }
  const groups:string[][]=[]
  for(const topic of input.topics) {
    if(!groups.length || /^\s*[IVX]+[.)]\s/i.test(topic))groups.push([])
    groups.at(-1)!.push(topic)
  }
  const steps:CoursewareStep[]=[]
  for(const group of groups)for(const topic of group)steps.push({key:`lesson-${steps.length+1}`,type:'material',format:'lesson',topics:[topic],planned:''})
  const activity=input.plan?.activities?.trim()||'',assessment=input.plan?.assessments?.trim()||''
  const hints=[assessment,...input.plan?.assessmentTypes||[]].join('; ')
  const modern=Boolean(input.sections?.length)
  const requested=requestedAssessmentFormat(input.request||'')
  const selected=requested||requestedAssessmentFormat((input.plan?.assessmentTypes||[]).join('; '))||requestedAssessmentFormat(assessment)
  const quiz=modern||Boolean(requested)||/\b(?:quiz|quizzes|test|multiple[ -]choice|true[ /-]*false|short[ -]answer|written response)\b/i.test(hints)
  const assignment=assessment&&!/^(?:learning|assessment|n\/?a|none|not applicable)[.\s]*$/i.test(assessment)&&!quiz?assessment:!quiz&&/essay|journal|report|project|portfolio|presentation|lab output/i.test(hints)?hints:''
  const planned=[/^(?:none|n\/?a|not applicable|tbd)[.\s]*$/i.test(activity)?'':activity,assignment].filter(Boolean).join('\n')
  if(planned)steps.push({key:'activity',type:'activity',format:/\b(?:lab|laboratory|hands.on|practical)\b/i.test(planned)?'laboratory':/\b(?:discussion|discussions|debate)\b/i.test(planned)?'discussion':assignment?'assignment':'teaching activity',topics:input.topics,planned})
  if(quiz){
   const format=!modern&&!requested&&/short[ -]answer|written response/i.test(hints)?'short_answer':selected||(/\b(?:justify|evaluate|critique)\b/i.test(input.outcomes||'')?'essay':/\b(?:implement|create|demonstrate|configure)\b/i.test(activity)?'follow_along':'multiple_choice')
   steps.push({key:'assessment',type:'assessment',format,topics:input.topics,planned:hints||'Choose questions suited to the generated teaching content and measurable outcomes.'})
  }
  return steps.filter(part=>!input.skipSteps?.includes(part.key)).map(part=>input.sections?.[0]?{...part,sectionId:input.sections[0].id}:part)
}

export function plannedCoursewareTypes(row:{contents?:unknown[];activities?:string;assessments?:string;assessmentTypes?:string[];sections?:CourseInput['sections'];ilos?:string}) {
  const topics=(row.contents||[]).map(value=>typeof value==='string'?value:value&&typeof value==='object'&&'name' in value?String(value.name):'').filter(Boolean)
  return [...new Set(coursewarePlan({topics,sections:row.sections,outcomes:row.ilos||'',plan:{activities:row.activities||'',assessments:row.assessments||'',assessmentTypes:row.assessmentTypes,teachingMaterials:[],resources:[]}}).map(step=>step.type))]
}

/** Teaching documents/guides are combined by type; each scope keeps its own assessment. */
export function missingCoursewareCount(row:Parameters<typeof plannedCoursewareTypes>[0],items:{type:string;content?:{outlineSectionId?:string}}[]) {
 return plannedCoursewareTypes(row).reduce((count,type)=>count+(type==='assessment'&&(row.sections?.length||0)>1
  ? row.sections!.filter(section=>!items.some(item=>item.type===type&&item.content?.outlineSectionId===section.id)).length
  : Number(!items.some(item=>item.type===type))),0)
}
