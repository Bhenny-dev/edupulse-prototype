import { useState } from 'react'
import { Eye, Copy, Link2, ChevronDown, ChevronRight, BookOpen, Users, Calendar, CheckCircle } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { CURRICULUM_COURSES, INSTRUCTORS, SHARED_SYLLABUS_REPOSITORY, DEFAULT_SYLLABI } from '../../data/mockData'

// Shared Syllabus Repository — browse all approved syllabi created by any
// instructor. Instructors can attach existing syllabi to their registered
// courses, clone them as a starting point, or view them for reference.

export default function SharedSyllabusRepository({ onAttach, onView }) {
  const { addToast } = useToast()
  const [expandedCourse, setExpandedCourse] = useState(null)
  const [search, setSearch] = useState('')

  // Group shared syllabi by course code
  const courseSyllabi = SHARED_SYLLABUS_REPOSITORY.reduce((acc, entry) => {
    if (!acc[entry.courseCode]) {
      acc[entry.courseCode] = []
    }
    acc[entry.courseCode].push(entry)
    return acc
  }, {})

  // Filter courses by search
  const filteredCourses = CURRICULUM_COURSES.filter(course => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      course.code.toLowerCase().includes(searchLower) ||
      course.title.toLowerCase().includes(searchLower)
    )
  })

  const toggleCourse = (courseCode) => {
    setExpandedCourse(expandedCourse === courseCode ? null : courseCode)
  }

  const handleAttach = (entry) => {
    const syllabus = DEFAULT_SYLLABI.find(s => s.id === entry.syllabusId)
    if (syllabus) {
      onAttach(syllabus)
      addToast(`Attached ${entry.courseCode} syllabus (v${entry.version}) from ${entry.instructorName}`, 'success')
    }
  }

  const handleClone = (entry) => {
    const syllabus = DEFAULT_SYLLABI.find(s => s.id === entry.syllabusId)
    if (syllabus) {
      onAttach({ ...syllabus, id: null, version: 1, status: 'drafted', lastUpdated: new Date().toISOString().split('T')[0] })
      addToast(`Cloned ${entry.courseCode} syllabus as a new draft`, 'success')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'var(--green-600, #16a34a)'
      case 'approved_uploaded': return 'var(--sky-600, #0284c7)'
      case 'downloaded_for_approval': return 'var(--orange-600, #ea580c)'
      case 'checked': return 'var(--amber-600, #d97706)'
      case 'drafted': return 'var(--gray-500)'
      default: return 'var(--gray-500)'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active'
      case 'approved_uploaded': return 'Approved'
      case 'downloaded_for_approval': return 'Out for Approval'
      case 'checked': return 'Checked'
      case 'drafted': return 'Draft'
      default: return status
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
          Shared Syllabus Repository
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '16px' }}>
          Browse approved syllabi from other instructors. Attach to your registered course or clone as a starting point.
        </p>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
          border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
          background: 'var(--white)', marginBottom: '16px',
        }}>
          <BookOpen size={16} style={{ color: 'var(--gray-400)' }} />
          <input
            placeholder="Search courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: 'transparent' }}
          />
        </div>
      </div>

      {/* Course List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredCourses.map(course => {
          const syllabi = courseSyllabi[course.code] || []
          const isExpanded = expandedCourse === course.code

          return (
            <div key={course.code} style={{
              border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden', transition: 'box-shadow 200ms',
            }}>
              {/* Course Header */}
              <div
                onClick={() => toggleCourse(course.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  background: isExpanded ? 'var(--gray-50)' : 'var(--white)',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--gray-500)' }} /> : <ChevronRight size={16} style={{ color: 'var(--gray-500)' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-900)' }}>{course.code}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{course.title} · {course.units} units</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: syllabi.length > 0 ? 'var(--sky-600)' : 'var(--gray-400)' }}>
                    {syllabi.length}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
                    {syllabi.length === 1 ? 'syllabus' : 'syllabi'}
                  </div>
                </div>
              </div>

              {/* Syllabus List */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--gray-200)', padding: '12px 16px', background: 'var(--gray-50)' }}>
                  {syllabi.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                      No syllabi uploaded for this course yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {syllabi.map(entry => (
                        <div key={entry.id} style={{
                          padding: '14px 16px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--gray-200)', background: 'var(--white)',
                          transition: 'box-shadow 200ms',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 'var(--radius-full)',
                              background: `${getStatusColor(entry.status)}15`,
                              color: getStatusColor(entry.status),
                              fontWeight: 600, fontSize: '0.6875rem',
                            }}>
                              {getStatusLabel(entry.status)}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--gray-800)' }}>
                              v{entry.version}
                            </span>
                            {entry.reuseCount > 0 && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 6px', borderRadius: 'var(--radius-full)',
                                background: 'var(--purple-100)', color: 'var(--purple-600, #9333ea)',
                                fontSize: '0.625rem', fontWeight: 600,
                              }}>
                                <Users size={10} /> Used {entry.reuseCount}x
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
                            Uploaded by <strong>{entry.instructorName}</strong>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '12px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} /> {entry.uploadedDate}
                            </span>
                            {entry.lastReusedBy && (
                              <span>Last used by {entry.lastReusedBy} on {entry.lastReusedDate}</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAttach(entry)}>
                              <Link2 size={12} /> Attach to My Course
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleClone(entry)}>
                              <Copy size={12} /> Clone as Draft
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                              const syllabus = DEFAULT_SYLLABI.find(s => s.id === entry.syllabusId)
                              if (syllabus) onView(syllabus)
                            }}>
                              <Eye size={12} /> View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>
          <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No courses found matching your search.</p>
        </div>
      )}
    </div>
  )
}
