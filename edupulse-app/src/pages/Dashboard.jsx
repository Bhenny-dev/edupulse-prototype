import StudentHome from '../components/academic/StudentHome'
import { useAuth } from '../context/AuthContext'
import { useAcademicRecords } from '../context/AcademicContext'
import useAcademicTerm from '../components/academic/useAcademicTerm'
import LoadTermFilter from '../components/academic/LoadTermFilter'
import {recordsForLoadTerm} from '../utils/loadTerms'
import AcademicSyncStatus from '../components/academic/AcademicSyncStatus'
import SystemAdminDashboard from './SystemAdminDashboard'
import InstructorHome from '../components/classroom/InstructorHome'
import AcademicManagement from '../components/academic/AcademicManagement'
import StaffCourseLoads from '../components/academic/StaffCourseLoads'
import { useAcademicTabs } from '../components/academic/AcademicUI'
import { accountManagementModel, accountStudentModel } from './dashboardModels'
import { previewInstructorModel, previewStudentModel } from './dashboardPreview'
import { deanPreview } from '../components/academic/deanPreview'
import { useNavigate } from 'react-router-dom'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import { SkeletonKPI, SkeletonTable } from '../components/ui/LoadingSkeleton'
import '../components/academic/academic.css'
import {
  AlertTriangle, CheckCircle, FileText, ArrowRight, BookOpen,
  Target, Sparkles, Calendar, Download,
  ChevronRight, Activity, Rocket, X, Bot, ClipboardCheck, Bell,
} from 'lucide-react'
import { useMemo, useState } from 'react'

const ACTIVITY_STYLE = {
  published: [CheckCircle, 'var(--green-500)'], syllabus: [FileText, 'var(--sky-500)'], drafted: [Sparkles, 'var(--purple-500)'],
  loading: [ClipboardCheck, 'var(--sky-400)'], reminder: [Bell, 'var(--amber-500)'], review: [Target, 'var(--purple-500)'],
  revision: [AlertTriangle, 'var(--amber-500)'], workspace: [Activity, 'var(--sky-500)'],
}

function ActivityList({ items }) {
  if (!items.length) return <p className="text-sm text-muted">No recorded academic activity yet.</p>
  return items.map((item, i) => {
    const [Icon, color] = ACTIVITY_STYLE[item.kind] || ACTIVITY_STYLE.workspace
    return (
      <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
        <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.8125rem' }}><strong>{item.actor}</strong> {item.action}{item.target && <> <strong>{item.target}</strong></>}</p>
          <span className="text-sm text-muted">{item.time}</span>
        </div>
      </div>
    )
  })
}

function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p className="text-sm text-muted mt-8">{subtitle}</p>
      </div>
      {actions}
    </div>
  )
}

const exportButton = <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>

/* Academic management screens are shared by the distinct Dean and Program Coordinator roles. */

function RecentActivity({ items }) {
  return <div className="card">
    <div className="card-header"><h3><Activity size={16} /> Recent Activity</h3></div>
    <div className="card-body"><ActivityList items={items} /></div>
  </div>
}

const STAFF_VIEWS = [['loads', 'Instructor course loads'], ['overview', 'Syllabus & Delivery'], ['alerts', 'Alerts']]
function StaffDashboard({ data, loaded, actions, status, term }) {
  const { user } = useAuth()
  const { key, nav } = useAcademicTabs({ items: STAFF_VIEWS, label: 'Monitor views', fallback: 'loads' })
  return (
    <div className="container academic-portal" data-pulse-zone={key === 'loads' ? 'course-loading' : 'monitor'} data-pulse-target="Dashboard">
      <PageHeader title={`${user?.title} Dashboard`} subtitle={user.authenticated ? 'Course loading and instructor oversight' : 'Preview sample records'} actions={actions} />
      {status}
      {loaded && <>
        {nav}
        {key === 'loads' ? <StaffCourseLoads data={data} {...term} canInspect={user.authenticated} /> : <>
          <AcademicManagement data={data} view="monitor" monitorTab={key} />
          <div className="mt-24"><RecentActivity items={accountManagementModel(data).activity} /></div>
        </>}
      </>}
    </div>
  )
}

/* ───────────────────────── Instructor ───────────────────────── */

const ONBOARDING_STEPS = [
  { id: 'onb-1', label: 'Build or upload a syllabus (Phase 2)', path: '/syllabus', icon: FileText },
  { id: 'onb-2', label: 'Generate courseware from your extracted outline', path: '/courseware', icon: Sparkles },
  { id: 'onb-3', label: 'Open Student Monitoring (track scores & access)', path: '/student-monitoring', icon: ClipboardCheck },
  { id: 'onb-4', label: 'Say hi to Pulse, your AI guide', action: 'pulse', icon: Bot },
]

// Steps completed by saved work (autoDone) count alongside the steps ticked on this device.
function OnboardingChecklist({ autoDone = [] }) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('edupulse-onboarding-done') === 'true')
  const [completedSteps, setCompletedSteps] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edupulse-onboarding-steps') || '[]') } catch { return [] }
  })
  const [expanded, setExpanded] = useState(true)

  if (dismissed) return null

  const done = new Set([...completedSteps, ...autoDone])
  const progress = Math.round((done.size / ONBOARDING_STEPS.length) * 100)

  const toggleStep = (id) => {
    const next = completedSteps.includes(id) ? completedSteps.filter(s => s !== id) : [...completedSteps, id]
    setCompletedSteps(next)
    localStorage.setItem('edupulse-onboarding-steps', JSON.stringify(next))
    if (new Set([...next, ...autoDone]).size === ONBOARDING_STEPS.length) {
      setTimeout(() => {
        setDismissed(true)
        localStorage.setItem('edupulse-onboarding-done', 'true')
      }, 1500)
    }
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem('edupulse-onboarding-done', 'true')
  }

  return (
    <div style={{ background: 'var(--onboarding-bg, linear-gradient(135deg, #EFF6FF, #F0F9FF, #FAF5FF))', borderRadius: 16, padding: 20, marginBottom: 24, border: '1.5px solid var(--sky-200)', boxShadow: 'var(--shadow-3d)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? 12 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--sky-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Getting Started with EduPulse</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', margin: 0 }}>
              {done.size}/{ONBOARDING_STEPS.length} steps complete · {progress}%
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setExpanded(!expanded)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4 }}>
            <ChevronRight size={16} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button onClick={dismiss} title="Dismiss"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      </div>
      {expanded && (
        <>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--gray-200)', marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, borderRadius: 3, background: progress === 100 ? 'var(--success)' : 'var(--sky-500)', transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {ONBOARDING_STEPS.map(step => {
              const isDone = done.has(step.id)
              const Icon = step.icon
              return (
                <button key={step.id} onClick={() => {
                  if (isDone) return
                  if (step.action === 'pulse') pulseBus.say('Hi! What would you like help with today?')
                  else navigate(step.path)
                  toggleStep(step.id)
                }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                    border: isDone ? '1.5px solid var(--success)' : '1.5px solid var(--gray-200)',
                    background: isDone ? 'var(--green-100)' : 'var(--white)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    opacity: isDone ? 0.8 : 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8,
                    background: isDone ? 'var(--success)' : 'var(--sky-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isDone ? <CheckCircle size={14} style={{ color: '#fff' }} /> : <Icon size={14} style={{ color: 'var(--sky-600)' }} />}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: isDone ? 600 : 500,
                    color: isDone ? 'var(--success)' : 'var(--gray-700)',
                    textDecoration: isDone ? 'line-through' : 'none' }}>
                    {step.label}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}


// Preview instructor Home: getting started and recent activity from the sample workspace. A signed-in
// instructor's Home lists their classes (InstructorHome).
function InstructorDashboard({ model, actions = exportButton, status }) {
  const { user } = useAuth()

  return (
    <div className="container">
      <PageHeader title="Home" subtitle={`Welcome back, ${user?.name}`} actions={actions} />
      {status}
      {model && <>
      <OnboardingChecklist autoDone={model.autoDone} />
      <RecentActivity items={model.activity} />
      </>}
    </div>
  )
}

/* ───────────────────────── Student ───────────────────────── */

// Reminder colors: blue for delivered work, orange within 3 days of the due date, red once it is missed (Manila time).
const REMINDER_LOOK = {
  blue: { label: 'Delivered', color: 'var(--sky-700)', background: 'var(--sky-50)' },
  orange: { label: 'Due soon', color: 'var(--amber-700)', background: 'var(--amber-100)' },
  red: { label: 'Missed', color: 'var(--red-700)', background: 'var(--red-100)' },
}

// Preview student Home: reminders, upcoming activities and the recorded sources from the sample records.
// A signed-in student's Home is StudentHome (classes and Join class).
function StudentDashboard({ model, actions, status }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="container">
      <PageHeader title="Home" subtitle={`Welcome back, ${user?.name}`} actions={actions} />
      {status}
      {model && <>
      {/* Pulse guidance — reminders only, never answers */}
      <div className="card mb-24">
        <div className="card-header" style={{flexWrap:'wrap',gap:'12px'}}>
          <h3><Bell size={16} /> Pulse Reminders</h3>
          <span className="text-sm text-muted">Guidance only — Pulse never answers or reviews assessment items</span>
        </div>
        <div className="card-body">
          {model.reminders.length === 0 && <p className="text-sm text-muted">Nothing pending: no unopened materials or unanswered assessments in your published records.</p>}
          {model.reminders.map(r => {
            const look = REMINDER_LOOK[r.state] || REMINDER_LOOK.blue
            return (
              <div key={r.id} data-reminder={r.state || 'blue'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: look.background, borderLeft: `4px solid ${look.color}`, marginBottom: '6px' }}>
                <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.8125rem' }}>{r.text}</span>
                  <span style={{ fontSize: '0.75rem', color: look.color }}><strong>{look.label}</strong>{r.when ? ` · ${r.when}` : ''}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(r.path)} style={{ flexShrink: 0 }}>Go <ArrowRight size={12} /></button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming published assessments */}
      <div className="card mb-24">
        <div className="card-header"><h3><Calendar size={16} /> Upcoming Activities</h3></div>
        <div className="card-body">
          {model.upcoming.length === 0 && <p className="text-sm text-muted">No upcoming deadlines in the published records.</p>}
          {model.upcoming.map(act => (
            <div key={act.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', marginBottom: '6px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{act.title}</div>
                <div className="text-sm text-muted">{act.course} · {act.type}</div>
              </div>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--amber-500)' }}>Due: {act.due}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grounding transparency — teacher-approved sources only */}
      <div className="card">
        <div className="card-header">
          <h3><BookOpen size={16} /> Learning Material Sources</h3>
          <span className="badge" style={{ fontSize: '0.625rem' }}>Recorded sources</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: 10 }}>
            References recorded for your enrolled courses are listed below.
          </p>
          {model.sources.length === 0 && <p className="text-sm text-muted">No enrolled courses yet.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {model.sources.map(course => (
              <div key={course.code} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6 }}>{course.code}</div>
                {course.items.length > 0 ? course.items.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: '0.75rem' }}>
                    <BookOpen size={10} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
                    {p.href
                      ? <a href={p.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-600)', overflowWrap: 'anywhere' }}>{p.label}</a>
                      : <span style={{ color: 'var(--gray-600)' }}>{p.label}</span>}
                  </div>
                )) : <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>No published sources yet</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      </>}
    </div>
  )
}

/* ───────────────────────── Signed-in accounts ───────────────────────── */

// Accounts see the same role dashboards as the previews, filled from their
// authorized records (the account-scoped RLS projection) and their own workspace.
// Missing records stay empty; they never fall back to the preview samples.
function AccountDashboard() {
  const { user } = useAuth()
  const records = useAcademicRecords()
  const role = user?.role
  // A Dean or Program Coordinator preview persona reads the sample Dean records, like its other pages.
  const preview = !user?.authenticated
  const previewData = useMemo(() => preview ? deanPreview() : null, [preview])
  const allData = previewData || records.data
  const { error, loading } = records, loaded = records.loaded || preview
  const term = useAcademicTerm()
  const data = useMemo(() => recordsForLoadTerm(allData, term.term), [allData, term.term])
  const actions = (
    <div className="academic-actions">
      <LoadTermFilter data={allData}/>{!preview && <AcademicSyncStatus />}
    </div>
  )
  const status = <>
    {error && <div role="alert" className="connected-pulse-warning">{error}</div>}
    {loading && !loaded && <section className="academic-loading" aria-label="Loading academic records"><p role="status" className="text-sm text-muted mb-16">Loading authorized academic records…</p><div aria-hidden="true"><div className="kpi-grid mb-24">{Array.from({ length: 4 }, (_, index) => <SkeletonKPI key={index} />)}</div><SkeletonTable rows={4} cols={4} /></div></section>}
    {loaded && !error && role === 'student' && !data.courses.length && <div className="empty-state mb-24" role="status"><h2>No authorized academic records yet</h2><p>Instructors register confirmed class lists, activate an approved syllabus, review courseware and publish it. Students need a matching account email in the registered class list. Saved workspaces synchronize automatically.</p></div>}
  </>
  if (role === 'dean' || role === 'associate_dean') return <StaffDashboard data={data} loaded={loaded} actions={actions} status={status} term={term} />
  if (role === 'instructor') return <InstructorHome data={data} loaded={loaded} actions={actions} status={status} />
  return <StudentDashboard model={loaded ? accountStudentModel(data, user) : null} actions={actions} status={status} />
}

// The system admin has a separate operations console. Every other role uses the
// same dashboard components for previews and accounts; only the data source differs.
export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'student' && user?.authenticated) return <StudentHome />
  if (user?.role === 'admin') return <SystemAdminDashboard />
  if (user?.authenticated || user?.role === 'dean' || user?.role === 'associate_dean') return <AccountDashboard />
  if (user?.role === 'instructor') return <InstructorDashboard model={previewInstructorModel(user)} />
  return <StudentDashboard model={previewStudentModel(user)} />
}
