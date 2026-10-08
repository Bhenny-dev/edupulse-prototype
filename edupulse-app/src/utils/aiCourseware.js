import { generateCourseDraft } from '../lib/aiClient'
import { buildCourseInput } from './courseInput'

export async function generateWeekDraft(syllabus, weekNumber, signal) {
  const row = syllabus.courseOutline?.find(item => item.week === weekNumber)
  if (!row) throw new Error('The selected outline week no longer exists.')
  if (!row.ilos && /examination/i.test(row.assessments || '')) return { week: weekNumber, items: [] }
  const result = await generateCourseDraft(buildCourseInput(syllabus, weekNumber), signal)
  const metadata = { requestId: result.requestId, provider: result.provider, model: result.model, sources: result.sources, trace: result.trace, warning: result.warning, coverage: result.coverage,
    // Summary only: metadata is saved with every item in the 3 MB workspace.
    verification: result.verification && { supported: result.verification.supported, total: result.verification.claims.length, method: result.verification.method },
    answerKey: result.answerKey && { checked: result.answerKey.checked, consistent: result.answerKey.consistent, issues: result.answerKey.issues },
    reviewRequired: true }
  const content = result.content
  const items = [
    { id: `gen-mat-${syllabus.id}-w${weekNumber}`, type: 'material', content: { ...content.material, subtitle: 'AI draft — instructor review required', viewMode: 'document', ai: metadata } },
    { id: `gen-act-${syllabus.id}-w${weekNumber}`, type: 'activity', content: { ...content.activity, subtitle: 'AI draft activity', viewMode: 'document', ai: metadata } },
    { id: `gen-assess-${syllabus.id}-w${weekNumber}`, type: 'assessment', content: {
      ...content.assessment, subtitle: 'AI draft assessment', viewMode: 'assessment', ai: metadata,
      description: 'Instructor must verify each answer and explanation before publishing.',
      questions: content.assessment.questions.map((q, i) => ({ ...q, id: `q${i + 1}`, options: q.options.map((text, index) => ({ label: String.fromCharCode(65 + index), text })) })),
      totalPoints: content.assessment.questions.length * 10, timeLimit: `${content.assessment.questions.length * 5} minutes`,
    } },
  ]
  return { week: weekNumber, items }
}
