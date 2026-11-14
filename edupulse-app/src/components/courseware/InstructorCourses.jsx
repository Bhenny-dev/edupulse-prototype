import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Users, ArrowLeft, ArrowRight, FileText, Share2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { useContentStore } from '../../context/ContentStoreContext'
import { instructorCourses, instructorRecords, syllabusForCourse, courseStudentCount, sameCourseCode } from '../../utils/instructorCourses'
import { collectSyllabusReferences } from '../../lib/rag/syllabusReferences'
import { prepareSyllabusSources, indexSyllabusReference, aiSessionVersion } from '../../lib/aiClient'
import { syllabusBlocks, downloadApprovedFile } from '../../utils/syllabusFiles'
import SummaryCard from '../ui/SummaryCard'
import ModalLayer from '../ui/ModalLayer'
import { LoadingStatus } from '../ui/LoadingFeedback'
import ApprovedSyllabusIntake from '../syllabus/ApprovedSyllabusIntake'
import useSyllabusSharing from '../syllabus/useSyllabusSharing'
import DocumentViewer from './DocumentViewer'
import CourseWorkspace from './CourseWorkspace'
import CourseTopicWeeks from './CourseTopicWeeks'
import './instructor-courses.css'
const Syllabus = lazy(() => import('../../pages/Syllabus'))

export default function InstructorCourses() {
  const { user } = useAuth(), workspace = useWorkspace(), records = useAcademicRecords()
  const { store, commitWeekDrafts, checkItem, bulkCheck, toggleVisibility } = useContentStore()
  const [params, setParams] = useSearchParams(), [query, setQuery] = useState(''), [preview, setPreview] = useState(null)
  const sharing = useSyllabusSharing(), [sharedChoice, setSharedChoice] = useState(''), [attested, setAttested] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const courses = useMemo(() => instructorCourses(records.data, user.id, workspace.syllabi), [records.data, user.id, workspace.syllabi])
  const requested = params.get('course'), legacySyllabus = workspace.syllabi.find(item => item.id === requested)
  const selected = courses.find(course => course.id === requested || course.courseIds.includes(requested) || (legacySyllabus && syllabusForCourse([legacySyllabus], course)) || sameCourseCode(course.code, requested || ''))
  const syllabus = selected && syllabusForCourse(workspace.syllabi, selected)
  const hasDrafts = syllabus && Object.values(workspace.content).some(item => item.syllabusId === syllabus.id && item.content)
  const ready = syllabus && syllabus.status === 'active' && !syllabus.suspended
  const incoming = sharing.shares.filter(item => item.recipient_id === user.id && item.sender_id !== user.id && sameCourseCode(item.courseCode, selected?.code || '') && !item.sender_suspended && !item.recipient_suspended)
  const sharedOpen = params.get('picker') === 'shared' && Boolean(selected)
  const setSharedOpen = open => { const query = new URLSearchParams(params); if (open) query.set('picker', 'shared'); else query.delete('picker'); setParams(query) }
  const view = params.get('view') || (params.get('tab') ? 'syllabus' : 'topics')
  const choose = course => setParams({ course: course.id, ...(view === 'syllabus' ? { view: 'syllabus', tab: params.get('tab') || 'mine' } : {}) })
  const back = () => { setError(''); setNotice(''); setParams({}) }
  const checkSources = async value => {
    const references = collectSyllabusReferences(value)
    if (!references.length) return
    try { const sources = await prepareSyllabusSources(references); for (const source of sources) if (source.snapshot && !source.metadataOnly) await indexSyllabusReference(source.snapshot.id, value.courseCode); window.dispatchEvent(new CustomEvent('edupulse-sources-updated', { detail: { sources, sessionVersion: aiSessionVersion() } })) }
    catch { setNotice('Syllabus saved. Open Syllabus sources below to check any unread references or attach the matching source copy.') }
  }
  const useApproved = async candidate => {
    if (!selected || candidate.courseCode.replace(/\s/g, '').toLowerCase() !== selected.code.replace(/\s/g, '').toLowerCase()) throw new Error('The approved syllabus must match the loaded course.')
    const value = { ...candidate, status: 'active', sample: false, courseInfo: { ...candidate.courseInfo, academicYear: selected.academicYear || candidate.courseInfo?.academicYear } }
    await workspace.commit(data => ({ ...data, syllabi: [...data.syllabi, value] }))
    void records.load(true)
    await checkSources(value)
  }
  const adoptShared = async () => {
    if (!selected || !attested || workspace.dirty || workspace.saving) return
    const share = incoming.find(item => item.id === sharedChoice)
    if (!share) return
    setBusy(true); setError('')
    try {
      const opened = await sharing.command({ operation: 'open', id: share.id })
      await sharing.command({ operation: 'adopt', id: share.id, revision: workspace.revision, mode: 'approved', approvalAttested: true })
      await workspace.refresh(); void records.load(true); setSharedOpen(false); setSharedChoice(''); setAttested(false)
      await checkSources(opened.syllabus)
      setNotice('Shared approved syllabus added to this course.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const scoped = instructorRecords(records.data, selected ? [selected] : courses)
  return <div className="container" data-pulse-zone="courseware" data-pulse-target={selected ? `${selected.code} course` : 'Loaded courses'}>
    <div className="page-header"><div><h1>{selected ? `${selected.code} — ${selected.title}` : 'Course'}</h1><p className="text-muted">{selected ? [selected.units && `${selected.units} units`, selected.semester, selected.blocks.join(' · ')].filter(Boolean).join(' · ') : 'Courses assigned to you by the Dean'}</p></div>{selected && <button className="btn btn-secondary" onClick={back}><ArrowLeft size={16} />Back to courses</button>}</div>
    {records.error && <p role="alert">{records.error}</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!records.loaded ? <LoadingStatus label="Loading assigned courses..." /> : !selected ? <>
      {requested && <p role="alert">This course is not in your current teaching load. Choose one of your assigned courses.</p>}
      <div className="kpi-grid mb-24"><SummaryCard icon={BookOpen} label="Courses loaded" value={courses.length} /><SummaryCard icon={Users} label="Students handled" value={courseStudentCount(scoped, scoped.courses.map(course => course.id))} color="var(--purple-500)" bg="var(--purple-100)" /></div>
      <div className="instructor-course-toolbar"><label className="form-label">Search loaded courses<input className="form-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Course or block section" /></label></div>
      {!courses.length && <div className="empty-state"><h2>No courses loaded yet</h2><p>Your courses will appear after the Dean assigns them.</p></div>}
      <div className="instructor-course-grid">{courses.filter(course => `${course.code} ${course.title} ${course.blocks.join(' ')}`.toLowerCase().includes(query.toLowerCase())).map(course => { const current = syllabusForCourse(workspace.syllabi, course); return <button className="instructor-course-card" key={course.id} onClick={() => choose(course)}><BookOpen size={24} aria-hidden="true" /><div><strong>{course.code} — {course.title}</strong><p>{course.blocks.join(' · ') || 'Block not recorded'}</p><small>{course.units && `${course.units} units · `}{current?.status === 'active' ? `${current.courseOutline?.length || 0} weeks · Syllabus ready` : 'Add approved syllabus'}</small></div><ArrowRight size={16} aria-hidden="true" /></button> })}</div>
    </> : <>
      <nav className="tabs mb-24" aria-label="Course workspace views">{[['topics', 'Weeks and topics'], ['syllabus', 'Syllabus'], ...(ready || hasDrafts ? [['review', ready ? 'Review and deliver' : 'Review drafts']] : [])].map(([id, label]) => <button key={id} className={`tab ${view === id ? 'active' : ''}`} aria-pressed={view === id} onClick={() => setParams({ course: selected.id, view: id })}>{label}</button>)}</nav>
      {view === 'syllabus' ? <Suspense fallback={<LoadingStatus label="Opening syllabus..." />}><Syllabus key={selected.id} courseContext={selected} /></Suspense> : view === 'review' && syllabus ? <CourseWorkspace syllabusId={syllabus.id} contentStore={store} focusWeek={Number(params.get('week')) || null} onBack={() => setParams({ course: selected.id })} onGenerateWeek={commitWeekDrafts} onCheckItem={checkItem} onBulkCheck={bulkCheck} onToggleVisibility={toggleVisibility} /> : !ready ? <>
        <ApprovedSyllabusIntake courseCode={selected.code} onUse={useApproved} onView={setPreview} />
        <button className="btn btn-secondary mt-16" onClick={() => setSharedOpen(true)}><Share2 size={16} />Choose a shared syllabus from the system</button>
      </> : <CourseTopicWeeks syllabus={syllabus} data={scoped} course={selected} />}
    </>}
    {preview && <ModalLayer className="overlay-backdrop academic-publication-overlay" onDismiss={() => setPreview(null)}><section className="modal-content academic-publication-dialog" role="dialog" aria-modal="true" aria-label="Approved syllabus preview"><button className="btn btn-secondary" onClick={() => downloadApprovedFile(preview.approvedFile)}><FileText size={14} />Original approved file</button><DocumentViewer readOnly content={{ title: `${preview.courseCode} — ${preview.courseTitle}`, sections: [{ heading: 'Approved syllabus', body: syllabusBlocks(preview).map(block => block.text).join('\n') }] }} onBack={() => setPreview(null)} /></section></ModalLayer>}
    {sharedOpen && <ModalLayer onDismiss={() => setSharedOpen(false)}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Choose shared syllabus"><div className="modal-header"><h2>Shared syllabi for {selected?.code}</h2><button className="modal-close" aria-label="Close shared syllabus picker" onClick={() => setSharedOpen(false)}>×</button></div>{sharing.loading ? <LoadingStatus label="Loading shared syllabi..." /> : !incoming.length ? <p>No matching syllabus has been shared with this account.</p> : <><label className="form-label">Shared syllabus<select className="form-input" value={sharedChoice} onChange={event => { setSharedChoice(event.target.value); setAttested(false) }}><option value="">Choose an approved copy</option>{incoming.map(share => <option key={share.id} value={share.id}>{share.courseTitle} · Shared by {share.sender_name}</option>)}</select></label><label className="form-label"><input type="checkbox" checked={attested} onChange={event => setAttested(event.target.checked)} />I confirm that this approved copy is authorized for this course.</label><button className="btn btn-primary" disabled={!sharedChoice || !attested || busy || workspace.dirty || workspace.saving} onClick={() => void adoptShared()}>Use approved shared syllabus</button></>}{error && <p role="alert">{error}</p>}</section></ModalLayer>}
  </div>
}
