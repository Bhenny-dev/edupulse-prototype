import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Bell, Check, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react'

// Notifications — SYSTEM_SPEC §5. Unopened-material and unanswered-assessment
// reminders fan out to BOTH the instructor and the student; syllabus-status
// and delivery-gap notices go to the Dean / Associate Dean (shared 'admin' role).
const ALL_NOTIFICATIONS = {
  admin: [
    { id: 1, message: 'IT 107 (Sir Rogelio L. Guisdan) is still Drafted — not yet checked or routed for approval', time: '2h ago', type: 'warning', category: 'syllabus_status', read: false },
    { id: 2, message: 'WMAD 303-1 approved file uploaded — Course Outline extraction pending', time: '1d ago', type: 'info', category: 'syllabus_status', read: true },
    { id: 3, message: 'IT 106 has no published courseware for Week 4 of its outline yet', time: '1d ago', type: 'warning', category: 'delivery_gap', read: true },
    { id: 4, message: 'Marielle Angela Fianza-Buya confirmed AI-proposed loading for 4 courses', time: '3d ago', type: 'success', category: 'course_loading', read: true },
    { id: 5, message: 'EduSuite class list import completed — 387 records', time: '1w ago', type: 'info', category: 'records', read: true },
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

const ICON_MAP = { warning: AlertTriangle, success: CheckCircle, error: AlertTriangle, info: Info }
const CATEGORY_LABELS = {
  syllabus_status: 'Syllabus Status', delivery_gap: 'Delivery Gap', course_loading: 'Course Loading',
  records: 'Records', courseware: 'Courseware', unopened_material: 'Unopened Material',
  missing_assessment: 'Missing Assessment', assessment: 'Assessment',
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS[user?.role] || [])
  const [filter, setFilter] = useState('all')

  const categories = ['all', 'unread', ...new Set(notifications.map(n => n.category))]

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter !== 'all' && n.category !== filter) return false
    return true
  })

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  return (
    <div className="container">
      <div className="page-header">
        <h1>Notifications</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            <Check size={14} /> Mark All Read
          </button>
        </div>
      </div>

      <div className="tabs mb-24" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {categories.map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ whiteSpace: 'nowrap' }}>
            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : CATEGORY_LABELS[f] || f}
            {f === 'unread' && notifications.filter(n => !n.read).length > 0 && ` (${notifications.filter(n => !n.read).length})`}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={36} /></div>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          filtered.map(n => {
            const Icon = ICON_MAP[n.type] || Info
            return (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '16px 20px', borderRadius: 'var(--radius-lg)',
                background: n.read ? 'var(--white)' : 'var(--sky-50)',
                border: `1px solid ${n.read ? 'var(--gray-100)' : 'var(--sky-200)'}`,
                transition: 'all 200ms',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-full)',
                  background: n.type === 'warning' ? 'var(--amber-100)' : n.type === 'success' ? 'var(--green-100)' : n.type === 'error' ? 'var(--red-100)' : 'var(--sky-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={16} style={{ color: n.type === 'warning' ? 'var(--amber-500)' : n.type === 'success' ? 'var(--green-500)' : n.type === 'error' ? 'var(--red-500)' : 'var(--sky-500)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>{n.message}</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    <span><Clock size={12} /> {n.time}</span>
                    <span>{CATEGORY_LABELS[n.category] || n.category}</span>
                  </div>
                </div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: 'var(--radius-full)', background: 'var(--sky-500)', flexShrink: 0, marginTop: '6px' }} />}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
