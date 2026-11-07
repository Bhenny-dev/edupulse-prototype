import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useAcademicRecords } from '../context/AcademicContext'
import AcademicSyncStatus from '../components/academic/AcademicSyncStatus'
import SystemAdminDashboard from './SystemAdminDashboard'
import { SYLLABUS_STATUS_META } from '../data/syllabusStatus'
import { accountManagementModel, accountInstructorModel, accountStudentModel } from './dashboardModels'
import { previewManagementModel, previewInstructorModel, previewStudentModel } from './dashboardPreview'
import { useNavigate } from 'react-router-dom'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import { SkeletonKPI, SkeletonTable } from '../components/ui/LoadingSkeleton'
import '../components/academic/academic.css'
import {
  BookOpen, Users, AlertTriangle, CheckCircle, FileText, TrendingUp, ArrowRight,
  Clock, Target, Sparkles, BarChart3, Eye, Calendar, Download,
  ChevronRight, Activity, Rocket, X, Bot, ClipboardCheck, Bell,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

function AnimatedNumber({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const numVal = typeof value === 'string' ? parseInt(value) : value
    if (isNaN(numVal)) { setDisplay(value); return }
    let start = 0
    const duration = 800
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (numVal - start) * eased))
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }
    ref.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(ref.current)
  }, [value])
  return <span>{typeof display === 'number' ? display : value}{suffix}</span>
}

function KpiCard({ icon: Icon, label, value, color, bg, suffix = '' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: bg }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <div className="kpi-value"><AnimatedNumber value={value} suffix={suffix} /></div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  )
}

// A value an account has not recorded yet shows as a dash, never as zero.
const recorded = (value, suffix) => (value === null || value === undefined ? { value: '—', suffix: '' } : { value, suffix })

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

/* Academic management screens are shared by the distinct Dean and Associate Dean roles. */

function ManagementDashboard({ model, actions = exportButton, status }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const quickActions = [
    { label: 'Load Courses', icon: ClipboardCheck, action: () => navigate('/course-loading'), color: 'var(--green-500)' },
    { label: 'Monitor Delivery', icon: BarChart3, action: () => navigate('/monitor'), color: 'var(--purple-500)' },
    { label: 'Ask Pulse', icon: Sparkles, action: () => pulseBus.say('Hi! What would you like help with today?'), color: 'var(--amber-500)' },
  ]

  return (
    <div className="container">
      <PageHeader title={`${user?.title} Dashboard`} subtitle="College of Information Technology — course loading and delivery monitoring (shared Dean / Associate Dean view)" actions={actions} />
      {status}
      {model && <>
      <div className="kpi-grid mb-24">
        <KpiCard icon={BookOpen} label="Released Courses" value={model.kpis.released} color="var(--sky-500)" bg="var(--sky-100)" />
        <KpiCard icon={ClipboardCheck} label="Courses Loaded" value={model.kpis.loaded} color="var(--purple-500)" bg="var(--purple-100)" />
        <KpiCard icon={CheckCircle} label="Approved Syllabi" value={model.kpis.approved} color="var(--green-500)" bg="var(--green-100)" />
        <KpiCard icon={AlertTriangle} label="Not Yet Routed for Approval" value={model.kpis.notRouted} color="var(--amber-500)" bg="var(--amber-100)" />
      </div>

      <div className="card mb-24">
        <nav className="card-body" aria-label="Quick actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {quickActions.map(a => (
            <button key={a.label} className="btn btn-secondary btn-sm" onClick={a.action}>
              <a.icon size={14} style={{ color: a.color }} /> {a.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <h3>Syllabus Stations</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/monitor?tab=syllabi')}>Monitor <ArrowRight size={14} /></button>
          </div>
          <div className="card-body">
            <p className="text-sm text-muted mb-16">Where every loaded course's syllabus sits in the lifecycle. The signatory chain (Dean → CAO → EVP) runs offline on the downloaded file.</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={model.stations} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Syllabi" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Delivery Progress (Active Courses)</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/monitor?tab=delivery')}>Details <ArrowRight size={14} /></button>
          </div>
          <div className="card-body">
            <p className="text-sm text-muted mb-16">Published courseware against the extracted Course Outline — are the mapped materials and assessments being delivered on schedule?</p>
            {model.delivery.length === 0 ? (
              <p className="text-sm text-muted">No active syllabi yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={model.delivery} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  {model.deliverySeries.map((series, index) => (
                    <Bar key={series.key} dataKey={series.key} stackId="a" fill={series.color} name={series.name} radius={index === model.deliverySeries.length - 1 ? [0, 4, 4, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header"><h3>Faculty Overview</h3></div>
          <div className="card-body">
            {model.faculty.length === 0 && <p className="text-sm text-muted">No instructor accounts or course loads recorded yet.</p>}
            {model.faculty.map(inst => (
              <div key={inst.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--gray-50)', marginBottom: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--sky-300), var(--sky-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.6875rem' }}>{inst.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{inst.name}</div>
                    <div className="text-sm text-muted">{inst.loads} loaded · {inst.active} active</div>
                  </div>
                </div>
                {inst.loads === 0
                  ? <span className="badge badge-draft" style={{ fontSize: '0.6875rem' }}>No load</span>
                  : inst.behind > 0
                    ? <span className="badge badge-drafted" style={{ fontSize: '0.6875rem' }}>{inst.behind} not yet routed</span>
                    : <span className="badge badge-approved" style={{ fontSize: '0.6875rem' }}>On track</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3><Activity size={16} /> Recent Activity</h3></div>
          <div className="card-body">
            <ActivityList items={model.activity} />
          </div>
        </div>
      </div>

      {/* Per-course syllabus status */}
      <div className="card">
        <div className="card-header">
          <h3>Syllabus Status by Course</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/monitor?tab=syllabi')}>Full Monitor <ArrowRight size={14} /></button>
        </div>
        <div className="card-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th><th>Instructor</th><th>Status</th><th>Outline</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {model.courses.length === 0 && <tr><td colSpan={6} className="text-sm text-muted">No loaded courses in the records yet.</td></tr>}
              {model.courses.map(course => {
                const meta = SYLLABUS_STATUS_META[course.status]
                return (
                  <tr key={course.id}>
                    <td><strong>{course.code}</strong><br /><span className="text-sm text-muted">{course.title}</span></td>
                    <td className="text-sm">{course.instructor}</td>
                    <td><span className={`badge badge-${meta?.badge || 'draft'}`} title={meta?.hint}>{meta?.label || course.status}</span></td>
                    <td className="text-sm">{course.status === 'active' ? `${course.outlineWeeks} weeks` : '—'}</td>
                    <td className="text-sm text-muted">{course.updated}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} title="View in Monitor" onClick={() => navigate('/monitor?tab=syllabi')}><Eye size={12} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
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

const QUEUE_PREVIEW = 8

function InstructorDashboard({ model, actions = exportButton, status }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const average = recorded(model?.snapshot.average, '%')

  return (
    <div className="container">
      <PageHeader title="Instructor Dashboard" subtitle={`Welcome back, ${user?.name}`} actions={actions} />
      {status}
      {model && <>
      <OnboardingChecklist autoDone={model.autoDone} />

      <div className="kpi-grid mb-24">
        <KpiCard icon={BookOpen} label="My Courses" value={model.kpis.courses} color="var(--sky-500)" bg="var(--sky-100)" />
        <KpiCard icon={CheckCircle} label="Active Syllabi" value={model.kpis.active} color="var(--green-500)" bg="var(--green-100)" />
        <KpiCard icon={Clock} label="Drafts to Review" value={model.kpis.drafts} color="var(--amber-500)" bg="var(--amber-100)" />
        <KpiCard icon={Target} label="Published Items" value={model.kpis.published} color="var(--purple-500)" bg="var(--purple-100)" />
      </div>

      <div className="card mb-24">
        <nav className="card-body" aria-label="Quick actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/syllabus?tab=builder')}><FileText size={14} style={{ color: 'var(--sky-500)' }} /> Syllabus Builder</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courseware?tab=builder')}><Sparkles size={14} style={{ color: 'var(--purple-500)' }} /> Generate Courseware</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student-monitoring')}><ClipboardCheck size={14} style={{ color: 'var(--green-500)' }} /> Student Monitoring</button>
        </nav>
      </div>

      <div className="card mb-24">
        <div className="card-header"><h3><Users size={16} /> My Block Sections</h3></div>
        <div className="card-body">
          {model.blocks.length === 0 ? (
            <p className="text-sm text-muted">No block sections assigned yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {model.blocks.map(bs => (
                <div key={bs.id} style={{ padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sky-100)', background: 'var(--sky-50)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--sky-600)' }}>{bs.code}</div>
                  <div className="text-sm text-muted">{bs.detail}</div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px', width: '100%' }} onClick={() => navigate('/student-monitoring')}>Student Monitoring <ArrowRight size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Score snapshot — from Student Monitoring */}
      <div className="card mb-24">
        <div className="card-header">
          <h3>Score Snapshot</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student-monitoring')}>Full Monitoring <ArrowRight size={14} /></button>
        </div>
        <div className="card-body">
          <div className="kpi-grid">
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value"><AnimatedNumber value={model.snapshot.students} /></div>
              <div className="kpi-label">Students</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--green-500)' }}><AnimatedNumber value={average.value} suffix={average.suffix} /></div>
              <div className="kpi-label">Avg. Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--red-500)' }}><AnimatedNumber value={model.snapshot.below} /></div>
              <div className="kpi-label">Below 75</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--sky-500)' }}><AnimatedNumber value={model.snapshot.top} /></div>
              <div className="kpi-label">90 and Above</div>
            </div>
          </div>
          <p className="text-sm text-muted" style={{ margin: '12px 0 4px' }}>{model.snapshot.caption}</p>
          {model.snapshot.chart.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={model.snapshot.chart} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="topic" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card mb-24">
        <div className="card-header"><h3><Activity size={16} /> Recent Activity</h3></div>
        <div className="card-body">
          <ActivityList items={model.activity} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>My Courses — Syllabus Stations</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/syllabus')}>Open <ArrowRight size={14} /></button>
          </div>
          <div className="card-body">
            {model.syllabi.length === 0 && <p className="text-sm text-muted">No syllabi yet. Start one in Syllabus Builder.</p>}
            {model.syllabi.map(syl => {
              const meta = SYLLABUS_STATUS_META[syl.status]
              return (
                <div key={syl.id} style={{ padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sky-100)', marginBottom: '10px', background: 'var(--gray-50)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.875rem' }}>{syl.code} — {syl.title}</strong>
                    <span className={`badge badge-${meta?.badge || 'draft'}`} title={meta?.hint}>{meta?.label || syl.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    <span>v{syl.version}</span>
                    <span>{syl.status === 'active' ? `${syl.outlineWeeks} outline weeks` : meta?.hint}</span>
                  </div>
                  <div className="progress-bar mt-8"><div className="progress-fill" style={{ width: `${(meta?.step || 0) * 20}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Courseware Review Queue</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courseware?tab=builder&sub=review')}>View All <ArrowRight size={14} /></button>
          </div>
          <div className="card-body">
            {model.queue.length === 0 && <p className="text-sm text-muted">No drafts are waiting for review.</p>}
            {model.queue.slice(0, QUEUE_PREVIEW).map(cw => (
              <div key={cw.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cw.title}</div>
                  <div className="text-sm text-muted">{cw.detail}</div>
                </div>
                <span className={`badge badge-${cw.status}`}>{cw.status}</span>
              </div>
            ))}
            {model.queue.length > QUEUE_PREVIEW && (
              <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                Showing {QUEUE_PREVIEW} of {model.queue.length} drafts. Use View All to review the rest in Courseware.
              </p>
            )}
          </div>
        </div>
      </div>
      </>}
    </div>
  )
}

/* ───────────────────────── Student ───────────────────────── */

function StudentDashboard({ model, actions, status }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const average = recorded(model?.kpis.average, '%')

  return (
    <div className="container">
      <PageHeader title="Student Dashboard" subtitle={`Welcome back, ${user?.name}`} actions={actions} />
      {status}
      {model && <>
      <div className="kpi-grid mb-24">
        <KpiCard icon={BookOpen} label="Enrolled Courses" value={model.kpis.enrolled} color="var(--sky-500)" bg="var(--sky-100)" />
        <KpiCard icon={TrendingUp} label="Average Score" value={average.value} color="var(--green-500)" bg="var(--green-100)" suffix={average.suffix} />
        <KpiCard icon={Target} label="Topics Mastered" value={model.kpis.mastered} color="var(--purple-500)" bg="var(--purple-100)" />
        <KpiCard icon={Clock} label="Pending Activities" value={model.kpis.pending} color="var(--amber-500)" bg="var(--amber-100)" />
      </div>

      {/* Pulse guidance — reminders only, never answers */}
      <div className="card mb-24" style={{ borderLeft: '4px solid var(--amber-500)' }}>
        <div className="card-header">
          <h3><Bell size={16} /> Pulse Reminders</h3>
          <span className="text-sm text-muted">Guidance only — Pulse never answers or reviews assessment items</span>
        </div>
        <div className="card-body">
          {model.reminders.length === 0 && <p className="text-sm text-muted">Nothing pending: no unopened materials or unanswered assessments in your published records.</p>}
          {model.reminders.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--amber-50, #fffbeb)', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8125rem' }}>{r.text}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(r.path)} style={{ flexShrink: 0 }}>Go <ArrowRight size={12} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Block info — from the EduSuite class list */}
      {model.block && (
        <div className="card mb-24" style={{ borderLeft: '4px solid var(--sky-500)' }}>
          <div className="card-header">
            <h3><Users size={16} /> My Block</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div><span className="text-muted">Block: </span><strong>{model.block.code}</strong></div>
              <div><span className="text-muted">Year Level: </span><strong>{model.block.year}</strong></div>
              <div><span className="text-muted">Students: </span><strong>{model.block.students}</strong></div>
              <div><span className="text-muted">Adviser: </span><strong>{model.block.adviser}</strong></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2 mb-24">
        {model.courses.map(course => (
          <div key={course.code} className="card">
            <div className="card-header">
              <h3>{course.code}</h3>
              <span className="badge badge-published">Active</span>
            </div>
            <div className="card-body">
              <p style={{ fontWeight: 600, marginBottom: '12px' }}>{course.title}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '6px' }}>
                <span>Latest recorded score</span><span style={{ fontWeight: 600 }}>{course.score === null ? 'No score yet' : `${course.score}%`}</span>
              </div>
              <div className="progress-bar mb-16"><div className="progress-fill" style={{ width: `${course.score || 0}%` }} /></div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courseware')}><BookOpen size={12} /> Materials</button>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/assessment')}><FileText size={12} /> Assessments</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grounding transparency — teacher-approved sources only */}
      <div className="card mb-24" style={{ borderLeft: '4px solid var(--sky-500)' }}>
        <div className="card-header">
          <h3><CheckCircle size={16} /> Learning Material Sources</h3>
          <span className="badge badge-connected" style={{ fontSize: '0.625rem' }}>Instructor-verified</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: 10 }}>
            Your learning materials are grounded in the approved syllabus and instructor-provided sources.
          </p>
          {model.sources.length === 0 && <p className="text-sm text-muted">No enrolled courses yet.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {model.sources.map(course => (
              <div key={course.code} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6 }}>{course.code}</div>
                {course.items.length > 0 ? course.items.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: '0.75rem' }}>
                    <CheckCircle size={10} style={{ color: 'var(--green-500)', flexShrink: 0 }} />
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

      <div className="card mb-24">
        <div className="card-header"><h3>My Score Trend</h3></div>
        <div className="card-body">
          {model.trend.length === 0 ? <p className="text-sm text-muted">No marked attempts yet. Your trend appears after your first marked assessment.</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={model.trend} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis domain={model.trendDomain} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Upcoming published assessments */}
      <div className="card">
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
  const workspace = useWorkspace()
  const { data, error, loading, loaded } = useAcademicRecords()
  const role = user?.role
  const exportRecords = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'edupulse-authorized-records.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const actions = (
    <div className="academic-actions">
      <AcademicSyncStatus />
      <button className="btn btn-secondary btn-sm" disabled={loading || !loaded || !!error} onClick={exportRecords} title="Export authorized records"><Download size={14} /> Export</button>
    </div>
  )
  const status = <>
    {error && <div role="alert" className="connected-pulse-warning">{error}</div>}
    {loading && !loaded && <section className="academic-loading" aria-label="Loading academic records"><p role="status" className="text-sm text-muted mb-16">Loading authorized academic records…</p><div aria-hidden="true"><div className="kpi-grid mb-24">{Array.from({ length: 4 }, (_, index) => <SkeletonKPI key={index} />)}</div><SkeletonTable rows={4} cols={4} /></div></section>}
    {loaded && !error && !data.courses.length && <div className="empty-state mb-24" role="status"><h2>No authorized academic records yet</h2><p>Instructors register confirmed class lists, activate an approved syllabus, review courseware and publish it. Students need a matching account email in the registered class list. Saved workspaces synchronize automatically.</p></div>}
  </>
  if (role === 'dean' || role === 'associate_dean') return <ManagementDashboard model={loaded ? accountManagementModel(data) : null} actions={actions} status={status} />
  if (role === 'instructor') return <InstructorDashboard model={loaded ? accountInstructorModel(data, workspace) : null} actions={actions} status={status} />
  return <StudentDashboard model={loaded ? accountStudentModel(data, user) : null} actions={actions} status={status} />
}

// The system admin has a separate operations console. Every other role uses the
// same dashboard components for previews and accounts; only the data source differs.
export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'admin') return <SystemAdminDashboard />
  if (user?.authenticated) return <AccountDashboard />
  if (user?.role === 'dean' || user?.role === 'associate_dean') return <ManagementDashboard model={previewManagementModel()} />
  if (user?.role === 'instructor') return <InstructorDashboard model={previewInstructorModel(user)} />
  return <StudentDashboard model={previewStudentModel(user)} />
}
