import type { Evidence } from '../src/lib/rag/types.js'

/** How an account's own records are indexed for System Search. A whole syllabus or lesson as one passage
 *  buries the answer to "what is in week 5" or "what is the late work policy" under everything else in
 *  the record, so a record is split where a person would look for it: the overview, each syllabus field,
 *  each teaching week, each lesson section. Every passage keeps a breadcrumb title (course > week 5) and,
 *  where the page can open there, a link to that place. Text is only what the record holds. */
type Destination = Evidence['destination']

export const evidence = (id: string, title: string, text: string, origin: Evidence['origin'] = 'account', destination?: Destination): Evidence => ({ ...(destination ? { destination } : {}), id, documentId: null, title, text, page: null, section: null, flagged: false, origin, method: origin === 'public-guide' ? 'keyword' : 'provided', similarity: null, relevance: null, rrf: 1, query: '' })
export const label = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
const HIDDEN = /^(?:id|.*Id|approvedFile|history|provenance|correctIndex|answerKey|password|token|apiKey|base64|data|courseOutline)$/i

export function prose(value: unknown, depth = 0): string {
  if (depth > 5) return ''
  if (typeof value === 'string') return value.slice(0, 12000)
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (Array.isArray(value)) return value.map(item => prose(item, depth + 1)).filter(Boolean).join('\n')
  if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => !HIDDEN.test(key)).map(([key, item]) => {
    const text = prose(item, depth + 1)
    return text ? `${['parsed', 'sections', 'content'].includes(key) ? '' : label(key) + ': '}${text}` : ''
  }).filter(Boolean).join('\n')
  return ''
}

const withQuery = (destination: Destination | undefined, query: string): Destination | undefined => destination && { ...destination, path: `${destination.path}${destination.path.includes('?') ? '&' : '?'}${query}` }
const SYLLABUS_FIELDS: [string, string][] = [['institutionalContext', 'Institutional context'], ['programOutcomes', 'Program outcomes'], ['courseRequirements', 'Course requirements'], ['gradingSystem', 'Grading system'], ['coursePolicy', 'Course policies'], ['books', 'Books'], ['onlineReferences', 'Online references']]

/** One passage per teaching week, in the same wording the whole-outline text used. */
export function weekPassages(id: string, title: string, outline: unknown, destination?: Destination): Evidence[] {
  return (Array.isArray(outline) ? outline : []).flatMap((row: Record<string, unknown>) => {
    const text = Object.entries(row).filter(([key]) => key !== 'week').map(([key, value]) => {
      const part = prose(value).replace(/\n/g, '; ')
      return part ? `Week ${row.week} ${key === 'ilos' ? 'learning outcomes' : label(key)}: ${part}` : ''
    }).filter(Boolean).join('\n')
    return text && Number.isInteger(row.week) ? [evidence(`${id}:week-${row.week}`, `${title} > Week ${row.week}`, text, 'account', withQuery(destination, `week=${row.week}`))] : []
  })
}

/** An assigned course: its overview line and its weeks. */
export function coursePassages(id: string, title: string, overview: string, outline: unknown, destination?: Destination): Evidence[] {
  return [evidence(id, title, overview, 'account', destination), ...weekPassages(id, title, outline, destination)]
}

/** A syllabus: the record's own details, each field with content, and each week. */
export function syllabusPassages(id: string, title: string, row: Record<string, unknown>, destination?: Destination): Evidence[] {
  const header = `${row.courseCode}: ${row.courseTitle}. Status: ${row.status}.`
  const rest = Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'courseOutline' && !SYLLABUS_FIELDS.some(([field]) => field === key)))
  const fields = SYLLABUS_FIELDS.flatMap(([key, name]) => { const text = prose(row[key]); return text ? [evidence(`${id}:${key}`, `${title} > ${name}`, `${header}\n${name}:\n${text}`, 'account', destination)] : [] })
  return [evidence(id, title, `${header}\n${prose(rest)}`, 'account', destination), ...fields, ...weekPassages(id, title, row.courseOutline, destination)]
}

/** A lesson or release: one passage per section and one for each of its other parts. */
export function materialPassages(id: string, title: string, content: Record<string, unknown> | undefined, destination?: Destination): Evidence[] {
  const sections = (Array.isArray(content?.sections) ? content.sections : []).flatMap((section: { heading?: unknown; body?: unknown }, index: number) => {
    const text = `${prose(section.heading)}\n${prose(section.body)}`.trim()
    return text ? [evidence(`${id}:section-${index + 1}`, `${title} > ${prose(section.heading) || `Section ${index + 1}`}`, text, 'account', destination)] : []
  })
  const parts = (['concepts', 'examples', 'applications'] as const).flatMap(key => { const text = prose(content?.[key]); return text ? [evidence(`${id}:${key}`, `${title} > ${label(key).replace(/^./, first => first.toUpperCase())}`, text, 'account', destination)] : [] })
  // The title alone stands for the record; a list of every heading would outrank the section that answers.
  return [evidence(id, title, title, 'account', destination), ...sections, ...parts]
}
