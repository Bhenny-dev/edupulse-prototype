import { useEffect, useState } from 'react'
import { BookOpen, ClipboardCheck, Files, Send } from 'lucide-react'
import { aiRequest } from '../../lib/aiClient'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { outlineSpans } from '../../utils/outlineSections'
import { DeanCards, DeanDialog } from './DeanCommon'
import { Empty, Table } from './AcademicUI'
import { LoadingStatus } from '../ui/LoadingFeedback'
import RetainedFileViewer from '../syllabus/RetainedFileViewer'
import DocumentViewer from '../courseware/DocumentViewer'
import ReadOnlyAssessment from '../courseware/ReadOnlyAssessment'

/** An authorized course scan is a read: it never starts an attempt, records an open or saves a workspace. */
export default function DeanCourseInspection({ load, onClose }) {
  const [snapshot, setSnapshot] = useState(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const [reader, setReader] = useWorkspaceViewState(`dean-course-reader:${load.key}`, null)
  useEffect(() => {
    const controller = new AbortController()
    aiRequest('academic', 'POST', { operation: 'dean', command: { action: 'load.inspect', key: load.key, expected_instructor: load.instructorId } }, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setSnapshot(result); setError('') } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [load.key, load.instructorId, retry])
  const close = () => { setReader(null); onClose() }
  const syllabus = snapshot?.syllabus, items = snapshot?.items || [], item = items.find(entry => `item:${entry.id}` === reader)
  return <DeanDialog title={`${load.code} · ${load.instructorName}`} subtitle={`${load.block} · ${load.semester || 'Semester not recorded'}`} label="Syllabus and teaching contents" size="page" icon={BookOpen} onClose={close}>
    {error ? <div role="alert"><p>{error}</p><button className="btn btn-secondary mt-16" onClick={() => { setSnapshot(null); setError(''); setRetry(value => value + 1) }}>Retry course scan</button></div>
      : !snapshot ? <LoadingStatus label="Reading the instructor’s course..." />
        : !syllabus ? <Empty>No syllabus has been added for this instructor’s course yet.</Empty>
          : reader === 'original' && syllabus.approvedFile ? <RetainedFileViewer file={syllabus.approvedFile} title={`${load.code} uploaded syllabus`} onBack={() => setReader(null)} />
            : item ? <>{item.type === 'assessment' ? <><button className="btn btn-ghost btn-sm mb-16" onClick={() => setReader(null)}>Back to syllabus and contents</button><h3>{item.content.title}</h3><ReadOnlyAssessment content={item.content} /></> : <DocumentViewer content={item.content} onBack={() => setReader(null)} isStudent readOnly />}</>
              : reader ? <><Empty>This file or content is no longer available in the course.</Empty><button className="btn btn-secondary" onClick={() => setReader(null)}>Back to syllabus and contents</button></>
                : <>
                  <DeanCards items={[
                    { label: 'Outline weeks', value: syllabus.courseOutline.length, icon: BookOpen },
                    { label: 'Teaching materials', value: items.filter(entry => entry.type !== 'assessment').length, icon: Files },
                    { label: 'Assessments', value: items.filter(entry => entry.type === 'assessment').length, icon: ClipboardCheck },
                    { label: 'Published items', value: items.filter(entry => entry.status === 'published').length, icon: Send },
                  ]} />
                  <div className="dean-toolbar mb-16"><h3>Uploaded syllabus</h3>{syllabus.approvedFile ? <button className="btn btn-secondary" onClick={() => setReader('original')}>View uploaded file</button> : <p className="text-sm text-muted">No approved file uploaded yet.</p>}</div>
                  <h3 className="dean-subhead">Extracted course outline</h3>
                  <Table headers={['Week', 'Intended learning outcomes', 'Contents', 'Teaching-Learning Activities', 'Assessments']} rows={outlineSpans(syllabus.courseOutline).map(span => [span.label, span.section.ilos, span.section.contents.join('\n'), span.section.activities, span.section.assessments])} empty="No extracted outline is saved yet." />
                  <h3 className="dean-subhead mt-24">Teaching materials and assessments</h3>
                  {syllabus.courseOutline.slice().sort((a, b) => a.week - b.week).map(row => <section key={row.week} className="dean-scan-week"><h4>Week {row.week}</h4>{items.filter(entry => entry.week === row.week).map(entry => <div className="academic-list-row" key={entry.id}><div><strong>{entry.content.title}</strong><p className="text-sm text-muted">{entry.type === 'assessment' ? 'Assessment' : 'Teaching material'} · {entry.status === 'published' ? 'Published' : entry.status === 'checked' ? 'Checked' : entry.status === 'hidden' ? 'Hidden' : 'Draft'}</p></div><button className="btn btn-secondary btn-sm" onClick={() => setReader(`item:${entry.id}`)} aria-label={`View ${entry.content.title}`}>View</button></div>)}{!items.some(entry => entry.week === row.week) && <p className="text-sm text-muted">No teaching content added yet.</p>}</section>)}
                </>}
  </DeanDialog>
}
