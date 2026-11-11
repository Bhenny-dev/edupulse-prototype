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
export function requestedAssessmentFormat(text:string) {
 const rules:[string,RegExp][]=[['follow_along',/follow.along|step.by.step|documentation guide/],['multiple_choice',/multiple.choice|\bmcq\b/],['true_false',/true.{0,5}false/],['enumeration',/enumeration|enumerate/],['identification',/identification|identify the/],['matching',/matching/],['essay',/essay|written response|short.answer/]]
 return rules.find(([,pattern])=>pattern.test(text.toLowerCase()))?.[0]||(/\bcriteria\b/i.test(text)?'follow_along':undefined)
}
