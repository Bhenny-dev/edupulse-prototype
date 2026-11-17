import { useMemo, useState } from 'react'
import { BookOpen, ClipboardCheck, AlertTriangle, Layers, Plus, FileUp, GraduationCap, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { Panel, Empty, Table, CsvButton } from './AcademicUI'
import { deanRecords, courseCatalog, deanDirectory, loadRows, assignedInstructorSyllabi } from './deanRecordModel'
import { curriculumCourse } from '../../utils/curriculumMetadata'
import { DeanCards, DeanDialog, DeanFeedback, ConfirmDialog, UploadButton } from './DeanCommon'
import { useDeanAction } from './deanActions'
import { readGrid, planCourseLoads, normalizeBlock, chunk } from './eduSuiteImport'
import DeanCourseInspection from './DeanCourseInspection'
import TeachingLoadImport from './TeachingLoadImport'
import LoadTermFilter from './LoadTermFilter'
import {readReferenceFile} from '../../lib/aiClient'
import {CURRENT_LOAD_TERM,recordsForLoadTerm,loadTerm} from '../../utils/loadTerms'
import {CURRENT_TERM,SEMESTERS} from '../../utils/teachingLoad'
import TeachingLoadFacts from './TeachingLoadFacts'

const groupLabel = course => course.year ? `Year ${course.year}${course.semester ? ` · ${course.semester}` : ''}` : 'Other recorded courses'
export const knownBlocks = (data, model) => [...new Set([...model.blocks.map(b => b.name), ...loadRows(data).map(l => l.block), ...(data.institutional || []).filter(r => r.kind === 'rosters').map(r => String(r.data.Block || ''))])].filter(b => b && b !== 'IRREGULAR').sort()

export default function DeanCourses({ data:allData }) {
  const [params, setParams] = useSearchParams()
  const data=useMemo(()=>recordsForLoadTerm(allData,params.get('term')||CURRENT_LOAD_TERM),[allData,params])
  const model = useMemo(() => deanRecords(data), [data])
  const catalog = useMemo(() => courseCatalog(data, model, curriculumCourse), [data, model])
  const directory = useMemo(() => deanDirectory(data, model), [data, model])
  const blocks = useMemo(() => knownBlocks(data, model), [data, model])
  const loads = useMemo(() => loadRows(data), [data])
  const [detail, setDetail] = useWorkspaceViewState('dean-detail:records', null)
  const [editingKey, setEditingKey] = useWorkspaceViewState('dean-course-edit', null)
  const [assigning, setAssigning] = useState(null), [removing, setRemoving] = useState(null), [review, setReview] = useState(null)
  const [search, setSearch] = useState('')
  const [document,setDocument]=useState(null),[reading,setReading]=useState('')
  const action = useDeanAction()
  const show = params.get('show') || 'all'
  const setShow = value => { const next = new URLSearchParams(params); if (value === 'all') next.delete('show'); else next.set('show', value); setParams(next) }
  const loaded = catalog.filter(course => course.loads.length), unloaded = catalog.filter(course => !course.loads.length)
  const matches = course => `${course.code} ${course.title}`.toLowerCase().includes(search.trim().toLowerCase()) && (show === 'all' || (show === 'loaded') === Boolean(course.loads.length))
  const selected = typeof detail === 'string' && detail.startsWith('course:') ? catalog.find(course => course.code === detail.slice(7)) : null
  const editing = selected?.loads.find(load => load.key === editingKey)
  const groups = [...new Set(catalog.filter(matches).map(groupLabel))].sort((a, b) => (a.startsWith('Other') ? 1 : 0) - (b.startsWith('Other') ? 1 : 0) || a.localeCompare(b))
  const upload = async file => {
    action.setError(''); action.setNotice(null)
    try {
      if(/\.pdf$/i.test(file.name)){
        setReading('Reading teaching-load PDF…')
        const ref=await readReferenceFile(file,setReading)
        if(!ref.teachingLoad)throw new Error('No teaching-load form was identified in this PDF. Check its instructor and table headings.')
        setDocument(ref)
      }else setReview({ filename: file.name, existing:loadRows(allData), plan: planCourseLoads(await readGrid(file), { instructors: directory.instructors, courses: catalog, loads, blocks }) })
    }
    catch (failure) { action.setError(failure.message || 'The file could not be read.') }
    finally{setReading('')}
  }
  const filters = <div className="dean-toolbar">
    <label className="academic-filter">Search courses<input className="form-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Course code or title" /></label>
    <div className="dean-segment" role="group" aria-label="Course load filter">{[['all', `All (${catalog.length})`], ['loaded', `Loaded (${loaded.length})`], ['unloaded', `Not yet loaded (${unloaded.length})`]].map(([value, label]) => <button key={value} className={show === value ? 'active' : ''} aria-pressed={show === value} onClick={() => setShow(value)}>{label}</button>)}</div>
  </div>
  return <>
    <LoadTermFilter data={allData}/>
    <DeanCards items={[
      { label: 'Courses', value: catalog.length, icon: BookOpen, to: '/records' },
      { label: 'Loaded courses', value: loaded.length, icon: ClipboardCheck, to: '/records?show=loaded' },
      { label: 'Not yet loaded', value: unloaded.length, icon: AlertTriangle, tone: 'amber', to: '/records?show=unloaded' },
      { label: 'Class loads', value: loads.length, icon: Layers, tone: 'green', to: '/records?show=loaded' }]} />
    {!selected && <DeanFeedback action={action} />}
    <Panel title="Courses" actions={<div className="academic-actions"><UploadButton label={<><FileUp size={15} aria-hidden="true" /> Upload course load</>} accept=".pdf,.csv,.tsv,.txt,.xlsx,.xls" onFile={upload} disabled={!directory.managed || Boolean(action.busy)||Boolean(reading)} /><CsvButton headers={['Course', 'Title', 'Units', 'Year and semester', 'Instructor', 'Block', 'Semester','Academic year','Days','Time','Room','Listed hours','Computed hours','Students listed']} rows={catalog.flatMap(c => (c.loads.length ? c.loads : [{}]).map(l => [c.code, c.title, c.units, groupLabel(c), l.instructorName || '', l.block || '', l.semester || '',l.academicYear||'',l.days||'',l.time||'',l.room||'',l.hours||'',l.computedHours||'',l.students||'']))} name="course-loads" /></div>}>
      {reading&&<p role="status">{reading}</p>}
      {document&&<TeachingLoadImport file={document} initialOpen onClose={()=>setDocument(null)}/>}
      {filters}
      {groups.map(label => <section className="dean-pill-group" key={label} aria-label={label}><h3>{label}</h3><div className="dean-pills">
        {catalog.filter(course => matches(course) && groupLabel(course) === label).map(course => <button key={course.code} className={`dean-pill${course.loads.length ? ' loaded' : ''}`} onClick={() => setDetail(`course:${course.code}`)} aria-label={`${course.code} ${course.title}, ${course.loads.length ? `loaded to ${new Set(course.loads.map(l => l.instructorId)).size} instructor(s)` : 'not yet loaded'}`}>
          <span className="dean-pill-code">{course.code}</span><span className="dean-pill-title">{course.title}</span><span className="dean-pill-state" aria-hidden="true">{course.loads.length ? `${new Set(course.loads.map(l => l.instructorId)).size} instr.` : 'Open'}</span>
        </button>)}
      </div></section>)}
      {!groups.length && <Empty>{catalog.length ? 'No course matches this search.' : 'No courses are recorded yet. Upload the course load or ask the System Admin to import the curriculum.'}</Empty>}
    </Panel>
    {selected && <CourseDialog course={selected} data={data} action={action} onEdit={load => setEditingKey(load.key)} managed={directory.managed} onClose={() => { setEditingKey(null); setDetail(null) }} onAssign={() => setAssigning(selected)} onRemove={load => setRemoving({ ...load, title: selected.title })} />}
    {typeof detail === 'string' && detail.startsWith('course:') && !selected && <DeanDialog title="Record unavailable" onClose={() => setDetail(null)} size="narrow"><Empty>This course is no longer in your records. Close this dialog and choose a current course.</Empty></DeanDialog>}
    {assigning && <AssignDialog course={assigning} instructors={directory.instructors} blocks={blocks} action={action} onClose={() => setAssigning(null)} />}
    {editingKey && selected && (editing ? <EditLoadDialog key={`${editing.key}:${editing.instructorId}`} course={selected} load={editing} instructors={directory.instructors} blocks={blocks} action={action} onClose={() => setEditingKey(null)} /> : <DeanDialog title="Course load unavailable" onClose={() => setEditingKey(null)} size="narrow"><Empty>This load is no longer available. Choose a current course load.</Empty></DeanDialog>)}
    {removing && <ConfirmDialog title="Remove course load" confirmLabel="Remove load" danger busy={action.busy} onClose={() => setRemoving(null)} onConfirm={async () => { if (await action.run('Removing course load', { action: 'load.remove', keys: [removing.key],expected_instructor:removing.instructorId }, () => ({ text: `${removing.instructorName} no longer teaches ${removing.code} for ${removing.block}.` }))) setRemoving(null) }}>
      <p>Remove <strong>{removing.instructorName}</strong> from <strong>{removing.code} — {removing.title}</strong> for block <strong>{removing.block}</strong>?</p><p className="text-sm text-muted">This block leaves the instructor's teaching load. Its syllabus, teaching materials, assessments, schedule and student history are retained for the replacement instructor.</p>
    </ConfirmDialog>}
    {review && <LoadReview review={review} action={action} onClose={() => setReview(null)} />}
  </>
}

function CourseDialog({ course, data, action, managed, onClose, onAssign, onEdit, onRemove }) {
  const [inspecting, setInspecting] = useWorkspaceViewState(`dean-course-inspect:${course.code}`, null)
  const load = course.loads.find(item => item.key === inspecting)
  const close = () => { setInspecting(null); onClose() }
  const instructorIds = new Set(course.loads.map(item => item.instructorId))
  const related = [...instructorIds].flatMap(id=>assignedInstructorSyllabi(data,id)).filter(item=>course.ids.includes(item.id))
  const students = new Set(data.enrollments.filter(item => !item.suspended && related.some(row => row.id === item.course_id && course.loads.some(current => current.instructorId === row.instructor_id && current.block === item.block_section))).map(item => item.student_email.toLowerCase())).size
  return <DeanDialog title={`${course.code} — ${course.title}`} subtitle={[groupLabel(course), course.units && `${course.units} units`, course.classification].filter(Boolean).join(' · ')} icon={BookOpen} size="page" onClose={close}
    footer={<>{managed && <button className="btn btn-primary" onClick={onAssign} disabled={Boolean(action.busy)}><Plus size={15} aria-hidden="true" /> Add instructor</button>}<button className="btn btn-secondary" onClick={close}>Close</button></>}>
    <DeanCards items={[
      { label: 'Instructors loaded', value: instructorIds.size, icon: GraduationCap },
      { label: 'Class loads', value: course.loads.length, icon: Layers },
      { label: 'Registered students', value: students, icon: Users },
      { label: 'Extracted syllabi', value: related.filter(item => item.outline?.length).length, icon: BookOpen },
    ]} />
    <DeanFeedback action={action} />
    {course.prerequisites && <p className="text-sm text-muted mb-16">Prerequisites: {course.prerequisites}</p>}
    <h3 className="dean-subhead">Loaded instructors</h3>
    <Table headers={['Instructor', 'Block', 'Term','Schedule and source details', 'Actions']} rows={course.loads.map(item => [item.instructorName, item.block, [item.semester,item.academicYear].filter(Boolean).join(' · ') || '—',<TeachingLoadFacts key={`facts:${item.key}`} load={item}/>,
      <div className="academic-actions" key={item.key}><button className="btn btn-secondary btn-sm" onClick={() => setInspecting(item.key)} aria-label={`Inspect ${item.instructorName} ${item.block}`} disabled={!managed}>View syllabus and contents</button>{managed && <><button className="btn btn-ghost btn-sm" onClick={() => onEdit(item)} disabled={Boolean(action.busy)} aria-label={`Edit ${item.instructorName} ${item.block}`}>Edit</button><button className="btn btn-ghost btn-sm" onClick={() => onRemove(item)} disabled={Boolean(action.busy)} aria-label={`Remove ${item.instructorName} from ${course.code} ${item.block}`}>Remove</button></>}</div>])} empty="No instructor is loaded with this course yet. Add an instructor to make it available on their Course page." />
    {inspecting && (load ? <DeanCourseInspection key={`${load.key}:${load.instructorId}`} load={load} onClose={() => setInspecting(null)} /> : <DeanDialog title="Course load unavailable" onClose={() => setInspecting(null)} size="narrow"><Empty>This load is no longer in the current records. Select a current instructor.</Empty></DeanDialog>)}
  </DeanDialog>
}

function EditLoadDialog({ course, load, instructors, blocks, action, onClose }) {
  const [teacher, setTeacher] = useState(load.instructorId), [block, setBlock] = useState(load.block), [semester, setSemester] = useState(load.semester), [problem, setProblem] = useState('')
  const save = async () => {
    if (!block.trim()) return setProblem('Choose a block.')
    if (await action.run('Saving course load', { action: 'load.update', key: load.key, expected_instructor: load.instructorId, instructor_id: teacher, block: normalizeBlock(block, blocks), semester }, () => ({ text: `${course.code} course load updated.` }))) onClose()
  }
  return <DeanDialog title={`Edit ${course.code} course load`} subtitle={`${load.instructorName} · ${load.block}`} size="form" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={Boolean(action.busy)}>Save load</button></>}>
    <div className="dean-form">{(problem || action.error) && <p role="alert" className="connected-pulse-warning">{problem || action.error}</p>}
      <p>For the same block and term, switching the instructor gives this class an independent continuation of its syllabus, teaching materials and assessments, with its delivery schedule and student history.</p>
      <label className="dean-field"><span>Instructor</span><select className="form-select" value={teacher} onChange={event => setTeacher(event.target.value)}>{instructors.filter(person => person.status !== 'suspended' || person.id === load.instructorId).map(person => <option key={person.id} value={person.id}>{person.name}{person.status === 'suspended' ? ' · Suspended' : ''}</option>)}</select></label>
      <label className="dean-field"><span>Block</span><input className="form-input" value={block} maxLength={40} onChange={event => setBlock(event.target.value)} /></label>
      <label className="dean-field"><span>Semester</span><input className="form-input" value={semester} maxLength={60} onChange={event => setSemester(event.target.value)} /></label>
    </div>
  </DeanDialog>
}

function AssignDialog({ course, instructors, blocks, action, onClose }) {
  const active = instructors.filter(person => person.status !== 'suspended')
  const [teacher, setTeacher] = useState(active[0]?.id || ''), [chosen, setChosen] = useState([]), [extra, setExtra] = useState(''), [semester, setSemester] = useState(CURRENT_TERM.semester), [academicYear,setAcademicYear]=useState(CURRENT_TERM.academicYear), [problem, setProblem] = useState('')
  const typed = extra.split(/[,;]/).map(value => normalizeBlock(value, blocks)).filter(Boolean)
  const target = [...new Set([...chosen, ...typed])]
  const person = active.find(p => p.id === teacher)
  const replaced = target.map(block => course.loads.find(load => load.block === block && load.semester === semester && load.instructorId !== teacher)).filter(Boolean)
  const submit = async () => {
    setProblem('')
    if (!person) return setProblem('Choose an active instructor.')
    if (!target.length) return setProblem('Choose at least one block.')
    const saved = await action.run('Saving course load', { action: 'load.assign', filename: 'Course page', loads: target.map(block => ({ course_code: course.code, course_title: course.title, instructor_id: teacher, block, semester,academic_year:academicYear })) },
      result => ({ text: `${person.name} now teaches ${course.code} for ${target.join(', ')} (${result.created} new, ${result.updated} reassigned).` }))
    if (saved) onClose()
  }
  return <DeanDialog title={`Load ${course.code}`} subtitle={course.title} icon={ClipboardCheck} tone="purple" size="form" onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={Boolean(action.busy)}>{action.busy ? `${action.busy}…` : `Assign to ${target.length || ''} block${target.length === 1 ? '' : 's'}`}</button></>}>
    <div className="dean-form">
      {(problem || action.error) && <p role="alert" className="connected-pulse-warning">{problem || action.error}</p>}
      <label className="dean-field"><span>Instructor</span><select className="form-select" value={teacher} onChange={event => setTeacher(event.target.value)}>{active.map(p => <option key={p.id} value={p.id}>{p.name}{p.has_masters ? ' · Master’s' : ''}{p.specialization ? ` · ${p.specialization}` : ''}</option>)}</select>{!active.length && <small className="text-xs text-muted">Add an instructor on the Instructors page first.</small>}</label>
      <fieldset className="dean-block-picker"><legend>Blocks</legend>
        <div className="dean-chips">{blocks.map(block => { const owner = course.loads.find(load => load.block === block); return <label key={block} className={`dean-chip selectable${chosen.includes(block) ? ' selected' : ''}`}><input type="checkbox" checked={chosen.includes(block)} onChange={event => setChosen(prior => event.target.checked ? [...prior, block] : prior.filter(b => b !== block))} />{block}{owner && <small>· {owner.instructorName}</small>}</label> })}</div>
        <label className="dean-field"><span>Other blocks</span><input className="form-input" value={extra} onChange={event => setExtra(event.target.value)} placeholder="BSIT-3C, BSIT-4A" /></label>
      </fieldset>
      <label className="dean-field"><span>Semester</span><input className="form-input" value={semester} onChange={event => setSemester(event.target.value)} placeholder="1st Semester" /></label>
      <label className="dean-field"><span>Academic year</span><input className="form-input" value={academicYear} onChange={event=>setAcademicYear(event.target.value)} placeholder="2026-2027" maxLength={9}/></label>
      {replaced.length > 0 && <p className="dean-warning">{replaced.map(load => `${load.block} is now taught by ${load.instructorName}`).join('; ')}. Assigning replaces that instructor for the block.</p>}
    </div>
  </DeanDialog>
}

function LoadReview({ review, action, onClose }) {
  const [year,setYear]=useState(CURRENT_TERM.academicYear),[semester,setSemester]=useState(CURRENT_TERM.semester)
  const validYear=/^20\d{2}-20\d{2}$/.test(year)&&+year.slice(5)===+year.slice(0,4)+1
  const loads=review.plan.loads.map(load=>{
    if(load.problem||!load.instructor)return load
    const effective=load.semester||semester
    const prior=(review.existing||[]).find(item=>item.code===load.course_code&&item.block===load.block&&loadTerm(item.academicYear,item.semester)===loadTerm(year,effective))
    return {...load,semester:effective,status:!prior?'new':prior.instructorId===load.instructor.id?'unchanged':'reassign',previous:prior?.instructorName}
  })
  const ready = loads.filter(load => load.status === 'new' || load.status === 'reassign')
  const count = status => loads.filter(load => load.status === status).length
  const apply = async () => {
    let created = 0, updated = 0
    for (const [index, part] of chunk(ready, 200).entries()) {
      const result = await action.run(`Adding course loads (${index + 1}/${Math.ceil(ready.length / 200)})`, { action: 'load.assign', filename: review.filename, loads: part.map(load => ({ course_code: load.course_code, course_title: load.course_title || undefined, instructor_id: load.instructor.id, block: load.block, semester: load.semester,academic_year:year })) })
      if (!result) return
      created += result.created; updated += result.updated
    }
    action.setNotice({ text: `${review.filename}: ${created} course loads added and ${updated} reassigned. ${count('problem')} rows need attention in the file.` })
    onClose()
  }
  const label = { new: 'Add', reassign: 'Reassign', unchanged: 'Already loaded', problem: 'Needs attention' }
  return <DeanDialog title="Review course load upload" subtitle={`${review.filename} · header found on row ${review.plan.header}`} icon={FileUp} tone="purple" onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" onClick={apply} disabled={!ready.length || !validYear || Boolean(action.busy)}>{action.busy ? `${action.busy}…` : `Add ${ready.length} course load${ready.length === 1 ? '' : 's'}`}</button></>}>
    {action.error && <p role="alert" className="connected-pulse-warning">{action.error}</p>}
    <div className="dean-form"><label className="dean-field">Target academic year<input className="form-input" value={year} maxLength={9} onChange={e=>setYear(e.target.value)} placeholder="2026-2027"/></label><label className="dean-field">Semester for rows without a value<select className="form-input" value={semester} onChange={e=>setSemester(e.target.value)}>{SEMESTERS.map(s=><option key={s}>{s}</option>)}</select></label></div>
    <div className="dean-review-counts">{['new', 'reassign', 'unchanged', 'problem'].map(status => <span key={status} className={`dean-tag dean-tag-${status}`}>{label[status]}: {count(status)}</span>)}</div>
    <p className="text-sm text-muted mb-16">Instructors are matched by email, employee ID, full name, then a unique surname. Nothing is saved until you add the loads.</p>
    <Table headers={['Row', 'Instructor in file', 'Matched account', 'Course', 'Block', 'Result']} rows={loads.map(load => [load.row, load.instructorText || '—', load.instructor ? `${load.instructor.name} (${load.match})` : '—', `${load.course_code}${load.course_title ? ` — ${load.course_title}` : ''}`, load.block || '—',
      <span key={load.row} className={`dean-tag dean-tag-${load.status}`}>{load.problem || (load.status === 'reassign' ? `Reassign from ${load.previous}` : label[load.status])}</span>])} empty="No course rows were found under the header." />
  </DeanDialog>
}
