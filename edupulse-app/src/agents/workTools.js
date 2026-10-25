import { mergeStudents, studentKey } from '../utils/rosterParser'

export const EDIT_REQUEST = /\b(?:update|modify|revise|edit|fix|improve|rewrite|insert|append|replace|remove|delete|integrate|fill|record)\b/i
export const ACTION_REQUEST = /\b(?:redirect|navigate|walkthrough|guide\s+me|walk\s+me|take\s+me|open|generate|create|build|update|modify|revise|edit|fix|rewrite|insert|append|replace|remove|delete|integrate)\b/i
export function sectionFor(text) {
  for (const [field, pattern] of [
    ['courseDescription', /course\s+description|section\s*2/i], ['programOutcomes', /program\s+outcomes?|section\s*4/i],
    ['courseOutline', /course\s+outline|weekly\s+(?:outline|plan)|section\s*5/i], ['courseRequirements', /course\s+requirements?/i],
    ['gradingSystem', /grading\s+(?:system|policy|rules?)/i], ['coursePolicy', /course\s+polic(?:y|ies)/i],
    ['books', /textbooks?|\bbooks?\b/i], ['onlineReferences', /online\s+references?|web\s+references?/i],
  ]) if (pattern.test(text)) return field
  return 'all'
}
export function sourceSyllabusPatch(parsed) {
  const section = parsed.sections, patch = {}
  if (section[3].parsed.programOutcomes?.length) patch.programOutcomes = section[3].parsed.programOutcomes
  if (section[4].parsed.courseOutline?.length) patch.courseOutline = section[4].parsed.courseOutline
  for (const field of ['courseRequirements', 'gradingSystem', 'coursePolicy']) if (section[5].parsed[field]?.length) patch[field] = section[5].parsed[field]
  for (const field of ['books', 'onlineReferences']) if (section[6].parsed[field]?.length) patch[field] = section[6].parsed[field]
  return patch
}
export function workProposal({ message, attachments, role, editor, registrations, catalog }) {
  const source = attachments.find(attachment => attachment.syllabus)
  if (source && (!message || /\b(?:import|build|create|record|add|insert|update|modify|integrate|fill|use|apply)\b/i.test(message))) {
    return role === 'instructor' ? { type: 'syllabus-import', attachment: source, section: sectionFor(message), courseCode: source.syllabus.courseMatch?.code || '', operation: /\b(?:append|insert|add)\b/i.test(message) ? 'append' : 'replace' } : { type: 'notice', text: 'Only an authorized instructor view can import a syllabus. You can still ask about the file.' }
  }
  if (EDIT_REQUEST.test(message) && (/\b(?:students?|roster|class\s*list|enroll|register)\b/i.test(message) || attachments.some(attachment => attachment.roster) && /\b(?:replace|remove|modify|update|fix)\b/i.test(message))) {
    const course = catalog.find(item => new RegExp(item.code.replace(/\s+/g, '\\s*'), 'i').test(message))
    const candidates = registrations.filter(item => (!course || item.courseCode === course.code))
    const selector = message.match(/\b(?:remove|delete|drop|unenroll)\s+(?:the\s+student\s+|student\s+)?(.+?)(?:\s+from\b|[.!?]|$)/i)?.[1]?.trim() || ''
    return role === 'instructor' ? { type: 'roster-edit', registrationId: candidates.length === 1 ? candidates[0].id : '', attachment: attachments.find(item => item.roster), selector, operation: /\b(?:remove|delete|drop|unenroll)\b/i.test(message) ? 'remove' : /\breplace\b/i.test(message) ? 'replace' : 'merge' } : { type: 'notice', text: 'This view cannot change class lists. Use an authorized instructor view.' }
  }
  if (EDIT_REQUEST.test(message) && (editor || /\b(?:syllabus|courseware|current\s+(?:page|section|component)|this\s+(?:section|content|lesson))\b/i.test(message))) {
    return role === 'instructor' ? { type: 'editor-edit', request: message, editor, section: editor?.kind === 'syllabus' ? sectionFor(message) : 'all', attachments } : { type: 'notice', text: 'This view can read and ask about content. An authorized instructor view is required to change it.' }
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
