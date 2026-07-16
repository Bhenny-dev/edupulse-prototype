import { useState, useMemo } from 'react'
import {
  ArrowLeft, FileText, FlaskConical, ClipboardCheck, BookOpen,
  ChevronDown, ChevronRight, Flag, Eye, EyeOff, Send, Pencil,
  MonitorPlay,
} from 'lucide-react'
import { DEFAULT_SYLLABI } from '../../data/mockData'
import { generateAllCourseContent } from '../../utils/courseContentGenerator'
import DocumentViewer from './DocumentViewer'
import AssessmentEditor from './AssessmentEditor'
import PresentationViewer from './PresentationViewer'

/* ─── Course Outline Viewer ───
 * Hierarchical view of generated courseware organized by week.
 * Supports document view, presentation view, and assessment view.
 * Instructors see hide/publish controls per item.
 * Content can come from contentStore (persisted) or be generated on the fly.
 */

const TYPE_CONFIG = {
  material: { icon: FileText, label: 'Learning Material', color: 'var(--sky-500)' },
  activity: { icon: FlaskConical, label: 'Activity', color: 'var(--purple-500, #a855f7)' },
  assessment: { icon: ClipboardCheck, label: 'Assessment', color: 'var(--amber-500, #f59e0b)' },
}

export default function CourseOutlineViewer({
  syllabusId,
  onBack,
  isStudent = false,
  contentStore = {},
  onToggleVisibility,
  onContentSave,
}) {
  const [expandedWeeks, setExpandedWeeks] = useState(new Set([1]))
  const [viewingItem, setViewingItem] = useState(null)
  const [viewingType, setViewingType] = useState(null)
  const [viewMode, setViewMode] = useState(null) // 'document' | 'presentation' | null

  const syllabus = DEFAULT_SYLLABI.find(s => s.id === syllabusId)

  const weeks = useMemo(() => {
    if (!syllabus) return []
    return generateAllCourseContent(syllabus)
  }, [syllabus])

  if (!syllabus) {
    return (
      <div className="container">
        <div className="empty-state">
          <h3>Syllabus not found</h3>
          <button className="btn btn-primary" onClick={onBack}><ArrowLeft size={14} /> Go Back</button>
        </div>
      </div>
    )
  }

  if (viewingItem) {
    const handleSave = (newSections) => {
      if (onContentSave && viewingItem._storeId) {
        onContentSave(viewingItem._storeId, { ...viewingItem, sections: newSections })
      }
    }

    if (viewMode === 'presentation') {
      return (
        <PresentationViewer
          content={viewingItem}
          onBack={() => { setViewingItem(null); setViewMode(null) }}
          isStudent={isStudent}
          onSave={!isStudent ? handleSave : undefined}
        />
      )
    }
    if (viewingType === 'assessment') {
      return <AssessmentEditor content={viewingItem} onBack={() => { setViewingItem(null); setViewingType(null) }} isStudent={isStudent} />
    }
    return (
      <DocumentViewer
        content={viewingItem}
        onBack={() => { setViewingItem(null); setViewMode(null) }}
        isStudent={isStudent}
        onSave={!isStudent ? handleSave : undefined}
      />
    )
  }

  const toggleWeek = (week) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(week)) next.delete(week)
      else next.add(week)
      return next
    })
  }

  const openItem = (item, mode = 'document') => {
    const storeKey = item.id
    const stored = contentStore[storeKey]
    const content = stored?.content || item.content
    const enriched = { ...content, _storeId: storeKey }
    setViewingItem(enriched)
    if (item.type === 'assessment') {
      setViewingType('assessment')
      setViewMode(null)
    } else {
      setViewMode(mode)
      setViewingType(null)
    }
  }

  const totalItems = weeks.reduce((acc, w) => acc + w.items.length, 0)
  const examWeeks = weeks.filter(w => w.isExam).length

  const getStatus = (itemId) => contentStore[itemId]?.status || 'draft'

  const statusColor = (status) => {
    if (status === 'published') return 'var(--green-500, #22c55e)'
    if (status === 'hidden') return 'var(--gray-400)'
    return 'var(--amber-500, #f59e0b)'
  }

  const statusLabel = (status) => {
    if (status === 'published') return 'Published'
    if (status === 'hidden') return 'Hidden'
    return 'Draft'
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '8px' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '4px' }}>
            <ArrowLeft size={14} /> My Courseware
          </button>
          <h1 style={{ fontSize: '1.25rem' }}>{syllabus.courseCode} — {syllabus.courseTitle}</h1>
          <p className="text-sm text-muted">
            Course outline with {totalItems} generated item{totalItems !== 1 ? 's' : ''} across {weeks.length - examWeeks} teaching week{weeks.length - examWeeks !== 1 ? 's' : ''}
            {examWeeks > 0 ? ` (+ ${examWeeks} exam week${examWeeks !== 1 ? 's' : ''})` : ''}
          </p>
        </div>
      </div>

      {/* Week list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {weeks.map(weekData => {
          const isExpanded = expandedWeeks.has(weekData.week)
          const itemCount = weekData.items.length

          return (
            <div key={weekData.week} className="card" style={{ overflow: 'hidden' }}>
              {/* Week header */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  cursor: 'pointer', transition: 'background 0.15s',
                  background: weekData.isExam ? 'var(--sky-50)' : isExpanded ? 'var(--gray-50)' : 'transparent',
                }}
                onClick={() => toggleWeek(weekData.week)}
              >
                {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--gray-400)' }} /> : <ChevronRight size={16} style={{ color: 'var(--gray-400)' }} />}

                {weekData.isExam ? (
                  <Flag size={16} style={{ color: 'var(--sky-500)', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
                    background: 'var(--sky-500)', color: '#fff', fontWeight: 700, fontSize: '0.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {weekData.week}
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {weekData.isExam ? `Week ${weekData.week} — ${weekData.examType}` : `Week ${weekData.week}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {weekData.isExam ? 'Exam week — no generated content' : `${itemCount} item${itemCount !== 1 ? 's' : ''} generated`}
                  </div>
                </div>

                {!weekData.isExam && itemCount > 0 && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {weekData.items.map(item => {
                      const cfg = TYPE_CONFIG[item.type]
                      const Icon = cfg.icon
                      const status = getStatus(item.id)
                      return (
                        <span key={item.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                          fontSize: '0.625rem', fontWeight: 600,
                          background: `${cfg.color}15`, color: cfg.color,
                        }}>
                          <Icon size={10} /> {cfg.label}
                          {!isStudent && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: statusColor(status), marginLeft: 2,
                            }} title={statusLabel(status)} />
                          )}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Expanded items */}
              {isExpanded && !weekData.isExam && (
                <div style={{ borderTop: '1px solid var(--gray-100)', padding: '8px 16px 12px' }}>
                  {weekData.items.length === 0 ? (
                    <p className="text-sm text-muted" style={{ padding: '8px 0' }}>No items generated for this week.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {weekData.items.map(item => {
                        const cfg = TYPE_CONFIG[item.type]
                        const Icon = cfg.icon
                        const status = getStatus(item.id)
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 12px', borderRadius: 'var(--radius-md)',
                              border: `1px solid ${status === 'published' ? 'var(--green-200, #bbf7d0)' : status === 'hidden' ? 'var(--gray-200)' : 'var(--gray-200)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              background: status === 'published' ? 'var(--green-50, #f0fdf4)' : status === 'hidden' ? 'var(--gray-50)' : '#fff',
                              opacity: status === 'hidden' ? 0.6 : 1,
                            }}
                            onClick={() => openItem(item)}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = status === 'published' ? 'var(--green-200, #bbf7d0)' : 'var(--gray-200)' }}
                          >
                            <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                                {item.content.title}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
                                {cfg.label}
                                {item.content.viewMode === 'presentation' ? ' · Presentation' : item.type !== 'assessment' ? ' · Document' : ''}
                                {item.content.category && ` — ${item.content.category}`}
                                {item.content.questions && ` — ${item.content.questions.length} questions`}
                                {!isStudent && (
                                  <span style={{
                                    marginLeft: 6, fontWeight: 600,
                                    color: statusColor(status),
                                  }}>• {statusLabel(status)}</span>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            {!isStudent && onToggleVisibility ? (
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                {/* View button — shows correct viewer based on viewMode */}
                                {item.type !== 'assessment' && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '4px 6px' }}
                                    title={item.content.viewMode === 'presentation' ? 'Open presentation' : 'Open document'}
                                    onClick={e => { e.stopPropagation(); openItem(item, item.content.viewMode || 'document') }}
                                  >
                                    {item.content.viewMode === 'presentation' ? <MonitorPlay size={13} /> : <BookOpen size={13} />}
                                  </button>
                                )}
                                {/* Publish / Unpublish */}
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{
                                    padding: '4px 6px',
                                    color: status === 'published' ? 'var(--green-500, #22c55e)' : undefined,
                                  }}
                                  title={status === 'published' ? 'Unpublish (hide from students)' : 'Publish to students'}
                                  onClick={e => {
                                    e.stopPropagation()
                                    onToggleVisibility(item.id, status === 'published' ? 'hidden' : 'published')
                                  }}
                                >
                                  {status === 'published' ? <EyeOff size={13} /> : <Send size={13} />}
                                </button>
                              </div>
                            ) : (
                              <BookOpen size={14} style={{ color: 'var(--gray-400)' }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
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
