import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { COURSEWARE_ITEMS, DEFAULT_SYLLABI, INSTRUCTORS } from '../data/mockData'
import { useToast } from '../context/ToastContext'
import { useContentStore } from '../context/ContentStoreContext'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import CourseOutlineViewer from '../components/courseware/CourseOutlineViewer'
import { generateAllCourseContent, generateWeekContent } from '../utils/courseContentGenerator'
import {
  Eye, Check, X, Send, FileText, Search, Clock, Sparkles, Calendar,
  Copy, Tag, MessageSquare, RotateCcw, Download,
  Info, Layers, Loader2, CircleCheck, BookOpen, Flag,
  ChevronDown, ChevronRight, MonitorPlay, ArrowLeft,
  Circle, CheckCircle2,
} from 'lucide-react'

// Courseware — FLOW_SPEC Phase 3. Generated from approved syllabi.
// Lifecycle: draft → checked → published.
// Builder: course selection → week timeline → generate per-week or all → review → publish.

const ALL_TABS = [
  { key: 'mine', label: 'My Courseware' },
  { key: 'builder', label: 'Courseware Builder' },
]

const STATUS_META = {
  draft: { label: 'Draft', badge: 'badge-draft', color: 'var(--amber-600, #d97706)' },
  checked: { label: 'Checked', badge: 'badge-checked', color: 'var(--sky-600)' },
  published: { label: 'Published', badge: 'badge-published', color: 'var(--green-600, #16a34a)' },
}

function isExamRow(row) {
  return !row.ilos && /examination/i.test(row.assessments || '')
}

/* ═══════════════════════ Builder: Course Selection Grid ═══════════════════════ */

function CourseSelectionGrid({ user, contentStore, onSelectCourse }) {
  const activeSyllabi = useMemo(() => {
    return DEFAULT_SYLLABI.filter(s => s.status === 'active' && (s.courseOutline?.length || 0) > 0)
  }, [])

  if (activeSyllabi.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><BookOpen size={36} /></div>
        <h3>No courses ready for courseware generation</h3>
        <p>Courseware is generated from approved syllabi with extracted Course Outlines. Complete the syllabus
          approval loop first: check your draft → download for approval → upload the signed file → extract the outline.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted" style={{ marginBottom: '16px' }}>
        Select a course to start generating courseware. Only courses with approved syllabi and extracted
        Course Outlines are shown. You can generate all content at once or week by week.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
        {activeSyllabi.map(syl => {
          const outline = syl.courseOutline || []
          const nonExamWeeks = outline.filter(r => !isExamRow(r)).length
          const totalItems = outline.filter(r => !isExamRow(r)).reduce((acc, row) => {
            let count = 0
            if (row.contents?.length && row.ilos) count++
            if (row.activities) count++
            if (row.assessments && !/examination/i.test(row.assessments)) count++
            return acc + count
          }, 0)

          const csEntries = Object.entries(contentStore).filter(([_, v]) => v.syllabusId === syl.id)
          const drafts = csEntries.filter(([_, v]) => v.status === 'draft').length
          const checked = csEntries.filter(([_, v]) => v.status === 'checked').length
          const published = csEntries.filter(([_, v]) => v.status === 'published').length
          const generated = drafts + checked + published

          const instructor = INSTRUCTORS.find(i => i.id === syl.instructorId)
          const progressPct = totalItems > 0 ? Math.round((generated / totalItems) * 100) : 0

          return (
            <div
              key={syl.id}
              onClick={() => onSelectCourse(syl.id)}
              style={{
                padding: '16px 20px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--gray-200)', background: 'var(--white)',
                cursor: 'pointer', transition: 'all 200ms',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-3d-hover)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                  background: progressPct === 100 ? 'var(--green-100, #dcfce7)' : progressPct > 0 ? 'var(--sky-100)' : 'var(--gray-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {progressPct === 100 ? <CheckCircle2 size={18} style={{ color: 'var(--green-600, #16a34a)' }} /> :
                   progressPct > 0 ? <Sparkles size={18} style={{ color: 'var(--sky-500)' }} /> :
                   <BookOpen size={18} style={{ color: 'var(--gray-400)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--gray-900)' }}>{syl.courseCode}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{syl.courseTitle}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '8px' }}>
                {instructor?.name || 'TBA'} · {outline.length} weeks · {totalItems} items
              </div>

              {/* Progress bar */}
              <div style={{ height: '4px', borderRadius: '2px', background: 'var(--gray-200)', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{
                  height: '100%', borderRadius: '2px', transition: 'width 300ms',
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? 'var(--green-500, #22c55e)' : 'var(--sky-500)',
                }} />
              </div>

              <div style={{ display: 'flex', gap: '8px', fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
                {drafts > 0 && <span style={{ color: 'var(--amber-600, #d97706)' }}>{drafts} draft</span>}
                {checked > 0 && <span style={{ color: 'var(--sky-600)' }}>{checked} checked</span>}
                {published > 0 && <span style={{ color: 'var(--green-600, #16a34a)' }}>{published} published</span>}
                {generated === 0 && <span style={{ fontStyle: 'italic' }}>Not started</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════ Builder: Course Workspace ═══════════════════════ */

function CourseWorkspace({ syllabusId, contentStore, onBack, onGenerateCourse, onGenerateWeek, onCheckItem, onBulkCheck, onToggleVisibility }) {
  const { addToast } = useToast()
  const syllabus = DEFAULT_SYLLABI.find(s => s.id === syllabusId)
  const [generatingWeek, setGeneratingWeek] = useState(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [expandedWeeks, setExpandedWeeks] = useState(new Set())
  const [selectedItems, setSelectedItems] = useState(new Set())

  if (!syllabus) return null

  const outline = syllabus.courseOutline || []
  const instructor = INSTRUCTORS.find(i => i.id === syllabus.instructorId)

  const toggleWeek = (w) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(w)) next.delete(w)
      else next.add(w)
      return next
    })
  }

  const getWeekItems = (weekNum) => {
    return Object.entries(contentStore)
      .filter(([_, v]) => v.syllabusId === syllabusId && v.week === weekNum)
  }

  const generateAll = () => {
    setGeneratingAll(true)
    pulseBus.expression('thinking')
    setTimeout(() => {
      const weeks = generateAllCourseContent(syllabus)
      let count = 0
      const updates = {}
      for (const weekData of weeks) {
        if (weekData.isExam) continue
        for (const item of weekData.items) {
          updates[item.id] = {
            content: item.content,
            status: 'draft',
            type: item.type,
            week: weekData.week,
            syllabusId: syllabus.id,
            title: item.content.title,
            generatedAt: new Date().toISOString().slice(0, 10),
          }
          count++
        }
      }
      onGenerateCourse(syllabus.id, updates)
      setGeneratingAll(false)
      addToast(`${count} items generated for ${syllabus.courseCode} — review each week`, 'success')
      pulseBus.celebrate(`Generated ${count} items for ${syllabus.courseCode}`)
    }, 1200)
  }

  const generateSingleWeek = (weekNum) => {
    setGeneratingWeek(weekNum)
    setTimeout(() => {
      const weekResult = generateWeekContent(syllabus, weekNum)
      const updates = {}
      let count = 0
      for (const item of weekResult.items) {
        updates[item.id] = {
          content: item.content,
          status: 'draft',
          type: item.type,
          week: weekResult.week,
          syllabusId: syllabus.id,
          title: item.content.title,
          generatedAt: new Date().toISOString().slice(0, 10),
        }
        count++
      }
      onGenerateWeek(updates)
      setGeneratingWeek(null)
      setExpandedWeeks(prev => new Set([...prev, weekNum]))
      addToast(`Week ${weekNum}: ${count} items generated`, 'success')
    }, 600)
  }

  const checkSelected = () => {
    const ids = [...selectedItems]
    onBulkCheck(ids)
    setSelectedItems(new Set())
    addToast(`${ids.length} items marked as checked`, 'success')
  }

  const toggleItemSelect = (id) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Summary stats
  const allEntries = Object.entries(contentStore).filter(([_, v]) => v.syllabusId === syllabusId)
  const totalDrafts = allEntries.filter(([_, v]) => v.status === 'draft').length
  const totalChecked = allEntries.filter(([_, v]) => v.status === 'checked').length
  const totalPublished = allEntries.filter(([_, v]) => v.status === 'published').length
  const totalGenerated = totalDrafts + totalChecked + totalPublished

  return (
    <div>
      {/* Course header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: '6px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
            {syllabus.courseCode} — {syllabus.courseTitle}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>
            {instructor?.name || 'TBA'} · {outline.length} weeks · {outline.filter(r => !isExamRow(r)).length} teaching weeks
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={generatingAll}
          onClick={generateAll}
        >
          {generatingAll ? (
            <><Loader2 size={14} className="spin" /> Generating…</>
          ) : totalGenerated > 0 ? (
            <><RotateCcw size={14} /> Regenerate All</>
          ) : (
            <><Sparkles size={14} /> Generate All Content</>
          )}
        </button>
      </div>

      {/* Summary bar */}
      {totalGenerated > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 16px',
          background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)',
          marginBottom: '16px', fontSize: '0.8125rem',
        }}>
          <span style={{ fontWeight: 600 }}>{totalGenerated} items generated</span>
          {totalDrafts > 0 && <span style={{ color: 'var(--amber-600, #d97706)' }}>{totalDrafts} draft</span>}
          {totalChecked > 0 && <span style={{ color: 'var(--sky-600)' }}>{totalChecked} checked</span>}
          {totalPublished > 0 && <span style={{ color: 'var(--green-600, #16a34a)' }}>{totalPublished} published</span>}
          {selectedItems.size > 0 && (
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={checkSelected}>
              <Check size={13} /> Check Selected ({selectedItems.size})
            </button>
          )}
        </div>
      )}

      {/* Week timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {outline.map((row, idx) => {
          const weekNum = row.week
          const exam = isExamRow(row)
          const weekItems = getWeekItems(weekNum)
          const hasContent = weekItems.length > 0
          const expanded = expandedWeeks.has(weekNum)
          const isGenerating = generatingWeek === weekNum
          const topic = exam ? (row.assessments || 'Examination') : (row.contents?.[0] || `Week ${weekNum}`)

          const drafts = weekItems.filter(([_, v]) => v.status === 'draft').length
          const checked = weekItems.filter(([_, v]) => v.status === 'checked').length
          const published = weekItems.filter(([_, v]) => v.status === 'published').length

          return (
            <div key={weekNum} style={{
              border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
              background: 'var(--white)', overflow: 'hidden',
            }}>
              {/* Week row */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                  cursor: hasContent ? 'pointer' : 'default',
                  background: exam ? 'var(--sky-50)' : expanded ? 'var(--gray-50)' : 'transparent',
                  borderBottom: expanded ? '1px solid var(--gray-100)' : 'none',
                }}
                onClick={() => hasContent && toggleWeek(weekNum)}
              >
                {/* Week number badge */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
                  background: exam ? 'var(--sky-500)' : hasContent ? 'var(--gray-100)' : 'var(--gray-50)',
                  color: exam ? '#fff' : hasContent ? 'var(--gray-700)' : 'var(--gray-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {weekNum}
                </div>

                {/* Topic */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.8125rem', fontWeight: hasContent ? 600 : 400,
                    color: exam ? 'var(--sky-700)' : 'var(--gray-800)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {exam && <span style={{ marginRight: '4px' }}>📝</span>}
                    {topic}
                  </div>
                  {exam && <div style={{ fontSize: '0.6875rem', color: 'var(--sky-500)' }}>Examination Week</div>}
                </div>

                {/* Status badges */}
                {hasContent && (
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {drafts > 0 && <span style={{
                      padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--amber-100, #fef3c7)', color: 'var(--amber-700, #b45309)',
                      fontSize: '0.625rem', fontWeight: 600,
                    }}>{drafts} draft</span>}
                    {checked > 0 && <span style={{
                      padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--sky-100)', color: 'var(--sky-700)',
                      fontSize: '0.625rem', fontWeight: 600,
                    }}>{checked} checked</span>}
                    {published > 0 && <span style={{
                      padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--green-100, #dcfce7)', color: 'var(--green-700, #15803d)',
                      fontSize: '0.625rem', fontWeight: 600,
                    }}>{published} pub</span>}
                  </div>
                )}

                {/* Generate button (if not exam and no content yet) */}
                {!exam && !hasContent && (
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={isGenerating}
                    onClick={(e) => { e.stopPropagation(); generateSingleWeek(weekNum) }}
                    style={{ flexShrink: 0 }}
                  >
                    {isGenerating ? (
                      <><Loader2 size={12} className="spin" /> Generating…</>
                    ) : (
                      <><Sparkles size={12} /> Generate</>
                    )}
                  </button>
                )}

                {/* Expand chevron */}
                {hasContent && (
                  expanded ? <ChevronDown size={16} style={{ color: 'var(--gray-400)', flexShrink: 0 }} /> :
                  <ChevronRight size={16} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                )}
              </div>

              {/* Expanded: item list */}
              {expanded && hasContent && (
                <div style={{ padding: '8px 14px 12px 58px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {weekItems.map(([id, item]) => {
                      const meta = STATUS_META[item.status] || STATUS_META.draft
                      const typeIcon = item.type === 'material' ? <FileText size={14} /> :
                                       item.type === 'activity' ? <MonitorPlay size={14} /> :
                                       <Tag size={14} />
                      const isSelected = selectedItems.has(id)

                      return (
                        <div key={id} style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 12px', borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isSelected ? 'var(--sky-300)' : 'var(--gray-100)'}`,
                          background: isSelected ? 'var(--sky-50)' : 'var(--white)',
                          transition: 'all 150ms',
                        }}>
                          {/* Select checkbox */}
                          {item.status === 'draft' && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelect(id)}
                              style={{ width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }}
                            />
                          )}

                          {/* Type icon */}
                          <span style={{ color: 'var(--sky-500)', flexShrink: 0 }}>{typeIcon}</span>

                          {/* Title */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
                              {item.type} · {item.generatedAt || '—'}
                            </div>
                          </div>

                          {/* Status badge */}
                          <span style={{
                            padding: '2px 8px', borderRadius: 'var(--radius-full)',
                            background: meta.color + '18', color: meta.color,
                            fontSize: '0.625rem', fontWeight: 600, flexShrink: 0,
                          }}>{meta.label}</span>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            {item.status === 'draft' && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.6875rem' }}
                                title="Mark as checked (you've reviewed this)"
                                onClick={() => { onCheckItem(id); addToast('Item checked — ready to publish', 'success') }}
                              >
                                <Check size={12} /> Check
                              </button>
                            )}
                            {item.status === 'checked' && (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.6875rem' }}
                                title="Publish to students"
                                onClick={() => { onToggleVisibility(id, 'published'); addToast('Published — students can see this', 'success') }}
                              >
                                <Send size={12} /> Publish
                              </button>
                            )}
                            {item.status === 'published' && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.6875rem', color: 'var(--green-600, #16a34a)' }}
                                title="Unpublish (hide from students)"
                                onClick={() => { onToggleVisibility(id, 'checked'); addToast('Unpublished — moved back to checked', 'info') }}
                              >
                                <Eye size={12} /> Unpublish
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Week-level actions */}
                  {weekItems.some(([_, v]) => v.status === 'draft') && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.6875rem' }}
                        onClick={() => {
                          const draftIds = weekItems.filter(([_, v]) => v.status === 'draft').map(([k]) => k)
                          onBulkCheck(draftIds)
                          addToast(`Week ${weekNum}: ${draftIds.length} items checked`, 'success')
                        }}
                      >
                        <Check size={12} /> Check All Drafts
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  )
}

/* ═══════════════════════ My Courseware Tab ═══════════════════════ */

function MyCoursewareTab({ items, contentStore, onSelectCourse }) {
  const navigate = useNavigate()
  const [viewingOutlineCourseId, setViewingOutlineCourseId] = useState(null)
  const { user } = useAuth()
  const isStudent = user?.role === 'student'

  const activeSyllabi = useMemo(() => {
    return DEFAULT_SYLLABI.filter(s => s.status === 'active' && (s.courseOutline?.length || 0) > 0)
  }, [])

  const myCoursewareList = useMemo(() => {
    return activeSyllabi.map(syl => {
      const csEntries = Object.entries(contentStore).filter(([_, v]) => v.syllabusId === syl.id)
      const drafts = csEntries.filter(([_, v]) => v.status === 'draft').length
      const checked = csEntries.filter(([_, v]) => v.status === 'checked').length
      const published = csEntries.filter(([_, v]) => v.status === 'published').length
      const total = drafts + checked + published
      const outlineWeeks = syl.courseOutline?.filter(r => !isExamRow(r)).length || 0

      let status = 'not-started'
      if (total > 0 && published === total) status = 'complete'
      else if (total > 0) status = 'partial'

      return { syl, drafts, checked, published, total, outlineWeeks, status }
    })
  }, [activeSyllabi, contentStore])

  if (viewingOutlineCourseId) {
    return (
      <CourseOutlineViewer
        syllabusId={viewingOutlineCourseId}
        onBack={() => setViewingOutlineCourseId(null)}
        isStudent={user?.role === 'student'}
        contentStore={contentStore}
      />
    )
  }

  if (myCoursewareList.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><BookOpen size={36} /></div>
        <h3>{isStudent ? 'No published courseware yet' : 'No active syllabi yet'}</h3>
        <p>{isStudent ? 'Your instructors haven\'t published any courseware for your courses yet. Check back later.' : 'Courseware is generated from approved syllabi with extracted Course Outcomes. Finish the syllabus approval loop first, then come back to generate courseware.'}</p>
      </div>
    )
  }

  const courseStatusBadge = (status) => {
    if (status === 'complete') return <span className="badge badge-published" style={{ fontSize: '0.6875rem' }}>Complete</span>
    if (status === 'partial') return <span className="badge badge-checked" style={{ fontSize: '0.6875rem' }}>In Progress</span>
    return <span className="badge badge-draft" style={{ fontSize: '0.6875rem' }}>Not Started</span>
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Course</th>
          {!isStudent && <th>Status</th>}
          <th>{isStudent ? 'Published' : 'Items'}</th>
          <th>Outline Weeks</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {myCoursewareList.map(({ syl, drafts, checked, published, total, outlineWeeks, status }) => (
          <tr key={syl.id}>
            <td>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{syl.courseCode}</div>
              <div className="text-sm text-muted">{syl.courseTitle}</div>
            </td>
            {!isStudent && <td>{courseStatusBadge(status)}</td>}
            <td>
              {isStudent ? (
                <span style={{ color: published > 0 ? 'var(--green-600, #16a34a)' : 'var(--gray-400)', fontWeight: published > 0 ? 600 : 400, fontSize: '0.8125rem' }}>
                  {published > 0 ? `${published} item${published !== 1 ? 's' : ''}` : 'No items yet'}
                </span>
              ) : (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                  {total === 0 ? (
                    <span className="text-muted">No items</span>
                  ) : (
                    <>
                      {drafts > 0 && <span style={{ color: 'var(--amber-600, #d97706)' }}>{drafts} draft</span>}
                      {checked > 0 && <span style={{ color: 'var(--sky-600)' }}>{checked} checked</span>}
                      {published > 0 && <span style={{ color: 'var(--green-600, #16a34a)' }}>{published} published</span>}
                    </>
                  )}
                </div>
              )}
            </td>
            <td className="text-sm">{outlineWeeks} weeks</td>
            <td>
              {isStudent ? (
                published > 0 ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setViewingOutlineCourseId(syl.id)}>
                    <Eye size={13} /> View Published
                  </button>
                ) : (
                  <span className="text-sm text-muted">Awaiting publish</span>
                )
              ) : (
                status === 'not-started' ? (
                  <button className="btn btn-primary btn-sm" onClick={() => onSelectCourse(syl.id)}>
                    <Sparkles size={13} /> Start Generating
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewingOutlineCourseId(syl.id)}>
                    <Eye size={13} /> View Items
                  </button>
                )
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ═══════════════════════ Page Shell ═══════════════════════ */

export default function Courseware() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items] = useState(COURSEWARE_ITEMS)
  const { store: contentStore, generateCourse, generateWeek, checkItem, bulkCheck, toggleVisibility, saveContent } = useContentStore()
  const [searchQuery, setSearchQuery] = useState('')
  const isStudent = user?.role === 'student'

  // Main tab (mine / builder)
  const requested = searchParams.get('tab')
  const mainTab = ALL_TABS.some(t => t.key === requested) ? requested : 'mine'
  const setMainTab = (key) => setSearchParams({ tab: key })

  // Builder state: which course is selected
  const [selectedCourseId, setSelectedCourseId] = useState(null)

  const handleSelectCourse = useCallback((sylId) => {
    setSelectedCourseId(sylId)
    setMainTab('builder')
  }, [setMainTab])

  const handleBackToGrid = useCallback(() => {
    setSelectedCourseId(null)
  }, [])

  const handleGenerateCourse = useCallback((syllabusId, courseUpdates) => {
    generateCourse(syllabusId, courseUpdates)
  }, [generateCourse])

  const handleGenerateWeek = useCallback((weekUpdates) => {
    generateWeek(weekUpdates)
  }, [generateWeek])

  const handleCheckItem = useCallback((contentId) => {
    checkItem(contentId)
  }, [checkItem])

  const handleBulkCheck = useCallback((contentIds) => {
    bulkCheck(contentIds)
  }, [bulkCheck])

  const handleToggleVisibility = useCallback((contentId, newStatus) => {
    toggleVisibility(contentId, newStatus)
  }, [toggleVisibility])

  return (
    <div className="container" data-pulse-zone="courseware">
      <div className="page-header">
        <h1>{isStudent ? 'My Courses' : 'Courseware'}</h1>
      </div>

      {isStudent && (
        <p className="text-sm text-muted" style={{ marginTop: '-8px', marginBottom: '16px' }}>
          Published learning materials and assessments for your courses.
        </p>
      )}

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--gray-200)', marginBottom: '20px' }}>
        {ALL_TABS.filter(t => !isStudent || t.key !== 'builder').map(t => (
          <button
            key={t.key}
            onClick={() => {
              setMainTab(t.key)
              if (t.key === 'builder' && !selectedCourseId) setSelectedCourseId(null)
            }}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600,
              fontSize: '0.875rem', color: mainTab === t.key ? 'var(--sky-600)' : 'var(--gray-500)',
              borderBottom: mainTab === t.key ? '2px solid var(--sky-500)' : '2px solid transparent',
              marginBottom: '-2px', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ Tab: My Courseware ═══════════════ */}
      {mainTab === 'mine' && (
        <MyCoursewareTab
          items={items}
          contentStore={contentStore}
          onSelectCourse={handleSelectCourse}
        />
      )}

      {/* ═══════════════ Tab: Courseware Builder ═══════════════ */}
      {mainTab === 'builder' && (
        <div>
          {selectedCourseId ? (
            <CourseWorkspace
              syllabusId={selectedCourseId}
              contentStore={contentStore}
              onBack={handleBackToGrid}
              onGenerateCourse={handleGenerateCourse}
              onGenerateWeek={handleGenerateWeek}
              onCheckItem={handleCheckItem}
              onBulkCheck={handleBulkCheck}
              onToggleVisibility={handleToggleVisibility}
            />
          ) : (
            <CourseSelectionGrid
              user={user}
              contentStore={contentStore}
              onSelectCourse={handleSelectCourse}
            />
          )}
        </div>
      )}
    </div>
  )
}
