import type { Identity } from '../contracts.js'
import type { Evidence } from '../../src/lib/rag/types.js'
import { readAcademic } from './academic.js'
import { readWorkspace } from '../workspace.js'
import { readStudents } from './students.js'
import { nameMatch, words, wordMatch } from '../../src/lib/rag/lookup.js'
import { profileName as profileQuery } from '../../src/lib/rag/conversation.js'
export { profileQuery }

export const accountTerms=(text:string)=>text.replace(/[\p{L}]{4,}/gu,word=>['syllabus','student','course','score','statistics','profile','material','outline','instructor'].find(known=>wordMatch(word.toLowerCase(),known)>=0.82)||word)

export const accountQuestion = (text: string) => /\b(?:my|our|this|selected|enrolled|registered)\b.{0,45}\b(?:courses?|syllab\w*|students?|instructors?|teachers?|faculty|users?|department|program|year level|topics?|class|block|materials?|progress|statistics|stats|performance|assessments?|scores?|drafts?|account|profile)|\b(?:who am i|who teaches|what can (?:i|you|the system)|which (?:courses?|students?)|published items|released materials)\b|\b(?:sino|ilan|aking|ko|nakaenrol)\b.{0,40}\b(?:estudyante|mag-aaral|guro|kurso|klase|marka|syllabus|instructors?|teachers?|students?|courses?)\b|\b(?:courses?|classes|students?|instructors?|teachers?|scores?|grades?|kurso|klase|estudyante|guro|marka)\s+(?:ko|namin|natin|aking|ating)\b/i.test(text)


/** Candidate reads retain the directory's existing RLS, including selected-account support. */
export async function findStudentProfiles(identity: Identity, name: string, signal?:AbortSignal) {
  const tokens=words(name).filter(t=>t.length>2).sort((a,b)=>b.length-a.length).slice(0,3)
  const queries=[name,...tokens,...tokens.filter(t=>t.length>=4).map(t=>t.slice(0,3))]
  const candidates=new Map<string,Record<string,any>>()
  let truncated=false
  for (const q of [...new Set(queries)]) {
    signal?.throwIfAborted()
    const url=new URL('https://edupulse.invalid/directory');url.searchParams.set('q',q)
    const found=await readStudents(identity,url,signal)
    truncated ||= found.total>found.students.length
    for (const row of found.students) candidates.set(String(row.student_number),row)
    if ([...candidates.values()].some(row=>nameMatch(name,String(row.full_name),String(row.student_number))>=0.9)) break
  }
  const matches=[...candidates.values()].map(person=>({person,score:nameMatch(name,String(person.full_name),String(person.student_number))})).filter(hit=>hit.score>=0.82).sort((a,b)=>b.score-a.score||String(a.person.full_name).localeCompare(String(b.person.full_name)))
  return { matches:matches.slice(0,8), truncated:truncated||matches.length>8 }
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
export async function authorizedAccountContext(identity: Identity, question: string, signal?:AbortSignal): Promise<{ evidence: Evidence[]; warning?: string; correction?: string }> {
  const name = profileQuery(question), normalized=accountTerms(question)
  const productHelp=/\b(?:what can (?:i|you|the system)|features?|functionalities)\b/i.test(normalized)&&! /\b(?:my|our|selected|aking|namin)\b/i.test(normalized)
  const contextual = accountQuestion(normalized)&&!productHelp
  if (identity.role === 'guest' || identity.local || !contextual && !name) return { evidence: [] }
  try {
    let text = '', correction: string | undefined
    if (name) {
      const found = await findStudentProfiles(identity,name,signal)
      text = found.matches.map(({person}) => `Registered student: ${person.full_name}; student number ${person.student_number}; year ${person.year_level}; department ${person.department}; program ${person.program}.`).join('\n')
      if (found.truncated) text += '\nCandidate search is limited; refine the name or student number for additional matches.'
      if (found.matches.length===1 && words(name).join(' ')!==words(String(found.matches[0]!.person.full_name)).join(' ') && !/\d/.test(name)) correction=String(found.matches[0]!.person.full_name)
      if (!text) {
        const records=await readAcademic(identity)
        for (const course of records.courses) if (course.instructor_name && nameMatch(name,String(course.instructor_name),'')>=0.82) text+=`Recorded instructor: ${course.instructor_name}; course ${course.course_code}: ${course.course_title}.\n`
        for (const faculty of records.faculty||[]) {
          const fullName=String(faculty.full_name||faculty.name||faculty.faculty_name||'')
          if(fullName && nameMatch(name,fullName,'')>=0.82) text+=`Recorded faculty: ${fullName}; department ${faculty.department||'not recorded'}; specialization ${faculty.specialization||'not recorded'}.\n`
        }
      }
      if (!contextual && !text) return { evidence: [] }
    }
    if (contextual) text += `\n${accountFacts(await readAcademic(identity), identity, normalized)}`
    if (identity.name && contextual) text = `The selected account is ${identity.name}.\n${text}`
    if (['instructor','admin','dean','associate_dean'].includes(identity.role) && /\b(?:syllab\w*|drafts?|outline|workspace|sections?)\b/i.test(normalized)) {
      const workspace = await readWorkspace(identity)
      text += `\nThe saved workspace contains ${workspace.data?.syllabi.length || 0} syllabi and ${Object.keys(workspace.data?.content || {}).length} authored items. Saved workspace revision: ${workspace.revision}.`
      for (const syllabus of workspace.data?.syllabi.slice(0, 12) || []) text += `\nSaved syllabus: ${syllabus.courseCode} ${syllabus.courseTitle}; status ${syllabus.status}; ${syllabus.courseOutline.length} outline weeks.`
    }
    return { correction:correction||(!name&&normalized!==question?normalized:undefined), evidence: [{ id: 'authorized-account-snapshot', documentId: null, title: `Live authorized ${identity.role.replace('_',' ')} records`, text: text.slice(0, 9500), page: null, section: 'Account records', flagged: false, origin: 'account', method: 'provided', similarity: null, relevance: null, rrf: 1, query: question }] }
  } catch {
    signal?.throwIfAborted()
    return { evidence: [], warning: 'Live account records could not be loaded. Do not infer zero courses, students, scores or releases from this failure. Open the relevant page and retry when connected.' }
  }
}
