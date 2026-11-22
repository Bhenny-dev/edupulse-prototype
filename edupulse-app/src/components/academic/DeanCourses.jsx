import { useMemo, useState } from 'react'
import { BookOpen, ClipboardCheck, AlertTriangle, Layers, Plus, FileUp, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { Panel, Empty, Table, CsvButton } from './AcademicUI'
import { deanRecords, courseCatalog, deanDirectory, loadRows, courseAssignments } from './deanRecordModel'
import DeanBlockSectionDialog from './DeanBlockSectionDialog'
import { curriculumCourse } from '../../utils/curriculumMetadata'
import { DeanCards, DeanDialog, DeanFeedback, ConfirmDialog, UploadButton } from './DeanCommon'
import { useDeanAction } from './deanActions'
import { readGrid, planCourseLoads, chunk } from './eduSuiteImport'
import DeanCourseInspection from './DeanCourseInspection'
import DeanCourseAssignment from './DeanCourseAssignment'
import TeachingLoadImport from './TeachingLoadImport'
import DeanClassListImport from './DeanClassListImport'
import DeanTermCalendar from './DeanTermCalendar'
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
  const [inspecting,setInspecting]=useWorkspaceViewState(`dean-table-inspect:${term}`,null)
  const [adding,setAdding]=useState(null)
  const addingLoad=courseAssignments(data).find(load=>load.key===adding?.key)
  const inspectedLoad=courseAssignments(data).find(load=>load.key===inspecting)
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
    <DeanFeedback action={action} />
    <Panel title="Courses" actions={<div className="academic-actions"><DeanTermCalendar records={allData.institutional||[]} semester={semester} academicYear={academicYear} writable={writable&&directory.managed} action={action}/>{directory.managed&&writable&&<button className="btn btn-primary btn-sm" disabled={Boolean(action.busy)} onClick={()=>setCatalogAction('add')}><Plus size={15} aria-hidden="true"/> Add Course</button>}{writable&&<UploadButton label={<><FileUp size={15} aria-hidden="true" /> Upload course load</>} accept=".pdf,.csv,.tsv,.txt,.xlsx,.xls" onFile={upload} disabled={!directory.managed || Boolean(action.busy)||Boolean(reading)} />}{writable&&<UploadButton label={<><Users size={15} aria-hidden="true" /> Upload class lists</>} accept=".xls,.xlsx,.csv,.tsv,.txt" onFiles={files=>{action.setError('');action.setNotice(null);setClassLists(files)}} disabled={!directory.managed || Boolean(action.busy)||Boolean(reading)} />}<CsvButton headers={['Course', 'Title', 'Units', 'Year and semester', 'Instructor', 'Block', 'Semester','Academic year','Days','Time','Room','Listed hours','Computed hours','Students listed']} rows={catalog.flatMap(c => (c.loads.length ? c.loads : [{}]).map(l => [c.code, c.title, c.units, groupLabel(c), l.instructorName || '', l.block || '', l.semester || '',l.academicYear||'',l.days||'',l.time||'',l.room||'',l.hours||'',l.computedHours||'',l.students||'']))} name="course-loads" /></div>}>
      {reading&&<p role="status">{reading}</p>}
      {writable&&document&&<TeachingLoadImport file={document} initialOpen onClose={()=>setDocument(null)}/>}
      {writable&&classLists&&<DeanClassListImport files={classLists} data={data} students={directory.students} action={action} term={{semester,academicYear}} onClose={()=>setClassLists(null)}/>}
      {filters}
      <Table label="Course catalog and instructor loads" headers={['Course code','Course title','Units','Status','Instructor','Block sections','Schedule / source','Students','Actions']} rows={catalog.filter(matches).flatMap(course=>(course.assignments.length?course.assignments:[null]).map(item=>[
        course.code,course.title,course.units,course.status==='suspended'?'Suspended':item?'Loaded':'Not yet loaded',item?.instructorName||'Not assigned',item?.blocks.join(', ')||'No block section yet',item?<TeachingLoadFacts key={item.key} load={item}/>:null,item?item.sections.reduce((sum,section)=>sum+section.students.length,0):0,
        <CourseCardActions key={item?.key||course.code} label={`Course actions for ${course.code}${item?` ${item.instructorName}`:''}`} course={course} open={catalogMenu===(item?.key||course.code)} onOpenChange={next=>setCatalogMenu((typeof next==='function'?next(catalogMenu===(item?.key||course.code)):next)?(item?.key||course.code):null)} disabled={Boolean(action.busy)} canEdit={directory.managed&&writable} onAction={setCatalogAction} extraActions={[
          ...(directory.managed&&writable&&course.status!=='suspended'?[{label:'Add instructor',icon:Plus,onSelect:()=>setAssigning(course)}]:[]),
          ...(item?[{label:'View syllabus and contents',icon:BookOpen,onSelect:()=>setInspecting(item.key)},...(directory.managed&&writable?[
            {label:'Edit instructor load',onSelect:()=>{setDetail(`course:${course.code}`);setEditingKey(item.key)}},
            {label:'Remove instructor load',onSelect:()=>setRemoving({...item,title:course.title})},
            ...(!item.legacy?[{label:'Add block section',onSelect:()=>setAdding({key:item.key,block:''})},...item.sections.map(section=>({label:`Add students to ${course.code} ${section.block}`,onSelect:()=>setAdding({key:item.key,block:section.block})}))]:[])
          ]:[])]:[])
        ]}/>
      ]))} empty="No courses match the current filters."/>
      {!groups.length && <Empty>{catalog.length ? 'No course matches this search.' : 'No courses are recorded yet. Add Course or upload the course load to begin.'}</Empty>}
    </Panel>
    {directory.managed&&writable&&catalogAction&&(catalogAction==='add'?<CourseCatalogForm academicYear={academicYear} semester={semester} action={action} onClose={()=>setCatalogAction(null)}/>:actionCourse?(actionKind==='edit'?<CourseCatalogForm academicYear={academicYear} semester={semester} key={catalogAction} course={actionCourse} action={action} onClose={()=>setCatalogAction(null)}/>:<CourseStatusDialog academicYear={academicYear} semester={semester} key={catalogAction} course={actionCourse} kind={actionKind} action={action} onClose={()=>setCatalogAction(null)}/>):<DeanDialog title="Course unavailable" size="narrow" onClose={()=>setCatalogAction(null)}><Empty>This course is no longer available. Close this dialog and choose a current course.</Empty></DeanDialog>)}
    {addingLoad&&<DeanBlockSectionDialog load={addingLoad} block={adding.block} students={directory.students} action={action} onClose={()=>setAdding(null)}/>}
    {inspectedLoad&&<DeanCourseInspection load={inspectedLoad} students={directory.students} action={action} manage={directory.managed&&writable} onClose={()=>setInspecting(null)}/>}
    {writable && assigning && <DeanCourseAssignment course={assigning} instructors={directory.instructors} academicYear={academicYear} semester={semester} action={action} onClose={() => setAssigning(null)} />}
    {writable && editingKey && selected && (editing ? <DeanCourseAssignment key={`${editing.key}:${editing.instructorId}`} course={selected} load={editing} instructors={directory.instructors} academicYear={academicYear} semester={semester} action={action} onClose={() => setEditingKey(null)} /> : <DeanDialog title="Course load unavailable" onClose={() => setEditingKey(null)} size="narrow"><Empty>This load is no longer available. Choose a current course load.</Empty></DeanDialog>)}
    {writable && removing && <ConfirmDialog title="Remove course load" confirmLabel="Remove load" danger busy={action.busy} onClose={() => setRemoving(null)} onConfirm={async () => { if (await action.run('Removing course load', { action: 'course-load.remove', key:removing.key,expected_instructor:removing.instructorId,academic_year:academicYear,semester }, () => ({ text: `${removing.instructorName} no longer teaches ${removing.code} for ${semester}.` }))) setRemoving(null) }}>
      <p>Remove <strong>{removing.instructorName}</strong> from <strong>{removing.code} — {removing.title}</strong> for <strong>{semester} · AY {academicYear}</strong>?</p><p className="text-sm text-muted">This course and its confirmed classes leave the instructor's current load. Its syllabus, teaching materials, assessments, schedule and student history are retained for the replacement instructor.</p>
    </ConfirmDialog>}
    {writable && review && <LoadReview academicYear={academicYear} semester={semester} review={review} action={action} onClose={() => setReview(null)} />}
  </>
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
