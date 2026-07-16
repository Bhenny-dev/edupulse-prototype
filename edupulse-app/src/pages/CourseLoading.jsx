import { useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { CURRICULUM_COURSES, INSTRUCTORS, DEFAULT_SYLLABI, EUSUITE_COURSE_ASSIGNMENTS, BLOCK_SECTION_REGISTRATIONS } from '../data/mockData'
import {
  Search, GraduationCap, BookOpen,
  FileText, CheckCircle, Clock, XCircle,
} from 'lucide-react'

// Course Loading — FLOW_SPEC Phase 1 (read-only monitoring view).
// Course assignments happen in EduSuite (not in EduPulse). The Dean /
// Associate Dean monitors which courses have been loaded, which instructors
// are assigned, and which syllabi exist. No manual assignment in EduPulse.

/* ───────────────────────── Monitoring tab (read-only) ───────────────────────── */
function MonitoringTab() {
  const [search, setSearch] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  // Merge course assignments with syllabus data
  const monitoringData = EUSUITE_COURSE_ASSIGNMENTS.map(assignment => {
    const syllabi = DEFAULT_SYLLABI.filter(s => s.courseCode === assignment.courseCode)
    const activeSyllabi = syllabi.filter(s => s.status === 'active')
    const hasActiveSyllabus = activeSyllabi.length > 0
    const hasAnySyllabus = syllabi.length > 0

    // Get block section registrations for this course
    const registrations = BLOCK_SECTION_REGISTRATIONS.filter(r => r.courseCode === assignment.courseCode)
    const totalStudents = registrations.reduce((sum, r) => sum + r.studentCount, 0)

    // Determine course status
    let courseStatus = 'no_data'
    if (hasActiveSyllabus && registrations.length > 0) {
      courseStatus = 'active'
    } else if (hasAnySyllabus) {
      courseStatus = 'syllabus_only'
    } else if (registrations.length > 0) {
      courseStatus = 'data_only'
    }

    return {
      ...assignment,
      syllabi,
      activeSyllabi,
      registrations,
      totalStudents,
      courseStatus,
    }
  })

  const filteredData = monitoringData.filter(item => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      item.courseCode.toLowerCase().includes(searchLower) ||
      item.courseTitle.toLowerCase().includes(searchLower) ||
      item.instructorIds.some(id => {
        const inst = INSTRUCTORS.find(i => i.id === id)
        return inst?.name.toLowerCase().includes(searchLower)
      })
    )
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle size={14} style={{ color: 'var(--green-600, #16a34a)' }} />
      case 'syllabus_only': return <BookOpen size={14} style={{ color: 'var(--sky-600, #0284c7)' }} />
      case 'data_only': return <FileText size={14} style={{ color: 'var(--amber-600, #d97706)' }} />
      default: return <XCircle size={14} style={{ color: 'var(--gray-400)' }} />
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active'
      case 'syllabus_only': return 'Syllabus Only'
      case 'data_only': return 'Data Uploaded'
      default: return 'No Data'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--green-100, #dcfce7)'
      case 'syllabus_only': return 'var(--sky-100, #e0f2fe)'
      case 'data_only': return 'var(--amber-100, #fef3c7)'
      default: return 'var(--gray-100, #f3f4f6)'
    }
  }

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'active': return 'var(--green-700, #15803d)'
      case 'syllabus_only': return 'var(--sky-700, #0369a1)'
      case 'data_only': return 'var(--amber-700, #b45309)'
      default: return 'var(--gray-500)'
    }
  }

  // Summary stats
  const stats = {
    total: monitoringData.length,
    active: monitoringData.filter(d => d.courseStatus === 'active').length,
    syllabusOnly: monitoringData.filter(d => d.courseStatus === 'syllabus_only').length,
    dataOnly: monitoringData.filter(d => d.courseStatus === 'data_only').length,
    noData: monitoringData.filter(d => d.courseStatus === 'no_data').length,
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
          Course Loading Monitor
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '16px' }}>
          Read-only view of courses loaded in EduSuite. Course assignments happen in EduSuite, not in EduPulse.
        </p>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Total Courses</div>
          </div>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--green-100, #dcfce7)', border: '1px solid var(--green-200, #bbf7d0)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green-700, #15803d)' }}>{stats.active}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--green-600, #16a34a)' }}>Active</div>
          </div>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--sky-100, #e0f2fe)', border: '1px solid var(--sky-200, #bae6fd)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sky-700, #0369a1)' }}>{stats.syllabusOnly}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--sky-600, #0284c7)' }}>Syllabus Only</div>
          </div>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--amber-100, #fef3c7)', border: '1px solid var(--amber-200, #fde68a)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--amber-700, #b45309)' }}>{stats.dataOnly}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--amber-600, #d97706)' }}>Data Uploaded</div>
          </div>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100, #f3f4f6)', border: '1px solid var(--gray-200, #e5e7eb)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-500)' }}>{stats.noData}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>No Data</div>
          </div>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
          border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
          background: 'var(--white)', marginBottom: '16px',
        }}>
          <Search size={16} style={{ color: 'var(--gray-400)' }} />
          <input
            placeholder="Search courses or instructors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: 'transparent' }}
          />
        </div>
      </div>

      {/* Course Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Year / Sem</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Instructor(s)</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Syllabus</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(item => (
              <tr key={item.courseCode} style={{
                borderBottom: '1px solid var(--gray-100)',
                background: selectedAssignment === item.courseCode ? 'var(--sky-50)' : undefined,
                cursor: 'pointer',
              }} onClick={() => setSelectedAssignment(selectedAssignment === item.courseCode ? null : item.courseCode)}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.courseCode}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{item.courseTitle}</div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                  Yr {item.yearLevel} · {item.semester === 'summer' ? 'Summer' : `Sem ${item.semester}`}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {item.instructorIds.map(id => {
                      const inst = INSTRUCTORS.find(i => i.id === id)
                      return inst ? (
                        <span key={id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: 'var(--radius-full)',
                          background: 'var(--sky-100)', color: 'var(--sky-700)',
                          fontSize: '0.6875rem', fontWeight: 600,
                        }}>
                          {inst.name.split(' ').pop()}
                          {inst.hasMasters && <GraduationCap size={10} style={{ color: 'var(--purple-500)' }} />}
                        </span>
                      ) : null
                    })}
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {item.syllabi.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BookOpen size={14} style={{ color: 'var(--sky-500)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                        {item.syllabi.length} version{item.syllabi.length > 1 ? 's' : ''}
                        {item.activeSyllabi.length > 0 && (
                          <span style={{ color: 'var(--green-600, #16a34a)', marginLeft: '4px' }}>(active)</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>None</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    background: getStatusColor(item.courseStatus),
                    color: getStatusTextColor(item.courseStatus),
                    fontWeight: 600, fontSize: '0.6875rem',
                  }}>
                    {getStatusIcon(item.courseStatus)}
                    {getStatusLabel(item.courseStatus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded Details */}
      {selectedAssignment && (
        <div style={{
          marginTop: '16px', padding: '16px 20px', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--sky-200)', background: 'var(--sky-50)',
        }}>
          {(() => {
            const item = monitoringData.find(d => d.courseCode === selectedAssignment)
            if (!item) return null

            return (
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', marginBottom: '12px' }}>
                  {item.courseCode} — {item.courseTitle}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {/* Block Sections */}
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Block Sections ({item.blockSections.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {item.blockSections.map(bs => (
                        <span key={bs} style={{
                          padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                          background: 'var(--white)', border: '1px solid var(--sky-200)',
                          fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          {bs}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Syllabi */}
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Syllabi ({item.syllabi.length})
                    </div>
                    {item.syllabi.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.syllabi.map(syl => (
                          <div key={syl.id} style={{
                            padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--white)', border: '1px solid var(--sky-200)',
                            fontSize: '0.75rem',
                          }}>
                            <span style={{ fontWeight: 600 }}>v{syl.version}</span>
                            <span style={{ color: 'var(--gray-500)', marginLeft: '8px' }}>{syl.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                        No syllabi uploaded yet
                      </div>
                    )}
                  </div>

                  {/* Block Section Registrations */}
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      EduSuite Data ({item.registrations.length})
                    </div>
                    {item.registrations.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.registrations.map(reg => (
                          <div key={reg.id} style={{
                            padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--white)', border: '1px solid var(--sky-200)',
                            fontSize: '0.75rem',
                          }}>
                            <span style={{ fontWeight: 600 }}>{reg.blockSection}</span>
                            <span style={{ color: 'var(--gray-500)', marginLeft: '8px' }}>{reg.studentCount} students</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                        No student data uploaded yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {filteredData.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
          <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No courses found matching your search.</p>
        </div>
      )}
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
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Instructor Class List</h2>
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
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'monitoring'

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  const switchTab = (tab) => {
    const p = new URLSearchParams(searchParams)
    p.set('tab', tab)
    setSearchParams(p)
  }

  return (
    <div style={{ padding: '24px 32px' }} data-pulse-zone="course-loading">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--gray-200)', marginBottom: '20px' }}>
        <button
          onClick={() => switchTab('monitoring')}
          style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.875rem', color: activeTab === 'monitoring' ? 'var(--sky-600)' : 'var(--gray-500)',
            borderBottom: activeTab === 'monitoring' ? '2px solid var(--sky-500)' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s',
          }}
        >
          Course Monitoring
        </button>
        <button
          onClick={() => switchTab('instructors')}
          style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.875rem', color: activeTab === 'instructors' ? 'var(--sky-600)' : 'var(--gray-500)',
            borderBottom: activeTab === 'instructors' ? '2px solid var(--sky-500)' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s',
          }}
        >
          Instructors
        </button>
      </div>

      {activeTab === 'monitoring' && <MonitoringTab />}
      {activeTab === 'instructors' && <InstructorsTab />}
    </div>
  )
}
