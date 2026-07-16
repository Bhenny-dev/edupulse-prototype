import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { COURSEWARE_ITEMS, DEFAULT_SYLLABI } from '../data/mockData'
import { useToast } from '../context/ToastContext'
import { useContentStore } from '../context/ContentStoreContext'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import CourseOutlineViewer from '../components/courseware/CourseOutlineViewer'
import { generateAllCourseContent } from '../utils/courseContentGenerator'
import {
  Eye, Check, X, Send, FileText, Search, Clock, Sparkles, Calendar,
  Copy, Tag, MessageSquare, RotateCcw, Download,
  Info, Layers, Loader2, CircleCheck, BookOpen, Flag,
  ChevronDown, ChevronRight, MonitorPlay,
} from 'lucide-react'

// Courseware — FLOW_SPEC Phase 3. Generated from approved syllabi.
// contentStore: { [contentId]: { content, status: 'draft'|'published'|'hidden', type, week, syllabusId, title } }
// Builder shows per-course content so instructors can review/edit/publish individually.

const ALL_TABS = [
  { key: 'mine', label: 'My Courseware' },
  { key: 'builder', label: 'Courseware Builder' },
]

const BUILDER_SUB_TABS = [
  { key: 'generate', label: 'Generate', roles: ['instructor'] },
  { key: 'review', label: 'Review Queue', roles: ['instructor'] },
  { key: 'published', label: 'Published' },
]

const ITEM_STATUS_LABEL = { draft: 'Draft', finalized: 'Finalized', published: 'Published', hidden: 'Hidden' }

function isExamRow(row) {
  return !row.ilos && /examination/i.test(row.assessments || '')
}

/* ───────────────────────── Generate tab — per-course generation ───────────────────────── */

function GeneratePanel({ user, contentStore, onGenerateCourse }) {
  const { addToast } = useToast()
  const [generatingCourse, setGeneratingCourse] = useState(null)
  const [scope, setScope] = useState('whole')
  const [selectedWeek, setSelectedWeek] = useState(1)

  const mySyllabi = DEFAULT_SYLLABI.filter(s => s.instructorId === user?.id)
  const activeSyllabi = mySyllabi.filter(s => s.status === 'active' && (s.courseOutline?.length || 0) > 0)

  const runCourseGeneration = (syl) => {
    setGeneratingCourse(syl.id)
    pulseBus.expression('thinking')
    setTimeout(() => {
      const weeks = generateAllCourseContent(syl)
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
            syllabusId: syl.id,
            title: item.content.title,
            generatedAt: new Date().toISOString().slice(0, 10),
          }
          count++
        }
      }
      onGenerateCourse(syl.id, updates)
      setGeneratingCourse(null)
      addToast(`${count} items generated for ${syl.courseCode}`, 'success')
      pulseBus.celebrate(`Generated ${count} items for ${syl.courseCode} — review and publish when ready.`)
    }, 800)
  }

  if (activeSyllabi.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><BookOpen size={36} /></div>
        <h3>No active syllabi yet</h3>
        <p>Courseware is generated from the extracted Course Outline of an approved syllabus. Finish the approval
          loop first: check your draft → download for approval → upload the signed file → extract the outline.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted mb-16">
        Generate courseware content per course. Each course's content is stored separately so you can review,
        edit, and publish individual items. Nothing reaches students until you publish.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          const isGenerating = generatingCourse === syl.id
          const hasExisting = Object.keys(contentStore).some(k => k.includes(syl.id))

          return (
            <div key={syl.id} className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{syl.courseCode} — {syl.courseTitle}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>
                    {outline.length} weeks • {nonExamWeeks} teaching weeks • {totalItems} items to generate
                    {hasExisting && <span style={{ color: 'var(--green-600, #16a34a)', marginLeft: 6 }}>• Previously generated</span>}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={isGenerating}
                  onClick={() => runCourseGeneration(syl)}
                >
                  {isGenerating ? (
                    <><Loader2 size={13} className="spin" /> Generating…</>
                  ) : hasExisting ? (
                    <><RotateCcw size={13} /> Regenerate All</>
                  ) : (
                    <><Sparkles size={13} /> Generate Content</>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  )
}

/* ───────────────────────── Per-course content viewer for Review/Published tabs ───────────────────────── */

function CourseContentTab({ syllabusId, contentStore, statusFilter, onToggleVisibility }) {
  const syllabus = DEFAULT_SYLLABI.find(s => s.id === syllabusId)
  const [expandedWeeks, setExpandedWeeks] = useState(new Set([1]))

  if (!syllabus) return null

  const courseItems = Object.entries(contentStore)
    .filter(([_, item]) => item.syllabusId === syllabusId && item.status === statusFilter)

  if (courseItems.length === 0) return null

  const toggleWeek = (w) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(w)) next.delete(w)
      else next.add(w)
      return next
    })
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
          cursor: 'pointer', background: 'var(--gray-50)',
        }}
        onClick={() => toggleWeek(0)}
      >
        {expandedWeeks.has(0) ? <ChevronDown size={16} style={{ color: 'var(--gray-400)' }} /> : <ChevronRight size={16} style={{ color: 'var(--gray-400)' }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{syllabus.courseCode} — {syllabus.courseTitle}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{courseItems.length} item{courseItems.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {expandedWeeks.has(0) && (
        <div style={{ borderTop: '1px solid var(--gray-100)', padding: '8px 16px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {courseItems.map(([id, item]) => (
              <div key={id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--gray-200)', background: '#fff',
              }}>
                <FileText size={16} style={{ color: 'var(--sky-500)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>
                    {item.type} • Week {item.week} • {item.generatedAt || '—'}
                  </div>
                </div>
                <span className={`badge badge-${item.status}`} style={{ fontSize: '0.625rem' }}>{ITEM_STATUS_LABEL[item.status]}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 8px', color: item.status === 'published' ? 'var(--green-500, #22c55e)' : undefined }}
                  title={item.status === 'published' ? 'Unpublish' : 'Publish'}
                  onClick={() => onToggleVisibility(id, item.status === 'published' ? 'hidden' : 'published')}
                >
                  {item.status === 'published' ? <Eye size={14} /> : <Send size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── Review + Publish popovers ───────────────────────── */

function ReviewPopover({ item, onClose, onFinalize, onBackToDraft }) {
  const [comment, setComment] = useState('')
  const { addToast } = useToast()
  const syllabus = DEFAULT_SYLLABI.find(s => s.id === item.syllabusId)

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Review: {item.title}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span className={`badge badge-${item.status}`}>{ITEM_STATUS_LABEL[item.status]}</span>
          <span className="badge badge-draft">{item.type}</span>
          {item.week && <span className="badge badge-published">Week {item.week}</span>}
        </div>

        <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', marginBottom: '16px' }}>
          <p style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.875rem' }}>Content Preview</p>
          <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
            Preview of the {item.type}, drafted from Week {item.week || '—'} of the {syllabus?.courseCode} Course Outline.
            Edit and correct it before finalizing — you are the deciding author.
          </p>
        </div>

        <div className="form-group mb-16">
          <label className="form-label"><MessageSquare size={14} /> Your review notes</label>
          <textarea className="form-input" rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Notes to yourself before finalizing..." />
        </div>

        <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {item.status === 'draft' && (
              <>
                <button className="btn btn-ghost" onClick={() => { onBackToDraft(); onClose() }}><X size={14} /> Back to Draft</button>
                <button className="btn btn-primary" onClick={() => { addToast('Item finalized — ready to publish', 'success'); onFinalize(); onClose() }}><Check size={14} /> Finalize</button>
              </>
            )}
            {item.status === 'hidden' && (
              <button className="btn btn-primary" onClick={() => { addToast('Item finalized — ready to publish', 'success'); onFinalize(); onClose() }}><Check size={14} /> Finalize</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PublishPopover({ item, onClose, onPublish }) {
  const [schedule, setSchedule] = useState(false)
  const [publishDate, setPublishDate] = useState('')
  const { addToast } = useToast()
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="popover-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '16px' }}>Publish: {item.title}</h3>
        <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>Publishing makes this item visible to students.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Schedule release?</span>
          <div className={`toggle ${schedule ? 'active' : ''}`} onClick={() => setSchedule(!schedule)}><div className="toggle-knob" /></div>
        </div>
        {schedule && <div className="form-group"><label className="form-label"><Calendar size={14} /> Publish Date</label><input className="form-input" type="datetime-local" value={publishDate} onChange={e => setPublishDate(e.target.value)} /></div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onPublish(schedule ? publishDate : null); addToast(schedule ? 'Scheduled' : 'Published — students notified', 'success'); onClose() }}><Send size={14} /> {schedule ? 'Schedule' : 'Publish Now'}</button>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── Page shell ───────────────────────── */

export default function Courseware() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState(COURSEWARE_ITEMS)
  const { store: contentStore, generateCourse, toggleVisibility, saveContent } = useContentStore()
  const [reviewItem, setReviewItem] = useState(null)
  const [publishItem, setPublishItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [openedIds, setOpenedIds] = useState(['cw-1'])
  const [viewingOutlineCourseId, setViewingOutlineCourseId] = useState(null)
  const isStudent = user?.role === 'student'

  // Main tab (mine / builder)
  const requested = searchParams.get('tab')
  const mainTab = ALL_TABS.some(t => t.key === requested) ? requested : 'mine'
  const setMainTab = (key) => setSearchParams({ tab: key })

  // Builder sub-tab from URL
  const requestedSub = searchParams.get('sub')
  const visibleSubTabs = BUILDER_SUB_TABS.filter(t => !t.roles || t.roles.includes(user?.role))
  const subTab = visibleSubTabs.some(t => t.key === requestedSub) ? requestedSub : visibleSubTabs[0]?.key || 'generate'
  const setSubTab = (key) => setSearchParams({ tab: 'builder', sub: key })

  // ── My Courseware: deduplicated courses from active syllabi with item counts ──
  const activeSyllabi = useMemo(() => {
    return DEFAULT_SYLLABI.filter(s => s.status === 'active' && (s.courseOutline?.length || 0) > 0)
  }, [])

  const myCoursewareList = useMemo(() => {
    return activeSyllabi.map(syl => {
      const courseItems = items.filter(i => i.syllabusId === syl.id)
      const drafts = courseItems.filter(i => i.status === 'draft').length
      const finalized = courseItems.filter(i => i.status === 'finalized').length
      const published = courseItems.filter(i => i.status === 'published').length
      const total = courseItems.length

      // Also count from contentStore
      const csEntries = Object.entries(contentStore).filter(([_, v]) => v.syllabusId === syl.id)
      const csDrafts = csEntries.filter(([_, v]) => v.status === 'draft').length
      const csPublished = csEntries.filter(([_, v]) => v.status === 'published').length

      const outlineWeeks = syl.courseOutline?.filter(r => !isExamRow(r)).length || 0

      const totalDrafts = drafts + csDrafts
      const totalPublished = published + csPublished
      const totalCount = Math.max(total, csEntries.length)

      let status = 'not-started'
      if (totalCount > 0 && totalPublished === totalCount && csEntries.length > 0) status = 'complete'
      else if (totalCount > 0 || csEntries.length > 0) status = 'partial'

      return { syl, drafts: totalDrafts, finalized, published: totalPublished, total: totalCount, outlineWeeks, status }
    })
  }, [activeSyllabi, items, contentStore])

  const startGenerating = (sylId) => {
    setMainTab('builder')
    setSearchParams({ tab: 'builder', sub: 'generate', syl: sylId })
  }

  const viewItems = (sylId) => {
    setViewingOutlineCourseId(sylId)
  }

  // ── Content store operations now via shared context ──
  const handleGenerateCourse = useCallback((syllabusId, courseUpdates) => {
    generateCourse(syllabusId, courseUpdates)
  }, [generateCourse])

  const handleToggleVisibility = useCallback((contentId, newStatus) => {
    toggleVisibility(contentId, newStatus)
    const label = newStatus === 'published' ? 'Published — students can now see this' : 'Hidden from students'
    addToast(label, 'success')
  }, [toggleVisibility, addToast])

  const handleContentSave = useCallback((contentId, newContent) => {
    saveContent(contentId, newContent)
  }, [saveContent])

  const handleFinalize = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'finalized' } : i))
  const handleBackToDraft = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'draft' } : i))
  const handlePublish = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'published' } : i))

  const openMaterial = (item) => {
    if (!openedIds.includes(item.id)) {
      setOpenedIds(prev => [...prev, item.id])
      addToast('Opened — your instructor\'s scoring sheet now shows this material as opened', 'info')
    }
  }

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // Courses that have content in contentStore (for builder per-course view)
  const coursesWithContent = useMemo(() => {
    const syllabusIds = [...new Set(Object.values(contentStore).map(v => v.syllabusId))]
    return syllabusIds.map(id => DEFAULT_SYLLABI.find(s => s.id === id)).filter(Boolean)
  }, [contentStore])

  const courseStatusBadge = (status) => {
    if (status === 'complete') return <span className="badge badge-published" style={{ fontSize: '0.6875rem' }}>Complete</span>
    if (status === 'partial') return <span className="badge badge-checked" style={{ fontSize: '0.6875rem' }}>In Progress</span>
    return <span className="badge badge-draft" style={{ fontSize: '0.6875rem' }}>Not Started</span>
  }

  // If viewing a course outline, show the outline viewer
  if (viewingOutlineCourseId) {
    return (
      <CourseOutlineViewer
        syllabusId={viewingOutlineCourseId}
        onBack={() => setViewingOutlineCourseId(null)}
        isStudent={isStudent}
        contentStore={contentStore}
        onToggleVisibility={isStudent ? undefined : handleToggleVisibility}
        onContentSave={isStudent ? undefined : handleContentSave}
      />
    )
  }

  return (
    <div className="container" data-pulse-zone="courseware">
      <div className="page-header">
        <h1>{isStudent ? 'My Courses' : 'Courseware'}</h1>
        {mainTab === 'builder' && subTab === 'review' && selected.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { selected.forEach(handleFinalize); addToast(`${selected.length} items finalized`, 'success'); setSelected([]) }}><Check size={14} /> Bulk Finalize ({selected.length})</button>
          </div>
        )}
      </div>

      {isStudent && (
        <p className="text-sm text-muted" style={{ marginTop: '-8px', marginBottom: '16px' }}>
          Published learning materials and assessments for your courses. Opening a material marks it as accessed;
          your instructor can track your progress through the Student Monitoring page.
        </p>
      )}

      {/* ── Main Tabs ── */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--gray-200)', marginBottom: '20px' }}>
        {ALL_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => {
              setMainTab(t.key)
              if (t.key === 'builder') setSubTab('generate')
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

      {/* ═══════════════════════════ Tab: My Courseware ═══════════════════════════ */}
      {mainTab === 'mine' && (
        <div>
          {myCoursewareList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={36} /></div>
              <h3>No active syllabi yet</h3>
              <p>Courseware is generated from approved syllabi with extracted Course Outcomes. Finish the syllabus approval loop first, then come back to generate courseware.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Outline Weeks</th>
                  <th>Next Action</th>
                </tr>
              </thead>
              <tbody>
                {myCoursewareList.map(({ syl, drafts, finalized, published, total, outlineWeeks, status }) => (
                  <tr key={syl.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{syl.courseCode}</div>
                      <div className="text-sm text-muted">{syl.courseTitle}</div>
                    </td>
                    <td>{courseStatusBadge(status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                        {total === 0 ? (
                          <span className="text-muted">No items</span>
                        ) : (
                          <>
                            {drafts > 0 && <span style={{ color: 'var(--amber-600, #d97706)' }}>{drafts} draft</span>}
                            {finalized > 0 && <span style={{ color: 'var(--sky-600)' }}>{finalized} finalized</span>}
                            {published > 0 && <span style={{ color: 'var(--green-600, #16a34a)' }}>{published} published</span>}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="text-sm">{outlineWeeks} weeks</td>
                    <td>
                      {status === 'not-started' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => startGenerating(syl.id)}>
                          <Sparkles size={13} /> Start Generating
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => viewItems(syl.id)}>
                          <Eye size={13} /> View Items
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══════════════════════════ Tab: Courseware Builder ═══════════════════════════ */}
      {mainTab === 'builder' && (
        <div>
          {/* Builder sub-tabs */}
          <div className="tabs mb-24" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            {visibleSubTabs.map(t => (
              <button key={t.key} className={`tab ${subTab === t.key ? 'active' : ''}`} onClick={() => setSubTab(t.key)} style={{ whiteSpace: 'nowrap' }}>{t.key === 'published' && isStudent ? 'My Materials' : t.label}</button>
            ))}
          </div>

          {/* ── Generate sub-tab ── */}
          {subTab === 'generate' && user?.role === 'instructor' && (
            <GeneratePanel
              user={user}
              contentStore={contentStore}
              onGenerateCourse={handleGenerateCourse}
            />
          )}

          {/* ── Review Queue sub-tab: per-course content with status=draft ── */}
          {subTab === 'review' && user?.role === 'instructor' && (
            <div>
              {coursesWithContent.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><FileText size={36} /></div>
                  <h3>Nothing to review</h3>
                  <p>Generate courseware from the Generate tab to populate this queue.</p>
                  <button className="btn btn-primary" onClick={() => setSubTab('generate')}><Sparkles size={14} /> Generate</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {coursesWithContent.map(syl => (
                    <CourseContentTab
                      key={syl.id}
                      syllabusId={syl.id}
                      contentStore={contentStore}
                      statusFilter="draft"
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Published sub-tab: per-course content with status=published ── */}
          {subTab === 'published' && (
            <div>
              {coursesWithContent.length === 0 && items.filter(i => i.status === 'published').length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Copy size={36} /></div>
                  <h3>Nothing published yet</h3>
                  <p>Published courseware will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {coursesWithContent.map(syl => (
                    <CourseContentTab
                      key={syl.id}
                      syllabusId={syl.id}
                      contentStore={contentStore}
                      statusFilter="published"
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                  {/* Legacy items from COURSEWARE_ITEMS */}
                  {items.filter(i => i.status === 'published').length > 0 && (
                    <div className="card" style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px', background: 'var(--gray-50)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Legacy Published Items</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Items from before content store migration</div>
                      </div>
                      <div style={{ padding: '8px 16px' }}>
                        {items.filter(i => i.status === 'published').map(item => (
                          <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--gray-200)', background: '#fff', marginBottom: 6,
                          }}>
                            <FileText size={16} style={{ color: 'var(--sky-500)', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{item.title}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>{item.type} • Week {item.week}</div>
                            </div>
                            {isStudent && (
                              item.type === 'assessment' ? (
                                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => navigate(`/assessment?item=${item.id}`)}>Answer</button>
                              ) : (
                                <button className={`btn ${openedIds.includes(item.id) ? 'btn-ghost' : 'btn-primary'} btn-sm`} style={{ flexShrink: 0 }} onClick={() => openMaterial(item)}>
                                  {openedIds.includes(item.id) ? <><Check size={13} /> Opened</> : <><BookOpen size={13} /> Open</>}
                                </button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {reviewItem && <ReviewPopover item={reviewItem} onClose={() => setReviewItem(null)} onFinalize={() => handleFinalize(reviewItem.id)} onBackToDraft={() => handleBackToDraft(reviewItem.id)} />}
      {publishItem && <PublishPopover item={publishItem} onClose={() => setPublishItem(null)} onPublish={() => handlePublish(publishItem.id)} />}
    </div>
  )
}
