import {SYLLABUS_STATUS_META} from '../../data/syllabusStatus'
import { useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import PageModal from '../ui/PageModal'
import { Settings2, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { instructorCourses, instructorRecords, syllabusForCourse, approvedSyllabusForCourse, sameCourseCode } from '../../utils/instructorCourses'
import { LoadingStatus } from '../ui/LoadingFeedback'
import CourseBlockSections from './CourseBlockSections'
import CourseTopicWeeks from './CourseTopicWeeks'
import useAcademicTerm from '../academic/useAcademicTerm'
import {recordsForLoadTerm} from '../../utils/loadTerms'
import {loadRows} from '../academic/deanRecordModel'
import TeachingLoadFacts from '../academic/TeachingLoadFacts'
import { classOf, classStudents, classTone, studentCount } from '../../utils/classroom'
import ClassStream, { classAnnouncements } from '../classroom/ClassStream'
import ClassPeople, { ClassScores } from '../classroom/ClassPeople'
import ClassSyllabus from '../classroom/ClassSyllabus'
import ApprovedSyllabusIntake from '../syllabus/ApprovedSyllabusIntake'
import './instructor-courses.css'
import '../classroom/classroom.css'

// The class space of one assigned course: Stream, Teaching Materials & Assessments, Class List and Scores,
// with Syllabus and Block sections as class actions. Home lists the classes; old ?view= links keep working.
const TABS = [['stream', 'Stream'], ['materials', 'Teaching Materials & Assessments'], ['class-list', 'Class List'], ['scores', 'Scores']]
const MATERIAL_PARAMS = ['week', 'topic', 'item', 'publication', 'add', 'picker', 'moveFrom']

/** The class as a page over Home (`/dashboard?course=`). `onClose` returns to Home. */
export default function InstructorCourses({ onClose }) {
  const { user } = useAuth(), workspace = useWorkspace(), records = useAcademicRecords()
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const {term,writable}=useAcademicTerm()
  const termData = useMemo(() => recordsForLoadTerm(records.data,term), [records.data,term])
  const courses = useMemo(() => instructorCourses(termData, user.id, workspace.syllabi), [termData, user.id, workspace.syllabi])
  const requested = params.get('course'), legacySyllabus = workspace.syllabi.find(item => item.id === requested)
  const matching = courses.filter(course => course.id === requested || requested===course.id.split('~').slice(0,3).join('~') || course.courseIds.includes(requested) || (legacySyllabus && syllabusForCourse([legacySyllabus], course)) || sameCourseCode(course.code, requested || ''))
  const course = matching.length===1?matching[0]:undefined
  // A class is one block section: ?block= picks it; without a valid one the course's first block is used.
  const blockParam = params.get('block') || '', block = course ? (course.blocks.includes(blockParam) ? blockParam : course.blocks[0] || '') : ''
  const selected = course ? classOf(course, block) : undefined
  const syllabus = selected && approvedSyllabusForCourse(workspace.syllabi, selected)
  const ready = Boolean(syllabus)
  const schedules=selected?loadRows(records.data,true).filter(load=>load.instructorId===user.id&&sameCourseCode(load.code,selected.code)&&(load.loadType==='course'||selected.blocks.includes(load.block))&&load.academicYear===selected.academicYear&&load.semester===selected.semester&&(load.time||load.source||load.sourceRows?.length)):[]
  const rawView = params.get('view') || ''
  const tab = params.get('tab'), section = rawView === 'blocks' ? 'blocks' : rawView === 'class-syllabus' ? 'class-syllabus' : tab === 'announcements' ? 'stream' : TABS.some(([key]) => key === tab) ? tab : rawView === 'topics' || MATERIAL_PARAMS.some(key => params.has(key)) ? 'materials' : 'stream'
  const own = selected ? { course: selected.id, ...(selected.block ? { block: selected.block } : {}) } : {}
  const go = next => { setError(''); setNotice(''); setParams({ ...own, term, ...(next === 'blocks' || next === 'class-syllabus' ? { view: next } : { tab: next }) }) }
  const scoped = instructorRecords(termData, selected ? [selected] : courses)
  const useApproved = async candidate => {
    if (!writable || !selected || !sameCourseCode(candidate.courseCode, selected.code)) throw new Error('Choose the approved syllabus for this editable assigned course.')
    const teaching = { ...candidate, status: 'active', sample: false, courseInfo: { ...candidate.courseInfo, academicYear: candidate.courseInfo?.academicYear || selected.academicYear, periodOffered: candidate.courseInfo?.periodOffered || selected.semester } }
    if (!approvedSyllabusForCourse([teaching], selected)) throw new Error('Choose the approved syllabus for this class, academic year and semester.')
    await workspace.commit(data => {
      if (approvedSyllabusForCourse(data.syllabi, selected)) throw new Error('This class already has an uploaded approved syllabus. Reopen the class to view it.')
      return { ...data, syllabi: [...data.syllabi, teaching] }
    })
    await records.load(true)
    setNotice('Approved syllabus saved. The extracted outline is ready for this class.')
  }
  if (rawView === 'syllabus' || ['mine', 'repository', 'builder', 'register'].includes(tab)) {
    const query = new URLSearchParams(params)
    for (const key of ['view', 'course', 'picker', 'week']) query.delete(key)
    return <Navigate replace to={`/syllabus?${query}`} />
  }
  if (selected && ['review','drafts'].includes(rawView)) {
    const query = new URLSearchParams(params); query.set('view', 'blocks')
    return <Navigate replace to={`/dashboard?${query}`} />
  }
  // A link to a course with several blocks (older links, Pulse, notifications) lands on one class: name its block in the address.
  if (course && block && blockParam !== block) {
    const query = new URLSearchParams(params); query.set('block', block)
    return <Navigate replace to={`/dashboard?${query}`} />
  }
  // The class is a page over Home: without ?course= there is nothing to show.
  if (!requested) return null
  const counts = selected ? classStudents(selected, workspace.registrations, termData.enrollments) : new Map()
  const title = !records.loaded ? 'Opening class' : selected ? `${selected.code} ${selected.title}` : 'Class unavailable'
  const facts = selected ? [selected.block && `Block ${selected.block}`, selected.semester, selected.academicYear && `AY ${selected.academicYear}`, selected.units && `${selected.units} units`].filter(Boolean).join(' · ') : ''
  return <PageModal title={title} subtitle={facts} label={selected ? `Class ${selected.code}${selected.block ? ` block ${selected.block}` : ''}` : title} closeLabel="Close class and return to Home" onClose={onClose} className="class-modal" bodyClassName="classroom">
    <div data-pulse-zone="courseware" data-pulse-target={selected ? `${selected.code} course` : 'Loaded courses'}>
    {!records.loaded ? <LoadingStatus label="Loading your class..." /> : !selected ? <section className="class-empty" aria-label="Class unavailable">
      <p role="alert">{matching.length>1?'Choose the block-labelled course you want to open from Home.':'This course is not in your current teaching load. Choose one of your assigned classes on Home.'}</p>
      <div className="class-empty-actions"><button type="button" className="btn btn-primary" onClick={onClose}>Back to Home</button></div>
    </section> : <>
      <header className="class-banner" data-tone={classTone(selected.code)}>
        <div>
          <div className="class-banner-meta">
            {selected.block ? <span className="class-chip">Block {selected.block} · {studentCount(counts.get(selected.block)?.size || 0)}</span> : <span className="class-chip">No block section yet</span>}
            <span className="class-chip">{syllabus ? `Syllabus: ${SYLLABUS_STATUS_META[syllabus.status]?.label || syllabus.status}` : 'Syllabus not added'}</span>
          </div></div>
        <div className="class-banner-actions">
          {syllabus?.approvedFile && <button type="button" className={`btn btn-sm ${section === 'class-syllabus' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={section === 'class-syllabus'} onClick={() => go('class-syllabus')}><BookOpen size={14} aria-hidden="true" />Syllabus</button>}
          <button type="button" className={`btn btn-sm ${section === 'blocks' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={section === 'blocks'} onClick={() => go('blocks')}><Settings2 size={14} aria-hidden="true" />Block section</button>
        </div>
      </header>
      {records.error && <p role="alert">{records.error}</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status" className="mb-16">{notice}</p>}
      {!writable&&<p className="text-sm text-muted mb-16">This semester is view-only.</p>}
      {syllabus?.handedOverFrom?.instructorName&&<p className="text-sm text-muted mb-16">Continued from {syllabus.handedOverFrom.instructorName} for {selected.blocks.join(', ')}.</p>}
      <nav className="tabs class-tabs" aria-label="Class sections">{TABS.map(([key, label]) => <button type="button" key={key} className={`tab ${section === key ? 'active' : ''}`} aria-pressed={section === key} onClick={() => go(key)}>{label}</button>)}</nav>
      {section === 'stream' && <ClassStream key={selected.id + ':' + selected.block} course={selected} syllabus={syllabus} data={scoped} readOnly={!writable} highlight={params.get('announcement')} onOpenMaterials={() => go('materials')} />}
      {section === 'materials' && <>
        {!ready && (writable ? <ApprovedSyllabusIntake key={selected.id} courseCode={selected.code} onUse={useApproved} /> : <p>No approved syllabus is recorded for this class.</p>)}
        {syllabus?.courseOutline?.length > 0 && !syllabus.suspended && <CourseTopicWeeks readOnly={!writable} syllabus={syllabus} data={scoped} course={selected} announcements={classAnnouncements(scoped, selected)} onOpenAnnouncement={id => setParams({ ...own, term, tab: 'stream', announcement: id })} onSchedule={() => go('blocks')} />}
      </>}
      {section === 'class-syllabus' && (syllabus?.approvedFile ? <ClassSyllabus course={selected} syllabus={syllabus} onOpenMaterials={() => go('materials')} /> : <p>No uploaded syllabus is recorded. Open Teaching Materials &amp; Assessments to add the approved file.</p>)}
      {section === 'class-list' && <ClassPeople course={selected} data={scoped} readOnly={!writable} />}
      {section === 'scores' && <ClassScores course={selected} data={scoped} />}
      {section === 'blocks' && <>
        <div className="class-section-heading"><h2>Block section</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => go('stream')}>Back to Stream</button></div>
        {schedules.length>0&&<section className="card mb-24"><div className="card-header"><h2>Teaching schedule and load</h2></div><div className="card-body">{schedules.map(load=><div key={load.key} className="mb-16"><strong>{load.block}</strong><TeachingLoadFacts load={load}/></div>)}<p className="text-sm text-muted">These are the reviewed load records. Set actual class dates and delivery times below.</p></div></section>}
        <CourseBlockSections course={selected} syllabus={syllabus} data={scoped} readOnly={!writable}/>
      </>}
    </>}
    </div>
  </PageModal>
}
