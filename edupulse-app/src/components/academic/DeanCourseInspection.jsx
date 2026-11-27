import {Link} from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BookOpen, ClipboardCheck, Clock, Files, Send } from 'lucide-react'
import { aiRequest } from '../../lib/aiClient'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { outlineSpans } from '../../utils/outlineSections'
import { DeanCards, DeanDialog } from './DeanCommon'
import { Empty, Table } from './AcademicUI'
import { LoadingStatus } from '../ui/LoadingFeedback'
import RetainedFileViewer from '../syllabus/RetainedFileViewer'
import DocumentViewer from '../courseware/DocumentViewer'
import ReadOnlyAssessment from '../courseware/ReadOnlyAssessment'
import { slotText, isIrregular } from './deanRecordModel'
import DeanBlockSectionDialog from './DeanBlockSectionDialog'
import TeachingLoadFacts from './TeachingLoadFacts'
import { courseDelivery } from './deliveryOversight'
import { deliveryTimeLabel } from '../../utils/blockDelivery'

function DeliveryByBlock({ load, records }) {
  if (!records) return null
  const delivery = courseDelivery(records, load)
  return (delivery.blocks.length > 0 && <>
      <h3 className="dean-subhead mt-24">Delivery by block</h3>
      <p className="text-sm text-muted mb-16">Each block counts a released week once. Delivered weeks have opened. Scheduled weeks have a future opening. Unscheduled weeks still need a class window.</p>
      <Table label={`${load.code} delivery by block`} headers={['Block', 'Students', 'Weeks planned', 'Weeks released', 'Delivered', 'Scheduled', 'Not scheduled', 'Next opening']} rows={delivery.blocks.map(row => [row.block, row.students, row.plannedWeeks, row.releasedWeeks, row.deliveredWeeks, row.scheduledWeeks, row.unscheduledWeeks, row.nextOpening ? deliveryTimeLabel(row.nextOpening) : 'None scheduled'])} />
    </>)
}
/** Each block section of the load with its schedule and class list; irregular students are marked. The retained
 * teaching-load source rows (pages, schedules, instructor-form totals) stay readable below the blocks. */
function BlockSectionList({ load, students, onAdd }) {
  const sections = load.sections || [], irregular = new Set(students.filter(isIrregular).map(s => String(s.email || '').toLowerCase()))
  const joined = new Set(sections.flatMap(s => s.students.map(p => p.email)).filter(email => irregular.has(email)))
  return <>
    <div className="dean-toolbar mb-16 mt-24"><h3>Block sections and students</h3>{onAdd && <button className="btn btn-secondary" onClick={() => onAdd('')}>Add block section</button>}</div>
    <p className="text-sm text-muted mb-16">{sections.length} block section{sections.length === 1 ? '' : 's'} share this syllabus, each with its own schedule. {joined.size ? `${joined.size} irregular student${joined.size === 1 ? '' : 's'} joined this course.` : 'No irregular student has joined this course.'}</p>
    {sections.length ? <div className="dean-block-list">{sections.map(section => <section key={section.key} className="dean-block-section" aria-label={`${load.code} block ${section.block}`}>
      <header><div><h4>{load.code} {section.block}</h4><p className="text-sm text-muted">{slotText(section)}</p></div>{onAdd && <button className="btn btn-ghost btn-sm" onClick={() => onAdd(section.block)} aria-label={`Add students to ${load.code} ${section.block}`}>Add students</button>}</header>
      {section.students.length ? <ul className="dean-block-students">{section.students.map(person => <li key={person.email}><Link to={`/students?q=${encodeURIComponent(person.id||person.email)}`} aria-label={`View student ${person.name}`}>{person.name}</Link><span className="text-sm text-muted">{[person.id, person.email].filter(Boolean).join(' · ')}</span>{irregular.has(person.email) && <span className="dean-tag">Irregular</span>}</li>)}</ul> : <p className="text-sm text-muted">Class list not added yet.</p>}
    </section>)}</div> : <Empty>No block section is loaded for this course yet.</Empty>}
    <h3 className="dean-subhead mt-24">Schedule and source details</h3>
    <TeachingLoadFacts load={load} />
  </>
}

/** An authorized course scan is a read: it never starts an attempt, records an open or saves a workspace. */
export default function DeanCourseInspection({ load, onClose, students = [], action = null, manage = false, records = null }) {
  const [snapshot, setSnapshot] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const [adding, setAdding] = useWorkspaceViewState(`dean-scan-block:${load.key}:${load.instructorId}`, null)
  const [reader, setReader] = useWorkspaceViewState(`dean-course-reader:${load.key}:${load.instructorId}`, null)
  const blocks = <BlockSectionList load={load} students={students} onAdd={manage && action ? setAdding : null} />
  useEffect(() => {
    const controller = new AbortController()
    aiRequest('academic', 'POST', { operation: 'dean', command: { action: 'load.inspect', key: load.key, expected_instructor: load.instructorId } }, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setSnapshot(result); setError('') } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [load.key, load.instructorId, retry])
  const close = () => { setAdding(null); setReader(null); onClose() }
  const syllabus = snapshot?.syllabus, items = snapshot?.items || [], item = items.find(entry => `item:${entry.id}` === reader)
  return <DeanDialog title={`${load.code} · ${load.instructorName}`} subtitle={`${load.blocks?.length ? `Block${load.blocks.length === 1 ? '' : 's'} ${load.blocks.join(', ')}` : load.block || 'No block section yet'} · ${[load.semester, load.academicYear].filter(Boolean).join(' · ') || 'Semester not recorded'}`} label="Syllabus and teaching contents" size="page" icon={BookOpen} onClose={close}>
    {action?.notice && <p role="status" className="mb-16">{action.notice.text}</p>}
    {snapshot && manage && action && typeof adding === 'string' && (adding === '' || load.sections.some(section => section.block === adding)) && <DeanBlockSectionDialog load={load} block={adding} students={students} action={action} onClose={() => setAdding(null)} />}
    {error ? <><div role="alert"><p>{error}</p><button className="btn btn-secondary mt-16" onClick={() => { setSnapshot(null); setError(''); setRetry(value => value + 1) }}>Retry course scan</button></div>{blocks}</>
      : !snapshot ? <LoadingStatus label="Reading the instructor’s course..." />
        : !syllabus ? <><Empty>No syllabus has been added for this instructor’s course yet.</Empty>{blocks}</>
          : reader === 'original' && syllabus.approvedFile ? <RetainedFileViewer file={syllabus.approvedFile} title={`${load.code} uploaded syllabus`} onBack={() => setReader(null)} />
            : item ? <>{item.type === 'assessment' ? <><button className="btn btn-ghost btn-sm mb-16" onClick={() => setReader(null)}>Back to syllabus and contents</button><h3>{item.content.title}</h3><ReadOnlyAssessment content={item.content} /></> : <DocumentViewer content={item.content} onBack={() => setReader(null)} isStudent readOnly />}</>
              : reader ? <><Empty>This file or content is no longer available in the course.</Empty><button className="btn btn-secondary" onClick={() => setReader(null)}>Back to syllabus and contents</button></>
                : <>
                  <div className="dean-toolbar mb-16"><h3>Uploaded syllabus</h3>{syllabus.approvedFile ? <button className="btn btn-secondary" onClick={() => setReader('original')}>View uploaded file</button> : <p className="text-sm text-muted">No approved file uploaded yet.</p>}</div>
                  <DeliveryByBlock load={load} records={records} />
                  <div className="mt-24"><DeanCards items={[
                    { label: 'Outline weeks', value: syllabus.courseOutline.length, icon: BookOpen },
                    { label: 'Teaching materials', value: items.filter(entry => entry.type !== 'assessment').length, icon: Files },
                    { label: 'Assessments', value: items.filter(entry => entry.type === 'assessment').length, icon: ClipboardCheck },
                    { label: 'Published items', value: items.filter(entry => entry.status === 'published').length, icon: Send },
                    { label: 'Prepared, not delivered', value: items.filter(entry => ['draft', 'checked'].includes(entry.status)).length, icon: Clock },
                  ]} /></div>
                  {blocks}
                  <h3 className="dean-subhead mt-24">Extracted course outline</h3>
                  <Table headers={['Week', 'Intended learning outcomes', 'Contents', 'Teaching-Learning Activities', 'Assessments']} rows={outlineSpans(syllabus.courseOutline).map(span => [span.label, span.section.ilos, span.section.contents.join('\n'), span.section.activities, span.section.assessments])} empty="No extracted outline is saved yet." />
                  <h3 className="dean-subhead mt-24">Teaching materials and assessments</h3>
                  {syllabus.courseOutline.slice().sort((a, b) => a.week - b.week).map(row => <section key={row.week} className="dean-scan-week"><h4>Week {row.week}</h4>{items.filter(entry => entry.week === row.week).map(entry => <div className="academic-list-row" key={entry.id}><div><strong>{entry.content.title}</strong><p className="text-sm text-muted">{entry.type === 'assessment' ? 'Assessment' : 'Teaching material'} · {entry.status === 'published' ? 'Published' : entry.status === 'checked' ? 'Checked' : entry.status === 'hidden' ? 'Hidden' : 'Draft'}</p></div><button className="btn btn-secondary btn-sm" onClick={() => setReader(`item:${entry.id}`)} aria-label={`View ${entry.content.title}`}>View</button></div>)}{!items.some(entry => entry.week === row.week) && <p className="text-sm text-muted">No teaching content added yet.</p>}</section>)}
                </>}
  </DeanDialog>
}
