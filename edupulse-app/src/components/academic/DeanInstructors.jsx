import { useMemo, useState } from 'react'
import { GraduationCap, Award, ClipboardCheck, UserX, UserPlus, Pencil, Pause, Play, Trash2 } from 'lucide-react'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { Empty, CsvButton } from './AcademicUI'
import { deanRecords, deanDirectory, loadRows, syllabusState, assignedInstructorSyllabi } from './deanRecordModel'
import { SYLLABUS_STATUS_META } from '../../data/syllabusStatus'
import GlassIcon from '../ui/GlassIcon'
import { useAuth } from '../../context/AuthContext'
import { DeanCards, DeanDialog, ActivityTable, DeanFeedback, ConfirmDialog, StatusBadge } from './DeanCommon'
import { useDeanAction } from './deanActions'
import DeanAccountDialog from './DeanAccountDialog'
import CoursewareActions from '../courseware/CoursewareActions'
import {useSearchParams} from 'react-router-dom'
import LoadTermFilter from './LoadTermFilter'
import TeachingLoadFacts from './TeachingLoadFacts'
import {CURRENT_LOAD_TERM,recordsForLoadTerm} from '../../utils/loadTerms'

const degreeLabel = person => person.has_masters === true ? (person.degree || 'Master’s degree') : person.has_masters === false ? (person.degree || 'No master’s degree') : 'Degree not recorded'
const signIn = value => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'

export default function DeanInstructors({ data:allData }) {
  const [params]=useSearchParams()
  const data=useMemo(()=>recordsForLoadTerm(allData,params.get('term')||CURRENT_LOAD_TERM),[allData,params])
  const { user } = useAuth(), scores = user?.role !== 'associate_dean'
  const model = useMemo(() => deanRecords(data), [data])
  const directory = useMemo(() => deanDirectory(data, model), [data, model])
  const loads = useMemo(() => loadRows(data), [data])
  const [detail, setDetail] = useWorkspaceViewState('dean-detail:instructors', null)
  const [search, setSearch] = useState(''), [status, setStatus] = useState('all')
  const [accountAction,setAccountAction]=useWorkspaceViewState('dean-instructor-action',null)
  const [accountMenu,setAccountMenu]=useWorkspaceViewState('dean-instructor-menu',null)
  const action = useDeanAction()
  const people = directory.instructors.map(person => ({ ...person, loads: loads.filter(load => load.instructorId === person.id), syllabi: assignedInstructorSyllabi(data,person.id) }))
  const shown = people.filter(person => (status === 'all' || person.status === status || (status === 'masters' && person.has_masters)) && `${person.name} ${person.email} ${person.specialization}`.toLowerCase().includes(search.trim().toLowerCase()))
  const selected = typeof detail === 'string' && detail.startsWith('instructor:') ? people.find(person => person.id === detail.slice(11)) : null
  const operation=typeof accountAction==='string'?accountAction.split(':')[0]:''
  const target=typeof accountAction==='string'?people.find(person=>person.id===accountAction.slice(accountAction.indexOf(':')+1)):null
  const editing=accountAction==='add'?'new':operation==='edit'?target:null
  const confirm=target&&['suspended','active','removed'].includes(operation)?{person:target,next:operation}:null
  const setEditing=person=>setAccountAction(person==='new'?'add':person?`edit:${person.id}`:null)
  const setConfirm=()=>setAccountAction(null)
  const changeStatus = (person, next) => setAccountAction(`${next}:${person.id}`)
  const actions = (person,place='card') => directory.managed && <CoursewareActions label={`Instructor actions for ${person.name}`} disabled={Boolean(action.busy)} open={accountMenu===`${place}:${person.id}`} onOpenChange={next=>setAccountMenu((typeof next==='function'?next(accountMenu===`${place}:${person.id}`):next)?`${place}:${person.id}`:null)} actions={[
    {label:'Edit instructor',icon:Pencil,onSelect:()=>setEditing(person)},
    person.status==='suspended'?{label:'Reactivate instructor',icon:Play,onSelect:()=>changeStatus(person,'active')}:{label:'Suspend instructor',icon:Pause,onSelect:()=>changeStatus(person,'suspended')},
    ...(person.status==='suspended'?[{label:'Remove instructor',icon:Trash2,onSelect:()=>changeStatus(person,'removed')}]:[])
  ]}/>
  return <>
    <LoadTermFilter data={allData}/>
    <DeanCards items={[
      { label: 'Instructors', value: people.filter(p => p.status === 'active').length, icon: GraduationCap, tone: 'purple', onClick: () => setStatus('active') },
      { label: 'With master’s degree', value: people.filter(p => p.has_masters).length, icon: Award, tone: 'green', onClick: () => setStatus('masters') },
      { label: 'With course loads', value: people.filter(p => p.loads.length).length, icon: ClipboardCheck, tone: 'sky', to: '/records?tab=loads&show=loaded' },
      { label: 'Suspended', value: people.filter(p => p.status === 'suspended').length, icon: UserX, tone: 'red', onClick: () => setStatus('suspended') }]} />
    <DeanFeedback action={action} />
    {!directory.managed && <p className="text-sm text-muted mb-16">{data.directoryError || 'Preview sample. Account changes need a signed-in Dean account.'}</p>}
    <div className="dean-toolbar">
      <label className="academic-filter">Search instructors<input className="form-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, email or specialization" /></label>
      <label className="academic-filter">Show<select className="form-select" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All instructors</option><option value="active">Active</option><option value="masters">With master’s degree</option><option value="suspended">Suspended</option></select></label>
      <div className="academic-actions"><CsvButton headers={['Name', 'Email', 'Employee ID', 'Master’s degree', 'Highest degree', 'Specialization', 'Course loads', 'Status']} rows={shown.map(p => [p.name, p.email, p.employee_id, p.has_masters === null ? 'Not recorded' : p.has_masters ? 'Yes' : 'No', p.degree, p.specialization, p.loads.length, p.status])} name="instructors" />
        {directory.managed && <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><UserPlus size={15} aria-hidden="true" /> Add instructor</button>}</div>
    </div>
    <div className="academic-card-grid">{shown.map(person => <article className={`card dean-record-card dean-person-card has-actions${person.status === 'suspended' ? ' is-suspended' : ''}`} key={person.id}>
      <button className="dean-card-main" onClick={() => setDetail(`instructor:${person.id}`)} aria-label={`View instructor ${person.name}`}>
        <GlassIcon icon={GraduationCap} color={person.status === 'suspended' ? 'var(--gray-400)' : 'var(--purple-500)'} />
        <span className="dean-card-text"><strong>{person.name}</strong><span>{person.email || 'Email not recorded'}</span></span>
      </button>
      <div className="dean-card-tags"><span className={`dean-tag ${person.has_masters ? 'dean-tag-new' : 'dean-tag-unchanged'}`}>{degreeLabel(person)}</span>{person.specialization && <span className="dean-tag">{person.specialization}</span>}<StatusBadge status={person.status} /></div>
      <span>{person.loads.length} class load{person.loads.length === 1 ? '' : 's'} · {new Set(person.loads.map(l => l.code)).size} course{new Set(person.loads.map(l => l.code)).size === 1 ? '' : 's'} · {person.syllabi.length} syllab{person.syllabi.length === 1 ? 'us' : 'i'}</span>
      <div className="dean-person-actions">{actions(person)}</div>
    </article>)}</div>
    {!shown.length && <Empty>{people.length ? 'No instructor matches this view.' : 'No instructor accounts yet. Add an instructor to begin course loading.'}</Empty>}
    {selected && <DeanDialog title={selected.name} subtitle={`${selected.email || 'Email not recorded'} · ${selected.status === 'suspended' ? 'Suspended' : 'Active'}`} icon={GraduationCap} tone="purple" label={`Instructor ${selected.name}`} onClose={() => setDetail(null)}
      footer={<div className="academic-actions">{actions(selected,'dialog')}<button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button></div>}>
      <dl className="dean-facts">
        <div><dt>Master’s degree</dt><dd>{selected.has_masters === null ? 'Not recorded' : selected.has_masters ? 'Yes' : 'No'}</dd></div>
        <div><dt>Highest degree</dt><dd>{selected.degree || 'Not recorded'}</dd></div>
        <div><dt>Specialization</dt><dd>{selected.specialization || 'Not recorded'}</dd></div>
        <div><dt>Employee ID</dt><dd>{selected.employee_id || 'Not recorded'}</dd></div>
        <div><dt>Last sign-in</dt><dd>{signIn(selected.last_sign_in_at)}</dd></div>
      </dl>
      <h3 className="dean-subhead">Course loads</h3>
      <DeanCards items={[{label:'Class loads',value:selected.loads.length,icon:ClipboardCheck},{label:'Units loaded',value:selected.loads.reduce((n,l)=>n+(Number(l.units)||0),0),icon:Award},{label:'Computed hours / week',value:selected.loads.reduce((n,l)=>n+(Number(l.computedHours)||0),0),icon:GraduationCap}]}/>
      <ActivityTable scores={scores} headers={['Course', 'Block', 'Term','Schedule and source details']} rows={selected.loads.map(load => [load.code, load.block, [load.semester,load.academicYear].filter(Boolean).join(' · ') || '—',<TeachingLoadFacts key={load.key} load={load}/>])} empty="No course load assigned for this term. Load courses on the Course page." />
      <h3 className="dean-subhead">Syllabi and delivery</h3>
      <ActivityTable scores={scores} headers={['Course', 'Syllabus status', 'Released items', 'Assessment attempts', 'Material opens']} rows={selected.syllabi.map(course => { const activity = model.activity(new Set([course.id])); return [course.course_code, SYLLABUS_STATUS_META[syllabusState(course)]?.label || syllabusState(course), activity.publications, activity.submissions, activity.opens] })} empty={selected.loads.length?'No syllabus added to the assigned courses yet.':'No course load assigned for this term.'} />
    </DeanDialog>}
    {typeof detail === 'string' && detail.startsWith('instructor:') && !selected && <DeanDialog title="Record unavailable" size="narrow" onClose={() => setDetail(null)}><Empty>This instructor is no longer in your records. Close this dialog and choose a current instructor.</Empty></DeanDialog>}
    {directory.managed&&accountAction&&accountAction!=='add'&&!target&&<DeanDialog title="Instructor unavailable" size="narrow" onClose={()=>setAccountAction(null)}><Empty>This instructor is no longer available. Choose a current instructor.</Empty></DeanDialog>}
    {editing && <DeanAccountDialog role="instructor" account={editing === 'new' ? null : editing} action={action} onClose={() => setEditing(null)} />}
    {confirm && <ConfirmDialog title={confirm.next === 'suspended' ? 'Suspend instructor' : confirm.next === 'active' ? 'Reactivate instructor' : 'Remove instructor'} confirmLabel={confirm.next === 'suspended' ? 'Suspend' : confirm.next === 'active' ? 'Reactivate' : 'Remove account'} danger={confirm.next !== 'active'} busy={action.busy}
      onClose={() => setConfirm(null)} onConfirm={async () => {
        const name = confirm.person.name
        if (await action.run(confirm.next === 'suspended' ? 'Suspending' : confirm.next === 'active' ? 'Reactivating' : 'Removing', { action: 'account.status', id: confirm.person.id, status: confirm.next }, () => ({ text: confirm.next === 'suspended' ? `${name} is suspended and signed out.` : confirm.next === 'active' ? `${name} can sign in again.` : `${name} was removed and their course loads were released.` }))) { setConfirm(null); if (confirm.next === 'removed') setDetail(null) }
      }}>
      {confirm.next === 'suspended' && <p><strong>{confirm.person.name}</strong> is signed out and cannot sign in until reactivated. Course loads, syllabi and records stay in place.</p>}
      {confirm.next === 'active' && <p><strong>{confirm.person.name}</strong> can sign in again with their existing password.</p>}
      {confirm.next === 'removed' && <><p>Remove <strong>{confirm.person.name}</strong>? Their sign-in access is revoked and their {confirm.person.loads.length} course load{confirm.person.loads.length === 1 ? '' : 's'} are released for reassignment.</p><p className="text-sm text-muted">Published materials and recorded student activity stay in the records. Adding the same email again restores the account.</p></>}
    </ConfirmDialog>}
  </>
}
