import { SkeletonContent } from '../components/ui/LoadingFeedback'
import DataTable, { StatusPill } from '../components/ui/DataTable'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../data/notifications'
import { Check, AlertTriangle, Info, CheckCircle } from 'lucide-react'

const ICON_MAP = { warning: AlertTriangle, success: CheckCircle, error: AlertTriangle, info: Info }
const ICON_TONE = { warning: 'var(--amber-600)', success: 'var(--green-600)', error: 'var(--red-600)', info: 'var(--sky-600)' }
const CATEGORY_LABELS = {
  academic: 'Academic Notices', syllabus_status: 'Syllabus Status', delivery_gap: 'Delivery Gap', course_loading: 'Course Loading',
  records: 'Records', courseware: 'Courseware', unopened_material: 'Unopened Material',
  missing_assessment: 'Missing Assessment', assessment: 'Assessment',
}
const categoryOf = notice => CATEGORY_LABELS[notice.category] || notice.category || 'Other'
const TABS = [{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread', match: notice => !notice.read }]

// One table for every notice (UI redesign rule 6): status tabs, a category filter and search replace
// the per-notice cards. A row or its "Mark read" button marks one notice read.
export default function NotificationCenter() {
  const { user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead, loading, error } = useNotifications(user?.role)
  const columns = [
    { key: 'message', label: 'Notice', render: notice => {
      const Icon = ICON_MAP[notice.type] || Info
      return <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10, fontWeight: notice.read ? 500 : 700 }}>
        <Icon size={16} aria-hidden="true" style={{ color: ICON_TONE[notice.type] || ICON_TONE.info, flexShrink: 0, marginTop: 2 }} />
        <span>{notice.message}</span>
      </span>
    } },
    { key: 'category', label: 'Category', value: categoryOf, width: 180 },
    { key: 'time', label: 'When', sortable: false, searchable: false, width: 140 },
    { key: 'read', label: 'Status', searchable: false, width: 150, value: notice => notice.read ? 'Read' : 'Unread', render: notice => notice.read
      ? <StatusPill>Read</StatusPill>
      : <button type="button" className="btn btn-ghost btn-sm" onClick={() => markRead([notice.id])}><Check size={14} /> Mark read</button> },
  ]

  return (
    <div className="container">
      <div className="page-header">
        <h1>Notifications</h1>
        <button className="btn btn-secondary btn-sm" onClick={markAllRead} disabled={!unreadCount}>
          <Check size={14} /> Mark All Read
        </button>
      </div>

      {user?.authenticated && <p className="text-sm text-muted mb-16">Academic notices and read receipts are saved to your account. Current-record reminders are also shown; their read state is retained on this device.</p>}
      {loading && !notifications.length && <SkeletonContent label="Loading record notices…" rows={3} />}
      {error && <p role="alert">{error}</p>}
      {!(loading && !notifications.length) && <DataTable
        label="Notifications" columns={columns} rows={notifications} tabs={TABS}
        filters={[{ key: 'category', label: 'Categories', value: categoryOf }]}
        searchPlaceholder="Search notices" empty="No notifications yet." noMatch="No notices match the current records and filter."
        onRowClick={notice => { if (!notice.read) markRead([notice.id]) }}
      />}
    </div>
  )
}
