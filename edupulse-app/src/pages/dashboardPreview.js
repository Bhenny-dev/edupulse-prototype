// View models for the preview personas' role dashboards. They read only the
// sample data; signed-in accounts use the account models in dashboardModels.ts
// with the same dashboard components.
import {
  ADMIN_STATS, DEFAULT_SYLLABI, COURSEWARE_ITEMS, STUDENT_RECORDS, INSTRUCTORS,
  RAG_GROUNDING_PASSAGES, BLOCK_SECTIONS, CURRICULUM_COURSES, BLOCK_SECTION_REGISTRATIONS,
} from '../data/mockData'
import { SYLLABUS_STATUS_META, SYLLABUS_STATUS_ORDER } from '../data/syllabusStatus'
import { ordinal, shortLabel } from './dashboardModels'

// Recent activity in the flow's own vocabulary: no in-system approvals, no
// integrity flags, no ops telemetry (all outside the confirmed business flow).
const PREVIEW_ACTIVITY = [
  { kind: 'published', actor: 'Sir Rogelio L. Guisdan', action: 'published', target: 'Week 3 — Variables & Data Types: Guided Practice', time: '2h ago' },
  { kind: 'syllabus', actor: 'Sir Rogelio L. Guisdan', action: 'uploaded the approved syllabus for', target: 'WMAD 303-1', time: '1d ago' },
  { kind: 'drafted', actor: 'AI (Auto mode)', action: 'drafted', target: '3 courseware items from the IT 106 outline', time: '2d ago' },
  { kind: 'loading', actor: 'Marielle Angela Fianza-Buya', action: 'confirmed AI-proposed loading for', target: '4 courses', time: '3d ago' },
  { kind: 'reminder', actor: 'System', action: 'reminded 5 students about', target: 'unopened Week 1 materials', time: '4d ago' },
]

const notRouted = status => status === 'drafted' || status === 'checked'

export function previewManagementModel() {
  return {
    kpis: { released: ADMIN_STATS.totalCourses, loaded: ADMIN_STATS.coursesLoaded, approved: ADMIN_STATS.approvedSyllabi, notRouted: ADMIN_STATS.deliveryGaps },
    stations: SYLLABUS_STATUS_ORDER.map(status => ({ name: SYLLABUS_STATUS_META[status].label, count: DEFAULT_SYLLABI.filter(s => s.status === status).length })),
    delivery: DEFAULT_SYLLABI.filter(s => s.status === 'active').map(s => ({
      name: s.courseCode,
      published: COURSEWARE_ITEMS.filter(c => c.syllabusId === s.id && c.status === 'published').length,
      checked: COURSEWARE_ITEMS.filter(c => c.syllabusId === s.id && c.status === 'checked').length,
    })),
    deliverySeries: [{ key: 'published', name: 'Published', color: '#22c55e' }, { key: 'checked', name: 'Checked (unpublished)', color: '#38bdf8' }],
    faculty: INSTRUCTORS.map(inst => {
      const loads = DEFAULT_SYLLABI.filter(s => s.instructorId === inst.id)
      return { id: inst.id, name: inst.name, loads: loads.length, active: loads.filter(s => s.status === 'active').length, behind: loads.filter(s => notRouted(s.status)).length }
    }),
    activity: PREVIEW_ACTIVITY,
    courses: DEFAULT_SYLLABI.map(syl => ({
      id: syl.id, code: syl.courseCode, title: syl.courseTitle, instructor: INSTRUCTORS.find(i => i.id === syl.instructorId)?.name,
      status: syl.status, outlineWeeks: syl.courseOutline?.length || 0, updated: syl.lastUpdated,
    })),
  }
}

export function previewInstructorModel(user) {
  const mySyllabi = DEFAULT_SYLLABI.filter(s => s.instructorId === user?.id)
  const myCourseware = COURSEWARE_ITEMS.filter(c => mySyllabi.some(s => s.id === c.syllabusId))
  // The review queue is drafts awaiting the instructor, earliest outline week first.
  const reviewQueue = myCourseware.filter(c => c.status === 'draft').sort((a, b) => a.week - b.week)
  const myBlockSections = BLOCK_SECTIONS.filter(s => s.adviserId === user?.id)
  // STUDENT_RECORDS stores the block code (not a blockSectionId FK): match on that.
  const myStudents = STUDENT_RECORDS.filter(stu => myBlockSections.some(bs => bs.code === stu.section))
  const midterm = s => s.courses[0]?.scores.midterm || 0
  const course = DEFAULT_SYLLABI[0]
  return {
    kpis: { courses: mySyllabi.length, active: mySyllabi.filter(s => s.status === 'active').length, drafts: myCourseware.filter(c => c.status === 'draft').length, published: myCourseware.filter(c => c.status === 'published').length },
    autoDone: [],
    blocks: myBlockSections.map(bs => ({ id: bs.id, code: bs.code, course: BLOCK_SECTION_REGISTRATIONS.filter(reg=>reg.uploadedBy===user?.id&&reg.blockSection===bs.code).map(reg=>`${reg.courseCode} — ${CURRICULUM_COURSES.find(course=>course.code===reg.courseCode)?.title||reg.courseCode}`).join('; ') || 'No registered course', detail: `${ordinal(bs.yearLevel)} Year · ${bs.students} students` })),
    snapshot: {
      students: myStudents.length,
      average: myStudents.length ? Math.round(myStudents.reduce((acc, s) => acc + midterm(s), 0) / myStudents.length) : 0,
      below: myStudents.filter(s => midterm(s) < 75).length,
      top: myStudents.filter(s => midterm(s) >= 90).length,
      caption: `Topic averages · ${course?.courseCode} ${course?.courseTitle}`,
      // Topic averages count only students who have a score for that topic in this course.
      chart: (course?.topics || []).map(t => {
        const scores = myStudents.map(s => s.courses.find(c => c.code === course.courseCode)?.topics?.[t.id]).filter(v => typeof v === 'number')
        return { topic: shortLabel(t.title), avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0 }
      }),
    },
    activity: PREVIEW_ACTIVITY.slice(0, 3),
    syllabi: mySyllabi.map(syl => ({ id: syl.id, code: syl.courseCode, title: syl.courseTitle, status: syl.status, version: syl.version, outlineWeeks: syl.courseOutline?.length || 0 })),
    queue: reviewQueue.map(cw => ({ id: cw.id, title: cw.title, detail: `${cw.type} · ${cw.aiGenerated ? 'AI-generated · ' : ''}${cw.generatedAt}`, status: cw.status })),
  }
}

const TREND_DATA = [
  { week: 'W1', score: 72 }, { week: 'W2', score: 75 }, { week: 'W3', score: 78 }, { week: 'W4', score: 80 },
  { week: 'W5', score: 83 }, { week: 'W6', score: 81 }, { week: 'W7', score: 85 }, { week: 'W8', score: 88 },
]

export function previewStudentModel(user) {
  const me = STUDENT_RECORDS.find(s => s.name === user?.name)
  const myBlockSection = me ? BLOCK_SECTIONS.find(bs => bs.code === me.section) : null
  const myCourses = me ? me.courses : []
  // AI guide surface (Phase 4): reminders about unopened materials and
  // unanswered assessments. Guidance only, never answers.
  const reminders = [
    { id: 'r1', text: 'You haven\'t opened "Week 1 — What is Programming: Lecture Notes" yet.', path: '/courseware' },
    { id: 'r2', text: 'Unanswered assessment: "Week 1 — Recitation & Short Quiz".', path: '/assessment' },
  ]
  return {
    kpis: {
      enrolled: myCourses.length,
      average: myCourses.length ? Math.round(myCourses.reduce((a, s) => a + (s.scores.midterm || 0), 0) / myCourses.length) : 0,
      mastered: me ? Object.values(myCourses[0]?.topics || {}).filter(v => v >= 75).length : 0,
      pending: reminders.length,
    },
    reminders,
    block: myBlockSection ? { code: myBlockSection.code, year: `Year ${myBlockSection.yearLevel}`, students: myBlockSection.students, adviser: INSTRUCTORS.find(i => i.id === myBlockSection.adviserId)?.name } : null,
    courses: myCourses.map(course => ({ code: course.code, title: CURRICULUM_COURSES.find(s => s.code === course.code)?.title || course.code, score: Math.round(course.scores.midterm || 0) })),
    sources: myCourses.map(course => ({ code: course.code, items: RAG_GROUNDING_PASSAGES.filter(p => p.courseCode === course.code && !p.sensitive).map(p => ({ id: p.id, label: p.docName })) })),
    trend: TREND_DATA,
    trendDomain: [60, 100],
    upcoming: [
      { id: 'u1', title: 'Week 1 — Recitation & Short Quiz: Programming Basics', course: 'IT 102', due: 'Jul 15, 2026', type: 'Quiz' },
      { id: 'u2', title: 'Week 4 — Conditional Statements: Seatwork & Quiz', course: 'IT 102', due: 'Jul 18, 2026', type: 'Activity' },
      { id: 'u3', title: 'Week 3 — Variables & Data Types: Quiz', course: 'IT 102', due: 'Jul 20, 2026', type: 'Activity' },
    ],
  }
}
