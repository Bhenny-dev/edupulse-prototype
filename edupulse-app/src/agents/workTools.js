import { mergeStudents, studentKey } from '../utils/rosterParser'
import { ALL_FIELDS, DRAFT_REQUEST, WEB_REQUEST } from './skills'
export { ALL_FIELDS, DRAFT_REQUEST, WEB_REQUEST }

export const EDIT_REQUEST = /make\s+(?:it|this|these|the.*?)\s+(?:more\s+)?(?:accurate|complete|correct)|\b(?:update|modify|change|revise|edit|fix|correct|adjust|improve|rewrite|rephrase|shorten|expand|simplify|polish|insert|append|replace|remove|delete|integrate|fill|record)\b/i
export const ACTION_REQUEST = /\b(?:redirect|navigate|walkthrough|guide\s+me|walk\s+me|take\s+me|open|generate|create|draft|write|compose|fill|populate|complete|build|change|correct|adjust|rephrase|shorten|expand|simplify|polish|update|modify|revise|edit|fix|improve|accurate|complete|rewrite|insert|append|replace|remove|delete|integrate)\b/i
export function sectionFor(text) {
  if (ALL_FIELDS.test(text)) return 'all'
  for (const [field, pattern] of [
    ['courseDescription', /course\s+description|section\s*2/i], ['institutionalContext', /institutional context|vision|mission|core values|section\s*3/i], ['programOutcomes', /program\s+outcomes?|section\s*4/i],
    ['courseOutline', /course\s+outline|weekly\s+(?:outline|plan)|section\s*5/i], ['courseRequirements', /course\s+requirements?/i],
    ['gradingSystem', /grading\s+(?:system|policy|rules?)/i], ['coursePolicy', /course\s+polic(?:y|ies)/i],
    ['books', /textbooks?|\bbooks?\b/i], ['onlineReferences', /online\s+references?|web\s+references?/i],
  ]) if (pattern.test(text)) return field
  return 'all'
}
export function sourceSyllabusPatch(parsed) {
  const section = parsed.sections, patch = {}
  if (section[2].parsed.institutionalContext) patch.institutionalContext = Object.fromEntries(Object.entries(section[2].parsed.institutionalContext).map(([unit, fields]) => [unit, Object.fromEntries(Object.entries(fields).filter(([,value]) => Array.isArray(value) ? value.length : String(value || '').trim()))]))
  if (section[3].parsed.programOutcomes?.length) patch.programOutcomes = section[3].parsed.programOutcomes
  if (section[4].parsed.courseOutline?.length) patch.courseOutline = section[4].parsed.courseOutline
  for (const field of ['courseRequirements', 'gradingSystem', 'coursePolicy']) if (section[5].parsed[field]?.length) patch[field] = section[5].parsed[field]
  for (const field of ['books', 'onlineReferences']) if (section[6].parsed[field]?.length) patch[field] = section[6].parsed[field]
  return patch
}
export function workProposal({ message, attachments, role, editor, registrations, catalog, section = 'all', target = null, scopeFields }) {
  const targetSection = sectionFor(message) === 'all' ? section : sectionFor(message)
  const source = attachments.find(attachment => attachment.syllabus)
  const sourceCorrection = source && /\b(?:accurate|incomplete|re.?extract|restore|not correct)\b/i.test(message) && !/\b(?:generate|create|draft|write|compose|populate)\b/i.test(message)
  const correctFromSource = sourceCorrection && /\b(?:uploaded?|file|source|pdf|document)\b/i.test(message)
  const materialDraft = /\b(?:creat|generat|draft|build|mak|prepar)\w*\b/i.test(message) && /learning materials?|lessons?|courseware|lecture|quiz/i.test(message)
  if (materialDraft && !target) return null
  if (target && editor && !correctFromSource && (DRAFT_REQUEST.test(message) || EDIT_REQUEST.test(message)) && !/\b(?:import|extract|restore|copy\s+from)\b/i.test(message)) return role === 'instructor' ? { type: 'editor-edit', request: message, editor, section: target.path.split('.')[0], target, scopeFields, attachments } : { type: 'notice', text: 'An authorized instructor view is required to draft academic edits.' }
  // Generating new content uses the mounted editor and selected course. A retained
  // source can inform that draft, but must not hijack it into another file import.
  const authoring = editor && DRAFT_REQUEST.test(message) && !/\b(?:import|extract|restore|copy\s+from)\b/i.test(message) && (target || /\b(?:syllabus|fields?|sections?|outline|outcomes?|requirements?|references?|content|it|this)\b/i.test(message))
  if (authoring && !sourceCorrection) return role === 'instructor' ? { type: 'editor-edit', request: message, editor, section: target ? target.path.split('.')[0] : editor.kind === 'syllabus' ? targetSection : 'all', target, scopeFields, attachments } : { type: 'notice', text: 'An authorized instructor view is required to draft changes to academic content.' }
  if (source && (!message || /\b(?:accurate|incomplete|re.?extract|restore)\b/i.test(message) || /\b(?:import|build|create|record|add|insert|update|modify|integrate|fill|use|apply)\b/i.test(message))) {
    return role === 'instructor' ? { type: 'syllabus-import', attachment: source, editor, target, section: target ? target.path.split('.')[0] : targetSection, courseCode: source.syllabus.courseMatch?.code || '', scopeFields, operation: /\b(?:append|insert|add)\b/i.test(message) ? 'append' : 'replace' } : { type: 'notice', text: 'Only an authorized instructor view can import a syllabus. You can still ask about the file.' }
  }
  if (EDIT_REQUEST.test(message) && (/\b(?:students?|roster|class\s*list|enroll|register)\b/i.test(message) || attachments.some(attachment => attachment.roster) && /\b(?:replace|remove|modify|update|fix)\b/i.test(message))) {
    const course = catalog.find(item => new RegExp(item.code.replace(/\s+/g, '\\s*'), 'i').test(message))
    const candidates = registrations.filter(item => (!course || item.courseCode === course.code))
    const selector = message.match(/\b(?:remove|delete|drop|unenroll)\s+(?:the\s+student\s+|student\s+)?(.+?)(?:\s+from\b|[.!?]|$)/i)?.[1]?.trim() || ''
    return role === 'instructor' ? { type: 'roster-edit', registrationId: candidates.length === 1 ? candidates[0].id : '', attachment: attachments.find(item => item.roster), selector, operation: /\b(?:remove|delete|drop|unenroll)\b/i.test(message) ? 'remove' : /\breplace\b/i.test(message) ? 'replace' : 'merge' } : { type: 'notice', text: 'This view cannot change class lists. Use an authorized instructor view.' }
  }
  if (EDIT_REQUEST.test(message) && (editor || /\b(?:syllabus|courseware|current\s+(?:page|section|component)|this\s+(?:section|content|lesson))\b/i.test(message))) {
    return role === 'instructor' ? { type: 'editor-edit', request: message, editor, section: target ? target.path.split('.')[0] : editor?.kind === 'syllabus' ? targetSection : 'all', target, scopeFields, attachments } : { type: 'notice', text: 'This view can read and ask about content. An authorized instructor view is required to change it.' }
  }
  return null
}

export function rosterRevision(registration, { operation, incoming = [], selected = [], field, value = '' }) {
  const before = registration.students || [], keys = new Set(selected)
  let students
  if (operation === 'remove') {
    if (!keys.size) throw new Error('Choose the exact student rows to remove.')
    students = before.filter(student => !keys.has(studentKey(student)))
  } else if (operation === 'update') {
    if (!keys.size || !['Name', 'Email', 'YearLevel', 'Block'].includes(field) || !value.trim()) throw new Error('Choose rows, a supported field and its new value.')
    if (field === 'Email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new Error('Enter a valid email address.')
    students = before.map(student => keys.has(studentKey(student)) ? { ...student, [field]: value.trim() } : student)
  } else {
    if (!incoming.length) throw new Error('Attach a readable class list first.')
    students = operation === 'replace' ? incoming : mergeStudents(before, incoming).students.map(student => {
      // File-driven corrections require an exact existing identity; ambiguous names do not overwrite records.
      const match = incoming.find(row => studentKey(row) === studentKey(student))
      return match ? { ...student, ...Object.fromEntries(Object.entries(match).filter(([, value]) => String(value || '').trim())) } : student
    })
  }
  return { ...registration, students, studentCount: students.length, lastUpdated: new Date().toISOString() }
}
export function receiptText(result) { return result.persisted !== true ? 'Applied to this preview device. No cloud save was made.' : `Saved to the ${result.mode === 'local' ? 'local' : 'account'} workspace and verified by the database response.` }
