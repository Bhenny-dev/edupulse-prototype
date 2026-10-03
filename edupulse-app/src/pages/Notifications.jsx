import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../data/notifications'
import { Bell, Check, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react'

const ICON_MAP = { warning: AlertTriangle, success: CheckCircle, error: AlertTriangle, info: Info }
const CATEGORY_LABELS = {
  syllabus_status: 'Syllabus Status', delivery_gap: 'Delivery Gap', course_loading: 'Course Loading',
  records: 'Records', courseware: 'Courseware', unopened_material: 'Unopened Material',
  missing_assessment: 'Missing Assessment', assessment: 'Assessment',
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.role)
  const [filter, setFilter] = useState('all')

  const categories = ['all', 'unread', ...new Set(notifications.map(n => n.category))]

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter !== 'all' && n.category !== filter) return false
    return true
  })

  return (
    <div className="container">
      <div className="page-header">
        <h1>Notifications</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={markAllRead} disabled={!unreadCount}>
            <Check size={14} /> Mark All Read
          </button>
        </div>
      </div>

      <div className="tabs mb-24" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {categories.map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ whiteSpace: 'nowrap' }}>
            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : CATEGORY_LABELS[f] || f}
            {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
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
              <div key={n.id} role={n.read ? undefined : 'button'} tabIndex={n.read ? undefined : 0} title={n.read ? undefined : 'Mark as read'}
                onClick={n.read ? undefined : () => markRead([n.id])} onKeyDown={n.read ? undefined : e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markRead([n.id]) } }} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: n.read ? 'default' : 'pointer',
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
