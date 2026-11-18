import { useMemo, useState } from 'react'
import { BookOpen, ClipboardCheck, AlertTriangle, Layers, Plus, FileUp, GraduationCap, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { Panel, Empty, Table, CsvButton } from './AcademicUI'
import { deanRecords, courseCatalog, deanDirectory, loadRows, courseAssignments, assignedInstructorSyllabi, slotText } from './deanRecordModel'
import DeanBlockSectionDialog from './DeanBlockSectionDialog'
import { curriculumCourse } from '../../utils/curriculumMetadata'
import { DeanCards, DeanDialog, DeanFeedback, ConfirmDialog, UploadButton } from './DeanCommon'
import { useDeanAction } from './deanActions'
import { readGrid, planCourseLoads, chunk } from './eduSuiteImport'
import DeanCourseInspection from './DeanCourseInspection'
import DeanCourseAssignment from './DeanCourseAssignment'
import TeachingLoadImport from './TeachingLoadImport'
import DeanClassListImport from './DeanClassListImport'
import useAcademicTerm from './useAcademicTerm'
import {readReferenceFile} from '../../lib/aiClient'
import {recordsForLoadTerm,loadTerm} from '../../utils/loadTerms'
import TeachingLoadFacts from './TeachingLoadFacts'
import {CourseCardActions,CourseCatalogForm,CourseStatusDialog} from './DeanCatalogActions'

const groupLabel = course => course.semester || 'Courses'
export const knownBlocks = (data, model) => [...new Set([...model.blocks.map(b => b.name), ...loadRows(data).map(l => l.block), ...(data.institutional || []).filter(r => r.kind === 'rosters').map(r => String(r.data.Block || ''))])].filter(b => b && b !== 'IRREGULAR').sort()

export default function DeanCourses({ data:allData }) {
  const [params, setParams] = useSearchParams()
  const {term,writable,academicYear,semester}=useAcademicTerm()
  const data=useMemo(()=>recordsForLoadTerm(allData,term),[allData,term])
  const model = useMemo(() => deanRecords(data), [data])
  const catalog = useMemo(() => courseCatalog(data, model, curriculumCourse), [data, model])
  const directory = useMemo(() => deanDirectory(data, model), [data, model])
  const blocks = useMemo(() => knownBlocks(data, model), [data, model])
  const loads = useMemo(() => loadRows(data), [data])
  const [detail, setDetail] = useWorkspaceViewState(`dean-detail:records:${term}`, null)
  const [editingKey, setEditingKey] = useWorkspaceViewState('dean-course-edit', null)
  const [assigning, setAssigning] = useState(null), [removing, setRemoving] = useState(null), [review, setReview] = useState(null)
  const [search, setSearch] = useState('')
  const [catalogAction,setCatalogAction]=useWorkspaceViewState(`dean-catalog-action:${term}`,null)
  const [catalogMenu,setCatalogMenu]=useWorkspaceViewState(`dean-catalog-menu:${term}`,null)
  const actionKind=typeof catalogAction==='string'?catalogAction.split(':')[0]:''
  const actionCourse=typeof catalogAction==='string'?catalog.find(course=>course.code===catalogAction.slice(catalogAction.indexOf(':')+1)):null
  const [document,setDocument]=useState(null),[reading,setReading]=useState(''),[classLists,setClassLists]=useState(null)
  const action = useDeanAction()
  const show = params.get('show') || 'all'
  const setShow = value => { const next = new URLSearchParams(params); if (value === 'all') next.delete('show'); else next.set('show', value); setParams(next) }
  const loaded = catalog.filter(course => course.assignments.length), unloaded = catalog.filter(course => !course.assignments.length)
  const matches = course => `${course.code} ${course.title}`.toLowerCase().includes(search.trim().toLowerCase()) && (show === 'all' || (show === 'loaded') === Boolean(course.assignments.length))
  const selected = typeof detail === 'string' && detail.startsWith('course:') ? catalog.find(course => course.code === detail.slice(7)) : null
  const editing = selected?.assignments.find(load => load.key === editingKey)
  const groups = [...new Set(catalog.filter(matches).map(groupLabel))].sort((a, b) => (a.startsWith('Other') ? 1 : 0) - (b.startsWith('Other') ? 1 : 0) || a.localeCompare(b))
  const upload = async file => {
    action.setError(''); action.setNotice(null)
    try {
      if(/\.pdf$/i.test(file.name)){
        setReading('Reading teaching-load PDF…')
        const ref=await readReferenceFile(file,setReading)
        if(!ref.teachingLoad)throw new Error('No teaching-load form was identified in this PDF. Check its instructor and table headings.')
        setDocument(ref)
      }else setReview({ filename: file.name, existing:courseAssignments(data), plan: planCourseLoads(await readGrid(file), { instructors: directory.instructors, courses: catalog, loads, blocks,courseOnly:true }) })
    }
    catch (failure) { action.setError(failure.message || 'The file could not be read.') }
    finally{setReading('')}
  }
  const filters = <div className="dean-toolbar">
    <label className="academic-filter">Search courses<input className="form-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Course code or title" /></label>
    <div className="dean-segment" role="group" aria-label="Course load filter">{[['all', `All (${catalog.length})`], ['loaded', `Loaded (${loaded.length})`], ['unloaded', `Not yet loaded (${unloaded.length})`]].map(([value, label]) => <button key={value} className={show === value ? 'active' : ''} aria-pressed={show === value} onClick={() => setShow(value)}>{label}</button>)}</div>
  </div>
  return <>
    {!writable&&<p className="text-sm text-muted mb-16">This semester is view-only.</p>}
    <DeanCards items={[
      { label: 'Courses', value: catalog.length, icon: BookOpen, to: '/records' },
      { label: 'Loaded courses', value: loaded.length, icon: ClipboardCheck, to: '/records?show=loaded' },
      { label: 'Not yet loaded', value: unloaded.length, icon: AlertTriangle, tone: 'amber', to: '/records?show=unloaded' },
      { label: 'Instructor loads', value: courseAssignments(data).length, icon: Layers, tone: 'green', to: '/records?show=loaded' }]} />
    {!selected && <DeanFeedback action={action} />}
    <Panel title="Courses" actions={<div className="academic-actions">{directory.managed&&writable&&<button className="btn btn-primary btn-sm" disabled={Boolean(action.busy)} onClick={()=>setCatalogAction('add')}><Plus size={15} aria-hidden="true"/> Add Course</button>}{writable&&<UploadButton label={<><FileUp size={15} aria-hidden="true" /> Upload course load</>} accept=".pdf,.csv,.tsv,.txt,.xlsx,.xls" onFile={upload} disabled={!directory.managed || Boolean(action.busy)||Boolean(reading)} />}{writable&&<UploadButton label={<><Users size={15} aria-hidden="true" /> Upload class lists</>} accept=".xls,.xlsx,.csv,.tsv,.txt" onFiles={files=>{action.setError('');action.setNotice(null);setClassLists(files)}} disabled={!directory.managed || Boolean(action.busy)||Boolean(reading)} />}<CsvButton headers={['Course', 'Title', 'Units', 'Year and semester', 'Instructor', 'Block', 'Semester','Academic year','Days','Time','Room','Listed hours','Computed hours','Students listed']} rows={catalog.flatMap(c => (c.loads.length ? c.loads : [{}]).map(l => [c.code, c.title, c.units, groupLabel(c), l.instructorName || '', l.block || '', l.semester || '',l.academicYear||'',l.days||'',l.time||'',l.room||'',l.hours||'',l.computedHours||'',l.students||'']))} name="course-loads" /></div>}>
      {reading&&<p role="status">{reading}</p>}
      {writable&&document&&<TeachingLoadImport file={document} initialOpen onClose={()=>setDocument(null)}/>}
      {writable&&classLists&&<DeanClassListImport files={classLists} data={data} students={directory.students} action={action} term={{semester,academicYear}} onClose={()=>setClassLists(null)}/>}
      {filters}
      {groups.map(label => <section className="dean-pill-group" key={label} aria-label={label}>{groups.length>1&&<h3>{label}</h3>}<div className="dean-pills">
        {catalog.filter(course => matches(course) && groupLabel(course) === label).map(course => <article key={course.code} className={`dean-course-card${course.status==='suspended'?' is-suspended':''}`}><button className={`dean-pill${course.assignments.length ? ' loaded' : ''}`} onClick={() => setDetail(`course:${course.code}`)} aria-label={`${course.code} ${course.title}, ${course.assignments.length ? `loaded to ${new Set(course.assignments.map(l => l.instructorId)).size} instructor(s)` : 'not yet loaded'}`}>
          <span className="dean-pill-code">{course.code}</span>{course.status==='suspended'&&<span className="dean-status dean-status-suspended">Suspended</span>}<span className="dean-pill-title">{course.title}</span><span className="dean-pill-state" aria-hidden="true">{course.assignments.length ? `${new Set(course.assignments.map(l => l.instructorId)).size} instr.` : 'Open'}</span>
        </button>{directory.managed&&writable&&<CourseCardActions course={course} open={catalogMenu===course.code} onOpenChange={next=>setCatalogMenu((typeof next==='function'?next(catalogMenu===course.code):next)?course.code:null)} disabled={Boolean(action.busy)} onAction={setCatalogAction}/>}</article>)}
      </div></section>)}
      {!groups.length && <Empty>{catalog.length ? 'No course matches this search.' : 'No courses are recorded yet. Add Course or upload the course load to begin.'}</Empty>}
    </Panel>
    {directory.managed&&writable&&catalogAction&&(catalogAction==='add'?<CourseCatalogForm academicYear={academicYear} semester={semester} action={action} onClose={()=>setCatalogAction(null)}/>:actionCourse?(actionKind==='edit'?<CourseCatalogForm academicYear={academicYear} semester={semester} key={catalogAction} course={actionCourse} action={action} onClose={()=>setCatalogAction(null)}/>:<CourseStatusDialog academicYear={academicYear} semester={semester} key={catalogAction} course={actionCourse} kind={actionKind} action={action} onClose={()=>setCatalogAction(null)}/>):<DeanDialog title="Course unavailable" size="narrow" onClose={()=>setCatalogAction(null)}><Empty>This course is no longer available. Close this dialog and choose a current course.</Empty></DeanDialog>)}
    {selected && <CourseDialog course={selected} data={data} directoryStudents={directory.students} action={action} onEdit={load => setEditingKey(load.key)} managed={directory.managed} writable={writable} onClose={() => { setEditingKey(null); setDetail(null) }} onAssign={() => setAssigning(selected)} onRemove={load => setRemoving({ ...load, title: selected.title })} />}
    {typeof detail === 'string' && detail.startsWith('course:') && !selected && <DeanDialog title="Record unavailable" onClose={() => setDetail(null)} size="narrow"><Empty>This course is no longer in your records. Close this dialog and choose a current course.</Empty></DeanDialog>}
    {writable && assigning && <DeanCourseAssignment course={assigning} instructors={directory.instructors} academicYear={academicYear} semester={semester} action={action} onClose={() => setAssigning(null)} />}
    {writable && editingKey && selected && (editing ? <DeanCourseAssignment key={`${editing.key}:${editing.instructorId}`} course={selected} load={editing} instructors={directory.instructors} academicYear={academicYear} semester={semester} action={action} onClose={() => setEditingKey(null)} /> : <DeanDialog title="Course load unavailable" onClose={() => setEditingKey(null)} size="narrow"><Empty>This load is no longer available. Choose a current course load.</Empty></DeanDialog>)}
    {writable && removing && <ConfirmDialog title="Remove course load" confirmLabel="Remove load" danger busy={action.busy} onClose={() => setRemoving(null)} onConfirm={async () => { if (await action.run('Removing course load', { action: 'course-load.remove', key:removing.key,expected_instructor:removing.instructorId,academic_year:academicYear,semester }, () => ({ text: `${removing.instructorName} no longer teaches ${removing.code} for ${semester}.` }))) setRemoving(null) }}>
      <p>Remove <strong>{removing.instructorName}</strong> from <strong>{removing.code} — {removing.title}</strong> for <strong>{semester} · AY {academicYear}</strong>?</p><p className="text-sm text-muted">This course and its confirmed classes leave the instructor's current load. Its syllabus, teaching materials, assessments, schedule and student history are retained for the replacement instructor.</p>
    </ConfirmDialog>}
    {writable && review && <LoadReview academicYear={academicYear} semester={semester} review={review} action={action} onClose={() => setReview(null)} />}
  </>
}

function CourseDialog({ course, data, directoryStudents = [], action, managed, writable, onClose, onAssign, onEdit, onRemove }) {
  const [inspecting, setInspecting] = useWorkspaceViewState(`dean-course-inspect:${course.code}`, null)
  const [adding, setAdding] = useState(null), addingTo = adding && course.assignments.find(item => item.key === adding.key)
  const sections = course.assignments.flatMap(item => item.sections.map(section => ({ item, section })))
  const load = course.assignments.find(item => item.key === inspecting)
  const close = () => { setInspecting(null); onClose() }
  const instructorIds = new Set(course.assignments.map(item => item.instructorId))
  const related = [...instructorIds].flatMap(id=>assignedInstructorSyllabi(data,id)).filter(item=>course.ids.includes(item.id))
  const students = new Set(data.enrollments.filter(item => !item.suspended && related.some(row => row.id === item.course_id && course.loads.some(current => current.instructorId === row.instructor_id && current.block === item.block_section))).map(item => item.student_email.toLowerCase())).size
  return <DeanDialog title={`${course.code} — ${course.title}`} subtitle={[groupLabel(course), course.units && `${course.units} units`, course.classification].filter(Boolean).join(' · ')} icon={BookOpen} size="page" onClose={close}
    footer={<>{managed && writable && <button className="btn btn-primary" onClick={onAssign} disabled={Boolean(action.busy)||course.status==='suspended'}><Plus size={15} aria-hidden="true" /> Add instructor</button>}<button className="btn btn-secondary" onClick={close}>Close</button></>}>
    <DeanCards items={[
      { label: 'Instructors loaded', value: instructorIds.size, icon: GraduationCap },
      { label: 'Block sections', value: sections.length, icon: Layers },
      { label: 'Registered students', value: students, icon: Users },
      { label: 'Extracted syllabi', value: related.filter(item => item.outline?.length).length, icon: BookOpen },
    ]} />
    <DeanFeedback action={action} />
    {course.prerequisites && <p className="text-sm text-muted mb-16">Prerequisites: {course.prerequisites}</p>}
    {course.status==='suspended'&&<p className="dean-warning">Course suspended. Reactivate it from the course card menu before adding new loads. Existing classes and teaching history remain available.</p>}
    <h3 className="dean-subhead">Loaded instructors</h3>
    <Table headers={['Instructor', 'Block sections', 'Term','Schedule and source details', 'Actions']} rows={course.assignments.map(item => [item.instructorName, item.blocks.join(', ')||'No block section yet', [item.semester,item.academicYear].filter(Boolean).join(' · ') || '—',<TeachingLoadFacts key={`facts:${item.key}`} load={item}/>,
      <div className="academic-actions" key={item.key}><button className="btn btn-secondary btn-sm" onClick={() => setInspecting(item.key)} aria-label={`Inspect ${item.instructorName} ${item.blocks.join(', ')}`} disabled={!managed}>View syllabus and contents</button>{managed && writable && <>{!item.legacy && <button className="btn btn-ghost btn-sm" onClick={() => setAdding({ key: item.key, block: '' })} disabled={Boolean(action.busy)} aria-label={`Add a block section to ${item.instructorName} ${course.code}`}>Add block section</button>}<button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)} disabled={Boolean(action.busy)} aria-label={`Edit ${item.instructorName} ${item.block}`}>Edit</button><button className="btn btn-ghost btn-sm" onClick={() => onRemove(item)} disabled={Boolean(action.busy)} aria-label={`Remove ${item.instructorName} from ${course.code}`}>Remove</button></>}</div>])} empty="No instructor is loaded with this course yet. Add an instructor to make it available on their Course page. The instructor adds its syllabus and class lists." />
    <h3 className="dean-subhead mt-24">Block sections</h3>
    <p className="text-sm text-muted mb-16">Each block shares the instructor's syllabus and keeps its own schedule. Add home-block or irregular students to a block, or let the instructor add the class list.</p>
    <Table headers={['Block section', 'Instructor', 'Term', 'Schedule', 'Class list', 'Actions']} rows={sections.map(({ item, section }) => [`${course.code} ${section.block}`, item.instructorName, [item.semester, item.academicYear].filter(Boolean).join(' · ') || 'Not recorded', slotText(section), section.students.length ? `${section.students.length} student${section.students.length === 1 ? '' : 's'}` : 'Class list not added',
      managed && writable && !item.legacy ? <button key={section.key} className="btn btn-ghost btn-sm" onClick={() => setAdding({ key: item.key, block: section.block })} disabled={Boolean(action.busy)} aria-label={`Add students to ${course.code} ${section.block}`}>Add students</button> : ''])} empty="No block section is loaded yet. Confirm a teaching load, or add a block section to a loaded instructor." />
    {addingTo && <DeanBlockSectionDialog load={addingTo} block={adding.block} students={directoryStudents} action={action} onClose={() => setAdding(null)} />}
    {inspecting && (load ? <DeanCourseInspection key={`${load.key}:${load.instructorId}`} load={load} students={directoryStudents} action={action} manage={managed && writable} onClose={() => setInspecting(null)} /> : <DeanDialog title="Course load unavailable" onClose={() => setInspecting(null)} size="narrow"><Empty>This load is no longer in the current records. Select a current instructor.</Empty></DeanDialog>)}
  </DeanDialog>
}

function LoadReview({ review, action, onClose,academicYear:year,semester }) {
  const loads=review.plan.loads.map(load=>{
    if(load.problem||!load.instructor)return load
    const effective=semester
    if(load.semester&&loadTerm(year,load.semester)!==loadTerm(year,semester))return {...load,status:'problem',problem:'The source row belongs to another semester.'}
    const prior=(review.existing||[]).find(item=>item.code===load.course_code&&item.instructorId===load.instructor.id&&loadTerm(item.academicYear,item.semester)===loadTerm(year,effective))
    return {...load,semester:effective,status:!prior?'new':'unchanged',previous:prior?.instructorName}
  })
  const ready = loads.filter(load => load.status === 'new' || load.status === 'reassign')
  const count = status => loads.filter(load => load.status === status).length
  const apply = async () => {
    let created = 0, updated = 0
    for (const [index, part] of chunk(ready, 200).entries()) {
      const result = await action.run(`Adding course loads (${index + 1}/${Math.ceil(ready.length / 200)})`, { action: 'load.assign', filename: review.filename, loads: part.map(load => ({ course_code: load.course_code, course_title: load.course_title || undefined, instructor_id: load.instructor.id, semester: load.semester,academic_year:year })) })
      if (!result) return
      created += result.created; updated += result.updated
    }
    action.setNotice({ text: `${review.filename}: ${created} course loads added and ${updated} reassigned. ${count('problem')} rows need attention in the file.` })
    onClose()
  }
  const label = { new: 'Add', reassign: 'Reassign', unchanged: 'Already loaded', problem: 'Needs attention' }
  return <DeanDialog title="Review course load upload" subtitle={`${review.filename} · header found on row ${review.plan.header}`} icon={FileUp} tone="purple" onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" onClick={apply} disabled={!ready.length || Boolean(action.busy)}>{action.busy ? `${action.busy}…` : `Add ${ready.length} course load${ready.length === 1 ? '' : 's'}`}</button></>}>
    {action.error && <p role="alert" className="connected-pulse-warning">{action.error}</p>}
    <p className="text-sm text-muted mb-16">{semester} · AY {year}. Only course assignments are saved. Instructors add their class lists.</p>
    <div className="dean-review-counts">{['new', 'reassign', 'unchanged', 'problem'].map(status => <span key={status} className={`dean-tag dean-tag-${status}`}>{label[status]}: {count(status)}</span>)}</div>
    <p className="text-sm text-muted mb-16">Instructors are matched by email, employee ID, full name, then a unique surname. Nothing is saved until you add the loads.</p>
    <Table headers={['Row', 'Instructor in file', 'Matched account', 'Course', 'Block', 'Result']} rows={loads.map(load => [load.row, load.instructorText || '—', load.instructor ? `${load.instructor.name} (${load.match})` : '—', `${load.course_code}${load.course_title ? ` — ${load.course_title}` : ''}`, load.block || '—',
      <span key={load.row} className={`dean-tag dean-tag-${load.status}`}>{load.problem || (load.status === 'reassign' ? `Reassign from ${load.previous}` : label[load.status])}</span>])} empty="No course rows were found under the header." />
  </DeanDialog>
}
