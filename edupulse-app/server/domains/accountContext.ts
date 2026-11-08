import type { Identity } from '../contracts.js'
import type { Evidence } from '../../src/lib/rag/types.js'
import { readAcademic } from './academic.js'
import { readWorkspace } from '../workspace.js'
import { readStudents } from './students.js'

export const accountQuestion = (text: string) => /\b(?:my|our|this|selected|enrolled|registered)\b.{0,45}\b(?:courses?|syllab\w*|students?|instructors?|teachers?|faculty|users?|department|program|year level|topics?|class|block|materials?|progress|statistics|stats|performance|assessments?|scores?|drafts?|account|profile)|\b(?:who am i|who teaches|what can (?:i|you|the system)|which (?:courses?|students?)|published items|released materials)\b|\b(?:sino|ilan|aking|ko|nakaenrol)\b.{0,40}\b(?:estudyante|mag-aaral|guro|kurso|klase|marka|syllabus|instructors?|teachers?|students?|courses?)\b|\b(?:courses?|classes|students?|instructors?|teachers?|scores?|grades?|kurso|klase|estudyante|guro|marka)\s+(?:ko|namin|natin|aking|ating)\b/i.test(text)
export function profileQuery(text: string) {
  return /^(?:who is|do you know|sino si|kilala mo (?:ba )?si|profile of|find (?:the )?student(?: named)?)\s+([\p{L}\p{N}\s'-]{3,100})[?.!]?$/iu.exec(text.trim())?.[1]?.trim() || ''
}

type Academic = { courses: Record<string, any>[]; enrollments: Record<string, any>[]; publications: Record<string, any>[]; attempts: Record<string, any>[]; accesses: Record<string, any>[] }
/** Summaries use only the already-authorized snapshot; no global directory or guessed zeroes. */
export function accountFacts(records: Academic, identity: Identity, question: string) {
  const courses = records.courses || [], publications = records.publications || [], attempts = records.attempts || []
  const lines = [`The current account role is ${identity.role.replace('_', ' ')}.`, `There are ${courses.length} accessible courses and ${publications.length} accessible released items.`, `There are ${attempts.length} saved assessment attempts (including retakes and pending grading), and ${(records.accesses || []).length} saved first-open records. An open record does not prove a material was completed.`]
  for (const course of courses.slice(0, 12)) {
    const roster = (records.enrollments || []).filter(row => row.course_id === course.id)
    lines.push(`${course.course_code}: ${course.course_title}. ${course.active ? 'Active' : 'Inactive'} course. Instructor: ${course.instructor_name || 'not recorded'}. ${new Set(roster.map(row => row.student_email)).size} visible enrolled students, ${publications.filter(row => row.course_id === course.id).length} accessible released items.`)
    if (/\b(?:outline|topics?|covering|learning outcomes?)\b/i.test(question) && Array.isArray(course.outline)) lines.push(`Outline for ${course.course_code}: ${course.outline.slice(0, 18).map((week: Record<string, unknown>) => `Week ${week.week}: ${Array.isArray(week.contents) ? week.contents.join('; ') : ''}`).join(' | ')}.`)
  }
  if (/\b(?:who|list|names?|sino|students|estudyante|roster|class list)\b/i.test(question) && ['instructor','dean','admin'].includes(identity.role)) {
    const matching = (records.enrollments || []).filter(row => !question.match(/\b[A-Z]{2,}\s?\d{2,}\b/) || courses.some(course => course.id === row.course_id && question.includes(course.course_code))).slice(0, 30)
    for (const row of matching) lines.push(`Enrolled student: ${row.display_name}; student number ${row.student_ref || 'not recorded'}; block ${row.block_section}; course ${courses.find(course => course.id === row.course_id)?.course_code || 'not available'}.`)
    if (matching.length === 30) lines.push('Only the first 30 matching roster entries are included here. Open Student Monitoring for the complete authorized roster.')
  }
  if (courses.length > 12) lines.push('Only the first 12 course descriptions are included; totals cover all accessible records.')
  if (/\b(?:scores?|grades?|statistics|stats|performance|assessment results|marka)\b/i.test(question)) {
    const current = new Map<string, Record<string, any>>()
    for (const attempt of [...attempts].sort((a,b)=>String(b.submitted_at).localeCompare(String(a.submitted_at)))) {
      const key = `${attempt.publication_id}:${attempt.student_id}:${attempt.source_version}`
      if (!current.has(key)) current.set(key, attempt)
    }
    for (const attempt of [...current.values()].slice(0, 10)) {
      const publication = publications.find(row => row.id === attempt.publication_id && row.source_version === attempt.source_version)
      if (!publication) continue
      const learner = (records.enrollments || []).find(row => row.student_email === attempt.student_email)
      lines.push(`Saved assessment result: ${publication.title}; learner ${learner?.display_name || 'current authorized account'}; ${attempt.grading_status === 'pending_review' ? 'written responses awaiting instructor grading' : `raw score ${attempt.score}/${attempt.max_score}`}; attempt ${attempt.attempt_no || 1}; submitted ${attempt.submitted_at}.`)
    }
    if (current.size > 10) lines.push('Only the ten most recent result descriptions are included; open Performance for the complete authorized results. These are saved raw scores, not institutional course grades.')
  }
  return lines.join('\n')
}
export async function authorizedAccountContext(identity: Identity, question: string): Promise<{ evidence: Evidence[]; warning?: string }> {
  const name = profileQuery(question), contextual = accountQuestion(question)
  if (identity.role === 'guest' || identity.local || !contextual && !name) return { evidence: [] }
  try {
    let text = ''
    if (name) {
      const url = new URL('https://edupulse.invalid/directory'); url.searchParams.set('q', name)
      const found = await readStudents(identity, url)
      text = found.students.slice(0,8).map((person: Record<string, unknown>) => `Registered student: ${person.full_name}; student number ${person.student_number}; year ${person.year_level}; department ${person.department}; program ${person.program}.`).join('\n')
      if (found.total > Math.min(8,found.students.length)) text += `\nShowing ${Math.min(8,found.students.length)} of ${found.total} authorized matching profiles. Refine the name or student number.`
      if (!contextual && !text) return { evidence: [] }
    }
    if (contextual) text += `\n${accountFacts(await readAcademic(identity), identity, question)}`
    if (identity.name && contextual) text = `The selected account is ${identity.name}.\n${text}`
    if (['instructor','admin','dean','associate_dean'].includes(identity.role) && /\b(?:syllab\w*|drafts?|outline|workspace|sections?)\b/i.test(question)) {
      const workspace = await readWorkspace(identity)
      text += `\nThe saved workspace contains ${workspace.data?.syllabi.length || 0} syllabi and ${Object.keys(workspace.data?.content || {}).length} authored items. Saved workspace revision: ${workspace.revision}.`
      for (const syllabus of workspace.data?.syllabi.slice(0, 12) || []) text += `\nSaved syllabus: ${syllabus.courseCode} ${syllabus.courseTitle}; status ${syllabus.status}; ${syllabus.courseOutline.length} outline weeks.`
    }
    return { evidence: [{ id: 'authorized-account-snapshot', documentId: null, title: `Live authorized ${identity.role.replace('_',' ')} records`, text: text.slice(0, 9500), page: null, section: 'Account records', flagged: false, origin: 'account', method: 'provided', similarity: null, relevance: null, rrf: 1, query: question }] }
  } catch {
    return { evidence: [], warning: 'Live account records could not be loaded. Do not infer zero courses, students, scores or releases from this failure. Open the relevant page and retry when connected.' }
  }
}
