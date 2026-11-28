export const ASSESSMENT_FORMATS = [
 {id:'multiple_choice',label:'Multiple choice'},
 {id:'true_false',label:'True or false'},
 {id:'enumeration',label:'Enumeration'},
 {id:'identification',label:'Identification'},
 {id:'essay',label:'Essay'},
 {id:'matching',label:'Matching type'},
 {id:'follow_along',label:'Follow-along / Step-by-step documentation guide or criteria'},
] as const
export const ASSESSMENT_CHOICES = [{layer:'Assessment types',items:ASSESSMENT_FORMATS.map(format=>format.label)}]
export const writtenFormat=(format:string)=>!['multiple_choice','true_false'].includes(format)
export const assessmentLabel=(format:string)=>ASSESSMENT_FORMATS.find(item=>item.id===format)?.label||'Written response'

export function assessmentTitle(questions: {type?: string; responseFormat?: string}[] = []) {
 const formats = new Set(questions.map(question => question.responseFormat || question.type || 'multiple_choice'))
 if (formats.size > 1) return 'Mixed-format assessment'
 const format = [...formats][0]
 return format === 'follow_along' ? 'Step-by-step documentation' : format ? assessmentLabel(format) : 'Assessment'
}
export function requestedAssessmentFormat(text:string) {
 const rules:[string,RegExp][]=[['follow_along',/follow.along|step.by.step|documentation guide/],['multiple_choice',/multiple.choice|\bmcq\b/],['true_false',/true.{0,5}false/],['enumeration',/enumeration|enumerate/],['identification',/identification|identify the/],['matching',/matching/],['essay',/essay|written response|short.answer/]]
 return rules.find(([,pattern])=>pattern.test(text.toLowerCase()))?.[0]||(/\bcriteria\b/i.test(text)?'follow_along':undefined)
}

/** Published options may be strings or the labeled objects saved by the editor. */
export function questionOptionText(question: { options?: (string | { text?: string })[] } | undefined, index: unknown) {
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) return ''
  const option = question?.options?.[index]
  return (typeof option === 'string' ? option : option?.text) || ''
}
