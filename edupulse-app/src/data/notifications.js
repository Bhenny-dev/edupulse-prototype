import { useCallback, useSyncExternalStore } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAcademicRecords } from '../context/AcademicContext'
import { useWorkspace } from '../context/WorkspaceContext'

// Notifications — SYSTEM_SPEC §5. Unopened-material and unanswered-assessment
// reminders fan out to BOTH the instructor and the student; syllabus-status
// and delivery-gap notices go to Dean and Associate Dean accounts.
// The top-bar bell and the Notifications page read this one list, so their
// unread counts always agree.
export const ROLE_NOTIFICATIONS = {
  admin: [],
  dean: [
    { id: 1, message: 'IT 107 (Sir Rogelio L. Guisdan) is still Drafted — not yet checked or routed for approval', time: '2h ago', type: 'warning', category: 'syllabus_status', read: false },
    { id: 2, message: 'WMAD 303-1 approved file uploaded — Course Outline extraction pending', time: '1d ago', type: 'info', category: 'syllabus_status', read: true },
    { id: 3, message: 'IT 106 has no published courseware for Week 4 of its outline yet', time: '1d ago', type: 'warning', category: 'delivery_gap', read: true },
    { id: 4, message: 'Marielle Angela Fianza-Buya confirmed AI-proposed loading for 4 courses', time: '3d ago', type: 'success', category: 'course_loading', read: true },
    { id: 5, message: 'EduSuite class list import completed — 387 records', time: '1w ago', type: 'info', category: 'records', read: true },
  ],
  associate_dean: [
    { id: 1, message: 'IT 107 (Sir Rogelio L. Guisdan) is still Drafted — not yet checked or routed for approval', time: '2h ago', type: 'warning', category: 'syllabus_status', read: false },
    { id: 2, message: 'WMAD 303-1 approved file uploaded — Course Outline extraction pending', time: '1d ago', type: 'info', category: 'syllabus_status', read: true },
  ],
  instructor: [
    { id: 1, message: 'New courseware draft ready for review: Week 5 — Loop Structures Lab', time: '1h ago', type: 'info', category: 'courseware', read: false },
    { id: 2, message: '5 students in BSIT-3A have not opened "Week 1 — What is Programming"', time: '4h ago', type: 'warning', category: 'unopened_material', read: false },
    { id: 3, message: '2 students missed "Week 4 — Conditional Statements: Seatwork & Quiz"', time: '1d ago', type: 'warning', category: 'missing_assessment', read: true },
    { id: 4, message: 'AI Auto-draft completed for the IT 106 Course Outline (3 items)', time: '5d ago', type: 'info', category: 'courseware', read: true },
    { id: 5, message: 'Reminder: WMAD 303-1 syllabus is Checked — ready to download for approval', time: '5d ago', type: 'warning', category: 'syllabus_status', read: true },
  ],
  student: [
    { id: 1, message: 'New material published: Week 3 — Variables & Data Types', time: '30m ago', type: 'info', category: 'courseware', read: false },
    { id: 2, message: 'Reminder: you haven\'t opened "Week 1 — What is Programming: Lecture Notes"', time: '2h ago', type: 'warning', category: 'unopened_material', read: false },
    { id: 3, message: 'Unanswered assessment: "Week 1 — Recitation & Short Quiz"', time: '1d ago', type: 'warning', category: 'missing_assessment', read: true },
    { id: 4, message: 'Score recorded for Week 1 — Recitation & Short Quiz', time: '2d ago', type: 'success', category: 'assessment', read: true },
    { id: 5, message: 'Due soon: Week 4 — Conditional Statements: Seatwork & Quiz', time: '3d ago', type: 'warning', category: 'assessment', read: true },
  ],
}

// Read state is kept per role on this device and shared between the bell and the page.
const KEY = 'edupulse-notifications-read-v1'
const listeners = new Set()
let cache = null
function readStore() {
  if (cache) return cache
  try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { cache = {} }
  if (!cache || typeof cache !== 'object') cache = {}
  return cache
}
function writeStore(next) {
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* Read state still applies for this session. */ }
  listeners.forEach(listener => listener())
}
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }

export function useNotifications(role) {
  const { user } = useAuth()
  const { data, loading, error } = useAcademicRecords()
  const workspace = useWorkspace()
  const store = useSyncExternalStore(subscribe, readStore, readStore)
  const account = user?.authenticated ? `${user.id}:${role}` : role
  const seen = new Set(store[account] || [])
  const current = []
  const add = (id, message, category, type = 'info') => current.push({ id, message, category, type, time: 'Current records', read: false })
  if (role === 'student') {
    data.publications.filter(item => item.active).forEach(item => {
      if (item.type === 'assessment' && !data.attempts.some(attempt => attempt.publication_id === item.id && String(attempt.source_version) === String(item.source_version))) add(`assessment:${item.id}:${item.source_version}`, `Unanswered assessment: ${item.title}`, 'missing_assessment', 'warning')
      else if (item.type !== 'assessment' && !data.accesses.some(access => access.publication_id === item.id)) add(`material:${item.id}:${item.source_version}`, `Not opened: ${item.title}`, 'unopened_material')
    })
  } else if (['dean', 'associate_dean', 'instructor'].includes(role)) {
    data.courses.forEach(course => {
      if (!course.active) add(`syllabus:${course.id}`, `${course.course_code}: no active syllabus in the shared records`, 'syllabus_status', 'warning')
      else if (!data.publications.some(item => item.active && item.course_id === course.id)) add(`delivery:${course.id}`, `${course.course_code}: no published courseware`, 'delivery_gap', 'warning')
    })
    if (role === 'instructor') Object.entries(workspace.content).filter(([, item]) => item.status === 'draft').forEach(([id, item]) => add(`draft:${id}`, `Courseware draft awaiting review: ${item.content.title}`, 'courseware'))
  }
  const notifications = (user?.authenticated ? (loading || error ? [] : current) : ROLE_NOTIFICATIONS[role] || []).map(n => ({ ...n, read: n.read || seen.has(n.id) }))
  const markRead = useCallback(ids => {
    const current = readStore()
    writeStore({ ...current, [account]: [...new Set([...(current[account] || []), ...ids])].slice(-2000) })
  }, [account])
  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markRead,
    markAllRead: () => markRead(notifications.map(n => n.id)),
    loading: user?.authenticated && loading,
    error: user?.authenticated && error,
  }
}
