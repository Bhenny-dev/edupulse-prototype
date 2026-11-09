import type { CourseInput } from '../../../server/contracts.js'

export type CoursewareStep = { key:string; type:'material'|'activity'|'assessment'; format:string; topics:string[]; planned:string }
/** One complete lesson, generated in small topic groups; additional items follow the actual outline. */
export function coursewarePlan(input:Pick<CourseInput,'topics'|'plan'>):CoursewareStep[] {
  const groups:string[][]=[]
  for(const topic of input.topics) {
    if(!groups.length || /^\s*[IVX]+[.)]\s/i.test(topic))groups.push([])
    groups.at(-1)!.push(topic)
  }
  const steps:CoursewareStep[]=[]
  for(const group of groups)for(let i=0;i<group.length;i+=3)steps.push({key:`lesson-${steps.length+1}`,type:'material',format:'lesson',topics:group.slice(i,i+3),planned:''})
  const activity=input.plan?.activities?.trim()||'',assessment=input.plan?.assessments?.trim()||''
  const hints=[assessment,...input.plan?.assessmentTypes||[]].join('; ')
  const quiz=/\b(?:quiz|quizzes|test|multiple[ -]choice|true[ /-]*false|short[ -]answer|written response)\b/i.test(hints)
  const assignment=assessment&&!/^(?:learning|assessment|n\/?a|none|not applicable)[.\s]*$/i.test(assessment)&&!quiz?assessment:!quiz&&/essay|journal|report|project|portfolio|presentation|lab output/i.test(hints)?hints:''
  const planned=[/^(?:none|n\/?a|not applicable|tbd)[.\s]*$/i.test(activity)?'':activity,assignment].filter(Boolean).join('\n')
  if(planned)steps.push({key:'activity',type:'activity',format:/\b(?:lab|laboratory|hands.on|practical)\b/i.test(planned)?'laboratory':/\b(?:discussion|discussions|debate)\b/i.test(planned)?'discussion':assignment?'assignment':'teaching activity',topics:input.topics,planned})
  if(quiz)steps.push({key:'assessment',type:'assessment',format:/true[ /-]*false/i.test(hints)?'true_false':/short[ -]answer|written response/i.test(hints)?'short_answer':'multiple_choice',topics:input.topics,planned:hints})
  return steps
}

export function plannedCoursewareTypes(row:{contents?:unknown[];activities?:string;assessments?:string;assessmentTypes?:string[]}) {
  const topics=(row.contents||[]).map(value=>typeof value==='string'?value:value&&typeof value==='object'&&'name' in value?String(value.name):'').filter(Boolean)
  return [...new Set(coursewarePlan({topics,plan:{activities:row.activities||'',assessments:row.assessments||'',assessmentTypes:row.assessmentTypes,teachingMaterials:[],resources:[]}}).map(step=>step.type))]
}
