import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useAcademicRecords } from '../context/AcademicContext'
import useAcademicTerm from '../components/academic/useAcademicTerm'
import LoadTermFilter from '../components/academic/LoadTermFilter'
import {recordsForLoadTerm} from '../utils/loadTerms'
import AcademicSyncStatus from '../components/academic/AcademicSyncStatus'
import SystemAdminDashboard from './SystemAdminDashboard'
import SummaryCard from '../components/ui/SummaryCard'
import InstructorOverview from '../components/courseware/InstructorOverview'
import ClassCard, { ClassCardGrid } from '../components/ui/ClassCard'
import DataTable, { StatusPill } from '../components/ui/DataTable'
import { SYLLABUS_STATUS_META } from '../data/syllabusStatus'
import { accountManagementModel, accountStudentModel } from './dashboardModels'
import {curriculumLabel} from '../utils/curriculumMetadata'
import { previewManagementModel, previewInstructorModel, previewStudentModel } from './dashboardPreview'
import { useNavigate } from 'react-router-dom'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import { SkeletonKPI, SkeletonTable } from '../components/ui/LoadingSkeleton'
import '../components/academic/academic.css'
import {
  BookOpen, AlertTriangle, CheckCircle, FileText, TrendingUp, ArrowRight,
  Clock, Target, Sparkles, BarChart3, Download,
  ChevronRight, Activity, Rocket, X, Bot, ClipboardCheck, Bell,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

function AnimatedNumber({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const numVal = typeof value === 'string' ? parseInt(value) : value
    if (isNaN(numVal)||window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplay(value); return }
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

function KpiCard({ icon: Icon, label, value, color, bg, suffix = '', to }) {
  return <SummaryCard icon={Icon} label={label} value={value} color={color} bg={bg} to={to} description={`${value}${suffix}`}><AnimatedNumber value={value} suffix={suffix}/></SummaryCard>
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

/* Academic management screens are shared by the distinct Dean and Program Coordinator roles. */

function ManagementDashboard({ model, actions = exportButton, status }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const quickActions = [
    { label: ['dean','associate_dean'].includes(user?.role)?'View Course':'Load Courses', icon: ClipboardCheck, action: () => navigate(['dean','associate_dean'].includes(user?.role)?'/records':'/course-loading'), color: 'var(--green-500)' },
    { label: 'Monitor Delivery', icon: BarChart3, action: () => navigate('/monitor'), color: 'var(--purple-500)' },
    { label: 'Ask Pulse', icon: Sparkles, action: () => pulseBus.say('Hi! What would you like help with today?'), color: 'var(--amber-500)' },
  ]

  return (
    <div className="container">
      <PageHeader title={`${user?.title} Dashboard`} subtitle={['dean','associate_dean'].includes(user?.role)?'Courses, instructors and recorded student activity':'College of Information Technology — course loading and delivery monitoring'} actions={actions} />
      {status}
      {model && <>
      <div className="kpi-grid mb-24">
        <KpiCard icon={BookOpen} label="Released Courses" value={model.kpis.released} color="var(--sky-500)" bg="var(--sky-100)" to={['dean','associate_dean'].includes(user?.role)?'/records?tab=courses':undefined}/>
        <KpiCard icon={ClipboardCheck} label="Courses Loaded" value={model.kpis.loaded} color="var(--purple-500)" bg="var(--purple-100)" to={['dean','associate_dean'].includes(user?.role)?'/records?tab=loads':undefined}/>
        <KpiCard icon={CheckCircle} label="Approved Syllabi" value={model.kpis.approved} color="var(--green-500)" bg="var(--green-100)" to={['dean','associate_dean'].includes(user?.role)?'/monitor?tab=overview':undefined}/>
        <KpiCard icon={AlertTriangle} label="Not Yet Routed for Approval" value={model.kpis.notRouted} color="var(--amber-500)" bg="var(--amber-100)" to={['dean','associate_dean'].includes(user?.role)?'/monitor?tab=overview':undefined}/>
      </div>

      <nav className="home-actions mb-24" aria-label="Quick actions">
        {quickActions.map(a => (
          <button key={a.label} className="btn btn-secondary btn-sm" onClick={a.action}>
            <a.icon size={14} style={{ color: a.color }} /> {a.label}
          </button>
        ))}
      </nav>

      {/* Charts sit on flat surfaces; every list below is a filtered table (UI redesign U4). */}
      <div className="grid-2">
        <section className="home-section">
          <div className="home-section-head">
            <h2>Syllabus Stations</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/monitor?tab=overview')}>Monitor <ArrowRight size={14} /></button>
          </div>
          <div className="home-feed" style={{ padding: 16 }}>
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
        </section>

        <section className="home-section">
          <div className="home-section-head">
            <h2>Delivery Progress (Active Courses)</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/monitor?tab=overview')}>Details <ArrowRight size={14} /></button>
          </div>
          <div className="home-feed" style={{ padding: 16 }}>
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
        </section>
      </div>

      <section className="home-section">
        <div className="home-section-head">
          <h2>Syllabus Status by Course</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/monitor?tab=overview')}>Full Monitor <ArrowRight size={14} /></button>
        </div>
        <DataTable label="Syllabus status by course" rows={model.courses} searchPlaceholder="Search courses or instructors" empty="No loaded courses in the records yet."
          filters={[{ key: 'status', label: 'Statuses', value: course => SYLLABUS_STATUS_META[course.status]?.label || course.status }, { key: 'instructor', label: 'Instructors' }]}
          onRowClick={() => navigate('/monitor?tab=overview')}
          columns={[
            { key: 'code', label: 'Course', value: course => `${course.code} ${course.title}`, render: course => <span style={{ display: 'flex', flexDirection: 'column' }}><span>{course.code}</span><small className="text-muted" style={{ fontWeight: 400 }}>{course.title}</small></span> },
            { key: 'instructor', label: 'Instructor' },
            { key: 'status', label: 'Status', value: course => SYLLABUS_STATUS_META[course.status]?.label || course.status, render: course => { const meta = SYLLABUS_STATUS_META[course.status]; return <span className={`badge badge-${meta?.badge || 'draft'}`} title={meta?.hint}>{meta?.label || course.status}</span> } },
            { key: 'outlineWeeks', label: 'Outline', searchable: false, render: course => course.status === 'active' ? `${course.outlineWeeks} weeks` : '—' },
            { key: 'updated', label: 'Updated', searchable: false, sortable: false },
          ]} />
      </section>

      <div className="grid-2">
        <section className="home-section">
          <h2>Faculty Overview</h2>
          <DataTable label="Faculty overview" dense pageSize={8} rows={model.faculty} searchPlaceholder="Search instructors" empty="No instructor accounts or course loads recorded yet."
            tabs={[{ key: 'all', label: 'All' }, { key: 'none', label: 'No load', match: inst => inst.loads === 0 }, { key: 'behind', label: 'Not yet routed', match: inst => inst.loads > 0 && inst.behind > 0 }, { key: 'track', label: 'On track', match: inst => inst.loads > 0 && !inst.behind }]}
            onRowClick={() => navigate('/instructors')}
            columns={[
              { key: 'name', label: 'Instructor' },
              { key: 'loads', label: 'Loads', searchable: false, render: inst => `${inst.loads} loaded · ${inst.active} active` },
              { key: 'behind', label: 'Status', searchable: false, render: inst => inst.loads === 0 ? <StatusPill>No load</StatusPill> : inst.behind > 0 ? <StatusPill tone="warning">{inst.behind} not yet routed</StatusPill> : <StatusPill tone="success">On track</StatusPill> },
            ]} />
        </section>

        <section className="home-section">
          <h2>Recent Activity</h2>
          <div className="home-feed"><ActivityList items={model.activity} /></div>
        </section>
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
        <KpiCard icon={BookOpen} label="My Courses" value={model.kpis.courses} color="var(--sky-500)" bg="var(--sky-100)" to="/courseware" />
        <KpiCard icon={CheckCircle} label="Active Syllabi" value={model.kpis.active} color="var(--green-500)" bg="var(--green-100)" to="/syllabus?tab=mine&status=active" />
        <KpiCard icon={Clock} label="Drafts to Review" value={model.kpis.drafts} color="var(--amber-500)" bg="var(--amber-100)" to="/courseware?status=draft" />
        <KpiCard icon={Target} label="Published Items" value={model.kpis.published} color="var(--purple-500)" bg="var(--purple-100)" to="/courseware?status=published" />
      </div>

      <nav className="home-actions mb-24" aria-label="Quick actions">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/syllabus?tab=builder')}><FileText size={14} style={{ color: 'var(--sky-500)' }} /> Syllabus Builder</button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courseware?tab=builder')}><Sparkles size={14} style={{ color: 'var(--purple-500)' }} /> Generate Courseware</button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student-monitoring')}><ClipboardCheck size={14} style={{ color: 'var(--green-500)' }} /> Student Monitoring</button>
      </nav>

      {/* Classroom Home: one card per block, opening that block's monitoring. */}
      <section className="home-section">
        <h2>My Block Sections</h2>
        {model.blocks.length === 0 ? <p className="text-sm text-muted">No block sections assigned yet.</p> : <ClassCardGrid>
          {model.blocks.map(bs => <ClassCard key={bs.id} code={bs.code} subtitle={bs.detail}
            to={bs.courseId ? `/student-monitoring?tab=assessments&course=${encodeURIComponent(bs.courseId)}&block=${encodeURIComponent(bs.code)}` : '/student-monitoring'}
            items={bs.course.split('; ').map(course => ({ key: course, label: course }))} meta={<span>Student Monitoring <ArrowRight size={12} aria-hidden="true" /></span>} />)}
        </ClassCardGrid>}
      </section>

      {/* Score snapshot — from Student Monitoring */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>Score Snapshot</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student-monitoring')}>Full Monitoring <ArrowRight size={14} /></button>
        </div>
        <div>
          {model.snapshot.average===null ? <p className="academic-empty">No marked scores yet. Published assessment results appear here after submission and any required instructor marking.</p> : <><div className="kpi-grid">
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value"><span>{model.snapshot.students}</span></div>
              <div className="kpi-label">Students</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--green-500)' }}><span>{average.value}{average.suffix}</span></div>
              <div className="kpi-label">Avg. Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--red-500)' }}><span>{model.snapshot.below}</span></div>
              <div className="kpi-label">Below 75</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--sky-500)' }}><span>{model.snapshot.top}</span></div>
              <div className="kpi-label">90 and Above</div>
            </div>
          </div>
          {model.snapshot.scored!==undefined&&<p className="text-sm text-muted">{model.snapshot.scored} {model.snapshot.scored===1?'student':'students'} with marked results. Unsubmitted and unmarked work is excluded.</p>}
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
          {(model.snapshot.results||[]).length>0&&<DataTable label="Marked assessment results" dense pageSize={10} rows={model.snapshot.results.map(item=>({...item,assessment:`Week ${item.week} · ${item.title}`}))}
            filters={[{key:'course',label:'Courses'}]} searchPlaceholder="Search assessments"
            columns={[{key:'course',label:'Course'},{key:'assessment',label:'Assessment'},{key:'score',label:'Average',searchable:false,render:item=>`${item.score}%`},{key:'marked',label:'Marked results',searchable:false}]} />}
          </>}
        </div>
      </section>

      <section className="home-section">
        <h2>Recent Activity</h2>
        <div className="home-feed"><ActivityList items={model.activity} /></div>
      </section>

      {/* Lists are tables with inline filters (UI redesign rule 6). */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>My Courses — Syllabus Stations</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/syllabus')}>Open <ArrowRight size={14} /></button>
        </div>
        <DataTable label="Syllabus stations" rows={model.syllabi} empty="No syllabi yet. Start one in Syllabus Builder." searchPlaceholder="Search courses"
          filters={[{ key: 'status', label: 'Statuses', value: syl => SYLLABUS_STATUS_META[syl.status]?.label || syl.status }]}
          onRowClick={() => navigate('/syllabus?tab=mine')}
          columns={[
            { key: 'code', label: 'Course', value: syl => `${syl.code} — ${syl.title}` },
            { key: 'status', label: 'Status', value: syl => SYLLABUS_STATUS_META[syl.status]?.label || syl.status, render: syl => { const meta = SYLLABUS_STATUS_META[syl.status]; return <span className={`badge badge-${meta?.badge || 'draft'}`} title={meta?.hint}>{meta?.label || syl.status}</span> } },
            { key: 'version', label: 'Version', searchable: false, render: syl => `v${syl.version}` },
            { key: 'outlineWeeks', label: 'Outline', searchable: false, render: syl => syl.status === 'active' ? `${syl.outlineWeeks} weeks` : SYLLABUS_STATUS_META[syl.status]?.hint },
          ]} />
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>Courseware Review Queue</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courseware?tab=builder&sub=review')}>View All <ArrowRight size={14} /></button>
        </div>
        <DataTable label="Courseware review queue" rows={model.queue} pageSize={QUEUE_PREVIEW} empty="No drafts are waiting for review." searchPlaceholder="Search drafts"
          onRowClick={() => navigate('/courseware?tab=builder&sub=review')}
          columns={[{ key: 'title', label: 'Draft' }, { key: 'detail', label: 'Details' }, { key: 'status', label: 'Status', render: cw => <StatusPill tone="warning">{cw.status}</StatusPill> }]} />
      </section>
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

      {/* Classroom To-do: Pulse reminders as one table with status tabs (blue delivered, orange due soon, red missed). Guidance only. */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>Pulse Reminders</h2>
          <span className="text-sm text-muted">Guidance only — Pulse never answers or reviews assessment items</span>
        </div>
        <DataTable label="Pulse reminders" rows={model.reminders} searchPlaceholder="Search reminders" dense
          empty="Nothing pending: no unopened materials or unanswered assessments in your published records."
          tabs={[{ key: 'all', label: 'All' }, { key: 'blue', label: 'Assigned', match: r => (r.state || 'blue') === 'blue' }, { key: 'orange', label: 'Due soon', match: r => r.state === 'orange' }, { key: 'red', label: 'Missing', match: r => r.state === 'red' }]}
          rowProps={r => ({ 'data-reminder': r.state || 'blue' })} onRowClick={r => navigate(r.path)}
          columns={[
            { key: 'text', label: 'Work' },
            { key: 'state', label: 'Status', width: 220, searchable: false, value: r => REMINDER_LOOK[r.state || 'blue'].label, render: r => { const look = REMINDER_LOOK[r.state] || REMINDER_LOOK.blue; return <span style={{ color: look.color, fontSize: '0.8125rem' }}><StatusPill tone={r.state === 'red' ? 'danger' : r.state === 'orange' ? 'warning' : 'info'}>{look.label}</StatusPill>{r.when ? ` · ${r.when}` : ''}</span> } },
            { key: 'go', label: '', sortable: false, searchable: false, width: 80, render: r => <button className="btn btn-secondary btn-sm" onClick={() => navigate(r.path)}>Go <ArrowRight size={12} /></button> },
          ]} />
      </section>

      {/* Block info — from the EduSuite class list */}
      {model.block && (
        <section className="home-section">
          <h2>My Block</h2>
          <dl className="home-stats">
            <div><dt>Block</dt><dd>{model.block.code}</dd></div>
            <div><dt>Year level</dt><dd>{model.block.year}</dd></div>
            <div><dt>Students</dt><dd>{model.block.students}</dd></div>
            <div><dt>Adviser</dt><dd>{model.block.adviser}</dd></div>
          </dl>
        </section>
      )}

      {/* Classroom Home: one card per enrolled class. */}
      {model.courses.length > 0 && <section className="home-section">
        <h2>My Classes</h2>
        <ClassCardGrid>{model.courses.map(course => <ClassCard key={course.id || course.code} code={course.code} title={course.title}
          to={course.id ? `/courseware?course=${encodeURIComponent(course.id)}` : '/courseware'} subtitle={curriculumLabel(course.code)}
          items={[{ key: 'score', label: 'Latest recorded score', detail: course.score === null ? 'No score yet' : `${course.score}%` }]}
          meta={<span>{course.suspended ? 'Suspended' : course.available === false ? 'Awaiting release' : 'Active'}</span>} />)}</ClassCardGrid>
      </section>}

      <section className="home-section">
        <h2>Upcoming Activities</h2>
        <DataTable label="Upcoming activities" rows={model.upcoming} searchPlaceholder="Search activities" empty="No upcoming deadlines in the published records."
          filters={[{ key: 'course', label: 'Courses' }, { key: 'type', label: 'Types' }]}
          columns={[{ key: 'title', label: 'Activity' }, { key: 'course', label: 'Course' }, { key: 'type', label: 'Type' }, { key: 'due', label: 'Due', searchable: false }]} />
      </section>

      <section className="home-section">
        <h2>My Score Trend</h2>
        <div className="home-feed" style={{ padding: 16 }}>
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
      </section>

      {/* Grounding transparency — teacher-approved sources only */}
      <section className="home-section">
        <div className="home-section-head">
          <h2>Learning Material Sources</h2>
          <span className="badge badge-connected" style={{ fontSize: '0.625rem' }}>Instructor-verified</span>
        </div>
        <p className="text-sm text-muted mb-16">Your learning materials are grounded in the approved syllabus and instructor-provided sources.</p>
        <DataTable label="Learning material sources" dense pageSize={10} searchPlaceholder="Search sources" empty="No enrolled courses yet."
          rows={model.sources.flatMap(course => course.items.length ? course.items.map(p => ({ ...p, key: `${course.code}:${p.id}`, course: course.code })) : [{ key: course.code, course: course.code, label: 'No published sources yet' }])}
          rowKey="key" filters={[{ key: 'course', label: 'Courses' }]}
          columns={[{ key: 'course', label: 'Course', width: 140 }, { key: 'label', label: 'Source', render: p => p.href ? <a href={p.href} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>{p.label}</a> : p.label }]} />
      </section>
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
  const { data:allData, error, loading, loaded } = useAcademicRecords()
  const {term}=useAcademicTerm()
  const data=recordsForLoadTerm(allData,term)
  const role = user?.role
  const actions = (
    <div className="academic-actions">
      <LoadTermFilter data={allData}/><AcademicSyncStatus />
    </div>
  )
  const status = <>
    {error && <div role="alert" className="connected-pulse-warning">{error}</div>}
    {loading && !loaded && <section className="academic-loading" aria-label="Loading academic records"><p role="status" className="text-sm text-muted mb-16">Loading authorized academic records…</p><div aria-hidden="true"><div className="kpi-grid mb-24">{Array.from({ length: 4 }, (_, index) => <SkeletonKPI key={index} />)}</div><SkeletonTable rows={4} cols={4} /></div></section>}
    {loaded && !error && role !== 'instructor' && !data.courses.length && <div className="empty-state mb-24" role="status"><h2>No authorized academic records yet</h2><p>Instructors register confirmed class lists, activate an approved syllabus, review courseware and publish it. Students need a matching account email in the registered class list. Saved workspaces synchronize automatically.</p></div>}
  </>
  if (role === 'dean' || role === 'associate_dean') return <ManagementDashboard model={loaded ? accountManagementModel(data) : null} actions={actions} status={status} />
  if (role === 'instructor') return <InstructorOverview data={data} loaded={loaded} actions={actions} status={status} />
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
