import {useEffect,useRef,useState} from 'react'
import {useAuth} from '../../context/AuthContext'
import {useWorkspace,useWorkspaceViewState} from '../../context/WorkspaceContext'
import {useToast} from '../../context/ToastContext'
import {changeCourseMembership,updateCourseMember,registerCourseStudents} from '../../utils/courseRoster'
import StudentDirectoryPicker from '../syllabus/StudentDirectoryPicker'
import BlockSectionUploader from '../syllabus/BlockSectionUploader'
import ModalLayer from '../ui/ModalLayer'
import {Panel,KPIs,Table} from './AcademicUI'

export default function MonitoringRoster({cohort}){
 const {user}=useAuth(),workspace=useWorkspace(),{addToast}=useToast()
 const [query,setQuery]=useState(''),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [memberRef,setMemberRef]=useWorkspaceViewState(`monitoring-roster-member:${cohort.id}`,null),[action,setAction]=useWorkspaceViewState(`monitoring-roster-action:${cohort.id}`,null)
 const selected=cohort.members.find(m=>(m.student.Email||m.student.StudentID||m.student.Name)===memberRef)
 const [form,setForm]=useState({name:'',id:'',year:'',block:''})
 const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 const savedForm=selected?JSON.stringify({name:selected.student.Name,id:selected.student.StudentID||'',year:String(selected.year||''),block:selected.blockSection}):null
 useEffect(()=>{if(savedForm)setForm(JSON.parse(savedForm))},[memberRef,action,savedForm])
 const blocked=busy||workspace.loading||workspace.saving||!!workspace.conflict||!!workspace.error
 const close=()=>{if(!busy){setAction(null);setMemberRef(null);setError('')}}
 const open=(member,kind)=>{setMemberRef(member.student.Email||member.student.StudentID||member.student.Name);setAction(kind);setError('')}
 const confirm=async()=>{
  if(blocked||!selected)return
  setBusy(true);setError('')
  try{
   await workspace.commit(current=>{
    if(action==='remove')return changeCourseMembership(current,selected,user.id,null)
    if(action==='suspend'||action==='resume')return updateCourseMember(current,selected,{suspended:action==='suspend'},user.id)
    let next=updateCourseMember(current,selected,{displayName:form.name.trim(),studentRef:form.id.trim(),...(form.year?{yearLevel:Number(form.year)}:{})},user.id)
    if(form.block.trim().toUpperCase()!==selected.blockSection)next=changeCourseMembership(next,{...selected,student:{...selected.student,Name:form.name.trim(),StudentID:form.id.trim(),YearLevel:form.year}},user.id,form.block)
    return next
   })
   if(active.current){setAction(null);setMemberRef(null);addToast('Course roster saved','success')}
  }catch(failure){if(active.current)setError(failure.message)}finally{if(active.current)setBusy(false)}
 }
 const register=async input=>{if(blocked)throw new Error('Wait for the workspace save and resolve any conflict first.');if(input.courseCode!==cohort.course.course_code||input.blockSection!==cohort.block)throw new Error('Select students for this course and block.');await workspace.commit(current=>registerCourseStudents(current,input,user.id))}
 const rows=cohort.members.filter(m=>`${m.student.Name} ${m.student.StudentID} ${m.student.Email}`.toLowerCase().includes(query.toLowerCase()))
 const last=Math.max(0,Math.ceil(rows.length/25)-1),current=Math.min(page,last)
 return <>
  <KPIs items={[["Students in this block",cohort.members.length],['Active students',cohort.members.filter(m=>!m.suspended).length],['Suspended students',cohort.members.filter(m=>m.suspended).length],['Available places',Math.max(0,35-cohort.members.length)]]}/>
  <p className="text-sm text-muted mb-16">Manage this course membership. Suspend a student before removal. Student accounts, official directory profiles and recorded results are retained; editing changes this roster only.</p>
  <label className="academic-filter mb-16">Find enrolled student<input className="form-input" type="search" value={query} maxLength={200} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label>
  <Panel title="Students in this course block"><Table label="Enrolled students table" headers={['Student','Student number','Year level','Status','Actions']} rows={rows.slice(current*25,current*25+25).map(member=>[<span key="name"><strong>{member.student.Name}</strong><span className="text-sm text-muted monitoring-email">{member.student.Email||'Account email missing'}</span></span>,member.student.StudentID||'—',member.year?`Year ${member.year}`:'Not recorded',member.suspended?'Suspended':'Active',<div key="actions" className="monitoring-row-actions"><button className="btn btn-ghost btn-sm" disabled={blocked} onClick={()=>open(member,'edit')}>Edit {member.student.Name}</button><button className="btn btn-secondary btn-sm" disabled={blocked} onClick={()=>open(member,member.suspended?'resume':'suspend')}>{member.suspended?'Resume':'Suspend'} {member.student.Name}</button><button className="btn btn-ghost btn-sm" disabled={blocked||!member.suspended} title={!member.suspended?'Suspend this student first':'Remove this course membership'} onClick={()=>open(member,'remove')}>Remove {member.student.Name}</button></div>])} empty="No enrolled students match your search."/>
   {rows.length>25&&<div className="academic-actions mt-16"><button className="btn btn-secondary btn-sm" disabled={!current} onClick={()=>setPage(current-1)}>Previous students</button><span>Page {current+1} of {last+1}</span><button className="btn btn-secondary btn-sm" disabled={current===last} onClick={()=>setPage(current+1)}>Next students</button></div>}
  </Panel>
  <details className="academic-details"><summary>Add students to this block</summary><StudentDirectoryPicker onRegister={register} scope={{course:cohort.course.course_code,block:cohort.block}}/><details className="academic-details"><summary>Import an EduSuite class list</summary><BlockSectionUploader onRegister={register} onCancel={()=>{}}/></details></details>
  {selected&&action&&<ModalLayer onDismiss={close} onClick={close}><div className="modal-content" role="dialog" aria-modal="true" aria-label={`${action==='edit'?'Edit':action==='suspend'?'Suspend':action==='resume'?'Resume':'Remove'} student membership`} onClick={e=>e.stopPropagation()}><div className="modal-header"><h2>{action==='edit'?'Edit roster entry':`${action==='suspend'?'Suspend':action==='resume'?'Resume':'Remove'} student`}</h2><button className="modal-close" disabled={busy} aria-label="Close roster change" onClick={close}>×</button></div><p className="mb-16">{selected.student.Name} · {cohort.course.course_code} · {cohort.block}</p>
   {action==='edit'?<div className="grid-2"><label className="form-group">Roster name<input className="form-input" value={form.name} maxLength={200} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="form-group">Roster student number<input className="form-input" value={form.id} maxLength={80} onChange={e=>setForm({...form,id:e.target.value})}/></label><label className="form-group">Roster year level<select className="form-input" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}><option value="">Keep recorded year</option>{[1,2,3,4].map(year=><option key={year} value={year}>Year {year}</option>)}</select></label><label className="form-group">New block section<input className="form-input" value={form.block} maxLength={80} onChange={e=>setForm({...form,block:e.target.value})}/></label></div>:<p className="mb-16">{action==='suspend'?'Suspension stops new access to this course’s released materials and assessments. Recorded work remains. You can resume this membership.':action==='resume'?'Restore access under this course’s publication and release rules.':'Remove this suspended membership. The student account and recorded assessment/reading history remain.'}</p>}
   {error&&<p role="alert">{error}</p>}<div className="modal-actions"><button className="btn btn-ghost" disabled={busy} onClick={close}>Cancel</button><button className="btn btn-primary" disabled={blocked||(action==='edit'&&(!form.name.trim()||!form.block.trim()))||(action==='remove'&&!selected.suspended)} onClick={confirm}>{busy?'Saving…':action==='edit'?'Save roster changes':action==='remove'?'Confirm removal':action==='resume'?'Confirm resume':'Confirm suspension'}</button></div>
  </div></ModalLayer>}
 </>
}
