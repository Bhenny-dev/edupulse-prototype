import TeachingFileAttachment from './TeachingFileAttachment'
import SyllabusSources from './SyllabusSources'
import { Fragment, useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Check, Send, FileText, Sparkles, Tag, RotateCcw, Loader2, Flag, MonitorPlay, ArrowLeft, PlugZap, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { useToast } from '../../context/ToastContext'
import { useContentStore } from '../../context/ContentStoreContext'
import { useAI } from '../../context/AIContext'
import { INSTRUCTORS } from '../../data/mockData'
import { pulse as pulseBus } from '../pulse/pulseBus'
import { generateWeekDraft } from '../../utils/aiCourseware'
import { plannedCoursewareTypes,missingCoursewareCount } from '../../lib/rag/coursewarePlan'
import { buildCourseInput } from '../../utils/courseInput'
import { checkpointId, checkpointResults, checkpointItem, coursewareFingerprint } from '../../utils/coursewareCheckpoint'
import { coursewarePlan } from '../../lib/rag/coursewarePlan'
import DeliverySettings from './DeliverySettings'
import CoursewareActions from './CoursewareActions'
import DocumentViewer from './DocumentViewer'
import PresentationViewer from './PresentationViewer'
import AssessmentEditor from './AssessmentEditor'
import './courseware.css'

const SETUP_ERRORS = new Set(['MODEL_UNAVAILABLE', 'MODEL_NOT_AVAILABLE', 'MODEL_INCOMPATIBLE', 'PROVIDER_AUTH', 'PROVIDER_CREDITS', 'PROVIDER_QUOTA', 'PROVIDER_WORKSPACE_REQUIRED', 'MODEL_TOKEN_LIMIT'])
const STATUS_META = { draft: { label: 'Draft', badge: 'badge-draft' }, checked: { label: 'Checked', badge: 'badge-checked' }, published: { label: 'Published', badge: 'badge-published' } }
const isExamRow = row => !row.ilos && /examination/i.test(row.assessments || '')
const missingWeekContent=(row,items)=>missingCoursewareCount(row,items.filter(([,item])=>!item.generationCheckpoint).map(([,item])=>item))>0

export default function CourseWorkspace({ syllabusId, focusWeek, contentStore, onBack, onGenerateWeek, onCheckItem, onBulkCheck, onToggleVisibility }) {
  const { syllabi, saving, dirty } = useWorkspace()
  const { user } = useAuth()
  const [deliveryItemId, setDeliveryItemId] = useWorkspaceViewState(`course:${syllabusId}:delivery`,null)
  const generationRef = useRef(null)
  const [generationProgress, setGenerationProgress] = useState('')
  // A failed generation stays on the page until it is dismissed or a later generation succeeds.
  const [generationIssue, setGenerationIssue] = useState(null)
  useEffect(() => () => generationRef.current?.abort(), [])
  const ai = useAI()
  const navigate = useNavigate()
  const reportIssue = (err, saved = 0) => setGenerationIssue({ message: err.message, setup: SETUP_ERRORS.has(err.code), saved })

  const { addToast } = useToast()
  const { saveContent, commitGenerationPart } = useContentStore()
  const liveContent=useRef(contentStore)
  liveContent.current=contentStore
  const syllabus = syllabi.find(s => s.id === syllabusId)
  const [generatingWeek, setGeneratingWeek] = useState(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [expandedWeeks, setExpandedWeeks] = useWorkspaceViewState(`course:${syllabusId}:expanded`,()=>new Set())
  const [selectedItems, setSelectedItems] = useWorkspaceViewState(`course:${syllabusId}:selected`,()=>new Set())
  const [viewingId,setViewingId]=useWorkspaceViewState(`course:${syllabusId}:reader`,null)
  const viewingItem=useMemo(()=>contentStore[viewingId]?.syllabusId===syllabusId?{...contentStore[viewingId].content,_storeId:viewingId}:null,[contentStore,viewingId,syllabusId])
  const [viewingType, setViewingType] = useWorkspaceViewState(`course:${syllabusId}:type`,null)
  const [viewMode, setViewMode] = useWorkspaceViewState(`course:${syllabusId}:mode`,null)
  // A link from Pulse (?course=…&week=…) opens that week and scrolls it into view.
  useEffect(() => {
    if (!focusWeek) return
    setExpandedWeeks(prev => prev.has(focusWeek) ? prev : new Set([...prev, focusWeek]))
    const frame = requestAnimationFrame(() => document.querySelector(`[data-week="${focusWeek}"]`)?.scrollIntoView({ block: 'center' }))
    return () => cancelAnimationFrame(frame)
  }, [focusWeek, syllabusId])

  if (!syllabus) return null

  const outline = syllabus.courseOutline || []
  const teachingWeeks = outline.filter(r => !isExamRow(r)).length
  const instructor = user?.authenticated ? user : INSTRUCTORS.find(i => i.id === syllabus.instructorId)

  const toggleWeek = (w) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(w)) next.delete(w)
      else next.add(w)
      return next
    })
  }

  const getWeekItems = (weekNum) => {
    return Object.entries(liveContent.current)
      .filter(([_, v]) => v.content && v.syllabusId === syllabusId && v.week === weekNum)
  }

  const saveWeekDraft = async (weekNum, signal, missingOnly = false, restart = false) => {
    let expected=Object.fromEntries(getWeekItems(weekNum).filter(([,item])=>!item.generationCheckpoint))
    const id=checkpointId(syllabus.id,weekNum),input=buildCourseInput(syllabus,weekNum),planned=plannedCoursewareTypes(outline.find(row=>row.week===weekNum)||{})
    input.skipSteps=coursewarePlan(input).filter(part=>part.type==='assessment'&&part.sectionId&&getWeekItems(weekNum).some(([,item])=>item.type==='assessment'&&item.content?.outlineSectionId===part.sectionId&&(missingOnly||['checked','published'].includes(item.status)))).map(part=>part.key)
    input.generatedTeaching=getWeekItems(weekNum).filter(([,item])=>item.type!=='assessment'&&!item.generationCheckpoint).flatMap(([,item])=>item.content?.sections||[]).map(section=>section.heading+'\n'+section.body).join('\n\n').slice(0,18000)
    let checkpoint=liveContent.current[id]
    const cached=checkpoint?.generationCheckpoint
    const samePlan=!restart&&Array.isArray(cached?.types)&&cached.types.every(type=>planned.includes(type))&&cached.fingerprint===await coursewareFingerprint(input,cached.types)
    if(samePlan&&cached.expected)expected=cached.expected
    const skipTypes=planned.filter(type=>{const existing=getWeekItems(weekNum).find(([,item])=>!item.generationCheckpoint&&item.type===type)?.[1];if(type==='assessment'&&(input.sections?.length||0)>1)return !coursewarePlan(input).some(part=>part.type==='assessment');return (type==='material'&&existing?.attachedAt)||(samePlan&&!cached.types.includes(type))||(existing&&((missingOnly&&!samePlan)||['checked','published'].includes(existing.status)))})
    const types=planned.filter(type=>!skipTypes.includes(type)),fingerprint=await coursewareFingerprint(input,types)
    const completed=restart?[]:await checkpointResults(input,checkpoint?.generationCheckpoint,fingerprint)
    const total=coursewarePlan(input).filter(part=>types.includes(part.type)).length
    const weekResult = await generateWeekDraft(syllabus, weekNum, signal,'',{skipTypes,completed,
      generatedTeaching:input.generatedTeaching,skipSteps:input.skipSteps,
      onProgress:(done,total,key)=>setGenerationProgress(`Week ${weekNum} · ${done}/${total} parts saved · ${key==='sources'?'Reading sources':'Generating '+(key.startsWith('lesson-')?'lesson '+key.slice(7):key)}`),
      onPart:async results=>{
        const item=await checkpointItem(input,syllabus.id,{version:1,fingerprint,types,results,total,expected})
        const receipt=await commitGenerationPart(item,{syllabus,expected:checkpoint})
        checkpoint=receipt.data.content[id];liveContent.current=receipt.data.content
        setExpandedWeeks(prev=>new Set([...prev,weekNum]))
      }})
    if (signal.aborted) return 0
    const updates = {}
    for (const item of weekResult.items) {
      // Reviewed/published work must not be silently overwritten by a batch.
      const existingEntry = getWeekItems(weekNum).find(([, saved]) => !saved.generationCheckpoint && saved.type === item.type && saved.content && saved.content.outlineSectionId===item.content.outlineSectionId)
      const existing = existingEntry?.[1]
      if (existing && (missingOnly || ['checked', 'published'].includes(existing.status))) continue
      updates[existingEntry?.[0] || item.id] = { ...existing, content: { ...item.content, ...(existing?.content.assessmentPolicy ? { assessmentPolicy: existing.content.assessmentPolicy } : {}) }, status: 'draft', type: item.type,
        week: weekNum, syllabusId: syllabus.id, title: item.content.title,
        generatedAt: new Date().toISOString() }
    }
    const receipt=await onGenerateWeek(updates,{syllabus,week:weekNum,expected,types:weekResult.plannedTypes,missingOnly,checkpoint})
    liveContent.current=receipt.data.content
    if (receipt.saved) pulseBus.progress('courseware-generated', `${syllabus.courseCode}, week ${weekNum}`)
    setExpandedWeeks(prev => new Set([...prev, weekNum]))
    return receipt.saved
  }
  const generateAll = async (missingOnly = false, restart = false) => {
    if (generationRef.current) return
    const controller = new AbortController(); generationRef.current = controller
    setGeneratingAll(true); setGenerationIssue(null); pulseBus.expression('thinking')
    let count = 0
    const failedWeeks=[]
    try {
      const rows = (syllabus.courseOutline || []).filter(row => !isExamRow(row) && (
        getWeekItems(row.week).some(([,item])=>item.generationCheckpoint) || missingWeekContent(row,getWeekItems(row.week)) ||
        (!missingOnly && getWeekItems(row.week).some(([, item]) => item.status === 'draft'))
      ))
      for (const [index, row] of rows.entries()) {
        controller.signal.throwIfAborted()
        setGenerationProgress(`Week ${row.week} (${index + 1}/${rows.length})`)
        try { count += await saveWeekDraft(row.week, controller.signal, missingOnly, restart) }
        catch(error){
          controller.signal.throwIfAborted()
          if(!['INVALID_GENERATION','MODEL_TOKEN_LIMIT','INCOMPLETE_COURSEWARE'].includes(error.code))throw error
          failedWeeks.push(row.week)
        }
      }
      if(failedWeeks.length)reportIssue(new Error(`Saved completed parts. Weeks ${failedWeeks.join(', ')} still need generation. Resume to retry only their unfinished parts.`),count)
      else addToast(`${count} AI drafts saved. Checked and published items were preserved.`, 'success')
    } catch (err) {
      if (controller.signal.aborted) addToast(`Generation stopped. ${count} completed drafts were saved.`, 'info')
      else reportIssue(err, count)
    }
    finally { setGeneratingAll(false); setGenerationProgress(''); generationRef.current = null; pulseBus.expression('idle') }
  }
  const generateSingleWeek = async (weekNum, missingOnly = false, restart = false) => {
    if (generationRef.current) return
    const controller = new AbortController(); generationRef.current = controller
    setGeneratingWeek(weekNum); setGenerationProgress(`Generating week ${weekNum}`); setGenerationIssue(null)
    try { const count = await saveWeekDraft(weekNum, controller.signal, missingOnly, restart); if (!controller.signal.aborted) addToast(`Week ${weekNum}: ${count} AI drafts saved for review.`, 'success') }
    catch (err) {
      if (controller.signal.aborted) addToast('Generation stopped. Existing content was preserved.', 'info')
      else reportIssue(err)
    }
    finally { setGeneratingWeek(null); setGenerationProgress(''); generationRef.current = null }
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

  const openItem = (id, item, mode) => {
    setViewingId(id)
    if (item.type === 'assessment') {
      setViewingType('assessment')
      setViewMode(null)
    } else {
      setViewMode(mode || item.content?.viewMode || 'document')
      setViewingType(null)
    }
  }

  const handleSaveContent = (newContent) => {
    if (viewingItem?._storeId) {
      const { _storeId, ...existing } = viewingItem
      saveContent(_storeId, { ...existing, [viewingType === 'assessment' ? 'questions' : 'sections']: newContent })
      addToast('Content saved', 'success')
    }
    setViewingId(null)
    setViewMode(null)
    setViewingType(null)
  }

  // Summary stats
  const allEntries = Object.entries(contentStore).filter(([_, v]) => v.content && !v.generationCheckpoint && v.syllabusId === syllabusId && outline.some(row => !isExamRow(row) && row.week === v.week))
  const unfinished=Object.values(contentStore).filter(item=>item.syllabusId===syllabusId&&item.generationCheckpoint)
  const totalDrafts = allEntries.filter(([_, v]) => v.status === 'draft').length
  const totalChecked = allEntries.filter(([_, v]) => v.status === 'checked').length
  const totalPublished = allEntries.filter(([_, v]) => v.status === 'published').length
  const totalGenerated = totalDrafts + totalChecked + totalPublished

  if (viewingItem) {
    if (viewMode === 'presentation') {
      return (
        <PresentationViewer cacheKey={viewingId}
          content={viewingItem}
          onBack={() => { setViewingId(null); setViewMode(null) }}
          isStudent={false}
          onSave={handleSaveContent}
        />
      )
    }
    if (viewingType === 'assessment') {
      return <AssessmentEditor topics={syllabus.courseOutline?.find(row=>row.week===contentStore[viewingItem._storeId]?.week)?.contents || []} content={viewingItem} onBack={() => { setViewingId(null); setViewingType(null) }} isStudent={false} onSave={handleSaveContent} />
    }
    return (
      <DocumentViewer
        content={viewingItem}
        readOnly={!!contentStore[viewingId]?.generationCheckpoint}
        onBack={() => { setViewingId(null); setViewMode(null) }}
        isStudent={false}
        onSave={handleSaveContent}
      />
    )
  }

  const busy = generatingAll || generatingWeek !== null
  const draftIds = allEntries.filter(([, item]) => item.status === 'draft').map(([id]) => id)
  const checkDrafts = ids => { onBulkCheck(ids); setSelectedItems(new Set()); addToast(`${ids.length} items marked as checked`, 'success') }
  return (
    <div>
      <div className="cw-workspace-header">
        <button className="btn btn-ghost cw-more" aria-label="Back to courses" onClick={onBack}><ArrowLeft size={18} /></button>
        <div className="cw-workspace-title"><h2>{syllabus.courseCode} — {syllabus.courseTitle}</h2><p className="text-sm text-muted">{instructor?.name || 'Instructor'} · {outline.length} {outline.length === 1 ? 'week' : 'weeks'} · {teachingWeeks} teaching {teachingWeeks === 1 ? 'week' : 'weeks'}</p></div>
        {(totalGenerated === 0 || unfinished.length>0) && <button className="btn btn-primary" disabled={busy || saving || dirty} onClick={() => generateAll(unfinished.length>0)}><Sparkles size={15} /> {unfinished.length?'Resume generation':'Generate All Content'}</button>}
        <CoursewareActions label="Course actions" disabled={busy} actions={[
          { label: 'Generate missing content', icon: Sparkles, onSelect: () => generateAll(true) },
          { label: 'Regenerate All', icon: RotateCcw, disabled: !totalDrafts&&!unfinished.length, onSelect: () => generateAll(false,true) },
          { label: 'Check All Drafts', icon: Check, disabled: !draftIds.length, onSelect: () => checkDrafts(draftIds) },
          { label: 'Expand all weeks', icon: Eye, onSelect: () => setExpandedWeeks(new Set(outline.map(row => row.week))) },
          { label: 'Collapse all weeks', icon: Eye, onSelect: () => setExpandedWeeks(new Set()) },
        ]} />
      </div>
      {generationProgress && <div className="ai-actions cw-generation-progress" role="status"><Loader2 size={16} className="spin" /><span>{generationProgress}</span><button className="btn btn-secondary btn-sm" onClick={() => generationRef.current?.abort()}>Stop generation</button></div>}
      {!busy && unfinished.length>0 && <p role="status">Saved parts are available below. Resume generation to finish; unfinished drafts cannot be checked or published.</p>}
      {generationIssue ? <div className="cw-ai-notice is-error" role="alert"><TriangleAlert size={18} aria-hidden="true" /><div className="cw-ai-notice-body"><strong>Generation did not finish</strong><span>{generationIssue.message}{generationIssue.saved ? ` ${generationIssue.saved} completed drafts remain available for review.` : ''}</span></div>{generationIssue.setup && <button className="btn btn-primary btn-sm" onClick={() => navigate('/settings?tab=ai-provider')}><PlugZap size={14} /> Set up Pulse AI</button>}<button className="btn btn-ghost btn-sm" onClick={() => setGenerationIssue(null)}>Dismiss</button></div> : !ai.ready && <div className="cw-ai-notice" role="status"><PlugZap size={18} aria-hidden="true" /><div className="cw-ai-notice-body"><strong>Pulse AI is not set up yet</strong><span>Generation needs a connected provider or the on-device model. Your outline and any saved drafts stay as they are.</span></div><button className="btn btn-secondary btn-sm" onClick={() => navigate('/settings?tab=ai-provider')}><PlugZap size={14} /> Set up Pulse AI</button></div>}
      {totalGenerated > 0 && <div className="cw-summary"><strong>{totalGenerated} {totalGenerated === 1 ? 'item' : 'items'} generated</strong>{totalDrafts > 0 && <span>{totalDrafts} draft</span>}{totalChecked > 0 && <span>{totalChecked} checked</span>}{totalPublished > 0 && <span>{totalPublished} published</span>}{selectedItems.size > 0 && <button className="btn btn-primary btn-sm" onClick={checkSelected}><Check size={14} /> Check Selected ({selectedItems.size})</button>}</div>}
      <SyllabusSources syllabus={syllabus} />
      <div className="cw-week-list">
        {outline.map(row => {
          const weekNum = row.week, exam = isExamRow(row), weekItems = getWeekItems(weekNum)
          const hasContent = weekItems.length > 0, expanded = expandedWeeks.has(weekNum)
          const weekDraftIds = weekItems.filter(([, item]) => item.status === 'draft'&&!item.generationCheckpoint).map(([id]) => id)
          const pending=weekItems.find(([,item])=>item.generationCheckpoint)?.[1]
          const topic = (row.contents || []).join('; ') || (exam ? row.assessments : `Week ${weekNum}`)
          return <section key={weekNum} data-week={weekNum} className="cw-week-card">
            <div className="cw-week-heading">
              <span className="cw-week-number">{exam ? <Flag size={16} aria-label="Examination week" /> : weekNum}</span>
              <div className="cw-week-topic"><strong>{topic}</strong>{exam && <span className="text-sm text-muted">Examination week</span>}{hasContent && <span className="text-sm text-muted">{weekItems.length} {weekItems.length === 1 ? 'item' : 'items'} · {weekDraftIds.length} draft</span>}</div>
              {!exam && <div className="cw-row-actions">
                {pending && <button className="btn btn-secondary btn-sm" disabled={busy || saving || dirty} onClick={()=>generateSingleWeek(weekNum)}><RotateCcw size={14}/>Resume</button>}
                <TeachingFileAttachment syllabus={syllabus} week={weekNum} disabled={busy||saving||dirty} onSaved={receipt=>{liveContent.current=receipt.data.content;setExpandedWeeks(previous=>new Set([...previous,weekNum]));addToast('Teaching file saved as a draft and retained as a reference.','success')}}/>{hasContent ? <button className="btn btn-secondary btn-sm" aria-expanded={expanded} aria-controls={`week-items-${weekNum}`} onClick={() => toggleWeek(weekNum)}><Eye size={14} /> {expanded ? 'Hide' : 'View'}</button> : <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => generateSingleWeek(weekNum)}>{generatingWeek === weekNum ? <><Loader2 size={14} className="spin" /> Generating…</> : <><Sparkles size={14} /> Generate</>}</button>}
                {hasContent && <CoursewareActions label={`Week ${weekNum} actions`} actions={[
                  { label: 'Generate missing content', icon: Sparkles, disabled: busy || !missingWeekContent(row,weekItems), onSelect: () => generateSingleWeek(weekNum, true) },
                  { label: 'Regenerate week', icon: RotateCcw, disabled: busy || (!weekDraftIds.length&&!pending), onSelect: () => generateSingleWeek(weekNum,false,true) },
                  { label: 'Check All Drafts', icon: Check, disabled: !weekDraftIds.length, onSelect: () => checkDrafts(weekDraftIds) },
                ]} />}
              </div>}
            </div>
            {expanded && hasContent && <div id={`week-items-${weekNum}`} className="cw-week-items">
              {[...weekItems].sort((a,b)=>Number(a[1].type==='assessment')-Number(b[1].type==='assessment')).map(([id, item],itemIndex,items) => {
                const meta = STATUS_META[item.status] || STATUS_META.draft
                const Icon = item.type === 'material' ? FileText : item.type === 'activity' ? MonitorPlay : Tag
                const title = item.title || item.content.title
                const generatedAt = item.generatedAt ? new Date(item.generatedAt) : null
                return <Fragment key={id}>{(itemIndex===0||items[itemIndex-1][1].type!=='assessment'&&item.type==='assessment')&&<h3 className="cw-output-heading">{item.type==='assessment'?'Assessments':'Teaching-Learning Activities'}</h3>}<div className="cw-item" data-content-id={id}>
                  {item.status === 'draft' && !item.generationCheckpoint && <input type="checkbox" aria-label={`Select ${title}`} checked={selectedItems.has(id)} onChange={() => toggleItemSelect(id)} />}
                  <Icon size={16} aria-hidden="true" />
                  <div className="cw-item-title"><strong>{title}</strong><div className="text-sm text-muted">{item.type}{Number.isFinite(generatedAt?.getTime()) && <time dateTime={item.generatedAt}> · {generatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>}{item.content?.questions && ` · ${item.content.questions.length} questions`}{item.content?.category && ` · ${item.content.category}`}</div></div>
                  <span className={`badge ${meta.badge}`}>{item.generationCheckpoint?'Unfinished':item.releaseAt && new Date(item.releaseAt) > new Date() && item.status === 'published' ? 'Scheduled' : meta.label}</span>
                  {item.outOfAlignment && <span className="badge badge-draft">Syllabus changed — review alignment</span>}
                  <div className="cw-row-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => openItem(id, item)}><Eye size={14} /> View</button>
                    {!item.generationCheckpoint && <CoursewareActions label={`Actions for ${title}`} actions={[
                      ...(item.type !== 'assessment' ? [
                        { label: 'View document', icon: FileText, onSelect: () => openItem(id, item, 'document') },
                        { label: 'View presentation', icon: MonitorPlay, onSelect: () => openItem(id, item, 'presentation') },
                      ] : []),
                      ...(item.status === 'draft' ? [{ label: 'Check', icon: Check, onSelect: () => { onCheckItem(id); addToast('Item marked as checked', 'success') } }] : []),
                      ...(item.status === 'checked' ? [{ label: 'Publish', icon: Send, disabled: saving || dirty, onSelect: () => onToggleVisibility(id, 'published') }] : []),
                      ...(item.status === 'published' ? [{ label: 'Unpublish', icon: Eye, onSelect: () => onToggleVisibility(id, 'checked') }] : []),
                      { label: 'Delivery settings', icon: Send, onSelect: () => setDeliveryItemId(current => current === id ? null : id) },
                    ]} />}
                  </div>
                  {deliveryItemId === id && <DeliverySettings key={id} id={id} item={item} initiallyOpen onClose={() => setDeliveryItemId(null)} />}
                </div></Fragment>
              })}
            </div>}
          </section>
        })}
      </div>
    </div>
  )
}
