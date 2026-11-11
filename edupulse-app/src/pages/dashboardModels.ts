// View models for the account role dashboards. Signed-in accounts render the
// same dashboard components as the preview personas (see dashboardPreview.js),
// filled from their authorized academic records and their own workspace.
// Account models never fall back to a sample value; a missing record stays empty.
import type { AcademicData, Course } from '../components/academic/academicData'
import { assessmentSummary, currentAttempts, deliverySummary, learnerRows, percent, studentAttempt, topicSummary } from '../components/academic/academicData'
import { SYLLABUS_STATUS_META, SYLLABUS_STATUS_ORDER } from '../data/syllabusStatus'

type StatusMeta = { label: string; badge: string; step: number; hint: string }
const STATUS: Record<string, StatusMeta | undefined> = SYLLABUS_STATUS_META
type BlockInfo = { block?: string; yearLevel?: string | number; students?: number; adviser?: string }
type AccountCourse = Course & { block_info?: BlockInfo[] }
type AcademicEvent = NonNullable<AcademicData['events']>[number]
type WorkspaceSyllabus = { id: string; courseCode?: string; courseTitle?: string; status?: string; version?: number; courseOutline?: unknown[]; sample?: boolean }
type WorkspaceItem = { syllabusId?: string; status?: string; type?: string; week?: number; title?: string; content?: { title?: string }; aiGenerated?: boolean; generatedAt?: string }
export type DashboardWorkspace = { syllabi?: WorkspaceSyllabus[]; content?: Record<string, WorkspaceItem> }
export type ActivityItem = { kind: string; actor: string; action: string; target: string; time: string }

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

export function timeAgo(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const minutes = Math.max(0, Math.round((now - then) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString()
}

export const shortLabel = (text: string) => (text.length > 14 ? `${text.slice(0, 13)}…` : text)
const dateOnly = (value?: string) => (value ? String(value).slice(0, 10) : '—')
const courses = (data: AcademicData) => data.courses as AccountCourse[]
const statusOf = (course: Course) => course.syllabus_status || (course.active ? 'active' : 'drafted')
const notRouted = (status?: string) => status === 'drafted' || status === 'checked'

// Saved academic events are shown as they were recorded.
const EVENT_KINDS: Record<string, string> = { publication: 'published', syllabus: 'syllabus', import: 'loading', assessment_review: 'review', revision_request: 'revision', workspace: 'workspace' }
export function accountActivity(events: AcademicEvent[] = [], limit = 5, now = Date.now()): ActivityItem[] {
  return [...events].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, limit).map(event => {
    const status = STATUS[event.detail]?.label || String(event.detail || '').replaceAll('_', ' ')
    const action = event.kind === 'syllabus' ? `syllabus is now ${status}` : event.kind === 'import' ? `imported: ${event.detail}` : event.detail
    return { kind: EVENT_KINDS[event.kind] || 'workspace', actor: event.title, action, target: '', time: timeAgo(event.created_at, now) }
  })
}

/* Dean and Associate Dean */

export function accountManagementModel(data: AcademicData, now = Date.now()) {
  const imported = (kind: string) => (data.institutional || []).filter(row => row.kind === kind).map(row => row.data?.CourseCode)
  const distinct = (codes: (string | undefined)[]) => new Set(codes.map(code => String(code || '').trim()).filter(Boolean)).size
  const people = new Map((data.faculty || []).map(person => [person.id, person.name || person.email || person.id]))
  for (const course of data.courses) if (course.instructor_id && !people.has(course.instructor_id)) people.set(course.instructor_id, course.instructor_name || course.instructor_id)
  return {
    kpis: {
      released: distinct([...data.courses.map(c => c.course_code), ...imported('courses')]),
      loaded: distinct([...data.courses.filter(c => c.instructor_id).map(c => c.course_code), ...imported('loads')]),
      approved: data.courses.filter(c => ['approved_uploaded', 'active'].includes(statusOf(c))).length,
      notRouted: data.courses.filter(c => notRouted(statusOf(c))).length,
    },
    stations: SYLLABUS_STATUS_ORDER.map(status => ({ name: STATUS[status]?.label || status, count: data.courses.filter(c => statusOf(c) === status).length })),
    delivery: deliverySummary(data).filter(c => statusOf(c) === 'active').map(c => ({ name: c.course_code, materials: c.materials, assessments: c.assessments })),
    deliverySeries: [{ key: 'materials', name: 'Published materials', color: '#22c55e' }, { key: 'assessments', name: 'Published assessments', color: '#38bdf8' }],
    faculty: [...people].map(([id, name]) => {
      const loads = data.courses.filter(c => c.instructor_id === id)
      return { id, name, loads: loads.length, active: loads.filter(c => statusOf(c) === 'active').length, behind: loads.filter(c => notRouted(statusOf(c))).length }
    }),
    activity: accountActivity(data.events, 5, now),
    courses: data.courses.map(c => ({
      id: c.id, code: c.course_code, title: c.course_title, instructor: c.instructor_name || (c.instructor_id && people.get(c.instructor_id)) || 'Not assigned',
      status: statusOf(c), outlineWeeks: c.outline?.length || 0, updated: dateOnly(c.updated_at),
    })),
  }
}

/* Instructor */

// Per-learner averages use each learner's latest marked attempt per assessment;
// learners with no marked attempt are left out rather than counted as zero.
function learnerAverages(data: AcademicData) {
  const totals = new Map<string, { score: number; max: number }>()
  for (const attempt of currentAttempts(data)) {
    const key = (attempt.student_email || attempt.student_id || '').toLowerCase()
    if (!key || attempt.grading_status === 'pending_review' || !(attempt.max_score > 0)) continue
    const entry = totals.get(key) || { score: 0, max: 0 }
    entry.score += attempt.score; entry.max += attempt.max_score
    totals.set(key, entry)
  }
  return [...totals.values()].map(total => percent(total.score, total.max)).filter((value): value is number => value !== null)
}

function scoreChart(data: AcademicData) {
  const topics = topicSummary(data)
  const course = data.courses.find(c => topics.some(t => t.course === c.id))
  if (course) return { caption: `Topic averages · ${course.course_code} ${course.course_title}`, chart: topics.filter(t => t.course === course.id).map(t => ({ topic: shortLabel(t.topic), avg: t.value })) }
  const assessments = assessmentSummary(data).filter(a => a.score !== null)
  if (assessments.length) return { caption: 'Assessment averages · all courses', chart: assessments.map(a => ({ topic: shortLabel(`W${a.week} ${a.title}`), avg: a.score as number })) }
  return { caption: 'No marked results yet. Averages appear after students submit published assessments.', chart: [] as { topic: string; avg: number }[] }
}

function blockCards(data: AcademicData) {
  const blocks = new Map<string, { code:string; courseId:string; course:string; students:Set<string>; year:number }>()
  for (const entry of data.enrollments) {
    const course=courses(data).find(c=>c.id===entry.course_id)
    if (!entry.block_section || !course) continue
    const id=`${course.id}:${entry.block_section}`
    const block=blocks.get(id)||{code:entry.block_section,courseId:course.id,course:`${course.course_code} — ${course.course_title}`,students:new Set<string>(),year:0}
    block.students.add(entry.student_email.toLowerCase())
    block.year ||= parseInt(String(course.block_info?.find(b=>b.block===entry.block_section)?.yearLevel??''),10)||0
    blocks.set(id,block)
  }
  return [...blocks].sort(([,a],[,b])=>a.course.localeCompare(b.course)||a.code.localeCompare(b.code)).map(([id,block])=>({id,code:block.code,course:block.course,courseId:block.courseId,detail:`${block.year?`${ordinal(block.year)} Year · `:''}${block.students.size} ${block.students.size===1?'student':'students'}`}))
}

export function accountInstructorModel(data: AcademicData, workspace?: DashboardWorkspace, now = Date.now()) {
  const syllabi = (workspace?.syllabi || []).filter(s => !s.sample)
  const ownedSyllabi = new Set(syllabi.map(s => s.id))
  const content = Object.entries(workspace?.content || {}).map(([id, item]) => ({ ...item, id })).filter(item=>item.syllabusId && ownedSyllabi.has(item.syllabusId))
  const drafts = content.filter(item => item.status === 'draft').sort((a, b) => (a.week || 0) - (b.week || 0))
  const averages = learnerAverages(data)
  return {
    kpis: { courses: syllabi.length, active: syllabi.filter(s => s.status === 'active').length, drafts: drafts.length, published: content.filter(item => item.status === 'published').length },
    // Saved work completes the first two Getting Started steps.
    autoDone: [syllabi.length > 0 && 'onb-1', content.length > 0 && 'onb-2'].filter((step): step is string => Boolean(step)),
    blocks: blockCards(data),
    snapshot: {
      students: learnerRows(data).length,
      scored: averages.length,
      results: assessmentSummary(data).filter(item=>item.score!==null).map(item=>{
        const publication=data.publications.find(pub=>pub.id===item.id)!
        const course=data.courses.find(course=>course.id===publication.course_id)
        const attempts=currentAttempts(data).filter(attempt=>attempt.publication_id===item.id&&attempt.grading_status!=='pending_review')
        return {...item,course:`${course?.course_code || 'Course'} — ${course?.course_title || ''}`,marked:attempts.length,test:attempts.some(attempt=>attempt.is_test)}
      }),
      average: averages.length ? Math.round(averages.reduce((a, b) => a + b, 0) / averages.length) : null,
      below: averages.filter(value => value < 75).length,
      top: averages.filter(value => value >= 90).length,
      ...scoreChart(data),
    },
    activity: accountActivity(data.events, 3, now),
    syllabi: syllabi.map(syl => ({ id: syl.id, code: syl.courseCode, title: syl.courseTitle, status: syl.status, version: syl.version || 1, outlineWeeks: syl.courseOutline?.length || 0 })),
    queue: drafts.map(item => ({
      id: item.id, title: item.title || item.content?.title || 'Untitled draft',
      detail: `${item.type || 'item'} · ${item.aiGenerated ? 'AI-generated · ' : ''}${dateOnly(item.generatedAt)}`, status: item.status,
    })),
  }
}

/* Student */

export function accountStudentModel(data: AcademicData, user?: { email?: string } | null, now = Date.now()) {
  const email = user?.email?.toLowerCase()
  const marked = currentAttempts(data).filter(a => (!email || a.student_email?.toLowerCase() === email) && a.grading_status !== 'pending_review' && a.max_score > 0)
  const publicationOf = (id: string) => data.publications.find(p => p.id === id)
  const released = data.publications.filter(p => p.active && (!p.release_at || new Date(p.release_at).getTime() <= now))
  const unopened = released.filter(p => p.type !== 'assessment' && !data.accesses.some(a => a.publication_id === p.id))
  const unanswered = released.filter(p => p.type === 'assessment' && !studentAttempt(data, p, email))
  const total = marked.reduce((sum, a) => ({ score: sum.score + a.score, max: sum.max + a.max_score }), { score: 0, max: 0 })
  const enrollment = data.enrollments.find(e => e.block_section)
  const info = enrollment && courses(data).find(c => c.id === enrollment.course_id)?.block_info?.find(b => b.block === enrollment.block_section)
  const year = parseInt(String(info?.yearLevel ?? ''), 10)
  const code = (id: string) => data.courses.find(c => c.id === id)?.course_code || 'Course'
  return {
    kpis: {
      enrolled: data.courses.length,
      average: marked.length ? percent(total.score, total.max) : null,
      mastered: topicSummary(data, email).filter(t => t.value >= 75).length,
      pending: unopened.length + unanswered.length,
    },
    reminders: [
      ...unopened.map(p => ({ id: p.id, text: `You haven't opened "${p.title}" yet.`, path: '/courseware' })),
      ...unanswered.map(p => ({ id: p.id, text: `Unanswered assessment: "${p.title}".`, path: '/assessment' })),
    ].slice(0, 6),
    block: enrollment ? {
      code: enrollment.block_section,
      year: year ? `Year ${year}` : 'Not recorded',
      students: info?.students ?? 'Not recorded',
      adviser: info?.adviser || 'Not recorded',
    } : null,
    courses: data.courses.map(course => {
      const latest = marked.filter(a => publicationOf(a.publication_id)?.course_id === course.id).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0]
      return { code: course.course_code, title: course.course_title || course.course_code, score: latest ? percent(latest.score, latest.max_score) : null }
    }),
    sources: data.courses.map(course => ({
      code: course.course_code,
      items: (course.source_links || []).filter(link => typeof link === 'string' && /^https?:\/\//i.test(link)).map(link => ({ id: link, label: link.replace(/^https?:\/\//i, ''), href: link })),
    })),
    trend: [...marked].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)).map(a => ({ week: `W${publicationOf(a.publication_id)?.week ?? '?'}`, score: percent(a.score, a.max_score) })),
    trendDomain: [0, 100],
    upcoming: released.filter(p => (p.type === 'activity' || p.type === 'assessment' && !studentAttempt(data,p,email)) && p.due_at && new Date(p.due_at).getTime() > now).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)))
      .map(p => ({ id: p.id, title: p.title, course: code(p.course_id), due: new Date(p.due_at as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), type: p.type === 'activity' ? 'Activity' : 'Assessment' })),
  }
}
