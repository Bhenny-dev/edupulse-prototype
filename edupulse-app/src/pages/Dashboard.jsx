import { useAuth } from '../context/AuthContext'
import {
  ADMIN_STATS, DEFAULT_SYLLABI, COURSEWARE_ITEMS, STUDENT_RECORDS, INSTRUCTORS,
  RAG_GROUNDING_PASSAGES, BLOCK_SECTIONS, CURRICULUM_COURSES, SYLLABUS_STATUS_META, SYLLABUS_STATUS_ORDER,
} from '../data/mockData'
import { useNavigate } from 'react-router-dom'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import {
  BookOpen, Users, AlertTriangle, CheckCircle, FileText, TrendingUp, ArrowRight,
  Clock, Target, Sparkles, BarChart3, Eye, Calendar, Download,
  ChevronRight, Activity, Rocket, X, Bot, ClipboardCheck, Bell,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

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

// Recent activity in the flow's own vocabulary — no in-system approvals, no
// integrity flags, no ops telemetry (all outside the confirmed business flow).
const ACTIVITY_FEED = [
  { actor: 'Sir Rogelio L. Guisdan', action: 'published', target: 'Week 3 — Variables & Data Types: Guided Practice', time: '2h ago', icon: CheckCircle, color: 'var(--green-500)' },
  { actor: 'Sir Rogelio L. Guisdan', action: 'uploaded the approved syllabus for', target: 'WMAD 303-1', time: '1d ago', icon: FileText, color: 'var(--sky-500)' },
  { actor: 'AI (Auto mode)', action: 'drafted', target: '3 courseware items from the IT 106 outline', time: '2d ago', icon: Sparkles, color: 'var(--purple-500)' },
  { actor: 'Marielle Angela Fianza-Buya', action: 'confirmed AI-proposed loading for', target: '4 courses', time: '3d ago', icon: ClipboardCheck, color: 'var(--sky-400)' },
  { actor: 'System', action: 'reminded 5 students about', target: 'unopened Week 1 materials', time: '4d ago', icon: Bell, color: 'var(--amber-500)' },
]

/* ───────────────────────── Admin (Dean / Associate Dean, one shared role) ───────────────────────── */

function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Syllabus station distribution — "does an approved syllabus exist?" at a glance.
  const stationData = SYLLABUS_STATUS_ORDER.map(status => ({
    name: SYLLABUS_STATUS_META[status].label,
    count: DEFAULT_SYLLABI.filter(s => s.status === status).length,
  }))

  // Delivery progress per active course: published items vs. outline weeks.
  const deliveryData = DEFAULT_SYLLABI.filter(s => s.status === 'active').map(s => {
    const published = COURSEWARE_ITEMS.filter(c => c.syllabusId === s.id && c.status === 'published').length
    const checked = COURSEWARE_ITEMS.filter(c => c.syllabusId === s.id && c.status === 'checked').length
    return { name: s.courseCode, published, checked }
  })

  const quickActions = [
    { label: 'Load Courses', icon: ClipboardCheck, action: () => navigate('/course-loading'), color: 'var(--green-500)' },
    { label: 'Monitor Delivery', icon: BarChart3, action: () => navigate('/monitor'), color: 'var(--purple-500)' },
    { label: 'Ask Pulse', icon: Sparkles, action: () => pulseBus.say('Hi! What would you like help with today?'), color: 'var(--amber-500)' },
  ]

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>{user?.title} Dashboard</h1>
          <p className="text-sm text-muted mt-8">College of Information Technology — course loading and delivery monitoring (shared Dean / Associate Dean view)</p>
        </div>
        <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
      </div>

      <div className="kpi-grid mb-24">
        <KpiCard icon={BookOpen} label="Released Courses" value={ADMIN_STATS.totalCourses} color="var(--sky-500)" bg="var(--sky-100)" />
        <KpiCard icon={ClipboardCheck} label="Courses Loaded" value={ADMIN_STATS.coursesLoaded} color="var(--purple-500)" bg="var(--purple-100)" />
        <KpiCard icon={CheckCircle} label="Approved Syllabi" value={ADMIN_STATS.approvedSyllabi} color="var(--green-500)" bg="var(--green-100)" />
        <KpiCard icon={AlertTriangle} label="Not Yet Routed for Approval" value={ADMIN_STATS.deliveryGaps} color="var(--amber-500)" bg="var(--amber-100)" />
      </div>

      <div className="card mb-24">
        <div className="card-body" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {quickActions.map(a => (
            <button key={a.label} className="btn btn-secondary btn-sm" onClick={a.action}>
              <a.icon size={14} style={{ color: a.color }} /> {a.label}
            </button>
          ))}
        </div>
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
              <BarChart data={stationData} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
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
            {deliveryData.length === 0 ? (
              <p className="text-sm text-muted">No active syllabi yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deliveryData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="published" stackId="a" fill="#22c55e" name="Published" />
                  <Bar dataKey="checked" stackId="a" fill="#38bdf8" radius={[0, 4, 4, 0]} name="Checked (unpublished)" />
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
            {INSTRUCTORS.map(inst => {
              const loads = DEFAULT_SYLLABI.filter(s => s.instructorId === inst.id)
              const activeCount = loads.filter(s => s.status === 'active').length
              const behind = loads.filter(s => s.status === 'drafted' || s.status === 'checked').length
              return (
                <div key={inst.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--gray-50)', marginBottom: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--sky-300), var(--sky-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.6875rem' }}>{inst.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{inst.name}</div>
                      <div className="text-sm text-muted">{loads.length} loaded · {activeCount} active</div>
                    </div>
                  </div>
                  {loads.length === 0
                    ? <span className="badge badge-draft" style={{ fontSize: '0.6875rem' }}>No load</span>
                    : behind > 0
                      ? <span className="badge badge-drafted" style={{ fontSize: '0.6875rem' }}>{behind} not yet routed</span>
                      : <span className="badge badge-approved" style={{ fontSize: '0.6875rem' }}>On track</span>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3><Activity size={16} /> Recent Activity</h3></div>
          <div className="card-body">
            {ACTIVITY_FEED.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < ACTIVITY_FEED.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={14} style={{ color: item.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.8125rem' }}><strong>{item.actor}</strong> {item.action} <strong>{item.target}</strong></p>
                  <span className="text-sm text-muted">{item.time}</span>
                </div>
              </div>
            ))}
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
              {DEFAULT_SYLLABI.map(syl => {
                const inst = INSTRUCTORS.find(i => i.id === syl.instructorId)
                const meta = SYLLABUS_STATUS_META[syl.status]
                return (
                  <tr key={syl.id}>
                    <td><strong>{syl.courseCode}</strong><br /><span className="text-sm text-muted">{syl.courseTitle}</span></td>
                    <td className="text-sm">{inst?.name}</td>
                    <td><span className={`badge badge-${meta?.badge || 'draft'}`} title={meta?.hint}>{meta?.label || syl.status}</span></td>
                    <td className="text-sm">{syl.status === 'active' ? `${syl.courseOutline?.length || 0} weeks` : '—'}</td>
                    <td className="text-sm text-muted">{syl.lastUpdated}</td>
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

function OnboardingChecklist() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('edupulse-onboarding-done') === 'true')
  const [completedSteps, setCompletedSteps] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edupulse-onboarding-steps') || '[]') } catch { return [] }
  })
  const [expanded, setExpanded] = useState(true)

  if (dismissed) return null

  const progress = Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100)

  const toggleStep = (id) => {
    const next = completedSteps.includes(id) ? completedSteps.filter(s => s !== id) : [...completedSteps, id]
    setCompletedSteps(next)
    localStorage.setItem('edupulse-onboarding-steps', JSON.stringify(next))
    if (next.length === ONBOARDING_STEPS.length) {
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
    <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF, #FAF5FF)', borderRadius: 16, padding: 20, marginBottom: 24, border: '1.5px solid var(--sky-200)', boxShadow: 'var(--shadow-3d)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? 12 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--sky-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Getting Started with EduPulse</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', margin: 0 }}>
              {completedSteps.length}/{ONBOARDING_STEPS.length} steps complete · {progress}%
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
              const done = completedSteps.includes(step.id)
              const Icon = step.icon
              return (
                <button key={step.id} onClick={() => {
                  if (done) return
                  if (step.action === 'pulse') pulseBus.say('Hi! What would you like help with today?')
                  else navigate(step.path)
                  toggleStep(step.id)
                }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                    border: done ? '1.5px solid var(--success)' : '1.5px solid var(--gray-200)',
                    background: done ? 'var(--green-100)' : 'var(--white)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    opacity: done ? 0.8 : 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8,
                    background: done ? 'var(--success)' : 'var(--sky-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {done ? <CheckCircle size={14} style={{ color: '#fff' }} /> : <Icon size={14} style={{ color: 'var(--sky-600)' }} />}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: done ? 600 : 500,
                    color: done ? 'var(--success)' : 'var(--gray-700)',
                    textDecoration: done ? 'line-through' : 'none' }}>
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

function InstructorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const mySyllabi = DEFAULT_SYLLABI.filter(s => s.instructorId === user?.id)
  const myCourseware = COURSEWARE_ITEMS.filter(c => mySyllabi.some(s => s.id === c.syllabusId))
  const myBlockSections = BLOCK_SECTIONS.filter(s => s.adviserId === user?.id)
  // STUDENT_RECORDS stores the block code (not a blockSectionId FK) — match on that.
  const myStudents = STUDENT_RECORDS.filter(stu => myBlockSections.some(bs => bs.code === stu.section))

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Instructor Dashboard</h1>
          <p className="text-sm text-muted mt-8">Welcome back, {user?.name}</p>
        </div>
        <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
      </div>

      <OnboardingChecklist />

      <div className="kpi-grid mb-24">
        <KpiCard icon={BookOpen} label="My Courses" value={mySyllabi.length} color="var(--sky-500)" bg="var(--sky-100)" />
        <KpiCard icon={CheckCircle} label="Active Syllabi" value={mySyllabi.filter(s => s.status === 'active').length} color="var(--green-500)" bg="var(--green-100)" />
        <KpiCard icon={Clock} label="Drafts to Review" value={myCourseware.filter(c => c.status === 'draft').length} color="var(--amber-500)" bg="var(--amber-100)" />
        <KpiCard icon={Target} label="Published Items" value={myCourseware.filter(c => c.status === 'published').length} color="var(--purple-500)" bg="var(--purple-100)" />
      </div>

      <div className="card mb-24">
        <div className="card-body" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/syllabus?tab=builder')}><FileText size={14} style={{ color: 'var(--sky-500)' }} /> Syllabus Builder</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/courseware?tab=builder')}><Sparkles size={14} style={{ color: 'var(--purple-500)' }} /> Generate Courseware</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student-monitoring')}><ClipboardCheck size={14} style={{ color: 'var(--green-500)' }} /> Student Monitoring</button>
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <h3>My Courses — Syllabus Stations</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/syllabus')}>Open <ArrowRight size={14} /></button>
          </div>
          <div className="card-body">
            {mySyllabi.map(syl => {
              const meta = SYLLABUS_STATUS_META[syl.status]
              return (
                <div key={syl.id} style={{ padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sky-100)', marginBottom: '10px', background: 'var(--gray-50)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.875rem' }}>{syl.courseCode} — {syl.courseTitle}</strong>
                    <span className={`badge badge-${meta?.badge || 'draft'}`} title={meta?.hint}>{meta?.label || syl.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    <span>v{syl.version}</span>
                    <span>{syl.status === 'active' ? `${syl.courseOutline?.length || 0} outline weeks` : meta?.hint}</span>
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
            {myCourseware.map(cw => (
              <div key={cw.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cw.title}</div>
                  <div className="text-sm text-muted">{cw.type} · {cw.aiGenerated ? 'AI-generated · ' : ''}{cw.generatedAt}</div>
                </div>
                <span className={`badge badge-${cw.status}`}>{cw.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mb-24">
        <div className="card-header"><h3><Users size={16} /> My Block Sections</h3></div>
        <div className="card-body">
          {myBlockSections.length === 0 ? (
            <p className="text-sm text-muted">No block sections assigned yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {myBlockSections.map(bs => (
                <div key={bs.id} style={{ padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sky-100)', background: 'var(--sky-50)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--sky-600)' }}>{bs.code}</div>
                  <div className="text-sm text-muted">{ordinal(bs.yearLevel)} Year · {bs.students} students</div>
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
              <div className="kpi-value"><AnimatedNumber value={myStudents.length} /></div>
              <div className="kpi-label">Students</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--green-500)' }}><AnimatedNumber value={myStudents.length ? Math.round(myStudents.reduce((acc, s) => acc + (s.courses[0]?.scores.midterm || 0), 0) / myStudents.length) : 0} suffix="%" /></div>
              <div className="kpi-label">Avg. Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--red-500)' }}><AnimatedNumber value={myStudents.filter(s => (s.courses[0]?.scores.midterm || 0) < 75).length} /></div>
              <div className="kpi-label">Below 75</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div className="kpi-value" style={{ color: 'var(--sky-500)' }}><AnimatedNumber value={myStudents.filter(s => (s.courses[0]?.scores.midterm || 0) >= 90).length} /></div>
              <div className="kpi-label">90 and Above</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DEFAULT_SYLLABI[0]?.topics.map(t => ({
              topic: t.title.substring(0, 10),
              avg: myStudents.length ? Math.round(myStudents.reduce((a, s) => a + (s.courses[0]?.topics[t.id] || 0), 0) / myStudents.length) : 0,
            }))} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="topic" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><Activity size={16} /> Recent Activity</h3></div>
        <div className="card-body">
          {ACTIVITY_FEED.slice(0, 3).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--gray-100)' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <item.icon size={14} style={{ color: item.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8125rem' }}><strong>{item.actor}</strong> {item.action} <strong>{item.target}</strong></p>
                <span className="text-sm text-muted">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Student ───────────────────────── */

const TREND_DATA = [
  { week: 'W1', score: 72 }, { week: 'W2', score: 75 }, { week: 'W3', score: 78 }, { week: 'W4', score: 80 },
  { week: 'W5', score: 83 }, { week: 'W6', score: 81 }, { week: 'W7', score: 85 }, { week: 'W8', score: 88 },
]

function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const me = STUDENT_RECORDS.find(s => s.name === user?.name)
  const myBlockSection = me ? BLOCK_SECTIONS.find(bs => bs.code === me.section) : null
  const myCourses = me ? me.courses : []

  // AI guide surface (Phase 4): reminders about unopened materials and
  // unanswered assessments — guidance only, never answers.
  const reminders = [
    { text: 'You haven\'t opened "Week 1 — What is Programming: Lecture Notes" yet.', action: () => navigate('/courseware') },
    { text: 'Unanswered assessment: "Week 1 — Recitation & Short Quiz".', action: () => navigate('/assessment') },
  ]

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Student Dashboard</h1>
          <p className="text-sm text-muted mt-8">Welcome back, {user?.name}</p>
        </div>
      </div>

      <div className="kpi-grid mb-24">
        <KpiCard icon={BookOpen} label="Enrolled Courses" value={myCourses.length} color="var(--sky-500)" bg="var(--sky-100)" />
        <KpiCard icon={TrendingUp} label="Average Score" value={myCourses.length ? Math.round(myCourses.reduce((a, s) => a + (s.scores.midterm || 0), 0) / myCourses.length) : 0} color="var(--green-500)" bg="var(--green-100)" suffix="%" />
        <KpiCard icon={Target} label="Topics Mastered" value={me ? Object.values(myCourses[0]?.topics || {}).filter(v => v >= 75).length : 0} color="var(--purple-500)" bg="var(--purple-100)" />
        <KpiCard icon={Clock} label="Pending Activities" value={reminders.length} color="var(--amber-500)" bg="var(--amber-100)" />
      </div>

      {/* Pulse guidance — reminders only, never answers */}
      <div className="card mb-24" style={{ borderLeft: '4px solid var(--amber-500)' }}>
        <div className="card-header">
          <h3><Bell size={16} /> Pulse Reminders</h3>
          <span className="text-sm text-muted">Guidance only — Pulse never answers or reviews assessment items</span>
        </div>
        <div className="card-body">
          {reminders.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--amber-50, #fffbeb)', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8125rem' }}>{r.text}</span>
              <button className="btn btn-secondary btn-sm" onClick={r.action} style={{ flexShrink: 0 }}>Go <ArrowRight size={12} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Block info — from the EduSuite class list */}
      {myBlockSection && (
        <div className="card mb-24" style={{ borderLeft: '4px solid var(--sky-500)' }}>
          <div className="card-header">
            <h3><Users size={16} /> My Block</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div><span className="text-muted">Block: </span><strong>{myBlockSection.code}</strong></div>
              <div><span className="text-muted">Year Level: </span><strong>Year {myBlockSection.yearLevel}</strong></div>
              <div><span className="text-muted">Students: </span><strong>{myBlockSection.students}</strong></div>
              <div><span className="text-muted">Adviser: </span><strong>{INSTRUCTORS.find(i => i.id === myBlockSection.adviserId)?.name}</strong></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2 mb-24">
        {myCourses.map(course => (
          <div key={course.code} className="card">
            <div className="card-header">
              <h3>{course.code}</h3>
              <span className="badge badge-published">Active</span>
            </div>
            <div className="card-body">
              <p style={{ fontWeight: 600, marginBottom: '12px' }}>{CURRICULUM_COURSES.find(s => s.code === course.code)?.title || course.code}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '6px' }}>
                <span>Latest recorded score</span><span style={{ fontWeight: 600 }}>{Math.round(course.scores.midterm || 0)}%</span>
              </div>
              <div className="progress-bar mb-16"><div className="progress-fill" style={{ width: `${Math.round(course.scores.midterm || 0)}%` }} /></div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {myCourses.map(course => {
              const coursePassages = RAG_GROUNDING_PASSAGES.filter(p => p.courseCode === course.code && !p.sensitive)
              return (
                <div key={course.code} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 6 }}>{course.code}</div>
                  {coursePassages.length > 0 ? coursePassages.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: '0.75rem' }}>
                      <CheckCircle size={10} style={{ color: 'var(--green-500)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--gray-600)' }}>{p.docName}</span>
                    </div>
                  )) : <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>No published sources yet</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card mb-24">
        <div className="card-header"><h3>My Score Trend</h3></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={TREND_DATA} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming published assessments */}
      <div className="card">
        <div className="card-header"><h3><Calendar size={16} /> Upcoming Activities</h3></div>
        <div className="card-body">
          {[
            { title: 'Week 1 — Recitation & Short Quiz: Programming Basics', course: 'IT 102', due: 'Jul 15, 2026', type: 'Quiz' },
            { title: 'Week 4 — Conditional Statements: Seatwork & Quiz', course: 'IT 102', due: 'Jul 18, 2026', type: 'Activity' },
            { title: 'Week 3 — Variables & Data Types: Quiz', course: 'IT 102', due: 'Jul 20, 2026', type: 'Activity' },
          ].map((act, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', marginBottom: '6px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{act.title}</div>
                <div className="text-sm text-muted">{act.course} · {act.type}</div>
              </div>
              <div className="text-sm" style={{ fontWeight: 600, color: 'var(--amber-500)' }}>Due: {act.due}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// One dashboard per role — Dean and Associate Dean share the admin view
// (FLOW_SPEC ground truth #5: same role, one shared UI).
export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'instructor') return <InstructorDashboard />
  return <StudentDashboard />
}
