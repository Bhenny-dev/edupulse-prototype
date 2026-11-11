import { plannedCoursewareTypes } from '../lib/rag/coursewarePlan'
import { generateCoursewareParts } from '../lib/aiClient'
import { buildCourseInput } from './courseInput'

export async function generateWeekDraft(syllabus, weekNumber, signal, request = '', options = {}) {
  const row = syllabus.courseOutline?.find(item => item.week === weekNumber)
  if (!row) throw new Error('The selected outline week no longer exists.')
  if (!row.ilos && /examination/i.test(row.assessments || '')) throw new Error('Examination weeks are excluded from automatic courseware generation.')
  const plannedTypes=plannedCoursewareTypes(row),types=plannedTypes.filter(type=>!options.skipTypes?.includes(type))
  if(!types.length)return {week:weekNumber,items:[],plannedTypes}
  const result = await generateCoursewareParts({...buildCourseInput(syllabus, weekNumber, request),...(options.skipSteps?{skipSteps:options.skipSteps}:{}),...(options.generatedTeaching?{generatedTeaching:options.generatedTeaching}:{})}, signal, types, options)
  const metadata = result => ({ requestId: result.requestId, provider: result.provider, model: result.model, sources: result.sources, trace: result.trace, warning: result.warning, coverage: result.coverage,
    // Summary only: metadata is saved with every item in the 3 MB workspace.
    verification: result.verification && { scope: 'sources', supported: result.verification.supported, total: result.verification.claims.length, method: result.verification.method },
    answerKey: result.answerKey && { checked: result.answerKey.checked, consistent: result.answerKey.consistent, issues: result.answerKey.issues },
    parts:result.parts, reviewRequired: true, planBased: true })
  const content = result.content
  const assessmentId=(assessment,index)=>{
    const sectionIndex=row.sections?.findIndex(section=>section.id===assessment.outlineSectionId)??-1
    const position=sectionIndex>=0?sectionIndex:index
    return `gen-assess-${syllabus.id}-w${weekNumber}${position?'-'+(position+1):''}`
  }
  const items = [
    ...(content.material?[{ id: `gen-mat-${syllabus.id}-w${weekNumber}`, type: 'material', content: { ...content.material, subtitle: 'AI draft — instructor review required', viewMode: 'document', ai: metadata(result.reviews?.material || result) } }]:[]),
    ...(content.activity?[{ id: `gen-act-${syllabus.id}-w${weekNumber}`, type: 'activity', content: { ...content.activity, subtitle: 'AI draft activity', viewMode: 'document', ai: metadata(result.reviews?.activity || result) } }]:[]),
    ...((content.assessments|| (content.assessment?[content.assessment]:[])).map((assessment,assessmentIndex)=>({ id: assessmentId(assessment,assessmentIndex), type: 'assessment', content: {
      ...assessment, subtitle: 'AI draft assessment', viewMode: 'assessment', ai: metadata(result.reviews?.assessment || result),
      description: 'Instructor must verify each answer and explanation before publishing.',
      questions: assessment.questions.map((q, i) => ({ ...q, id: `q${i + 1}`, options: q.options.map((text, index) => ({ label: String.fromCharCode(65 + index), text })) })),
      totalPoints: assessment.questions.length, timeLimit: 'No time limit specified',
    } }))),
  ]
  return { week: weekNumber, items, plannedTypes }
}
