import { z } from 'zod'
import { ApiError } from '../../server/contracts.js'
import { validateDraft, wholeSyllabusDraft, scheduledSyllabusDraft } from './draftValidation.js'
import { parseModelJson } from './skills.js'
import type { EditorSnapshot, syllabusPatch } from './editorTools.js'

type Input = { editor: EditorSnapshot; message: string; section: string | null; context: string }
type Row = { week: number; assessments?: string; [key: string]: unknown }
type Failure = { code: string; details: string[] }
export type DraftState = { next: number; patch: Record<string, unknown>; repair?: Failure }
export type DraftExecution = { state: DraftState; batchSize: number }
class PendingDraft {
  constructor(public state: DraftState) {}
}

/** Bounded generation stages assemble ONE proposal. No stage applies or saves. */
export async function draftHarness(input: Input, payload: Record<string, unknown>, system: string, sources: string, generate: (system: string, prompt: string, signal: AbortSignal, json: boolean) => Promise<string>, signal: AbortSignal, contextLimit: number, execution?: DraftExecution) {
  const previous = structuredClone(execution?.state.patch || {})
  const combined: Record<string, unknown> = {}
  let cursor = 0, generatedStages = 0
  const pause = (next: number, repair?: Failure): never => { throw new PendingDraft({ next, patch: structuredClone(combined), ...(repair ? { repair } : {}) }) }
  const stage = async (target: Input, data: Record<string, unknown>, fields?: string[], completeOutline = false) => {
    const index = cursor++
    if (execution && index < execution.state.next) {
      const patch = Object.fromEntries((fields || []).map(field => [field, field === 'courseOutline' ? (previous.courseOutline as Row[]).filter(row => (target.editor.data.courseOutline as Row[]).some(old => old.week === row.week)) : previous[field]]))
      return { patch: patch as z.infer<typeof syllabusPatch>, generated: true as const }
    }
    if (execution && generatedStages) pause(index)
    const prompt = JSON.stringify(data)
    if (prompt.length > contextLimit) throw new ApiError(400, 'CONTEXT_LIMIT', 'This exact section and its sources exceed the model context budget. Select a smaller section or source excerpt.')
    let failure = execution?.state.repair || { code: 'TOOL_OUTPUT_INVALID', details: ['Return a complete JSON object with the requested fields.'] }
    for (let attempt = execution?.state.repair ? 1 : 0; attempt < 2; attempt++) {
      signal.throwIfAborted()
      const scope = fields ? `\nThis is one stage of a larger task. Return ONLY ${fields.join(', ')}. Do not return other sections. All requested fields must contain useful proposed content; existing empty values are blanks to FILL. ${completeOutline
        ? `Complete every teaching field for exactly these weeks: ${((target.editor.data.courseOutline || []) as Row[]).map(row => row.week).join(', ')}. ilos is a nonempty measurable learning outcome starting with an action verb for EACH week. Follow the preceding topics and program outcomes without repeating earlier weeks. Example shape: {"courseOutline":[{"week":1,"ilos":"Evaluate a focused research question.","contents":["Research questions"],"activities":"Compare two research questions and justify the stronger one.","assessments":"Written comparison with criteria.","teachingMaterials":["Case studies"],"assessmentTypes":["Written work"],"resources":[]}]}. Adapt the content and week numbers to the actual course.`
        : fields.includes('programOutcomes')
          ? 'Return three arrays of plain strings. Example shape: {"programOutcomes":["Evaluate competing methods."],"courseRequirements":["Proposed for instructor review: methods portfolio."],"coursePolicy":["Proposed for instructor review: cite sources and protect participant privacy."]}. Adapt the content to this course. Do not return grading or outline fields.'
          : 'Return {"books":[{"title":"exact source title","authors":"exact source authors","year":"exact source year","publisher":"exact source publisher"}],"onlineReferences":[{"title":"source title","url":"exact source URL"}]}. Include only supplied or retrieved entries; use empty arrays for unavailable entries.'}` : ''
      const repair = attempt ? `\nRepair the previous attempt: ${failure.details.join('; ').slice(0, 1500)}. Return the complete corrected fields. No changes have been applied.` : ''
      let response = ''
      try { response = await generate(system + scope + repair, prompt, signal, true) }
      catch (error) {
        if (!(execution && !attempt && error instanceof ApiError && error.code === 'INCOMPLETE_RESPONSE')) throw error
        pause(index, { code: error.code, details: ['The prior answer was truncated. Be concise and complete only the requested fields and weeks.'] })
      }
      generatedStages++
      let raw: unknown
      try { raw = parseModelJson(response) }
      catch { failure = { code: 'TOOL_OUTPUT_INVALID', details: ['Return one complete JSON object without prose or code fences.'] }; if (execution && !attempt) pause(index, failure); continue }
      const clarification = z.object({ needsClarification: z.string().min(1).max(500) }).strict().safeParse(raw)
      if (clarification.success) return { clarification: clarification.data.needsClarification, generated: true as const }
      const checked = validateDraft(raw, target, sources, { fields, completeOutline })
      if ('error' in checked) { failure = checked.error; if (execution && !attempt) pause(index, failure); continue }
      return { patch: checked.patch, generated: true as const }
    }
    throw new ApiError(502, failure.code, `The model could not produce a complete valid edit (${failure.details.slice(0, 3).join('; ')}). Nothing changed. Try a smaller section or another model.`)
  }
  if (!scheduledSyllabusDraft(input)) return stage(input, payload)
  try {
    const whole = wholeSyllabusDraft(input)
    const before = input.editor.data
    const weeks = before.courseOutline as Row[] | undefined
    if (!weeks?.length) throw new ApiError(400, 'OUTLINE_REQUIRED', 'Select a course with its teaching-week schedule before drafting the complete syllabus.')
    const identity = Object.fromEntries(['courseCode', 'courseTitle', 'courseDescription', 'courseInfo'].filter(key => before[key] !== undefined).map(key => [key, before[key]]))
    const generateFields = async (fields: string[], data: Record<string, unknown>, completeOutline = false) => {
      const target = { ...input, section: fields.length === 1 ? fields[0]! : 'all', context: `${input.context}\nSelected section fields: ${fields.join(', ')}.`, editor: { ...input.editor, data: { ...identity, ...data } } }
      const progression = completeOutline ? { programOutcomes: combined.programOutcomes || before.programOutcomes, precedingTopics: (combined.courseOutline as Row[] || []).map(row => ({ week: row.week, contents: row.contents })), totalWeeks: weeks.length } : undefined
      const task = `Draft only ${fields.join(', ')}${completeOutline ? ` for weeks ${(data.courseOutline as Row[]).map(row => row.week).join(', ')}` : ''}. Follow the original request's subject, language and source restrictions within this stage. Other sections and weeks are handled separately.`
      return stage(target, { ...payload, ...target, message: task, originalRequest: input.message, requestedFields: fields, ...(progression ? { progression } : {}) }, fields, completeOutline)
    }
    if (whole) {
      const core = ['programOutcomes', 'courseRequirements', 'coursePolicy']
      const general = await generateFields(core, Object.fromEntries(core.map(key => [key, before[key] || []])))
      if ('clarification' in general) return general
      Object.assign(combined, general.patch)
      for (const key of ['courseRequirements', 'coursePolicy']) {
        const existing = before[key] as string[] | undefined
        combined[key] = (combined[key] as string[]).map(text => existing?.includes(text) || /^Proposed for instructor review:/i.test(text) ? text : `Proposed for instructor review: ${text}`)
      }
      // Approval facts are not generated. Keep the supplied grading rule, or expose
      // its missing official source explicitly while continuing educational fields.
      combined.gradingSystem = typeof before.gradingSystem === 'string' && before.gradingSystem.trim() ? before.gradingSystem : 'Pending approved institutional grading formula.'
    }
    const completed = new Map<number, Row>()
    const teaching = weeks.filter(row => !/examination/i.test(row.assessments || ''))
    for (const row of weeks.filter(row => /examination/i.test(row.assessments || ''))) completed.set(row.week, structuredClone(row))
    const batchSize = execution?.batchSize || 4
    for (let start = 0; start < teaching.length; start += batchSize) {
      const batch = teaching.slice(start, start + batchSize)
      const result = await generateFields(['courseOutline'], { courseOutline: batch }, true)
      if ('clarification' in result) return result
      if ('courseOutline' in result.patch) for (const row of result.patch.courseOutline || []) completed.set(row.week, row)
      combined.courseOutline = [...completed.values()].sort((a, b) => a.week - b.week)
    }
    combined.courseOutline = weeks.map(row => completed.get(row.week))
    const attachments = payload.attachments as unknown[] | undefined
    const research = payload.research as unknown[] | undefined
    if (whole && (research?.length || attachments?.length)) {
      const result = await generateFields(['books', 'onlineReferences'], { books: before.books || [], onlineReferences: before.onlineReferences || [] })
      if ('clarification' in result) return result
      Object.assign(combined, result.patch)
    } else if (whole) { combined.books = before.books || []; combined.onlineReferences = before.onlineReferences || [] }
    const checked = validateDraft(combined, input, sources, { completeOutline: true })
    if ('error' in checked) throw new ApiError(502, checked.error.code, 'The assembled syllabus did not pass its final completeness and source checks. Nothing changed.')
    return { patch: checked.patch, generated: true as const }
  } catch (error) {
    if (error instanceof PendingDraft) return { pending: error.state, generated: generatedStages > 0 }
    throw error
  }
}
