import { Spinner, LoadingStatus } from '../ui/LoadingFeedback'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GripVertical, ArrowUp, ArrowDown, Plus, Eye, Check, ClipboardCheck, Files, ChevronDown, ChevronsDownUp, ChevronsUpDown, Megaphone, Pencil, Trash2 } from 'lucide-react'
import { useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { jsonValue } from '../../utils/jsonValue'
import TopicWorkPanel from '../classroom/TopicWorkPanel'
import { useAuth } from '../../context/AuthContext'
import AssessmentTrial from './AssessmentTrial'
import { aggregateSections, isOutlineExam, weekSections } from '../../utils/outlineSections'
import { weekTopics, topicEntries, topicProgress, moveTeachingWeek, assessmentCoverage, topicOverall, isTeachingMaterial, teachingSequence } from '../../utils/instructorCourses'
import ModalLayer from '../ui/ModalLayer'
import PageModal from '../ui/PageModal'
import { uploadTeachingFile } from '../../utils/teachingFiles'
import DocumentViewer from './DocumentViewer'
import AssessmentEditor from './AssessmentEditor'
import SyllabusSources from './SyllabusSources'
import DeliverySettings from './DeliverySettings'
import TopicContentForm from './TopicContentForm'
import TeachingWeekEditor from './TeachingWeekEditor'
import ReadOnlyAssessment from './ReadOnlyAssessment'
import { termCalendar, weekMeetings, weekDeliveries, deliveryLine } from '../../utils/blockCalendar'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`
const weekCounts = (items, posts) => [plural(items.filter(item => item.type !== 'assessment' && !item.content.submissionOnly).length, 'teaching material'), items.some(item => item.content.submissionOnly) ? plural(items.filter(item => item.content.submissionOnly).length, 'submission bin') : '', plural(items.filter(item => item.type === 'assessment').length, 'assessment'), posts.length ? plural(posts.length, 'announcement') : ''].filter(Boolean).join(' · ')

function ProgressPills({ data, entries }) {
  const stats = topicProgress(data, entries)
  return <>{entries.some(item => item.type !== 'assessment' && !item.content.submissionOnly) && <span className="instructor-stat-pill">Materials accessed: {stats.access === null ? 'Not delivered' : `${stats.access}%`}{stats.access !== null && <progress aria-label="Teaching material access" value={stats.access} max="100" />}</span>}{entries.some(item => item.type === 'assessment') && <span className="instructor-stat-pill">Assessment average: {stats.average === null ? 'No scores yet' : `${stats.average}%`}{stats.average !== null && <progress aria-label="Average assessment score" value={stats.average} max="100" />}</span>}</>
}

export default function CourseTopicWeeks({ syllabus, data, course, onSchedule, readOnly=false, announcements = [], onOpenAnnouncement }) {
  const { user } = useAuth()
  const workspace = useWorkspace(), academic = useAcademicRecords(), [params, setParams] = useSearchParams()
  const [expanded, setExpanded] = useWorkspaceViewState(`course:${syllabus.id}:topic-expanded`, () => new Set())
  const [readerId, setReaderId] = useWorkspaceViewState(`course:${syllabus.id}:reader`, null)
  const [trialId, setTrialId] = useState(null), [dragging, setDragging] = useState(null), [target, setTarget] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [deliveryId, setDeliveryId] = useWorkspaceViewState(`course:${syllabus.id}:delivery`, null)
  const [revisionId, setRevisionId] = useWorkspaceViewState(`course:${syllabus.id}:revision`, null)
  // Weeks open by default; Collapse all keeps only their headings and counts.
  const [collapsedWeeks, setCollapsedWeeks] = useWorkspaceViewState(`course:${syllabus.id}:weeks-collapsed`, () => new Set())
  const [weekEdit, setWeekEdit] = useWorkspaceViewState(`course:${syllabus.id}:${course?.block || ''}:week-editor`, null)
  const lock = useRef(false), uploadedFiles = useRef(new WeakMap())
  const rows = [...syllabus.courseOutline].sort((a, b) => a.week - b.week), teachingWeeks = rows.filter(row => !isOutlineExam(row))
  const weekFilter = rows.some(row => String(row.week) === params.get('filterWeek')) ? params.get('filterWeek') : ''
  const selectFilter = value => {
    const query = new URLSearchParams(params)
    if (value) query.set('filterWeek', value); else query.delete('filterWeek')
    setParams(query, { replace: true })
  }
  const entries = Object.entries(workspace.content).filter(([, item]) => item.syllabusId === syllabus.id && !item.generationCheckpoint && item.content).map(([id, item]) => ({ ...item, id }))
  const sourcePublication = data.publications.find(item => item.id === params.get('publication') && item.type !== 'assessment')
  const sourceMatches = sourcePublication && entries.filter(item => item.id === sourcePublication.content?.courseItemId || item.week === sourcePublication.week && item.type === sourcePublication.type && (item.content.title || item.title) === sourcePublication.title)
  const sourceEntry = params.has('item') ? entries.find(item => item.id === params.get('item') && item.type !== 'assessment') : sourceMatches?.length === 1 ? sourceMatches[0] : null
  const sourceReading = Boolean(params.get('item') || params.get('publication'))
  const closeReader = () => { setReaderId(null); setTrialId(null); if (sourceReading) { const query = new URLSearchParams(params); query.delete('item'); query.delete('publication'); setParams(query) } }
  const reader = sourceReading ? sourceEntry : entries.find(item => item.id === readerId), delivery = entries.find(item => item.id === deliveryId)
  const readerPublication = reader?.status === 'published' && data.publications.find(item => item.active && (item.workspace_item_id === reader.id || item.content?.courseItemId === reader.id))
  const week = rows.find(row => row.week === Number(params.get('week'))), selectedTopic = week && weekTopics(week).find(topic => topic.id === params.get('topic'))
  const addType = ['material', 'assessment', 'submission'].includes(params.get('add')) ? params.get('add') : null
  // A linked week (search, Pulse, a reader) is always shown.
  const linkedWeek = Number(params.get('week')) || null
  useEffect(() => { if (linkedWeek && collapsedWeeks.has(linkedWeek)) setCollapsedWeeks(previous => { const next = new Set(previous); next.delete(linkedWeek); return next }) }, [linkedWeek, collapsedWeeks, setCollapsedWeeks])
  const toggleWeek = week => setCollapsedWeeks(previous => { const next = new Set(previous); if (next.has(week)) next.delete(week); else next.add(week); return next })
  const expandAll = () => { setCollapsedWeeks(new Set()); setExpanded(new Set(rows.flatMap(row => isOutlineExam(row) ? [] : weekTopics(row).map(topic => `${row.week}:${topic.id}`)))) }
  const collapseAll = () => { setCollapsedWeeks(new Set(rows.map(row => row.week))); setExpanded(new Set()) }
  const editing = Boolean(selectedTopic && addType)
  const blocked = readOnly || busy || workspace.loading || workspace.saving || editing
  const [weekMode, weekTarget] = (weekEdit || '').split(':')
  const editedWeek = teachingWeeks.find(row => row.week === Number(weekTarget))
  const run = async task => {
    if (readOnly || lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await task(); void academic.load(true); return true } catch (failure) { setError(failure.message); return false } finally { lock.current = false; setBusy(false) }
  }
  const clearEditor = () => { const query = new URLSearchParams(params); ['add', 'topic', 'after', 'overall'].forEach(key => query.delete(key)); setParams(query) }
  const add = (row, topic, type, afterId, overall = false) => {
    const query = new URLSearchParams(params); query.set('week', String(row.week)); query.set('topic', topic.id); query.set('add', type)
    if (afterId) query.set('after', afterId); else query.delete('after')
    if (overall) query.set('overall', '1'); else query.delete('overall')
    setParams(query)
  }
  const updateOutline = async change => {
    if (readOnly) throw new Error('This semester is view-only.')
    await workspace.commit(value => {
      const current = value.syllabi.find(item => item.id === syllabus.id)
      if (!current || current.suspended || jsonValue(current.courseOutline) !== jsonValue(syllabus.courseOutline)) throw new Error('The outline changed. Reopen the course before editing the week.')
      const courseOutline = change(current.courseOutline, value.content)
      if (!courseOutline.some(row => !isOutlineExam(row) && row.ilos?.trim() && row.contents?.some(text => text.trim()))) throw new Error('Keep at least one teaching week with a topic and learning outcomes.')
      return { ...value, syllabi: value.syllabi.map(item => item === current ? { ...current, extractedCourseOutline: current.extractedCourseOutline || current.courseOutline, courseOutline } : item) }
    })
    void academic.load(true)
  }
  const saveWeek = async (week, sections) => {
    await updateOutline(outline => {
      if (weekMode === 'add') {
        if (outline.some(row => row.week === week) || !sections[0].contents.length || !sections[0].ilos) throw new Error('Choose an unused week and enter its topic and learning outcomes.')
        return [...outline, aggregateSections({ week }, sections)].sort((a, b) => a.week - b.week)
      }
      const edited = new Map(sections.map(section => [section.id, section]))
      return outline.map(row => isOutlineExam(row) || !weekSections(row).some(section => edited.has(section.id)) ? row
        : aggregateSections(row, weekSections(row).map(section => edited.get(section.id) || section)))
    })
    setNotice(`Week ${week} saved.`)
  }
  const hasSavedContent = (content, week) => Object.values(content).some(item => item.syllabusId === syllabus.id && item.week === week)
  const removeWeek = async week => {
    await updateOutline((outline, content) => {
      if (hasSavedContent(content, week)) throw new Error('This week contains saved teaching content and cannot be removed.')
      return outline.filter(row => row.week !== week)
    })
    if (weekFilter === String(week)) selectFilter('')
    setNotice(`Week ${week} removed.`)
  }
  const applyMove = async (from, to) => run(async () => {
    await workspace.commit(value => {
      const current = value.syllabi.find(item => item.id === syllabus.id)
      if (!current || jsonValue(current.courseOutline) !== jsonValue(syllabus.courseOutline)) throw new Error('The outline changed. Reopen the course before moving a week.')
      const moved = moveTeachingWeek(current.courseOutline, value.content, syllabus.id, from, to)
      return { ...value, content: moved.content, syllabi: value.syllabi.map(item => item.id === syllabus.id ? { ...item, extractedCourseOutline: item.extractedCourseOutline || item.courseOutline, courseOutline: moved.outline, lastUpdated: new Date().toISOString() } : item) }
    })
    const query = new URLSearchParams(params); query.delete('moveFrom'); query.delete('moveTo'); setParams(query)
    setNotice('Week moved. Week labels remain chronological. Changed materials are drafts for review before delivery.')
  })
  const requestMove = (from, to) => {
    if (blocked || from === to || !teachingWeeks.some(row => row.week === from) || !teachingWeeks.some(row => row.week === to)) return
    let moved
    try { moved = moveTeachingWeek(rows, workspace.content, syllabus.id, from, to) } catch (failure) { setError(failure.message); return }
    const published = entries.some(item => ['published', 'hidden'].includes(item.status) && moved.content[item.id]?.week !== item.week)
    if (published) { const query = new URLSearchParams(params); query.set('moveFrom', String(from)); query.set('moveTo', String(to)); setParams(query) }
    else void applyMove(from, to)
  }
  const moveFrom = teachingWeeks.find(row => row.week === Number(params.get('moveFrom'))), moveTo = teachingWeeks.find(row => row.week === Number(params.get('moveTo')))
  const deliver = entry => run(async () => {
    await workspace.commit(value => {
      const fresh = value.content[entry.id], current = value.syllabi.find(item => item.id === syllabus.id)
      if (!current || current.status !== 'active' || current.suspended || !fresh || fresh.status !== 'checked' || jsonValue(fresh.content) !== jsonValue(entry.content)) throw new Error('Review and check the current draft before delivery.')
      return { ...value, content: { ...value.content, [entry.id]: { ...fresh, status: 'published', deliveryMode: 'block_schedule', releaseAt: undefined, dueAt: undefined } } }
    })
    await academic.load(true); setDeliveryId(null); setNotice('Checked course content delivered using the block-section schedules.')
  })
  // A week is scheduled by a saved block schedule, or by the class schedule of a block without saved dates.
  const calendar = course ? termCalendar(data.institutional, course.semester, course.academicYear) : null
  const savedBlock = name => (data.deliverySchedules || []).some(schedule => schedule.syllabus_id === syllabus.id && schedule.block_section === name)
  // When a checked or delivered item opens for each block: the block's saved window, otherwise its class schedule.
  const blockDelivery = entry => course ? deliveryLine(weekDeliveries(entry.week, course.blocks, course.slots || {}, (data.deliverySchedules || []).filter(schedule => schedule.syllabus_id === syllabus.id), calendar)) : ''
  const scheduled = entry => (data.deliverySchedules || []).some(schedule => schedule.syllabus_id === syllabus.id && (!course || course.blocks.includes(schedule.block_section)) && schedule.windows.some(window => window.week === entry.week))
    || Boolean(calendar && course.blocks.some(name => !savedBlock(name) && weekMeetings(course.slots?.[name] || [], calendar, entry.week).length))
  const revise = entry => run(async () => {
    await workspace.commit(value => {
      const current = value.content[entry.id]
      if (!current || !['published','hidden'].includes(current.status) || jsonValue(current.content) !== jsonValue(entry.content)) throw new Error('This delivered version changed. Reopen the current copy.')
      return {...value,content:{...value.content,[entry.id]:{...current,status:'draft'}}}
    })
    setRevisionId(null); setReaderId(entry.id)
  })
  const hide = entry => run(async () => {
    await workspace.commit(value => {
      const current = value.content[entry.id]
      if (!current || current.status !== 'published' || jsonValue(current.content) !== jsonValue(entry.content)) throw new Error('This item changed. Reopen the current copy.')
      return {...value,content:{...value.content,[entry.id]:{...current,status:'hidden'}}}
    })
  })
  const revision = entries.find(entry => entry.id === revisionId && ['published','hidden'].includes(entry.status))
  const check = entry => run(async () => {
    if (entry.type === 'assessment' && (!entry.content.questions?.length || entry.content.questions.some(question => !question.text?.trim()))) throw new Error('Complete the assessment questions before marking it checked.')
    await workspace.commit(value => {
      const fresh = value.content[entry.id]
      if (!fresh || jsonValue(fresh.content) !== jsonValue(entry.content) || fresh.status !== 'draft') throw new Error('This draft changed. Open the current copy before checking it.')
      return { ...value, content: { ...value.content, [entry.id]: { ...fresh, status: 'checked', outOfAlignment: false } } }
    })
  })
  const saveReader = content => workspace.commit(value => {
    const fresh = value.content[reader.id]
    if (!fresh || ['published','hidden'].includes(fresh.status) || fresh.week !== reader.week || jsonValue(fresh.content) !== jsonValue(reader.content)) throw new Error('This content changed. Reopen the current copy before editing.')
    return { ...value, content: { ...value.content, [reader.id]: { ...fresh, content, status: 'draft' } } }
  })
  const attachFile = async (entry,files) => {
    const saved=await run(async()=>{
      if(workspace.loading||workspace.saving)throw new Error('Wait for the current workspace save, then save the selected attachment again.')
      if(workspace.conflict||workspace.error)throw new Error(workspace.error||'Resolve the workspace conflict in Settings before saving the attachment.')
      const attachments=[]
      for(const file of files){
        if(!uploadedFiles.current.has(file))uploadedFiles.current.set(file,await uploadTeachingFile(syllabus.id,file))
        attachments.push(uploadedFiles.current.get(file))
      }
      await workspace.commit(value=>{
        const current=value.content[entry.id]
        if(!current||!['draft','checked'].includes(current.status)||current.week!==entry.week||jsonValue(current.content)!==jsonValue(entry.content))throw new Error('This teaching draft changed. Reopen the current copy before attaching the file.')
        return {...value,content:{...value.content,[entry.id]:{...current,status:'draft',content:{...current.content,attachments:[...(current.content.attachments||[]),...attachments]}}}}
      })
      for(const file of files)uploadedFiles.current.delete(file)
    })
    if(!saved)throw new Error('The attachment was not saved. Resolve the reported workspace error and retry; your selected file is retained in this dialog.')
  }
  // Links attach to drafts like files, without an upload; the resource stays with its provider.
  const attachLink = async (entry, link) => {
    const saved = await run(async () => {
      if (workspace.loading || workspace.saving) throw new Error('Wait for the current workspace save, then add the link again.')
      if (workspace.conflict || workspace.error) throw new Error(workspace.error || 'Resolve the workspace conflict in Settings before adding the link.')
      await workspace.commit(value => {
        const current = value.content[entry.id]
        if (!current || !['draft', 'checked'].includes(current.status) || current.week !== entry.week || jsonValue(current.content) !== jsonValue(entry.content)) throw new Error('This teaching draft changed. Reopen the current copy before adding the link.')
        if ((current.content.attachments || []).some(item => item.url === link.url)) throw new Error('This link is already attached.')
        return { ...value, content: { ...value.content, [entry.id]: { ...current, status: 'draft', content: { ...current.content, attachments: [...(current.content.attachments || []), link] } } } }
      })
    })
    if (!saved) throw new Error('The link was not added. Resolve the reported workspace error and retry.')
  }
  const attachBlocked=busy||workspace.loading||workspace.saving?'Wait for the current save to finish before saving the selected file.':workspace.error|| (workspace.conflict?'Resolve the workspace conflict in Settings before saving the attachment.':'')
  const renderEntry = (entry, topicItems, row, topic, index, overall = false) => {
    const covered = entry.content.coverage?.materialIds, expected = entry.type === 'assessment' ? assessmentCoverage(topicItems, entry.id, overall || Boolean(entry.content.overallAssessment)) : []
    const stale = covered && (covered.some(id => !topicItems.some(item => item.id === id && isTeachingMaterial(item))) || expected.some(id => !covered.includes(id)))
    return <div className="instructor-sequence-item" key={entry.id}><div className="instructor-sequence-heading"><span className="badge badge-draft">{entry.type === 'assessment' ? 'Assessment' : entry.content.submissionOnly ? 'Submission bin' : 'Teaching material'}</span><strong>{entry.content.title || entry.title}</strong><span className="text-sm text-muted">{entry.status === 'published' ? 'Delivered' : entry.status === 'checked' ? 'Checked' : entry.status === 'hidden' ? 'Hidden' : 'Draft'}</span><ProgressPills data={data} entries={[entry]} /></div>
      {['checked', 'published'].includes(entry.status) && blockDelivery(entry) && <p className="text-sm text-muted instructor-block-delivery" aria-label={`Delivery of ${entry.content.title || entry.title} by block`}>{entry.status === 'published' ? 'Delivery: ' : 'Opens when delivered: '}{blockDelivery(entry)}</p>}
      {entry.type === 'assessment' && <p className="text-sm text-muted">{overall || entry.content.overallAssessment ? 'Covers all topic teaching materials.' : `Covers ${plural((covered || expected).length, 'teaching material')}.`}{stale && ' Teaching materials changed. Review this assessment’s coverage.'}</p>}
      <div className="instructor-topic-actions"><button className="btn btn-secondary btn-sm" onClick={() => setReaderId(entry.id)}><Eye size={14} />Open</button>{!readOnly && entry.status === 'draft' && <button className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => void check(entry)}><Check size={14} />Mark checked</button>}{!readOnly && entry.status === 'checked' && <button className="btn btn-primary btn-sm" disabled={blocked} onClick={() => setDeliveryId(entry.id)}>Deliver to students</button>}{!readOnly && ['published','hidden'].includes(entry.status) && <button aria-busy={Boolean(busy)} className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => setRevisionId(entry.id)}>{busy && <Spinner />}Prepare draft revision</button>}{!readOnly && entry.status === 'published' && <button className="btn btn-ghost btn-sm" disabled={blocked} onClick={() => void hide(entry)}>Hide</button>}{!readOnly && entry.type !== 'assessment' && !entry.content.submissionOnly && topicItems[index + 1]?.type !== 'assessment' && <button className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => add(row, topic, 'assessment', entry.id)}><ClipboardCheck size={14} />Add assessment after this material</button>}</div>
    </div>
  }
  return <>
    {sourceReading && !reader && <p role="alert">The referenced teaching content is no longer available in this course.</p>}
    {busy && <LoadingStatus label="Updating teaching content..." />}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="instructor-week-tools" role="group" aria-label="Show or hide weeks"><button type="button" className="btn btn-ghost btn-sm" onClick={expandAll}><ChevronsUpDown size={14} aria-hidden="true" />Expand all</button><button type="button" className="btn btn-ghost btn-sm" onClick={collapseAll}><ChevronsDownUp size={14} aria-hidden="true" />Collapse all</button>
      <label className="instructor-week-filter">Show<select className="form-input" aria-label="Show week" value={weekFilter} onChange={event => selectFilter(event.target.value)}><option value="">All weeks</option>{rows.map(row => <option key={row.week} value={String(row.week)}>Week {row.week}</option>)}</select></label>
      {!readOnly && <button type="button" className="btn btn-primary btn-sm" disabled={blocked || rows.length >= 52} onClick={() => setWeekEdit('add')}><Plus size={14} aria-hidden="true" />Add teaching week</button>}
    </div>
    {rows.filter(row => !weekFilter || String(row.week) === weekFilter).map(row => {
      const topics = weekTopics(row), weekEntries = entries.filter(item => item.week === row.week), index = teachingWeeks.findIndex(item => item.week === row.week), exam = isOutlineExam(row)
      const assignedIds = new Set(topics.flatMap(topic => topicEntries(weekEntries, topic.id, topics.length === 1).map(item => item.id)))
      const weekPosts = announcements.filter(post => post.week === row.week), collapsed = collapsedWeeks.has(row.week), panel = `week-panel-${syllabus.id}-${row.week}`
      return <section key={row.week} className={`instructor-week ${target === row.week ? 'is-drop-target' : ''}`} data-week={row.week} onDragOver={event => { if (!exam && dragging !== null && !blocked) { event.preventDefault(); setTarget(row.week) } }} onDragLeave={() => setTarget(null)} onDrop={event => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/edupulse-week')); setTarget(null); setDragging(null); if (!exam && from === dragging) requestMove(from, row.week) }}>
        <header>{!readOnly && !exam && <><button className="btn btn-ghost btn-sm" draggable={!blocked} aria-label={`Drag week ${row.week}`} disabled={blocked} onDragStart={event => { setDragging(row.week); event.dataTransfer.setData('text/edupulse-week', String(row.week)) }} onDragEnd={() => { setDragging(null); setTarget(null) }}><GripVertical size={16} /></button><button className="btn btn-ghost btn-sm" aria-label={`Move week ${row.week} up`} disabled={blocked || index === 0} onClick={() => requestMove(row.week, teachingWeeks[index - 1].week)}><ArrowUp size={15} /></button><button className="btn btn-ghost btn-sm" aria-label={`Move week ${row.week} down`} disabled={blocked || index === teachingWeeks.length - 1} onClick={() => requestMove(row.week, teachingWeeks[index + 1].week)}><ArrowDown size={15} /></button></>}<h2 className="instructor-week-title"><button type="button" className="instructor-week-toggle" aria-expanded={!collapsed} aria-controls={panel} onClick={() => toggleWeek(row.week)}><ChevronDown size={16} aria-hidden="true" />Week {row.week}{exam ? ' — Examination' : ''}</button></h2><span className="instructor-week-counts">{weekCounts(weekEntries, weekPosts)}</span><ProgressPills data={data} entries={weekEntries} /></header>
        {!readOnly && !exam && <div className="instructor-week-edit-actions">
          <button type="button" className="btn btn-ghost btn-sm" disabled={blocked} onClick={() => setWeekEdit(`edit:${row.week}`)} aria-label={`Edit Week ${row.week}`}><Pencil size={14} aria-hidden="true" />Edit week</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={blocked || teachingWeeks.length <= 1 || hasSavedContent(workspace.content, row.week)} onClick={() => setWeekEdit(`remove:${row.week}`)} aria-label={`Remove Week ${row.week}`}><Trash2 size={14} aria-hidden="true" />Remove week</button>
        </div>}
        <div id={panel} hidden={collapsed}>
        {weekPosts.length > 0 && <section className="instructor-week-announcements" aria-label={`Announcements for week ${row.week}`}><h3>Announcements</h3>{weekPosts.map(post => <button type="button" key={post.id} className="btn btn-ghost btn-sm" onClick={() => onOpenAnnouncement?.(post.id)}><Megaphone size={14} aria-hidden="true" />{post.title}{post.block ? ` (block ${post.block})` : ''}</button>)}</section>}
        {exam ? <p className="instructor-topic-context">{row.assessments}</p> : topics.map(topic => {
          const key = `${row.week}:${topic.id}`, items = topicEntries(weekEntries, topic.id, topics.length === 1), materials = items.filter(item => item.type !== 'assessment' && !item.content.submissionOnly)
          const overall = topicOverall(items)
          const regular = items.filter(item => item !== overall)
          return <details className="instructor-topic" key={topic.id} open={expanded.has(key)} onToggle={event => { const open = event.currentTarget.open; setExpanded(previous => { const next = new Set(previous); if (open) next.add(key); else next.delete(key); return next }) }} data-topic={topic.id}><summary><ChevronDown className="instructor-topic-chevron" size={16} aria-hidden="true" /><strong>{topic.title}</strong><ProgressPills data={data} entries={items} /></summary>
            <div className="instructor-topic-context"><strong>Contents</strong><p>{topic.contents.join('\n')}</p>{topic.ilos && <><strong>Learning outcomes</strong><p>{topic.ilos}</p></>}</div>
            <p className="text-sm text-muted"><strong>Teaching-learning activities:</strong> {topic.activities || 'Add the teaching materials for this topic.'}</p>
            {regular.map((entry, itemIndex) => renderEntry(entry, regular, row, topic, itemIndex))}
            {!readOnly&&<div className="instructor-topic-actions"><button className="btn btn-primary btn-sm" disabled={blocked} onClick={() => add(row, topic, 'material')}><Plus size={14} />Add teaching material</button><button className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => add(row, topic, 'submission')}><ClipboardCheck size={14} />Add submission bin</button>{materials.length > 0 && regular.at(-1)?.type !== 'assessment' && <button className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => add(row, topic, 'assessment')}><ClipboardCheck size={14} />Add assessment</button>}</div>}
            <section className="instructor-course-form" aria-label={`Overall assessment for ${topic.title}`}><h3>Overall assessment</h3><p className="text-sm text-muted">{topic.assessments || 'Covers all teaching materials in this topic.'} {topic.assessmentTypes.join(' · ')}</p>{overall ? renderEntry(overall, items, row, topic, items.indexOf(overall), true) : !readOnly&&<button className="btn btn-secondary btn-sm" disabled={blocked || !materials.length} onClick={() => add(row, topic, 'assessment', undefined, true)}><Plus size={14} />Add overall assessment</button>}</section>
          </details>
        })}
        {weekEntries.some(item => !assignedIds.has(item.id)) && <details className="instructor-topic"><summary><Files size={16} /><strong>Other saved content for this week</strong></summary>{teachingSequence(weekEntries.filter(item => !assignedIds.has(item.id))).map(entry => <div className="instructor-sequence-item" key={entry.id}><strong>{entry.content.title || entry.title}</strong><button className="btn btn-secondary btn-sm" onClick={() => setReaderId(entry.id)}>Open saved content</button></div>)}</details>}
        </div>
      </section>
    })}
    <section className="instructor-source-section"><SyllabusSources syllabus={syllabus} defaultOpen readOnly={readOnly}/></section>
    {!readOnly && !editing && (weekMode === 'add' && rows.length < 52 || ['edit', 'remove'].includes(weekMode) && editedWeek) && <TeachingWeekEditor key={weekEdit} mode={weekMode} row={editedWeek} rows={rows} onClose={() => setWeekEdit(null)} onSave={saveWeek} onRemove={removeWeek} />}
    {!readOnly && editing && <PageModal title={addType === 'assessment' ? 'Add assessment' : addType === 'submission' ? 'Add submission bin' : 'Add teaching material'} closeLabel="Close content form" onClose={clearEditor}><TopicContentForm key={`${week.week}:${selectedTopic.id}:${addType}:${params.get('after')}:${params.get('overall')}`} syllabus={syllabus} week={week.week} topic={selectedTopic} entries={topicEntries(entries.filter(item => item.week === week.week), selectedTopic.id, weekTopics(week).length === 1)} type={addType} afterId={params.get('after')} overall={params.get('overall') === '1'} onClose={clearEditor} onSaved={id => { clearEditor(); setReaderId(id); void academic.load(true) }} /></PageModal>}
    {reader && <PageModal title={reader.content.title} subtitle={`Week ${reader.week} \u00b7 ${reader.type === 'assessment' ? 'Assessment' : 'Teaching material'}`} closeLabel="Close course content" onClose={closeReader} bodyClassName="reader-page-body">{readerPublication && !readOnly && !sourceReading && user?.authenticated && !user.supportSubject && <TopicWorkPanel key={readerPublication.id} publication={readerPublication} teacher/>}{error&&<p role="alert" className="reader-notice">{error}</p>}{['published','hidden'].includes(reader.status) && <div className="reader-notice"><p className="text-muted">This delivered version is protected. Prepare a draft revision before editing or attaching files.</p>{!sourceReading&&<button aria-busy={Boolean(busy)} className="btn btn-secondary" onClick={()=>{setReaderId(null);setRevisionId(reader.id)}}>{busy && <Spinner />}Prepare draft revision</button>}</div>}{reader.type === 'assessment' && !readOnly && !sourceReading && trialId !== reader.id && <div className="reader-notice"><button className="btn btn-secondary btn-sm" onClick={() => setTrialId(reader.id)}>Test attempt</button><span className="text-muted"> Answer this assessment as a student would. It is marked with your answer key and never saved.</span></div>}{reader.type === 'assessment' ? trialId === reader.id ? <AssessmentTrial key={reader.id} content={reader.content} onClose={() => setTrialId(null)} /> : sourceReading || ['published','hidden'].includes(reader.status) ? <ReadOnlyAssessment content={reader.content} /> : <AssessmentEditor onAttachFile={files=>attachFile(reader,files)} onSubmissionBinChange={enabled=>saveReader({...reader.content,submissionBin:enabled})} onAttachLink={link=>attachLink(reader,link)} attachBlocked={attachBlocked} key={reader.id} content={reader.content} topics={rows.find(row => row.week === reader.week)?.contents || []} onBack={closeReader} onSave={async questions => { if (!await run(() => saveReader({ ...reader.content, questions, totalPoints: questions.length }))) throw new Error('The current draft could not be saved.'); }} /> : <DocumentViewer embedded onAttachFile={!sourceReading&&!['published','hidden'].includes(reader.status)?files=>attachFile(reader,files):undefined} onAttachLink={!sourceReading&&!['published','hidden'].includes(reader.status)?link=>attachLink(reader,link):undefined} attachBlocked={attachBlocked} key={reader.id} content={{ ...reader.content, _storeId: reader.id }} readOnly={sourceReading || ['published','hidden'].includes(reader.status)} onBack={closeReader} onSave={async sections => { if (!await run(() => saveReader({ ...reader.content, sections, readableTeaching: sections.some(section => section.body?.trim()) }))) throw new Error('The current draft could not be saved.'); }} />}</PageModal>}
    {!readOnly && delivery && <ModalLayer onDismiss={() => setDeliveryId(null)}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Deliver course content"><h2>Deliver {delivery.content.title}</h2><p className="text-sm text-muted">This week opens for each block at its saved class start. Blocks without a schedule will not receive access.</p>{!scheduled(delivery) && <p>Set an opening date and class start for this week in Block sections, or ask the Dean to record when classes start.</p>}<div className="instructor-topic-actions"><button className="btn btn-secondary" onClick={() => {setDeliveryId(null);onSchedule?.()}}>Open Block sections</button><button className="btn btn-primary" disabled={blocked || delivery.status !== 'checked' || !scheduled(delivery) || syllabus.status !== 'active'} onClick={() => void deliver(delivery)}>Deliver checked content</button></div>{delivery.type === 'assessment' && <DeliverySettings id={delivery.id} item={delivery} blockScheduling initiallyOpen onClose={() => { setDeliveryId(null); void academic.load(true) }} />}</section></ModalLayer>}
    {!readOnly && revisionId && <ModalLayer onDismiss={() => setRevisionId(null)}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Prepare draft revision"><h2>Prepare draft revision</h2>{revision ? <><p>{revision.content.title} will be unavailable to students while you revise and check it. Recorded scores and reading history stay saved.</p><button aria-busy={Boolean(busy)} className="btn btn-primary" disabled={blocked} onClick={() => void revise(revision)}>{busy && <Spinner />}Prepare draft revision</button></> : <p>This delivered content is no longer available for revision.</p>}<button className="btn btn-secondary" disabled={busy} onClick={() => setRevisionId(null)}>Cancel</button></section></ModalLayer>}
    {!readOnly && moveFrom && moveTo && <ModalLayer onDismiss={() => { const query = new URLSearchParams(params); query.delete('moveFrom'); query.delete('moveTo'); setParams(query) }}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Move delivered teaching week"><h2>Move week {moveFrom.week} to week {moveTo.week}?</h2><p>Some affected materials are already delivered. The moved materials will return to drafts for review and will be unavailable to students until delivered again. Recorded scores and history are retained.</p><button aria-busy={Boolean(busy)} className="btn btn-primary" disabled={busy} onClick={() => void applyMove(moveFrom.week, moveTo.week)}>{busy && <Spinner />}Move weeks and prepare drafts</button><button className="btn btn-secondary" disabled={busy} onClick={() => { const query = new URLSearchParams(params); query.delete('moveFrom'); query.delete('moveTo'); setParams(query) }}>Cancel</button></section></ModalLayer>}
  </>
}
