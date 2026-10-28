export type Course = { id: string; course_code: string; course_title: string; active: boolean; instructor_id?: string; instructor_name?: string; source_revision?: number; updated_at?: string; syllabus_status?: string; outline?: {week:number; contents:string[]; ilos?:string}[]; delivery?: Record<string,number>; source_links?: string[] }
export type Publication = { id: string; course_id: string; active: boolean; type: string; week: number; title: string; source_version: string | number; updated_at?: string; release_at?:string; due_at?:string; content?: Record<string, unknown> }
export type Enrollment = { course_id: string; student_email: string; display_name?: string; student_ref?: string; block_section?: string }
export type Attempt = { id?: string; publication_id: string; source_version: string | number; student_id?: string; student_email?: string; score: number; max_score: number; submitted_at: string; attempt_no?:number; grading_status?:string; answers?: (number|string)[]; question_scores?:number[]; topic_scores?:{topic:string; score:number; max_score:number}[]; appeal?:string }
export type Access = { publication_id: string; student_id?: string; student_email?: string; first_opened_at: string }
export type AcademicData = { courses: Course[]; publications: Publication[]; enrollments: Enrollment[]; attempts: Attempt[]; accesses: Access[]; institutional?:{kind:string; record_key:string; data:Record<string,string>}[]; faculty?:{id:string;name:string;email:string}[]; events?:{id:string;kind:string;title:string;detail:string;created_at:string}[]; notices?:{id:string;title:string;detail:string;path:string;read_at?:string;created_at:string}[] }

export const percent = (score: number, total: number) => total > 0 ? Math.round(score / total * 100) : null
export function currentAttempts(data: AcademicData) {
  const latest = new Map<string,Attempt>()
  for(const attempt of data.attempts.filter(attempt => data.publications.some(item => item.active && item.id === attempt.publication_id && String(item.source_version) === String(attempt.source_version)))) {
    const key=`${attempt.publication_id}:${attempt.student_email || attempt.student_id || ''}`
    if(!latest.has(key) || attempt.submitted_at >= latest.get(key)!.submitted_at) latest.set(key,attempt)
  }
  return [...latest.values()]
}
export function filterAcademic(data: AcademicData, courseId = '', block = '', since = '', until = ''): AcademicData {
  const courses = data.courses.filter(course => !courseId || course.id === courseId)
  const courseIds = new Set(courses.map(course => course.id))
  const publications = data.publications.filter(item => courseIds.has(item.course_id))
  const publicationIds = new Set(publications.map(item => item.id))
  const enrollments = data.enrollments.filter(item => courseIds.has(item.course_id) && (!block || item.block_section === block))
  const memberships = new Set(enrollments.map(item => `${item.course_id}:${item.student_email.toLowerCase()}`))
  const inBlock = (item: { publication_id: string; student_email?: string }) => !block || memberships.has(`${publications.find(pub => pub.id === item.publication_id)?.course_id}:${item.student_email?.toLowerCase() || ''}`)
  const inDates = (date: string) => (!since || date.slice(0, 10) >= since) && (!until || date.slice(0, 10) <= until)
  return { ...data, courses, publications, enrollments,
    attempts: data.attempts.filter(item => publicationIds.has(item.publication_id) && inBlock(item) && inDates(item.submitted_at)),
    accesses: data.accesses.filter(item => publicationIds.has(item.publication_id) && inBlock(item) && inDates(item.first_opened_at)) }
}
export function assessmentSummary(data: AcademicData) {
  const attempts = currentAttempts(data)
  return data.publications.filter(item => item.active && item.type === 'assessment').map(item => {
    const results = attempts.filter(attempt => attempt.publication_id === item.id)
    const graded=results.filter(attempt=>attempt.grading_status!=='pending_review')
    const score = graded.reduce((sum, attempt) => sum + attempt.score, 0)
    const max = graded.reduce((sum, attempt) => sum + attempt.max_score, 0)
    const expected = new Set(data.enrollments.filter(entry => entry.course_id === item.course_id).map(entry => entry.student_email.toLowerCase())).size
    return { id: item.id, title: item.title, label: `W${item.week} · ${item.title}`, week: item.week, score: percent(score, max), attempts: results.length, expected, completion: percent(results.length, expected) }
  }).sort((a, b) => a.week - b.week || a.title.localeCompare(b.title))
}
export function deliverySummary(data: AcademicData) {
  return data.courses.map(course => {
    const items = data.publications.filter(item => item.course_id === course.id && item.active && (!item.release_at || new Date(item.release_at).getTime()<=Date.now()))
    const roster = data.enrollments.filter(item => item.course_id === course.id)
    const planned=(course.outline || []).filter(row=>row.ilos?.trim()&&row.contents?.length)
    const covered=planned.filter(row=>items.some(item=>item.week===row.week)).length
    return { ...course, plannedWeeks:planned.length, coverage:percent(covered,planned.length), materials: items.filter(item => item.type !== 'assessment').length, assessments: items.filter(item => item.type === 'assessment').length,
      students: new Set(roster.map(item => item.student_email.toLowerCase())).size, blocks: [...new Set(roster.map(item => item.block_section).filter(Boolean))], weeks: new Set(items.map(item => item.week)).size }
  })
}
export function learnerRows(data: AcademicData) {
  const learners = new Map<string, Enrollment>()
  data.enrollments.forEach(entry => { if (!learners.has(entry.student_email.toLowerCase())) learners.set(entry.student_email.toLowerCase(), entry) })
  return [...learners.values()]
}
export function studentAttempt(data: AcademicData, publication: Publication, email?: string) {
  return currentAttempts(data).find(item => item.publication_id === publication.id && String(item.source_version) === String(publication.source_version) && (!email || item.student_email?.toLowerCase() === email.toLowerCase()))
}

export function topicSummary(data:AcademicData, email?:string) {
 const topics=new Map<string,{id:string;course:string;topic:string;score:number;max_score:number}>()
 for(const attempt of currentAttempts(data)) {
  if(attempt.grading_status==='pending_review' || (email && attempt.student_email?.toLowerCase()!==email.toLowerCase()))continue
  const publication=data.publications.find(p=>p.id===attempt.publication_id)!
  for(const result of attempt.topic_scores || []) {
   if(!Number.isFinite(result.score)||result.max_score<=0)continue
   const key=`${publication.course_id}:${result.topic}`
   const entry=topics.get(key)||{id:key,course:publication.course_id,topic:result.topic,score:0,max_score:0}
   entry.score+=result.score;entry.max_score+=result.max_score;topics.set(key,entry)
  }
 }
 return [...topics.values()].map(item=>({...item,value:percent(item.score,item.max_score)!}))
}
