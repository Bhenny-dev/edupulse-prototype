import {editableSyllabusPath} from '../../agents/syllabusConversation'
import {SYLLABUS_STATUS_META} from '../../data/syllabusStatus'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigationType, useSearchParams } from 'react-router-dom'
import { Share2, Settings2, BookOpen, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { instructorCourses, instructorRecords, syllabusForCourse, sameCourseCode } from '../../utils/instructorCourses'
import { collectSyllabusReferences } from '../../lib/rag/syllabusReferences'
import { prepareSyllabusSources, indexSyllabusReference, aiSessionVersion } from '../../lib/aiClient'
import ModalLayer from '../ui/ModalLayer'
import { LoadingStatus } from '../ui/LoadingFeedback'
import ApprovedSyllabusIntake from '../syllabus/ApprovedSyllabusIntake'
import useSyllabusSharing from '../syllabus/useSyllabusSharing'
import CourseBlockSections from './CourseBlockSections'
import CourseTopicWeeks from './CourseTopicWeeks'
import useAcademicTerm from '../academic/useAcademicTerm'
import {recordsForLoadTerm} from '../../utils/loadTerms'
import {loadRows} from '../academic/deanRecordModel'
import TeachingLoadFacts from '../academic/TeachingLoadFacts'
import { classStudents, classTone } from '../../utils/classroom'
import ClassStream, { classAnnouncements } from '../classroom/ClassStream'
import ClassPeople, { ClassScores } from '../classroom/ClassPeople'
import CreateClassDialog from '../classroom/CreateClassDialog'
import './instructor-courses.css'
import '../classroom/classroom.css'

// The class space of one assigned course: Announcements, Teaching Materials & Assessments, Class List and Scores,
// with Syllabus and Block sections as class actions. Home lists the classes; old ?view= links keep working.
const TABS = [['announcements', 'Announcements'], ['materials', 'Teaching Materials & Assessments'], ['class-list', 'Class List'], ['scores', 'Scores']]
const MATERIAL_PARAMS = ['week', 'topic', 'item', 'publication', 'add', 'picker', 'moveFrom']

export default function InstructorCourses() {
  const { user } = useAuth(), workspace = useWorkspace(), records = useAcademicRecords(), navigationType = useNavigationType()
  const [params, setParams] = useSearchParams()
  const sharing = useSyllabusSharing(), [sharedChoice, setSharedChoice] = useState(''), [attested, setAttested] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [addingBlock, setAddingBlock] = useState(false)
  const [lastClass, setLastClass] = useWorkspaceViewState('class-location', null)
  const {term,writable}=useAcademicTerm()
  const termData = useMemo(() => recordsForLoadTerm(records.data,term), [records.data,term])
  const courses = useMemo(() => instructorCourses(termData, user.id, workspace.syllabi), [termData, user.id, workspace.syllabi])
  const requested = params.get('course'), legacySyllabus = workspace.syllabi.find(item => item.id === requested)
  const matching = courses.filter(course => course.id === requested || requested===course.id.split('~').slice(0,3).join('~') || course.courseIds.includes(requested) || (legacySyllabus && syllabusForCourse([legacySyllabus], course)) || sameCourseCode(course.code, requested || ''))
  const selected = matching.length===1?matching[0]:undefined
  useEffect(() => { if (selected) setLastClass(selected.id) }, [selected, setLastClass])
  const syllabus = selected && syllabusForCourse(workspace.syllabi, selected)
  const ready = syllabus && syllabus.status === 'active' && !syllabus.suspended
  const schedules=selected?loadRows(records.data,true).filter(load=>load.instructorId===user.id&&sameCourseCode(load.code,selected.code)&&(load.loadType==='course'||selected.blocks.includes(load.block))&&load.academicYear===selected.academicYear&&load.semester===selected.semester&&(load.time||load.source||load.sourceRows?.length)):[]
  const incoming = sharing.shares.filter(item => item.recipient_id === user.id && item.sender_id !== user.id && sameCourseCode(item.courseCode, selected?.code || '') && !item.sender_suspended && !item.recipient_suspended)
  const sharedOpen = params.get('picker') === 'shared' && Boolean(selected) && !ready
  const setSharedOpen = open => { const query = new URLSearchParams(params); if (open) query.set('picker', 'shared'); else query.delete('picker'); setParams(query) }
  const rawView = params.get('view') || ''
  const tab = params.get('tab'), section = rawView === 'blocks' ? 'blocks' : TABS.some(([key]) => key === tab) ? tab : rawView === 'topics' || MATERIAL_PARAMS.some(key => params.has(key)) ? 'materials' : 'announcements'
  const go = next => { setError(''); setNotice(''); setParams({ course: selected.id, term, ...(next === 'blocks' ? { view: 'blocks' } : { tab: next }) }) }
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
  const scoped = instructorRecords(termData, selected ? [selected] : courses)
  if (rawView === 'syllabus' || ['mine', 'repository', 'builder', 'register'].includes(tab)) {
    const query = new URLSearchParams(params)
    for (const key of ['view', 'course', 'picker', 'week']) query.delete(key)
    return <Navigate replace to={`/syllabus?${query}`} />
  }
  if (selected && ['review','drafts'].includes(rawView)) {
    const query = new URLSearchParams(params); query.set('view', 'blocks')
    return <Navigate replace to={`/courseware?${query}`} />
  }
  // Home lists the classes. The Course station reopens the class last opened in this tab.
  if (!requested) {
    if (!records.loaded) return <div className="container"><LoadingStatus label="Loading your classes..." /></div>
    const reopen = navigationType === 'PUSH' && lastClass && courses.some(course => course.id === lastClass)
    return <Navigate replace to={reopen ? `/courseware?${new URLSearchParams({ course: lastClass, term })}` : `/dashboard${params.get('term') ? `?${new URLSearchParams({ term: params.get('term') })}` : ''}`} />
  }
  const counts = selected ? classStudents(selected, workspace.registrations, termData.enrollments) : new Map()
  const syllabusLink = syllabus && writable && !syllabus.suspended && ['drafted','checked','downloaded_for_approval'].includes(syllabus.status) ? editableSyllabusPath(syllabus.id) : '/syllabus?tab=mine'
  return <div className="container classroom" data-pulse-zone="courseware" data-pulse-target={selected ? `${selected.code} course` : 'Loaded courses'}>
    {!records.loaded ? <LoadingStatus label="Loading your class..." /> : !selected ? <section className="class-empty" aria-label="Class unavailable">
      <h1>Class unavailable</h1>
      <p role="alert">{matching.length>1?'Choose the block-labelled course you want to open from Home.':'This course is not in your current teaching load. Choose one of your assigned classes on Home.'}</p>
      <div className="class-empty-actions"><Link className="btn btn-primary" to={`/dashboard?${new URLSearchParams({ term })}`}>Back to Home</Link></div>
    </section> : <>
      <header className="class-banner" data-tone={classTone(selected.code)}>
        <div><h1>{selected.code}<span>{selected.title}</span></h1>
          <div className="class-banner-meta">
            {[selected.semester, selected.academicYear && `AY ${selected.academicYear}`, selected.units && `${selected.units} units`].filter(Boolean).map(item => <span key={item} className="class-chip">{item}</span>)}
            {selected.blocks.length ? selected.blocks.map(block => <span key={block} className="class-chip">Block {block} · {counts.get(block)?.size || 0} students</span>) : <span className="class-chip">No block section yet</span>}
            <span className="class-chip">{syllabus ? `Syllabus: ${SYLLABUS_STATUS_META[syllabus.status]?.label || syllabus.status}` : 'Syllabus not added'}</span>
          </div></div>
        <div className="class-banner-actions">
          <Link className="btn btn-secondary btn-sm" to={syllabusLink}><BookOpen size={14} aria-hidden="true" />Syllabus</Link>
          <button type="button" className={`btn btn-sm ${section === 'blocks' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={section === 'blocks'} onClick={() => go('blocks')}><Settings2 size={14} aria-hidden="true" />Block sections</button>
        </div>
      </header>
      {records.error && <p role="alert">{records.error}</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      {!writable&&<p className="text-sm text-muted mb-16">This semester is view-only.</p>}
      {syllabus?.handedOverFrom?.instructorName&&<p className="text-sm text-muted mb-16">Continued from {syllabus.handedOverFrom.instructorName} for {selected.blocks.join(', ')}.</p>}
      <nav className="tabs class-tabs" aria-label="Class sections">{TABS.map(([key, label]) => <button type="button" key={key} className={`tab ${section === key ? 'active' : ''}`} aria-pressed={section === key} onClick={() => go(key)}>{label}</button>)}</nav>
      {section === 'announcements' && <ClassStream course={selected} syllabus={syllabus} data={scoped} readOnly={!writable} highlight={params.get('announcement')} createdBlock={params.get('code')} draftLink={syllabusLink.startsWith('/syllabus?tab=builder') ? syllabusLink : undefined} onOpenMaterials={() => go('materials')} onAddBlock={() => setAddingBlock(true)} />}
      {section === 'materials' && <>
        {writable&&syllabus&&!syllabus.suspended&&['drafted','checked','downloaded_for_approval'].includes(syllabus.status)&&<Link className="btn btn-secondary mb-16" to={editableSyllabusPath(syllabus.id)}>Continue editing draft</Link>}
        {writable && !ready && <><ApprovedSyllabusIntake courseCode={selected.code} onUse={useApproved} /><button type="button" className="btn btn-secondary mt-16" onClick={() => setSharedOpen(true)}><Share2 size={16} />Choose a shared syllabus from the system</button></>}
        {syllabus?.courseOutline?.length > 0 && !syllabus.suspended && <CourseTopicWeeks readOnly={!writable} syllabus={syllabus} data={scoped} course={selected} announcements={classAnnouncements(scoped, selected)} onOpenAnnouncement={id => setParams({ course: selected.id, term, tab: 'announcements', announcement: id })} onSchedule={() => go('blocks')} />}
      </>}
      {section === 'class-list' && <ClassPeople course={selected} data={scoped} readOnly={!writable} onAddBlock={() => setAddingBlock(true)} />}
      {section === 'scores' && <ClassScores course={selected} data={scoped} />}
      {section === 'blocks' && <>
        {schedules.length>0&&<section className="card mb-24"><div className="card-header"><h2>Teaching schedule and load</h2></div><div className="card-body">{schedules.map(load=><div key={load.key} className="mb-16"><strong>{load.block}</strong><TeachingLoadFacts load={load}/></div>)}<p className="text-sm text-muted">These are the reviewed load records. Set actual class dates and delivery times below.</p></div></section>}
        <CourseBlockSections course={selected} syllabus={syllabus} data={scoped} readOnly={!writable}/>
      </>}
    </>}
    {writable && addingBlock && selected && <CreateClassDialog courses={[selected]} codes={records.data.classCodes} counts={course => classStudents(course, workspace.registrations, termData.enrollments)} initialCourse={selected.id} initialBlock="new" onClose={() => setAddingBlock(false)} onCreated={(_, result) => { setAddingBlock(false); setParams({ course: selected.id, term, tab: 'announcements', code: result.block }) }} />}
    {writable && sharedOpen && <ModalLayer onDismiss={() => setSharedOpen(false)}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Choose shared syllabus"><div className="modal-header"><h2>Shared syllabi for {selected?.code}</h2><button type="button" className="modal-close" aria-label="Close shared syllabus picker" onClick={() => setSharedOpen(false)}><X size={20} aria-hidden="true" /></button></div>{sharing.loading ? <LoadingStatus label="Loading shared syllabi..." /> : !incoming.length ? <p>No matching syllabus has been shared with this account.</p> : <><label className="form-label">Shared syllabus<select className="form-input" value={sharedChoice} onChange={event => { setSharedChoice(event.target.value); setAttested(false) }}><option value="">Choose an approved copy</option>{incoming.map(share => <option key={share.id} value={share.id}>{share.courseTitle} · Shared by {share.sender_name}</option>)}</select></label><label className="form-label"><input type="checkbox" checked={attested} onChange={event => setAttested(event.target.checked)} />I confirm that this approved copy is authorized for this course.</label><button type="button" className="btn btn-primary" disabled={!sharedChoice || !attested || busy || workspace.dirty || workspace.saving} onClick={() => void adoptShared()}>Use approved shared syllabus</button></>}{error && <p role="alert">{error}</p>}</section></ModalLayer>}
  </div>
}
