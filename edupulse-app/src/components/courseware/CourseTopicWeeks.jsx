import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GripVertical, ArrowUp, ArrowDown, Plus, Eye, Check, ClipboardCheck, Files, ChevronDown } from 'lucide-react'
import { useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { jsonValue } from '../../utils/jsonValue'
import { isOutlineExam } from '../../utils/outlineSections'
import { weekTopics, topicEntries, topicProgress, moveTeachingWeek, assessmentCoverage, topicOverall } from '../../utils/instructorCourses'
import ModalLayer from '../ui/ModalLayer'
import DocumentViewer from './DocumentViewer'
import AssessmentEditor from './AssessmentEditor'
import SyllabusSources from './SyllabusSources'
import DeliverySettings from './DeliverySettings'
import TopicContentForm from './TopicContentForm'
import ReadOnlyAssessment from './ReadOnlyAssessment'

function ProgressPills({ data, entries }) {
  const stats = topicProgress(data, entries)
  return <>{entries.some(item => item.type !== 'assessment') && <span className="instructor-stat-pill">Materials accessed: {stats.access === null ? 'Not delivered' : `${stats.access}%`}{stats.access !== null && <progress aria-label="Teaching material access" value={stats.access} max="100" />}</span>}{entries.some(item => item.type === 'assessment') && <span className="instructor-stat-pill">Assessment average: {stats.average === null ? 'No scores yet' : `${stats.average}%`}{stats.average !== null && <progress aria-label="Average assessment score" value={stats.average} max="100" />}</span>}</>
}

export default function CourseTopicWeeks({ syllabus, data }) {
  const workspace = useWorkspace(), academic = useAcademicRecords(), [params, setParams] = useSearchParams()
  const [expanded, setExpanded] = useWorkspaceViewState(`course:${syllabus.id}:topic-expanded`, () => new Set())
  const [readerId, setReaderId] = useWorkspaceViewState(`course:${syllabus.id}:reader`, null)
  const [dragging, setDragging] = useState(null), [target, setTarget] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [deliveryId, setDeliveryId] = useWorkspaceViewState(`course:${syllabus.id}:delivery`, null)
  const lock = useRef(false)
  const rows = [...syllabus.courseOutline].sort((a, b) => a.week - b.week), teachingWeeks = rows.filter(row => !isOutlineExam(row))
  const entries = Object.entries(workspace.content).filter(([, item]) => item.syllabusId === syllabus.id && !item.generationCheckpoint && item.content).map(([id, item]) => ({ ...item, id }))
  const sourcePublication = data.publications.find(item => item.id === params.get('publication') && item.type !== 'assessment')
  const sourceMatches = sourcePublication && entries.filter(item => item.id === sourcePublication.content?.courseItemId || item.week === sourcePublication.week && item.type === sourcePublication.type && (item.content.title || item.title) === sourcePublication.title)
  const sourceEntry = params.has('item') ? entries.find(item => item.id === params.get('item') && item.type !== 'assessment') : sourceMatches?.length === 1 ? sourceMatches[0] : null
  const sourceReading = Boolean(params.get('item') || params.get('publication'))
  const closeReader = () => { setReaderId(null); if (sourceReading) { const query = new URLSearchParams(params); query.delete('item'); query.delete('publication'); setParams(query) } }
  const reader = sourceReading ? sourceEntry : entries.find(item => item.id === readerId), delivery = entries.find(item => item.id === deliveryId)
  const week = rows.find(row => row.week === Number(params.get('week'))), selectedTopic = week && weekTopics(week).find(topic => topic.id === params.get('topic'))
  const addType = ['material', 'assessment'].includes(params.get('add')) ? params.get('add') : null
  const editing = Boolean(selectedTopic && addType)
  const blocked = busy || workspace.saving || workspace.dirty || editing
  const run = async task => {
    if (lock.current) return
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
  const applyMove = async (from, to) => run(async () => {
    await workspace.commit(value => {
      const current = value.syllabi.find(item => item.id === syllabus.id)
      if (!current || jsonValue(current.courseOutline) !== jsonValue(syllabus.courseOutline)) throw new Error('The outline changed. Reopen the course before moving a week.')
      const moved = moveTeachingWeek(current.courseOutline, value.content, syllabus.id, from, to)
      return { ...value, content: moved.content, syllabi: value.syllabi.map(item => item.id === syllabus.id ? { ...item, courseOutline: moved.outline, lastUpdated: new Date().toISOString() } : item) }
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
      return { ...value, content: { ...value.content, [entry.id]: { ...fresh, status: 'published' } } }
    })
    await academic.load(true); setDeliveryId(null); setNotice('Checked course content delivered to enrolled students.')
  })
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
    if (!fresh || fresh.status === 'published' || fresh.week !== reader.week || jsonValue(fresh.content) !== jsonValue(reader.content)) throw new Error('This content changed. Reopen the current copy before editing.')
    return { ...value, content: { ...value.content, [reader.id]: { ...fresh, content, status: 'draft' } } }
  })
  const renderEntry = (entry, topicItems, row, topic, index, overall = false) => {
    const covered = entry.content.coverage?.materialIds, expected = entry.type === 'assessment' ? assessmentCoverage(topicItems, entry.id, overall || Boolean(entry.content.overallAssessment)) : []
    const stale = covered && jsonValue(covered) !== jsonValue(expected)
    return <div className="instructor-sequence-item" key={entry.id}><div className="instructor-sequence-heading"><span className="badge badge-draft">{entry.type === 'assessment' ? 'Assessment' : 'Teaching material'}</span><strong>{entry.content.title || entry.title}</strong><span className="text-sm text-muted">{entry.status === 'published' ? 'Delivered' : entry.status === 'checked' ? 'Checked' : entry.status === 'hidden' ? 'Hidden' : 'Draft'}</span><ProgressPills data={data} entries={[entry]} /></div>
      {entry.type === 'assessment' && <p className="text-sm text-muted">{overall || entry.content.overallAssessment ? 'Covers all topic teaching materials.' : `Covers ${(covered || expected).length} teaching material(s) since the previous assessment.`}{stale && ' Teaching materials changed; review this assessment’s coverage.'}</p>}
      <div className="instructor-topic-actions"><button className="btn btn-secondary btn-sm" onClick={() => setReaderId(entry.id)}><Eye size={14} />Open</button>{entry.status === 'draft' && <button className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => void check(entry)}><Check size={14} />Mark checked</button>}{entry.status === 'checked' && <button className="btn btn-primary btn-sm" disabled={blocked} onClick={() => setDeliveryId(entry.id)}>Deliver to students</button>}{entry.type !== 'assessment' && topicItems[index + 1]?.type !== 'assessment' && <button className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => add(row, topic, 'assessment', entry.id)}><ClipboardCheck size={14} />Add assessment after this material</button>}</div>
    </div>
  }
  return <>
    {sourceReading && !reader && <p role="alert">The referenced teaching content is no longer available in this course.</p>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <p className="text-sm text-muted">Open a topic to add its teaching materials and assessments. Drag a week by its handle, or use Move up / Move down. Examination weeks keep their scheduled slots.</p>
    {rows.map(row => {
      const topics = weekTopics(row), weekEntries = entries.filter(item => item.week === row.week), index = teachingWeeks.findIndex(item => item.week === row.week), exam = isOutlineExam(row)
      const assignedIds = new Set(topics.flatMap(topic => topicEntries(weekEntries, topic.id, topics.length === 1).map(item => item.id)))
      return <section key={row.week} className={`instructor-week ${target === row.week ? 'is-drop-target' : ''}`} data-week={row.week} onDragOver={event => { if (!exam && dragging !== null && !blocked) { event.preventDefault(); setTarget(row.week) } }} onDragLeave={() => setTarget(null)} onDrop={event => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/edupulse-week')); setTarget(null); setDragging(null); if (!exam && from === dragging) requestMove(from, row.week) }}>
        <header>{!exam && <><button className="btn btn-ghost btn-sm" draggable={!blocked} aria-label={`Drag week ${row.week}`} disabled={blocked} onDragStart={event => { setDragging(row.week); event.dataTransfer.setData('text/edupulse-week', String(row.week)) }} onDragEnd={() => { setDragging(null); setTarget(null) }}><GripVertical size={16} /></button><button className="btn btn-ghost btn-sm" aria-label={`Move week ${row.week} up`} disabled={blocked || index === 0} onClick={() => requestMove(row.week, teachingWeeks[index - 1].week)}><ArrowUp size={15} /></button><button className="btn btn-ghost btn-sm" aria-label={`Move week ${row.week} down`} disabled={blocked || index === teachingWeeks.length - 1} onClick={() => requestMove(row.week, teachingWeeks[index + 1].week)}><ArrowDown size={15} /></button></>}<h2>Week {row.week}{exam ? ' — Examination' : ''}</h2><ProgressPills data={data} entries={weekEntries} /></header>
        {exam ? <p className="instructor-topic-context">{row.assessments}</p> : topics.map(topic => {
          const key = `${row.week}:${topic.id}`, items = topicEntries(weekEntries, topic.id, topics.length === 1), materials = items.filter(item => item.type !== 'assessment')
          const overall = topicOverall(items)
          const regular = items.filter(item => item !== overall)
          return <details className="instructor-topic" key={topic.id} open={expanded.has(key)} onToggle={event => { const open = event.currentTarget.open; setExpanded(previous => { const next = new Set(previous); if (open) next.add(key); else next.delete(key); return next }) }} data-topic={topic.id}><summary><ChevronDown className="instructor-topic-chevron" size={16} aria-hidden="true" /><strong>{topic.title}</strong><ProgressPills data={data} entries={items} /></summary>
            <div className="instructor-topic-context"><strong>Contents</strong><p>{topic.contents.join('\n')}</p>{topic.ilos && <><strong>Learning outcomes</strong><p>{topic.ilos}</p></>}</div>
            <p className="text-sm text-muted"><strong>Teaching-learning activities:</strong> {topic.activities || 'Add the teaching materials for this topic.'}</p>
            {regular.map((entry, itemIndex) => renderEntry(entry, regular, row, topic, itemIndex))}
            <div className="instructor-topic-actions"><button className="btn btn-primary btn-sm" disabled={blocked} onClick={() => add(row, topic, 'material')}><Plus size={14} />Add teaching material</button>{materials.length > 0 && regular.at(-1)?.type !== 'assessment' && <button className="btn btn-secondary btn-sm" disabled={blocked} onClick={() => add(row, topic, 'assessment')}><ClipboardCheck size={14} />Add assessment</button>}</div>
            <section className="instructor-course-form" aria-label={`Overall assessment for ${topic.title}`}><h3>Overall assessment</h3><p className="text-sm text-muted">{topic.assessments || 'Covers all teaching materials in this topic.'} {topic.assessmentTypes.join(' · ')}</p>{overall ? renderEntry(overall, items, row, topic, items.indexOf(overall), true) : <button className="btn btn-secondary btn-sm" disabled={blocked || !materials.length} onClick={() => add(row, topic, 'assessment', undefined, true)}><Plus size={14} />Add overall assessment</button>}</section>
          </details>
        })}
        {weekEntries.some(item => !assignedIds.has(item.id)) && <details className="instructor-topic"><summary><Files size={16} /><strong>Other saved content for this week</strong></summary>{weekEntries.filter(item => !assignedIds.has(item.id)).map(entry => <div className="instructor-sequence-item" key={entry.id}><strong>{entry.content.title || entry.title}</strong><button className="btn btn-secondary btn-sm" onClick={() => setReaderId(entry.id)}>Open saved content</button></div>)}</details>}
      </section>
    })}
    <section className="instructor-source-section"><SyllabusSources syllabus={syllabus} defaultOpen /></section>
    {editing && <ModalLayer className="overlay-backdrop academic-publication-overlay" onDismiss={clearEditor}><section className="modal-content academic-publication-dialog" role="dialog" aria-modal="true" aria-label={addType === 'assessment' ? 'Add assessment' : 'Add teaching material'}><TopicContentForm key={`${week.week}:${selectedTopic.id}:${addType}:${params.get('after')}:${params.get('overall')}`} syllabus={syllabus} week={week.week} topic={selectedTopic} entries={topicEntries(entries.filter(item => item.week === week.week), selectedTopic.id, weekTopics(week).length === 1)} type={addType} afterId={params.get('after')} overall={params.get('overall') === '1'} onClose={clearEditor} onSaved={id => { clearEditor(); setReaderId(id); void academic.load(true) }} /></section></ModalLayer>}
    {reader && <ModalLayer className="overlay-backdrop academic-publication-overlay" onDismiss={closeReader}><section className="modal-content academic-publication-dialog" role="dialog" aria-modal="true" aria-label={reader.content.title}><div className="modal-header"><h2>{reader.content.title}</h2><button className="modal-close" aria-label="Close course content" onClick={closeReader}>×</button></div>{reader.status === 'published' && <p className="text-muted">This delivered version is protected. Use Review and deliver to prepare a draft revision.</p>}{reader.type === 'assessment' ? sourceReading || reader.status === 'published' ? <ReadOnlyAssessment content={reader.content} /> : <AssessmentEditor key={reader.id} content={reader.content} topics={rows.find(row => row.week === reader.week)?.contents || []} onBack={closeReader} onSave={async questions => { if (!await run(() => saveReader({ ...reader.content, questions, totalPoints: questions.length }))) throw new Error('The current draft could not be saved.'); }} /> : <DocumentViewer key={reader.id} content={{ ...reader.content, _storeId: reader.id }} readOnly={sourceReading || reader.status === 'published'} onBack={closeReader} onSave={async sections => { if (!await run(() => saveReader({ ...reader.content, sections, readableTeaching: sections.some(section => section.body?.trim()) }))) throw new Error('The current draft could not be saved.'); }} />}</section></ModalLayer>}
    {delivery && <ModalLayer onDismiss={() => setDeliveryId(null)}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Deliver course content"><h2>Deliver {delivery.content.title}</h2><button className="btn btn-primary" disabled={blocked || delivery.status !== 'checked'} onClick={() => void deliver(delivery)}>Deliver checked content</button><DeliverySettings id={delivery.id} item={delivery} initiallyOpen onClose={() => { setDeliveryId(null); void academic.load(true) }} /></section></ModalLayer>}
    {moveFrom && moveTo && <ModalLayer onDismiss={() => { const query = new URLSearchParams(params); query.delete('moveFrom'); query.delete('moveTo'); setParams(query) }}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Move delivered teaching week"><h2>Move week {moveFrom.week} to week {moveTo.week}?</h2><p>Some affected materials are already delivered. The moved materials will return to drafts for review and will be unavailable to students until delivered again. Recorded scores and history are retained.</p><button className="btn btn-primary" disabled={busy} onClick={() => void applyMove(moveFrom.week, moveTo.week)}>Move weeks and prepare drafts</button><button className="btn btn-secondary" disabled={busy} onClick={() => { const query = new URLSearchParams(params); query.delete('moveFrom'); query.delete('moveTo'); setParams(query) }}>Cancel</button></section></ModalLayer>}
  </>
}
