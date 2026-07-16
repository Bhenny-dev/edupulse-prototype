import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { CURRICULUM_COURSES, INSTRUCTORS, DEFAULT_SYLLABI } from '../data/mockData'
import {
  Search, Check, X, AlertTriangle, GraduationCap, Sparkles, Info,
} from 'lucide-react'

// Course Loading — FLOW_SPEC Phase 1. The Dean / Associate Dean loads each
// released course to an instructor. Business rule for who gets a course:
//   priority 1 — holder of a master's degree
//   priority 2 — specialization or forte in the course
// AI has two modes: Assist (per-course ranked suggestions) and Auto (propose
// the complete assignment in place). EITHER WAY the admin confirms every
// assignment before it takes effect — AI never finalizes loading.

const SPECIALIZATION_KEYWORDS = {
  'Web & Mobile Development': ['web', 'mobile', 'react', 'javascript', 'html', 'css', 'wmad', 'application'],
  'Database Systems': ['database', 'information management', 'data management', 'sql'],
  'Software Engineering': ['software', 'engineering', 'programming', 'integrative', 'system integration'],
  'Networking & Security': ['network', 'security', 'assurance', 'platform'],
  'Data Structures & Algorithms': ['data structures', 'algorithm', 'discrete', 'quantitative', 'logic'],
  'Mobile Development': ['mobile', 'game', 'iot', 'internet of things'],
  'Web Development': ['web', 'javascript', 'html', 'css', 'frontend'],
}

// Rank every instructor for a course by the business rule. Returns
// [{ ...instructor, specMatch, score, reason }] sorted best-first.
function rankCandidates(course) {
  const titleLower = course.title.toLowerCase()
  return INSTRUCTORS.map(inst => {
    const keywords = SPECIALIZATION_KEYWORDS[inst.specialization] || []
    const specMatch = keywords.filter(kw => titleLower.includes(kw)).length
    // Master's degree dominates (priority 1); specialization breaks ties (priority 2).
    const score = (inst.hasMasters ? 100 : 0) + specMatch
    const reason = [
      inst.hasMasters ? "Master's degree holder" : "No master's degree",
      specMatch > 0 ? `specialization match (${inst.specialization})` : 'no specialization match',
    ].join(' · ')
    return { ...inst, specMatch, score, reason }
  }).sort((a, b) => b.score - a.score)
}

/* ───────────────────────── Load Courses tab ───────────────────────── */
function AssignTab() {
  const { addToast } = useToast()
  // Existing syllabi count as already-confirmed loads.
  const [assignments, setAssignments] = useState(() => {
    const existing = {}
    DEFAULT_SYLLABI.forEach(syl => {
      if (!existing[syl.courseCode]) {
        existing[syl.courseCode] = { instructorId: syl.instructorId, confirmed: true, aiProposed: false }
      }
    })
    return existing
  })
  const [search, setSearch] = useState('')

  const filteredCourses = CURRICULUM_COURSES.filter(s =>
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  // Manual pick = the admin's own decision, confirmed by the act of choosing.
  const assignManually = (courseCode, instructorId) => {
    if (!instructorId) {
      setAssignments(prev => { const next = { ...prev }; delete next[courseCode]; return next })
      return
    }
    setAssignments(prev => ({ ...prev, [courseCode]: { instructorId, confirmed: true, aiProposed: false } }))
    addToast('Course loaded — assignment confirmed', 'success')
  }

  // Auto mode: AI proposes in place; every proposal still needs a confirm.
  const autoProposeAll = () => {
    const next = { ...assignments }
    const unassigned = CURRICULUM_COURSES.filter(s => !next[s.code])
    unassigned.forEach(course => {
      const best = rankCandidates(course)[0]
      next[course.code] = { instructorId: best.id, confirmed: false, aiProposed: true }
    })
    setAssignments(next)
    addToast(`AI proposed assignments for ${unassigned.length} courses — review and confirm each one`, 'info')
  }

  const confirmOne = (courseCode) => {
    setAssignments(prev => ({ ...prev, [courseCode]: { ...prev[courseCode], confirmed: true } }))
    addToast('Assignment confirmed', 'success')
  }
  const rejectOne = (courseCode) => {
    setAssignments(prev => { const next = { ...prev }; delete next[courseCode]; return next })
    addToast('Proposal discarded — assign manually or re-run AI', 'info')
  }
  const confirmAllProposals = () => {
    const pending = Object.entries(assignments).filter(([, a]) => a.aiProposed && !a.confirmed)
    setAssignments(prev => {
      const next = { ...prev }
      pending.forEach(([code]) => { next[code] = { ...next[code], confirmed: true } })
      return next
    })
    addToast(`${pending.length} AI-proposed assignments confirmed`, 'success')
  }

  const confirmedCount = Object.values(assignments).filter(a => a.confirmed).length
  const proposedCount = Object.values(assignments).filter(a => a.aiProposed && !a.confirmed).length
  const unassignedCount = CURRICULUM_COURSES.length - Object.keys(assignments).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Load Courses to Instructors</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            {confirmedCount} confirmed · {proposedCount} AI-proposed (awaiting your confirmation) · {unassignedCount} unassigned · {CURRICULUM_COURSES.length} released courses
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {proposedCount > 0 && (
            <button onClick={confirmAllProposals} className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
              <Check size={16} /> Confirm All Proposals ({proposedCount})
            </button>
          )}
          <button
            onClick={autoProposeAll}
            disabled={unassignedCount === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              borderRadius: 'var(--radius-md)', border: 'none',
              background: unassignedCount === 0 ? 'var(--gray-200)' : 'linear-gradient(135deg, var(--sky-400), var(--sky-500))',
              color: unassignedCount === 0 ? 'var(--gray-400)' : 'white',
              cursor: unassignedCount === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.8125rem', boxShadow: 'var(--shadow-3d)',
            }}
          >
            <Sparkles size={16} /> AI Auto-Propose
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
        borderRadius: 'var(--radius-md)', background: 'var(--sky-50)', border: '1px solid var(--sky-100)',
        marginBottom: 16, fontSize: '0.8125rem', color: 'var(--gray-600)',
      }}>
        <Info size={15} style={{ color: 'var(--sky-500)', flexShrink: 0, marginTop: 2 }} />
        <span>
          AI ranks candidates by the loading rule — <strong>priority 1: master's degree holder</strong>,
          <strong> priority 2: specialization or forte in the course</strong>. Whether you assign manually with AI
          suggestions or run AI Auto-Propose, <strong>no assignment takes effect until you confirm it</strong>.
        </span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
        background: 'var(--white)', marginBottom: 20,
      }}>
        <Search size={16} style={{ color: 'var(--gray-400)' }} />
        <input
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: 'transparent' }}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Year / Sem</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Suggestion</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Instructor</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map(course => {
              const assign = assignments[course.code]
              const isPendingProposal = assign?.aiProposed && !assign?.confirmed
              const suggestion = rankCandidates(course)[0]
              return (
                <tr key={course.code} style={{
                  borderBottom: '1px solid var(--gray-100)',
                  background: isPendingProposal ? 'var(--amber-50, #fffbeb)' : undefined,
                }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{course.code}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{course.title} · {course.units} units</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                    Yr {course.yearLevel} · {course.semester === 'summer' ? 'Summer' : `Sem ${course.semester}`}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={12} style={{ color: 'var(--purple-500)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{suggestion.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>{suggestion.reason}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={assign?.instructorId || ''}
                      onChange={e => assignManually(course.code, Number(e.target.value))}
                      style={{
                        padding: '6px 10px', borderRadius: 'var(--radius-md)',
                        border: isPendingProposal ? '1px solid var(--amber-300, #fcd34d)' : '1px solid var(--gray-200)',
                        fontSize: '0.8125rem', background: 'var(--white)', cursor: 'pointer', minWidth: 200,
                      }}
                    >
                      <option value="">— Unassigned —</option>
                      {rankCandidates(course).map(i => (
                        <option key={i.id} value={i.id}>{i.name}{i.hasMasters ? " · Master's" : ''}{i.specMatch > 0 ? ' · forte' : ''}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {!assign ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'var(--gray-100)', color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.6875rem' }}>
                        <AlertTriangle size={12} /> Unassigned
                      </span>
                    ) : isPendingProposal ? (
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <button className="btn btn-primary btn-sm" style={{ padding: '3px 8px', fontSize: '0.6875rem' }} onClick={() => confirmOne(course.code)}><Check size={12} /> Confirm</button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: '0.6875rem', color: 'var(--red-500)' }} onClick={() => rejectOne(course.code)}><X size={12} /></button>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'var(--green-100)', color: 'var(--green-700)', fontWeight: 600, fontSize: '0.6875rem' }}>
                        <Check size={12} /> Confirmed{assign.aiProposed ? ' (AI-proposed)' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ───────────────────────── Instructors tab ───────────────────────── */
function InstructorPopover({ instructor, onClose }) {
  const syllabi = DEFAULT_SYLLABI.filter(s => s.instructorId === instructor.id)

  return (
    <div className="overlay-backdrop" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: '520px', maxWidth: '95%', maxHeight: '80vh', overflow: 'auto',
          background: 'var(--white)', borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-3d-hover)', border: '1px solid var(--sky-100)',
          animation: 'bounceIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--sky-300), var(--sky-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0,
          }}>
            {instructor.name.split(' ')[1]?.charAt(0) || instructor.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{instructor.name}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              {instructor.specialization} {instructor.hasMasters && <span style={{ color: 'var(--purple-500)', fontWeight: 600 }}>· Master's degree</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{instructor.email}</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 'var(--radius-full)',
            background: 'var(--gray-100)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)',
          }}>✕</button>
        </div>

        <div style={{ padding: '16px 24px 20px' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Loaded Courses ({syllabi.length})
          </div>

          {syllabi.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8125rem', fontStyle: 'italic', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
              No courses loaded yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {syllabi.map(syl => {
                const course = CURRICULUM_COURSES.find(c => c.code === syl.courseCode)
                return (
                  <div key={syl.id} style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--gray-100)', background: 'var(--white)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--sky-700)' }}>{syl.courseCode}</span>
                      <span className={`badge badge-${syl.status === 'active' ? 'active' : syl.status === 'approved_uploaded' ? 'approved' : syl.status === 'downloaded_for_approval' ? 'out_for_approval' : syl.status}`} style={{ fontSize: '0.625rem' }}>
                        {syl.status.replace(/_/g, ' ')}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--gray-400)' }}>v{syl.version}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', marginBottom: 6 }}>{syl.courseTitle}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {course && (
                        <>
                          <span>Yr {course.yearLevel} · {course.semester === 'summer' ? 'Summer' : `Sem ${course.semester}`}</span>
                          <span>{course.units} units</span>
                        </>
                      )}
                      <span>Updated {syl.lastUpdated}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InstructorsTab() {
  const [popoverInstructor, setPopoverInstructor] = useState(null)

  const instructorStats = INSTRUCTORS.map(inst => ({
    ...inst,
    loadCount: DEFAULT_SYLLABI.filter(s => s.instructorId === inst.id).length,
  }))

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Instructor Roster</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: 24 }}>
        {INSTRUCTORS.length} instructors · Master's degree and specialization drive the loading rule · Click a card to view loaded courses
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {instructorStats.map(inst => (
          <div key={inst.id} style={{
            border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)',
            padding: 20, background: 'var(--white)', transition: 'box-shadow 200ms',
            cursor: 'pointer',
          }}
          onClick={() => setPopoverInstructor(inst)}
          onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-3d-hover)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--sky-300), var(--sky-400))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
              }}>
                {inst.name.split(' ')[1]?.charAt(0) || inst.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{inst.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{inst.specialization}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {inst.hasMasters ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 8px', borderRadius: 'var(--radius-full)', background: 'var(--purple-100)', color: 'var(--purple-500)', fontWeight: 700, fontSize: '0.625rem' }}>
                      <GraduationCap size={10} /> Master's
                    </span>
                  ) : (
                    <span style={{ padding: '1px 8px', borderRadius: 'var(--radius-full)', background: 'var(--gray-100)', color: 'var(--gray-500)', fontWeight: 600, fontSize: '0.625rem' }}>
                      Bachelor's
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--sky-600)' }}>{inst.loadCount}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>Courses</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {popoverInstructor && <InstructorPopover instructor={popoverInstructor} onClose={() => setPopoverInstructor(null)} />}
    </div>
  )
}

/* ───────────────────────── Main Component ───────────────────────── */
export default function CourseLoading() {
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'assign'

  return (
    <div style={{ padding: '24px 32px' }} data-pulse-zone="course-loading">
      {activeTab === 'assign' && <AssignTab />}
      {activeTab === 'instructors' && <InstructorsTab />}
    </div>
  )
}
