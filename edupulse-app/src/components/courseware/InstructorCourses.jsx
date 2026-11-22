import { useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Users, ArrowLeft, ArrowRight, Share2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { instructorCourses, instructorRecords, syllabusForCourse, courseStudentCount, assignedStudentCount, sameCourseCode } from '../../utils/instructorCourses'
import { collectSyllabusReferences } from '../../lib/rag/syllabusReferences'
import { prepareSyllabusSources, indexSyllabusReference, aiSessionVersion } from '../../lib/aiClient'
import SummaryCard from '../ui/SummaryCard'
import ModalLayer from '../ui/ModalLayer'
import { LoadingStatus } from '../ui/LoadingFeedback'
import ApprovedSyllabusIntake from '../syllabus/ApprovedSyllabusIntake'
import useSyllabusSharing from '../syllabus/useSyllabusSharing'
import CourseBlockSections from './CourseBlockSections'
import CourseTopicWeeks from './CourseTopicWeeks'
import LoadTermFilter from '../academic/LoadTermFilter'
import useAcademicTerm from '../academic/useAcademicTerm'
import {recordsForLoadTerm} from '../../utils/loadTerms'
import {loadRows} from '../academic/deanRecordModel'
import TeachingLoadFacts from '../academic/TeachingLoadFacts'
import './instructor-courses.css'

export default function InstructorCourses() {
  const { user } = useAuth(), workspace = useWorkspace(), records = useAcademicRecords()
  const [params, setParams] = useSearchParams(), [query, setQuery] = useState('')
  const sharing = useSyllabusSharing(), [sharedChoice, setSharedChoice] = useState(''), [attested, setAttested] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const {term,writable}=useAcademicTerm()
  const courses = useMemo(() => instructorCourses(recordsForLoadTerm(records.data,term), user.id, workspace.syllabi), [records.data,term, user.id, workspace.syllabi])
  const requested = params.get('course'), legacySyllabus = workspace.syllabi.find(item => item.id === requested)
  const matching = courses.filter(course => course.id === requested || requested===course.id.split('~').slice(0,3).join('~') || course.courseIds.includes(requested) || (legacySyllabus && syllabusForCourse([legacySyllabus], course)) || sameCourseCode(course.code, requested || ''))
  const selected = matching.length===1?matching[0]:undefined
  const syllabus = selected && syllabusForCourse(workspace.syllabi, selected)
  const ready = syllabus && syllabus.status === 'active' && !syllabus.suspended
  const schedules=selected?loadRows(records.data,true).filter(load=>load.instructorId===user.id&&sameCourseCode(load.code,selected.code)&&(load.loadType==='course'||selected.blocks.includes(load.block))&&load.academicYear===selected.academicYear&&load.semester===selected.semester&&(load.time||load.source||load.sourceRows?.length)):[]
  const incoming = sharing.shares.filter(item => item.recipient_id === user.id && item.sender_id !== user.id && sameCourseCode(item.courseCode, selected?.code || '') && !item.sender_suspended && !item.recipient_suspended)
  const sharedOpen = params.get('picker') === 'shared' && Boolean(selected) && !ready
  const setSharedOpen = open => { const query = new URLSearchParams(params); if (open) query.set('picker', 'shared'); else query.delete('picker'); setParams(query) }
  const rawView = params.get('view') || 'topics', view = rawView === 'blocks' ? 'blocks' : 'topics'
  const choose = course => setParams({ course: course.id,term })
  const back = () => { setError(''); setNotice(''); setParams({term}) }
  const checkSources = async value => {
    const references = collectSyllabusReferences(value)
    if (!references.length) return
    try { const sources = await prepareSyllabusSources(references); for (const source of sources) if (source.snapshot && !source.metadataOnly) await indexSyllabusReference(source.snapshot.id, value.courseCode); window.dispatchEvent(new CustomEvent('edupulse-sources-updated', { detail: { sources, sessionVersion: aiSessionVersion() } })) }
    catch { setNotice('Syllabus saved. Open Syllabus sources below to check any unread references or attach the matching source copy.') }
  }
  const useApproved = async candidate => {
    if(!writable)throw new Error('Completed semesters are view-only.')
    if (!selected || candidate.courseCode.replace(/\s/g, '').toLowerCase() !== selected.code.replace(/\s/g, '').toLowerCase()) throw new Error('The approved syllabus must match the loaded course.')
    const value = { ...candidate, status: 'active', sample: false, courseInfo: { ...candidate.courseInfo, academicYear: selected.academicYear || candidate.courseInfo?.academicYear,periodOffered:selected.semester||candidate.courseInfo?.periodOffered } }
    await workspace.commit(data => {
      if (syllabusForCourse(data.syllabi, selected)?.status === 'active') throw new Error('This course already has an approved syllabus. Open its current weeks or revise that syllabus in the repository.')
      return { ...data, syllabi: [...data.syllabi, value] }
    })
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
  if (rawView === 'syllabus' || ['mine', 'repository', 'builder', 'register'].includes(params.get('tab'))) {
    const query = new URLSearchParams(params)
    for (const key of ['view', 'course', 'picker', 'week']) query.delete(key)
    return <Navigate replace to={`/syllabus?${query}`} />
  }
  if (selected && ['review','drafts'].includes(rawView)) {
    const query = new URLSearchParams(params); query.set('view', 'blocks')
    return <Navigate replace to={`/courseware?${query}`} />
  }
  return <div className="container" data-pulse-zone="courseware" data-pulse-target={selected ? `${selected.code} course` : 'Loaded courses'}>
    <div className="page-header"><div><h1>{selected ? `${selected.code} — ${selected.title}` : 'Course'}</h1><p className="text-muted">{selected ? [selected.units && `${selected.units} units`, selected.semester,selected.academicYear&&`AY ${selected.academicYear}`, selected.blocks.join(' · ')].filter(Boolean).join(' · ') : 'Courses assigned to you by the Dean'}</p></div>{selected && <button className="btn btn-secondary" onClick={back}><ArrowLeft size={16} />Back to courses</button>}</div>
    {records.error && <p role="alert">{records.error}</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <LoadTermFilter data={records.data}/>{!writable&&<p className="text-sm text-muted mb-16">This semester is view-only.</p>}
    {selected&&syllabus?.handedOverFrom?.instructorName&&<p className="text-sm text-muted mb-16">Continued from {syllabus.handedOverFrom.instructorName} for {selected.blocks.join(', ')}.</p>}
    {!records.loaded ? <LoadingStatus label="Loading assigned courses..." /> : !selected ? <>

      {requested && <p role="alert">{matching.length>1?'Choose the block-labelled course you want to open.':'This course is not in your current teaching load. Choose one of your assigned courses.'}</p>}
      <div className="kpi-grid mb-24"><SummaryCard icon={BookOpen} label="Courses loaded" value={courses.length} /><SummaryCard icon={Users} label="Students handled" value={assignedStudentCount(scoped,courses,workspace.registrations)} color="var(--purple-500)" bg="var(--purple-100)" /></div>
      <div className="instructor-course-toolbar"><label className="form-label">Search loaded courses<input className="form-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Course or block section" /></label></div>
      {!courses.length && <div className="empty-state"><h2>No courses loaded yet</h2><p>Your courses will appear after the Dean assigns them.</p></div>}
      <div className="instructor-course-grid">{courses.filter(course => `${course.code} ${course.title} ${course.blocks.join(' ')}`.toLowerCase().includes(query.toLowerCase())).map(course => { const current = syllabusForCourse(workspace.syllabi, course); return <button className="instructor-course-card" key={course.id} onClick={() => choose(course)}><BookOpen size={24} aria-hidden="true" /><div><strong>{course.code} — {course.title}</strong><p>{course.blocks.join(' · ') || 'Class list not added'}</p><small>{course.units && `${course.units} units · `}{current?.status === 'active' ? `${current.courseOutline?.length || 0} weeks · Syllabus ready` : 'Add approved syllabus'}</small></div><ArrowRight size={16} aria-hidden="true" /></button> })}</div>
    </> : <>
      {schedules.length>0&&<section className="card mb-24"><div className="card-header"><h2>Teaching schedule and load</h2></div><div className="card-body">{schedules.map(load=><div key={load.key} className="mb-16"><strong>{load.block}</strong><TeachingLoadFacts load={load}/></div>)}<p className="text-sm text-muted">These are the reviewed load records. Set actual class dates and delivery times in Block sections.</p></div></section>}
      <nav className="tabs mb-24" aria-label="Course workspace views">{[['topics', 'Weeks and topics'], ['blocks', 'Block sections']].map(([id, label]) => <button key={id} className={`tab ${view === id ? 'active' : ''}`} aria-pressed={view === id} onClick={() => setParams({ course: selected.id, view: id,term })}>{label}</button>)}</nav>
      {view === 'blocks' ? <CourseBlockSections course={selected} syllabus={syllabus} data={scoped} readOnly={!writable}/> : <>
        {writable && !ready && <><ApprovedSyllabusIntake courseCode={selected.code} onUse={useApproved} /><button className="btn btn-secondary mt-16" onClick={() => setSharedOpen(true)}><Share2 size={16} />Choose a shared syllabus from the system</button></>}
        {syllabus?.courseOutline?.length > 0 && !syllabus.suspended && <CourseTopicWeeks readOnly={!writable} syllabus={syllabus} data={scoped} course={selected} onSchedule={() => setParams({course:selected.id,view:'blocks',term})} />}
      </>}
    </>}
    {writable && sharedOpen && <ModalLayer onDismiss={() => setSharedOpen(false)}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Choose shared syllabus"><div className="modal-header"><h2>Shared syllabi for {selected?.code}</h2><button className="modal-close" aria-label="Close shared syllabus picker" onClick={() => setSharedOpen(false)}>×</button></div>{sharing.loading ? <LoadingStatus label="Loading shared syllabi..." /> : !incoming.length ? <p>No matching syllabus has been shared with this account.</p> : <><label className="form-label">Shared syllabus<select className="form-input" value={sharedChoice} onChange={event => { setSharedChoice(event.target.value); setAttested(false) }}><option value="">Choose an approved copy</option>{incoming.map(share => <option key={share.id} value={share.id}>{share.courseTitle} · Shared by {share.sender_name}</option>)}</select></label><label className="form-label"><input type="checkbox" checked={attested} onChange={event => setAttested(event.target.checked)} />I confirm that this approved copy is authorized for this course.</label><button className="btn btn-primary" disabled={!sharedChoice || !attested || busy || workspace.dirty || workspace.saving} onClick={() => void adoptShared()}>Use approved shared syllabus</button></>}{error && <p role="alert">{error}</p>}</section></ModalLayer>}
  </div>
}
