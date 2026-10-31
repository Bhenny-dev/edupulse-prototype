import { syllabusPatch, contentPatch, type EditorSnapshot } from './editorTools.js'
import { ALL_FIELDS, DRAFT_REQUEST } from './skills.js'

/** Some text models return a JSON Patch envelope. Translate only whole-field
 * replacements into inert data; never interpret arbitrary paths or operations. */
export function normalizeDraft(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const record = raw as Record<string, unknown>
  let fields = record
  if (Object.keys(record).length === 1 && record.patch && typeof record.patch === 'object' && !Array.isArray(record.patch)) fields = record.patch as Record<string, unknown>
  if (Object.keys(record).every(key => ['operation', 'op', 'path', 'value'].includes(key)) && Object.keys(record).length === 3 && (record.operation || record.op) === 'replace' && typeof record.path === 'string' && /^\/(?:institutionalContext|programOutcomes|courseOutline|courseRequirements|gradingSystem|coursePolicy|books|onlineReferences|title|sections|questions)$/.test(record.path) && 'value' in record) fields = { [record.path.slice(1)]: record.value }
  // A single prose item is the same content as a one-item list. Preserve it
  // verbatim; schema/scope checks still reject unsupported fields and values.
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, ['programOutcomes', 'courseRequirements', 'coursePolicy'].includes(key) && typeof value === 'string' ? [value] : value]))
}

/** Shared by hosted and on-device planning. A model response is never a save. */
type DraftInput = { editor: EditorSnapshot; message: string; section: string | null; context: string }
export const wholeSyllabusDraft = (input: Omit<DraftInput, 'editor'> & { editor: EditorSnapshot | null }) => input.editor?.kind === 'syllabus' && DRAFT_REQUEST.test(input.message) && (!input.section || input.section === 'all') && !/Selected section fields:|Editable field path:/i.test(input.context) && (ALL_FIELDS.test(input.message) || /\bsyllabus\b/i.test(input.message))
export function validateDraft(raw: unknown, input: DraftInput, sources: string, options: { fields?: string[]; completeOutline?: boolean } = {}) {
  const shape = input.editor.kind === 'syllabus' ? syllabusPatch : contentPatch
  const parsed = shape.safeParse(normalizeDraft(raw))
  const issue = (code: string, details: string[]) => ({ error: { code, details: details.slice(0, 20) } } as const)
  if (!parsed.success) return issue('TOOL_OUTPUT_INVALID', parsed.error.issues.map(item => `${item.path.join('.')}: ${item.message}`))
  const patch = parsed.data
  if (input.section && input.section !== 'all' && Object.keys(patch).some(key => key !== input.section)) return issue('TOOL_SCOPE_MISMATCH', ['Return only the requested section: ' + input.section])
  const gaps: string[] = []
  const whole = wholeSyllabusDraft(input)
  if (options.fields) {
    if (Object.keys(patch).some(key => !options.fields!.includes(key))) return issue('TOOL_SCOPE_MISMATCH', ['Return only these fields: ' + options.fields.join(', ')])
    gaps.push(...options.fields.filter(key => !(key in patch)))
    for (const key of options.fields.filter(key => ['programOutcomes', 'courseRequirements', 'coursePolicy'].includes(key))) if (key in patch && !((patch as Record<string, unknown>)[key] as string[]).some(text => text.trim())) gaps.push(`nonempty ${key}`)
  }
  if (whole) {
    gaps.push(...['programOutcomes', 'courseOutline', 'courseRequirements', 'gradingSystem', 'coursePolicy', 'books', 'onlineReferences'].filter(key => !(key in patch)))
    for (const key of ['programOutcomes', 'courseRequirements', 'coursePolicy'] as const) if (key in patch && !((patch as Record<string, unknown>)[key] as string[]).some(text => text.trim())) gaps.push(`nonempty ${key}`)
    if ('gradingSystem' in patch && !patch.gradingSystem?.trim()) gaps.push('gradingSystem or explicit pending status')
  }
  if ('courseOutline' in patch && patch.courseOutline) {
    const before = input.editor.data.courseOutline as { week: number; assessments?: string }[] | undefined
    // Even a section edit is an array replacement. Never silently lose a week.
    if (before?.length) {
      if (patch.courseOutline.some(row => !before.some(old => old.week === row.week))) gaps.push('retain exactly the existing week numbers')
      for (const old of before) {
        const row = patch.courseOutline.find(item => item.week === old.week)
        if (!row) { gaps.push(`retain week ${old.week}`); continue }
        if (/examination/i.test(old.assessments || '') && !row.assessments?.includes(old.assessments!)) gaps.push(`preserve exam label for week ${old.week}`)
        if ((whole || options.completeOutline) && !/examination/i.test(old.assessments || '')) {
          const missing = [!row.ilos.trim() && 'ilos (a measurable learning outcome)', !row.contents.some(text => text.trim()) && 'contents', !row.activities?.trim() && 'activities', !row.assessments?.trim() && 'assessments', !row.teachingMaterials?.some(text => text.trim()) && 'teachingMaterials', !row.assessmentTypes?.some(text => text.trim()) && 'assessmentTypes'].filter(Boolean)
          if (missing.length) gaps.push(`week ${old.week}: generate nonempty ${missing.join(', ')}`)
        }
      }
    } else if (whole && !patch.courseOutline.length) gaps.push('nonempty courseOutline')
  }
  if (gaps.length) return issue('TOOL_OUTPUT_INCOMPLETE', gaps)
  const knownUrls = new Set((sources.match(/https?:\/\/[^\s"<>\\]+/g) || []).map(value => value.replace(/[),.;]+$/, '')))
  const unknownUrls = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(unknownUrls)
    if (!value || typeof value !== 'object') return false
    return Object.entries(value).some(([key, item]) => key === 'url' && typeof item === 'string' ? Boolean(item && !knownUrls.has(item)) : unknownUrls(item))
  }
  if (unknownUrls(patch)) return issue('TOOL_UNVERIFIED_SOURCE', ['Use only exact URLs from the supplied context and research; remove invented links.'])
  if ('books' in patch && patch.books?.some(book => [book.title, book.authors, book.year, book.publisher].some(value => value && !sources.toLowerCase().includes(value.toLowerCase())))) return issue('TOOL_UNVERIFIED_SOURCE', ['Use only book metadata explicitly present in supplied sources, or leave books empty.'])
  return { patch } as const
}
