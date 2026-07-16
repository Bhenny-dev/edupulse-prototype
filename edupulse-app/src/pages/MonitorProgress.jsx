import { useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_SYLLABI, INSTRUCTORS, BLOCK_SECTIONS, CURRICULUM_COURSES, STUDENT_RECORDS, COURSEWARE_ITEMS, SYLLABUS_STATUS_META } from '../data/mockData'
import {
  TrendingUp, AlertTriangle, Users, BookOpen, FileText,
  Check, Clock, X, ChevronDown, ChevronRight, Bell,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// Monitor — FLOW_SPEC Phase 5, Dean / Associate Dean view. Two questions per
// instructor and course: (1) does an approved syllabus exist? (2) are the
// mapped teaching materials and assessments being delivered on the outline's
// schedule? Plus student oversight (students within the courses each
// instructor handles). Graphs for visualization — no compliance scores, no
// grades, no in-system approvals.

/* ───────────────────── Syllabus Status Tab ───────────────────── */
function SyllabusStatusTab() {
  const [expandedInstructor, setExpandedInstructor] = useState(null)

  const totalCourses = CURRICULUM_COURSES.length

  const instructorData = INSTRUCTORS.map(inst => {
    const syllabi = DEFAULT_SYLLABI.filter(s => s.instructorId === inst.id)
    const approved = syllabi.filter(s => s.status === 'approved_uploaded' || s.status === 'active').length
    const active = syllabi.filter(s => s.status === 'active').length
    const inApproval = syllabi.filter(s => s.status === 'downloaded_for_approval').length
    const notRouted = syllabi.filter(s => s.status === 'drafted' || s.status === 'checked').length
    return { ...inst, syllabi, approved, active, inApproval, notRouted, loadCount: syllabi.length }
  })

  const totalApproved = instructorData.reduce((sum, i) => sum + i.approved, 0)
  const totalActive = instructorData.reduce((sum, i) => sum + i.active, 0)
  const totalLoaded = instructorData.reduce((sum, i) => sum + i.loadCount, 0)

  const chartData = instructorData.map(i => ({
    name: i.name.split(' ').pop(),
    approved: i.approved,
    active: i.active,
  }))

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Syllabus Status</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 24 }}>
        Per instructor and per course: does an approved syllabus exist, and has its Course Outline been extracted?
        (The approval itself happens offline: Dean review → CAO approval → EVP noting.)
      </p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Courses Loaded', value: `${totalLoaded} / ${totalCourses}`, sub: 'of released courses', color: 'var(--sky-500)', icon: BookOpen },
          { label: 'Approved Syllabi', value: `${totalApproved} / ${totalLoaded}`, sub: 'signed file uploaded', color: 'var(--green-500)', icon: Check },
          { label: 'Active (Outline Extracted)', value: `${totalActive} / ${totalApproved}`, sub: 'driving courseware', color: 'var(--purple-500)', icon: TrendingUp },
          { label: 'Not Yet Routed', value: totalLoaded - totalApproved - instructorData.reduce((s, i) => s + i.inApproval, 0), sub: 'still drafted / checked', color: 'var(--amber-500)', icon: Clock },
        ].map(card => (
          <div key={card.label} style={{
            padding: 16, borderRadius: 'var(--radius-xl)', background: 'var(--white)',
            border: '1px solid var(--gray-200)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <card.icon size={18} style={{ color: card.color }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{
        padding: 24, borderRadius: 'var(--radius-xl)', background: 'var(--white)',
        border: '1px solid var(--gray-200)', marginBottom: 24,
      }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem', marginBottom: 16 }}>By Instructor</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
            <Tooltip />
            <Bar dataKey="approved" fill="#0ea5e9" name="Approved Syllabi" radius={[0, 4, 4, 0]} />
            <Bar dataKey="active" fill="#22c55e" name="Active (Extracted)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Instructor breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {instructorData.map(inst => {
          const isExpanded = expandedInstructor === inst.id
          const approvedRate = inst.loadCount > 0 ? Math.round((inst.approved / inst.loadCount) * 100) : 0
          return (
            <div key={inst.id} style={{
              border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)',
              background: 'var(--white)', overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpandedInstructor(isExpanded ? null : inst.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                  padding: '16px 20px', border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--sky-300), var(--sky-400))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0,
                }}>
                  {inst.name.split(' ')[1]?.charAt(0) || inst.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{inst.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {inst.approved} approved · {inst.active} active · {inst.inApproval} out for approval · {inst.notRouted} not routed · {inst.loadCount} loaded
                  </div>
                </div>
                <div style={{
                  width: 100, height: 6, borderRadius: 3, background: 'var(--gray-100)', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${approvedRate}%`, height: '100%', borderRadius: 3,
                    background: approvedRate >= 80 ? 'var(--green-500)' : approvedRate >= 50 ? 'var(--sky-500)' : 'var(--amber-500)',
                  }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-600)', minWidth: 36, textAlign: 'right' }}>
                  {approvedRate}%
                </span>
                {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--gray-400)' }} /> : <ChevronRight size={16} style={{ color: 'var(--gray-400)' }} />}
              </button>
              {isExpanded && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--gray-100)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', marginTop: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.75rem' }}>Course</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.75rem' }}>Station</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.75rem' }}>Outline</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.75rem' }}>Next Step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inst.syllabi.map(syl => {
                        const meta = SYLLABUS_STATUS_META[syl.status]
                        return (
                          <tr key={syl.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 600 }}>{syl.courseCode}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{syl.courseTitle}</div>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className={`badge badge-${meta?.badge || 'draft'}`} style={{ fontSize: '0.6875rem' }} title={meta?.hint}>{meta?.label || syl.status}</span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {syl.status === 'active'
                                ? <Check size={16} style={{ color: 'var(--green-500)' }} />
                                : <X size={16} style={{ color: 'var(--gray-300)' }} />}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--gray-500)' }}>{meta?.hint}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────── Delivery Progress Tab ───────────────────── */
function DeliveryTab() {
  const [expanded, setExpanded] = useState(null)

  // Delivery per active course: published items vs the outline's weeks.
  const activeCourses = DEFAULT_SYLLABI.filter(s => s.status === 'active').map(syl => {
    const items = COURSEWARE_ITEMS.filter(c => c.syllabusId === syl.id)
    const published = items.filter(c => c.status === 'published')
    const checkedItems = items.filter(c => c.status === 'checked')
    const drafts = items.filter(c => c.status === 'draft')
    const inst = INSTRUCTORS.find(i => i.id === syl.instructorId)
    const weeks = syl.courseOutline?.length || 0
    const weeksCovered = new Set(published.map(c => c.week).filter(Boolean)).size
    return { syl, inst, items, published, checkedItems, drafts, weeks, weeksCovered }
  })

  const totalPublishedMaterials = activeCourses.reduce((s, c) => s + c.published.filter(i => i.type !== 'assessment').length, 0)
  const totalPublishedAssessments = activeCourses.reduce((s, c) => s + c.published.filter(i => i.type === 'assessment').length, 0)
  const totalDrafts = activeCourses.reduce((s, c) => s + c.drafts.length, 0)

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Delivery Progress</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 24 }}>
        Are the mapped teaching materials and assessments being delivered on the Course Outline's schedule?
      </p>

      <div data-pulse-help="delivery-gap" tabIndex={0} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24, outline: 'none' }}>
        {[
          { label: 'Active Courses', value: activeCourses.length, color: 'var(--sky-500)', icon: BookOpen },
          { label: 'Published Materials & Activities', value: totalPublishedMaterials, color: 'var(--green-500)', icon: FileText },
          { label: 'Published Assessments', value: totalPublishedAssessments, color: 'var(--purple-500)', icon: Check },
          { label: 'Drafts Awaiting Review', value: totalDrafts, color: 'var(--amber-500)', icon: Clock },
        ].map(card => (
          <div key={card.label} style={{
            padding: 16, borderRadius: 'var(--radius-xl)', background: 'var(--white)',
            border: '1px solid var(--gray-200)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <card.icon size={18} style={{ color: card.color }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activeCourses.length === 0 && (
          <p className="text-sm text-muted">No active syllabi yet — delivery starts once an approved syllabus's outline is extracted.</p>
        )}
        {activeCourses.map(({ syl, inst, published, checkedItems, drafts, weeks, weeksCovered }) => {
          const isExpanded = expanded === syl.id
          const coverage = weeks > 0 ? Math.round((weeksCovered / weeks) * 100) : 0
          return (
            <div key={syl.id} style={{
              border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)',
              background: 'var(--white)', overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpanded(isExpanded ? null : syl.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, width: '100%',
                  padding: '16px 20px', border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--purple-300), var(--purple-400))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                }}>
                  {syl.courseCode.split(' ')[0].slice(0, 4)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{syl.courseCode} — {syl.courseTitle}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {inst?.name} · {published.length} published · {checkedItems.length} checked · {drafts.length} drafts · {weeksCovered}/{weeks} outline weeks covered
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--gray-100)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${coverage}%`, height: '100%', borderRadius: 3,
                      background: coverage >= 80 ? 'var(--green-500)' : coverage >= 40 ? 'var(--sky-500)' : 'var(--amber-500)',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--gray-500)' }}>{coverage}%</span>
                </div>
                {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--gray-400)' }} /> : <ChevronRight size={16} style={{ color: 'var(--gray-400)' }} />}
              </button>

              {isExpanded && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--gray-100)' }}>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      Published to Students
                    </div>
                    {published.length === 0 ? (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>Nothing published yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {published.map(item => (
                          <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '8px 12px', borderRadius: 'var(--radius-md)',
                            background: 'var(--gray-50)', fontSize: '0.8125rem',
                          }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.625rem', textTransform: 'uppercase',
                              background: item.type === 'activity' ? 'var(--sky-100)' : item.type === 'assessment' ? 'var(--purple-100)' : 'var(--gray-100)',
                              color: item.type === 'activity' ? 'var(--sky-700)' : item.type === 'assessment' ? 'var(--purple-700)' : 'var(--gray-600)',
                            }}>
                              {item.type === 'activity' ? 'TLA' : item.type === 'assessment' ? 'Assessment' : 'Material'}
                            </span>
                            <span style={{ flex: 1, fontWeight: 500 }}>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────── Student Oversight Tab ───────────────────── */
function StudentsTab() {
  const [expandedBlock, setExpandedBlock] = useState(null)

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Student Oversight</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 24 }}>
        Students within the courses each instructor handles, by block (from the EduSuite class lists).
        Score details live in each instructor's Student Monitoring page — this view is structure and coverage only.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BLOCK_SECTIONS.map(bs => {
          const adviser = INSTRUCTORS.find(i => i.id === bs.adviserId)
          const students = STUDENT_RECORDS.filter(s => s.section === bs.code)
          const isExpanded = expandedBlock === bs.id
          return (
            <div key={bs.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)', background: 'var(--white)', overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedBlock(isExpanded ? null : bs.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
              >
                <Users size={18} style={{ color: 'var(--sky-500)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{bs.code}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    Year {bs.yearLevel} · {students.length} students · Adviser: {adviser?.name || 'Unassigned'}
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--gray-400)' }} /> : <ChevronRight size={16} style={{ color: 'var(--gray-400)' }} />}
              </button>
              {isExpanded && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--gray-100)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', marginTop: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.75rem' }}>Student</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.75rem' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--gray-600)', fontSize: '0.75rem' }}>Enrolled Course (this sem)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 10).map(stu => (
                        <tr key={stu.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{stu.name}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--gray-500)' }}>{stu.email}</td>
                          <td style={{ padding: '8px 12px' }}>{stu.courses[0]?.code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length > 10 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 8 }}>Showing 10 of {students.length} — full class list in Blocks &amp; Class Lists.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────── Alerts Tab ───────────────────── */
function AlertsTab() {
  // Alert kinds per SYSTEM_SPEC §2 Notification model: unopened_material,
  // missing_assessment, syllabus_status, delivery_gap. Nothing else.
  const alerts = [
    { id: 1, type: 'warning', kind: 'syllabus_status', message: 'IT 107 (Sir Rogelio L. Guisdan) is still Drafted — not yet checked or routed for approval', time: '2h ago' },
    { id: 2, type: 'warning', kind: 'delivery_gap', message: 'IT 106 has no published courseware for Week 4 of its outline yet', time: '1d ago' },
    { id: 3, type: 'info', kind: 'syllabus_status', message: 'WMAD 303-1 approved file uploaded — Course Outline extraction pending', time: '1d ago' },
    { id: 4, type: 'warning', kind: 'unopened_material', message: '5 students in BSIT-3A have not opened "Week 1 — What is Programming" (instructor and students notified)', time: '2d ago' },
    { id: 5, type: 'warning', kind: 'missing_assessment', message: '2 students missed "Week 4 — Conditional Statements: Seatwork & Quiz" (instructor and students notified)', time: '3d ago' },
    { id: 6, type: 'info', kind: 'syllabus_status', message: 'Maam Sharmaine Pangcog has no courses loaded yet this semester', time: '5d ago' },
  ]

  const iconMap = { warning: AlertTriangle, error: X, info: Bell, success: Check }
  const colorMap = { warning: 'var(--amber-500)', error: 'var(--red-500)', info: 'var(--sky-500)', success: 'var(--green-500)' }
  const bgMap = { warning: 'var(--amber-50)', error: 'var(--red-50)', info: 'var(--sky-50)', success: 'var(--green-50)' }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Alerts</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 24 }}>
        Syllabus-status and delivery-gap notices, plus the unopened-material / missed-assessment reminders that fan
        out to both instructors and students.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map(alert => {
          const Icon = iconMap[alert.type]
          return (
            <div key={alert.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 'var(--radius-md)',
              background: bgMap[alert.type], border: `1px solid ${colorMap[alert.type]}20`,
            }}>
              <Icon size={18} style={{ color: colorMap[alert.type], flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--gray-900)' }}>{alert.message}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{alert.kind.replace(/_/g, ' ')} · {alert.time}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────── Main Component ───────────────────── */
export default function MonitorProgress() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'syllabi'

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return (
    <div style={{ padding: '24px 32px' }} data-pulse-zone="monitor">
      {activeTab === 'syllabi' && <SyllabusStatusTab />}
      {activeTab === 'delivery' && <DeliveryTab />}
      {activeTab === 'students' && <StudentsTab />}
      {activeTab === 'alerts' && <AlertsTab />}
    </div>
  )
}
