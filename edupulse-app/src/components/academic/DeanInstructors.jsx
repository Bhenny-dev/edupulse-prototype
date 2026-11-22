import { useMemo, useState } from 'react'
import { GraduationCap, Award, ClipboardCheck, UserX, UserPlus, Pencil, Pause, Play, Trash2, BookOpen } from 'lucide-react'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { Empty, CsvButton, Table } from './AcademicUI'
import { deanRecords, deanDirectory, courseAssignments, syllabusState, assignedInstructorSyllabi } from './deanRecordModel'
import { SYLLABUS_STATUS_META } from '../../data/syllabusStatus'
import { useAuth } from '../../context/AuthContext'
import { DeanCards, DeanDialog, ActivityTable, DeanFeedback, ConfirmDialog, StatusBadge } from './DeanCommon'
import { useDeanAction } from './deanActions'
import DeanAccountDialog from './DeanAccountDialog'
import CoursewareActions from '../courseware/CoursewareActions'
import RecordPopover from './RecordPopover'
import useAcademicTerm from './useAcademicTerm'
import DeanCourseInspection from './DeanCourseInspection'
import {recordsForLoadTerm} from '../../utils/loadTerms'

const degreeLabel = person => person.has_masters === true ? (person.degree || 'Master’s degree') : person.has_masters === false ? (person.degree || 'No master’s degree') : 'Degree not recorded'
const signIn = value => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'

export default function DeanInstructors({ data:allData }) {
  const {term,writable}=useAcademicTerm()
  const data=useMemo(()=>recordsForLoadTerm(allData,term),[allData,term])
  const { user } = useAuth(), scores = user?.role !== 'associate_dean'
  const model = useMemo(() => deanRecords(data), [data])
  const directory = useMemo(() => deanDirectory(data, model), [data, model])
  const loads = useMemo(() => courseAssignments(data), [data])
  const [search, setSearch] = useState(''), [status, setStatus] = useState('all')
  const [accountAction,setAccountAction]=useWorkspaceViewState(`dean-instructor-action:${term}`,null)
  const [accountMenu,setAccountMenu]=useWorkspaceViewState(`dean-instructor-menu:${term}`,null)
  const [inspect,setInspect]=useWorkspaceViewState(`dean-instructor-course:${term}`,null)
  const action = useDeanAction()
  const people = directory.instructors.map(person => ({ ...person, loads: loads.filter(load => load.instructorId === person.id), syllabi: assignedInstructorSyllabi(data,person.id) }))
  const shown = people.filter(person => (status === 'all' || person.status === status || (status === 'masters' && person.has_masters)) && `${person.name} ${person.email} ${person.specialization}`.toLowerCase().includes(search.trim().toLowerCase()))
  const operation=typeof accountAction==='string'?accountAction.split(':')[0]:''
  const target=typeof accountAction==='string'?people.find(person=>person.id===accountAction.slice(accountAction.indexOf(':')+1)):null
  const editing=accountAction==='add'?'new':operation==='edit'?target:null
  const confirm=target&&['suspended','active','removed'].includes(operation)?{person:target,next:operation}:null
  const setEditing=person=>setAccountAction(person==='new'?'add':person?`edit:${person.id}`:null)
  const setConfirm=()=>setAccountAction(null)
  const changeStatus = (person, next) => setAccountAction(`${next}:${person.id}`)
  const actions = (person,place='card') => (person.loads.length>0 || directory.managed && writable) && <CoursewareActions label={`Instructor actions for ${person.name}`} disabled={Boolean(action.busy)} open={accountMenu===`${place}:${person.id}`} onOpenChange={next=>setAccountMenu((typeof next==='function'?next(accountMenu===`${place}:${person.id}`):next)?`${place}:${person.id}`:null)} actions={[...person.loads.map(load=>({label:`View ${load.code} syllabus and contents`,icon:BookOpen,onSelect:()=>setInspect(load.key)})),...(directory.managed&&writable?[
    {label:'Edit instructor',icon:Pencil,onSelect:()=>setEditing(person)},
    person.status==='suspended'?{label:'Reactivate instructor',icon:Play,onSelect:()=>changeStatus(person,'active')}:{label:'Suspend instructor',icon:Pause,onSelect:()=>changeStatus(person,'suspended')},
    ...(person.status==='suspended'?[{label:'Remove instructor',icon:Trash2,onSelect:()=>changeStatus(person,'removed')}]:[])
  ]:[])]}/>
  return <>

    <DeanCards items={[
      { label: 'Instructors', value: people.filter(p => p.status === 'active').length, icon: GraduationCap, tone: 'purple', onClick: () => setStatus('active') },
      { label: 'With master’s degree', value: people.filter(p => p.has_masters).length, icon: Award, tone: 'green', onClick: () => setStatus('masters') },
      { label: 'With course loads', value: people.filter(p => p.loads.length).length, icon: ClipboardCheck, tone: 'sky', to: '/records?tab=loads&show=loaded' },
      { label: 'Suspended', value: people.filter(p => p.status === 'suspended').length, icon: UserX, tone: 'red', onClick: () => setStatus('suspended') }]} />
    <DeanFeedback action={action} />
    {!directory.managed && writable && <p className="text-sm text-muted mb-16">{data.directoryError || 'Preview sample. Account changes need a signed-in Dean account.'}</p>}
    <div className="dean-toolbar">
      <label className="academic-filter">Search instructors<input className="form-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, email or specialization" /></label>
      <label className="academic-filter">Show<select className="form-select" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All instructors</option><option value="active">Active</option><option value="masters">With master’s degree</option><option value="suspended">Suspended</option></select></label>
      <div className="academic-actions"><CsvButton headers={['Name', 'Email', 'Employee ID', 'Master’s degree', 'Highest degree', 'Specialization', 'Course loads', 'Status']} rows={shown.map(p => [p.name, p.email, p.employee_id, p.has_masters === null ? 'Not recorded' : p.has_masters ? 'Yes' : 'No', p.degree, p.specialization, p.loads.length, p.status])} name="instructors" />
        {directory.managed && writable && <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><UserPlus size={15} aria-hidden="true" /> Add instructor</button>}</div>
    </div>
    <Table label="Instructor accounts and course loads" headers={['Instructor','Qualifications','Specialization','Status','Course loads','Syllabi','Last sign-in','Actions']} rows={shown.map(person=>[
      <div key={`name:${person.id}`}><strong>{person.name}</strong><div className="text-sm text-muted">{person.email||'Email not recorded'}</div></div>,<div key={`degree:${person.id}`}>{degreeLabel(person)}<div className="text-sm text-muted">Employee ID: {person.employee_id||'Not recorded'}</div></div>,person.specialization||'Not recorded',person.historical?'Historical teaching record':<StatusBadge key={person.id} status={person.status}/>,
      person.loads.length?<RecordPopover key={`loads:${person.id}`} buttonLabel={`${person.loads.length} course load${person.loads.length===1?'':'s'}`} viewKey={`instructor-loads:${term}:${person.id}`} label={`View course loads for ${person.name}`} title={`Course loads - ${person.name}`}><Table label={`Course loads of ${person.name}`} headers={['Course','Title','Blocks','Units','Hours / week','Students']} rows={person.loads.map(load=>[load.code,load.title,load.blocks.join(', ')||'Not added',load.units||'Not recorded',load.computedHours||'Not recorded',load.sections.reduce((sum,section)=>sum+section.students.length,0)])}/></RecordPopover>:'No course loads',
      person.syllabi.length?<RecordPopover key={`syllabi:${person.id}`} buttonLabel={`${person.syllabi.length} ${person.syllabi.length===1?'syllabus':'syllabi'}`} viewKey={`instructor-syllabi:${term}:${person.id}`} label={`View syllabi for ${person.name}`} title={`Syllabi - ${person.name}`}><ActivityTable scores={scores} headers={['Course','Syllabus status','Released items','Assessment attempts','Material opens']} rows={person.syllabi.map(course=>{const activity=model.activity(new Set([course.id]));return [course.course_code,SYLLABUS_STATUS_META[syllabusState(course)]?.label||syllabusState(course),activity.publications,activity.submissions,activity.opens]})}/></RecordPopover>:0,
      person.historical?'Not applicable':signIn(person.last_sign_in_at),actions(person,'row')
    ])} empty={people.length?'No instructor matches this view.':'No instructor accounts yet. Add an instructor to begin course loading.'}/>
    {inspect&&(loads.some(load=>load.key===inspect)?<DeanCourseInspection key={inspect} load={loads.find(load=>load.key===inspect)} students={directory.students} action={action} manage={directory.managed&&writable} onClose={()=>setInspect(null)}/>:<DeanDialog title="Course load unavailable" size="narrow" onClose={()=>setInspect(null)}><Empty>This course is no longer assigned to the instructor.</Empty></DeanDialog>)}
    {directory.managed&&writable&&accountAction&&accountAction!=='add'&&!target&&<DeanDialog title="Instructor unavailable" size="narrow" onClose={()=>setAccountAction(null)}><Empty>This instructor is no longer available. Choose a current instructor.</Empty></DeanDialog>}
    {writable && editing && <DeanAccountDialog role="instructor" account={editing === 'new' ? null : editing} action={action} onClose={() => setEditing(null)} />}
    {writable && confirm && <ConfirmDialog title={confirm.next === 'suspended' ? 'Suspend instructor' : confirm.next === 'active' ? 'Reactivate instructor' : 'Remove instructor'} confirmLabel={confirm.next === 'suspended' ? 'Suspend' : confirm.next === 'active' ? 'Reactivate' : 'Remove account'} danger={confirm.next !== 'active'} busy={action.busy}
      onClose={() => setConfirm(null)} onConfirm={async () => {
        const name = confirm.person.name
        if (await action.run(confirm.next === 'suspended' ? 'Suspending' : confirm.next === 'active' ? 'Reactivating' : 'Removing', { action: 'account.status', id: confirm.person.id, status: confirm.next }, () => ({ text: confirm.next === 'suspended' ? `${name} is suspended and signed out.` : confirm.next === 'active' ? `${name} can sign in again.` : `${name} was removed and their course loads were released.` }))) { setConfirm(null);  }
      }}>
      {confirm.next === 'suspended' && <p><strong>{confirm.person.name}</strong> is signed out and cannot sign in until reactivated. Course loads, syllabi and records stay in place.</p>}
      {confirm.next === 'active' && <p><strong>{confirm.person.name}</strong> can sign in again with their existing password.</p>}
      {confirm.next === 'removed' && <><p>Remove <strong>{confirm.person.name}</strong>? Their sign-in access is revoked and their {confirm.person.loads.length} course load{confirm.person.loads.length === 1 ? '' : 's'} are released for reassignment.</p><p className="text-sm text-muted">Published materials and recorded student activity stay in the records. Adding the same email again restores the account.</p></>}
    </ConfirmDialog>}
  </>
}
