import type { AcademicData } from '../components/academic/academicData'
import { currentAttempts } from '../components/academic/academicData'
import { studentRecorded } from '../components/academic/monitoringModel'
import { isOutlineExam, weekSections, type OutlineWeek } from './outlineSections'

export type InstructorCourse = { id: string; code: string; title: string; units: string; year: string; semester: string; academicYear: string; blocks: string[]; courseIds: string[] }
const codeKey = (value: string) => value.trim().toUpperCase().replace(/\s+/g, ' ')
export const sameCourseCode = (left: string, right: string) => left.replace(/\s/g, '').toUpperCase() === right.replace(/\s/g, '').toUpperCase()
const semesterKey = (value: string) => /(?:1|first|1st)/i.test(value) ? '1' : /(?:2|second|2nd)/i.test(value) ? '2' : value.trim().toLowerCase()
const inactive = (value?: string) => /^(?:inactive|suspended|withdrawn|deleted)$/i.test(value || '')

/** Only Dean-recorded assignments for this verified instructor authorize a course card. */
export function instructorCourses(data: AcademicData, instructorId: string, syllabi: { id: string; courseInfo?: { academicYear?: string; periodOffered?: string } }[] = []): InstructorCourse[] {
  if (!instructorId) return []
  const catalog = new Map((data.institutional || []).filter(row => row.kind === 'courses').map(row => [codeKey(row.data.CourseCode || row.record_key), row.data]))
  const courses = new Map<string, InstructorCourse>()
  for (const entry of (data.institutional || []).filter(row => row.kind === 'loads')) {
    const row = entry.data
    if (row.InstructorID !== instructorId || inactive(row.Status) || !row.CourseCode?.trim()) continue
    const code = codeKey(row.CourseCode), meta = catalog.get(code) || {}, academicYear = row.AcademicYear || meta.AcademicYear || '', semester = row.Semester || meta.Semester || ''
    const id = [code, academicYear, semester].map(encodeURIComponent).join('~')
    const existing = data.courses.filter(course => sameCourseCode(course.course_code, code) && course.instructor_id === instructorId && course.active && (() => { const source = syllabi.find(item => item.id === course.syllabus_id); return (!source?.courseInfo?.academicYear || !academicYear || source.courseInfo.academicYear === academicYear) && (!source?.courseInfo?.periodOffered || !semester || semesterKey(source.courseInfo.periodOffered) === semesterKey(semester)) })())
    const value = courses.get(id) || { id, code, title: meta.CourseTitle || row.CourseTitle || existing[0]?.course_title || code, units: meta.Units || row.Units || '', year: row.YearLevel || meta.YearLevel || '', academicYear, semester, blocks: [], courseIds: existing.map(course => course.id) }
    if (row.Block && !value.blocks.includes(row.Block)) value.blocks.push(row.Block)
    courses.set(id, value)
  }
  return [...courses.values()].map(course => ({ ...course, courseIds: course.courseIds.filter(id => { const projection = data.courses.find(row => row.id === id), source = syllabi.find(row => row.id === projection?.syllabus_id); return Boolean(source?.courseInfo?.periodOffered || [...courses.values()].filter(row => row.code === course.code).length === 1) }), blocks: course.blocks.sort() })).sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id))
}

export function instructorRecords(data: AcademicData, loaded: InstructorCourse[]): AcademicData {
  const ids = new Set(loaded.flatMap(course => course.courseIds)), courses = data.courses.filter(course => ids.has(course.id))
  const publications = data.publications.filter(item => ids.has(item.course_id)), publicationIds = new Set(publications.map(item => item.id))
  const enrollments = data.enrollments.filter(row => loaded.some(course => course.courseIds.includes(row.course_id) && course.blocks.includes(row.block_section || ''))), enrolled = new Set(enrollments.filter(row => !row.suspended).map(row => `${row.course_id}:${row.student_email.toLowerCase()}`))
  const members = (row: { publication_id: string; student_email?: string; is_test?: boolean | null }) => {
    const publication = publications.find(pub => pub.id === row.publication_id)
    return publication && row.student_email && enrolled.has(`${publication.course_id}:${row.student_email.toLowerCase()}`) && studentRecorded(row)
  }
  return { ...data, courses, publications, enrollments, attempts: data.attempts.filter(row => publicationIds.has(row.publication_id) && members(row)), accesses: data.accesses.filter(row => publicationIds.has(row.publication_id) && members(row)), reading: data.reading?.filter(row => publicationIds.has(row.publication_id) && members(row)), sessions: data.sessions?.filter(row => publicationIds.has(row.publication_id) && members(row)) }
}

export function syllabusForCourse<T extends { id: string; courseCode: string; status: string; suspended?: boolean; courseInfo?: { academicYear?: string; periodOffered?: string }; lastUpdated?: string }>(syllabi: T[], course: InstructorCourse): T | undefined {
  return syllabi.filter(item => sameCourseCode(item.courseCode, course.code) && !item.suspended && item.status !== 'archived' && (!course.academicYear || !item.courseInfo?.academicYear || course.academicYear === item.courseInfo.academicYear) && (!course.semester || !item.courseInfo?.periodOffered || semesterKey(course.semester) === semesterKey(item.courseInfo.periodOffered))).sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || String(b.lastUpdated || '').localeCompare(String(a.lastUpdated || '')))[0]
}

/** Keep week slots chronological while moving their complete teaching scopes and content together. */
export function moveTeachingWeek<T extends { syllabusId: string; week: number; status: string }>(outline: OutlineWeek[], content: Record<string, T>, syllabusId: string, from: number, to: number) {
  const ordered = [...outline].filter(row => !isOutlineExam(row)).sort((a, b) => a.week - b.week).map(row => ({ ...row, sections: weekSections(row) })), slots = ordered.map(row => row.week)
  const start = slots.indexOf(from), end = slots.indexOf(to)
  if (start < 0 || end < 0) throw new Error('The selected outline week is no longer available.')
  const [moved] = ordered.splice(start, 1); ordered.splice(end, 0, moved)
  const mapping = new Map(ordered.map((row, index) => [row.week, slots[index]]))
  if (Object.values(content).some(item => item.syllabusId === syllabusId && mapping.has(item.week) && mapping.get(item.week) !== item.week && 'generationCheckpoint' in item && item.generationCheckpoint)) throw new Error('Finish or explicitly discard saved generation progress in the affected weeks before moving them. Saved parts were preserved.')
  return { outline: [...ordered.map((row, index) => ({ ...row, week: slots[index] })), ...outline.filter(isOutlineExam)].sort((a, b) => a.week - b.week), content: Object.fromEntries(Object.entries(content).map(([id, item]) => [id, item.syllabusId === syllabusId && mapping.has(item.week) && mapping.get(item.week) !== item.week ? { ...item, week: mapping.get(item.week)!, status: 'draft', outOfAlignment: true } : item])) as Record<string, T> }
}

export function weekTopics(row: OutlineWeek) {
  return weekSections(row).map((section, index) => ({ ...section, title: section.contents.find(text => text.trim())?.split('\n')[0] || `Topic ${index + 1}` }))
}

export type TeachingEntry = { id: string; type: string; week?: number; title?: string; position?: number; content: { title?: string; courseTopicId?: string; outlineSectionId?: string; overallAssessment?: boolean; teachingOrder?: number; coverage?: { materialIds: string[] }; ai?: { parts?: { sectionId?: string }[] } } }
export const teachingOrder = (entry: TeachingEntry) => entry.position ?? entry.content.teachingOrder ?? (entry.type === 'assessment' ? 2048 : entry.type === 'activity' ? 1024 : 0)
export function topicEntries<T extends TeachingEntry>(entries: T[], topicId: string, soleTopic: boolean) {
  return entries.filter(item => (item.content.courseTopicId || item.content.outlineSectionId || (soleTopic ? topicId : '')) === topicId || item.content.ai?.parts?.some(part => part.sectionId === topicId)).sort((a, b) => Number(Boolean(a.content.overallAssessment)) - Number(Boolean(b.content.overallAssessment)) || teachingOrder(a) - teachingOrder(b) || a.id.localeCompare(b.id))
}
export const topicOverall = <T extends TeachingEntry>(entries: T[]) => entries.find(item => item.content.overallAssessment) || (entries.filter(item => item.type === 'assessment').length === 1 ? entries.find(item => item.type === 'assessment' && item.content.overallAssessment === undefined) : undefined)
export function assessmentCoverage(entries: TeachingEntry[], assessmentId?: string, overall = false) {
  let covered: string[] = [], all: string[] = []
  for (const item of entries) {
    if (item.id === assessmentId) return overall ? all : covered
    if (item.type !== 'assessment') { covered.push(item.id); all.push(item.id) }
    else if (!item.content.overallAssessment) covered = []
  }
  return overall ? all : covered
}

export function courseStudentCount(data: AcademicData, ids: string[]) {
  return new Set(data.enrollments.filter(row => ids.includes(row.course_id) && !row.suspended).map(row => row.student_email.toLowerCase())).size
}

export function topicProgress(data: AcademicData, entries: TeachingEntry[]) {
  const publications = entries.flatMap(entry => {
    const available = data.publications.filter(pub => pub.active && (!pub.release_at || new Date(pub.release_at).getTime() <= Date.now()))
    const exact = available.filter(pub => pub.active && pub.content?.courseItemId === entry.id)
    if (exact.length === 1) return exact
    if (exact.length) return []
    const legacy = available.filter(pub => pub.active && pub.week === entry.week && pub.type === entry.type && pub.title === (entry.content.title || entry.title))
    return legacy.length === 1 ? legacy : []
  })
  const ids = new Set(publications.map(pub => pub.id)), materials = publications.filter(pub => pub.type !== 'assessment')
  let expected = 0, opened = 0
  for (const material of materials) {
    const students = new Set(data.enrollments.filter(row => row.course_id === material.course_id && !row.suspended).map(row => row.student_email.toLowerCase()))
    expected += students.size
    opened += new Set(data.accesses.filter(row => row.publication_id === material.id && studentRecorded(row) && row.student_email && students.has(row.student_email.toLowerCase())).map(row => row.student_email!.toLowerCase())).size
  }
  const attempts = currentAttempts(data).filter(row => ids.has(row.publication_id) && row.grading_status !== 'pending_review' && row.max_score > 0 && studentRecorded(row) && data.enrollments.some(member => !member.suspended && member.course_id === publications.find(pub => pub.id === row.publication_id)?.course_id && member.student_email.toLowerCase() === row.student_email?.toLowerCase()))
  const totals = attempts.reduce((sum, row) => ({ score: sum.score + row.score, max: sum.max + row.max_score }), { score: 0, max: 0 })
  return { access: expected ? Math.round(opened / expected * 100) : null, opened, expected, average: totals.max ? Math.round(totals.score / totals.max * 100) : null, scored: attempts.length }
}
