import {useSearchParams} from 'react-router-dom'
import {useMemo,useLayoutEffect,useRef} from 'react'
import {BookOpen,Users,ChevronRight,X} from 'lucide-react'
import {useAuth} from '../../context/AuthContext'
import {useWorkspace} from '../../context/WorkspaceContext'
import {useToast} from '../../context/ToastContext'
import ModalLayer from '../ui/ModalLayer'
import StudentDirectoryPicker from '../syllabus/StudentDirectoryPicker'
import BlockSectionUploader from '../syllabus/BlockSectionUploader'
import {registerCourseStudents} from '../../utils/courseRoster'
import {KPIs,Empty} from './AcademicUI'
import {monitoringCohorts,cohortRecords,yearLabel} from './monitoringModel'
import MonitoringRoster from './MonitoringRoster'
import MonitoringAnalytics from './MonitoringAnalytics'
import './monitoring.css'

const tabs=[['students','Students'],['assessments','Assessment Scores'],['materials','Learning Material Access']]
export default function InstructorMonitoring({data}){
 const {user}=useAuth(),workspace=useWorkspace(),{addToast}=useToast(),[params,setParams]=useSearchParams()
 const cohorts=useMemo(()=>monitoringCohorts(data,workspace,user.id),[data,workspace,user.id])
 const query=params.get('q')||'',year=params.get('year')||'',course=params.get('filter-course')||''
 const filtered=cohorts.filter(c=>(!year||c.year===year)&&(!course||c.course.id===course)&&`${c.course.course_code} ${c.course.course_title} ${c.block} ${c.members.map(m=>m.student.Name).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
 const years=[...new Set(filtered.map(c=>c.year))].sort((a,b)=>a.localeCompare(b))
 const selected=cohorts.find(c=>c.course.id===params.get('course')&&c.block===params.get('block'))
 const body=useRef(null)
 const tab=tabs.some(([key])=>key===params.get('tab'))?params.get('tab'):'students'
 useLayoutEffect(()=>{if(body.current)body.current.scrollTop=0},[tab,selected?.id])
 const setFilter=(key,value)=>setParams(previous=>{const next=new URLSearchParams(previous);if(value)next.set(key,value);else next.delete(key);return next})
 const open=c=>setParams(previous=>{const next=new URLSearchParams(previous);next.set('course',c.course.id);next.set('block',c.block);if(!next.has('tab'))next.set('tab','students');return next})
 const close=()=>setParams(previous=>{const next=new URLSearchParams(previous);for(const key of ['course','block','tab'])next.delete(key);return next})
 const count=new Set(cohorts.flatMap(c=>c.members.map(m=>m.student.Email||m.student.StudentID||m.student.Name))).size
 const register=async input=>{if(workspace.loading||workspace.saving||workspace.conflict||workspace.error)throw new Error('Wait for the workspace save and resolve any conflict first.');await workspace.commit(current=>registerCourseStudents(current,input,user.id));addToast('Course roster saved','success')}
 return <section className="instructor-monitoring" aria-label="Instructor student monitoring">
  <KPIs items={[["Students handled",count],['Authorized courses',data.courses.filter(c=>String(c.instructor_id)===String(user.id)).length],['Course blocks',cohorts.length],['Suspended memberships',cohorts.reduce((n,c)=>n+c.members.filter(m=>m.suspended).length,0)]]}/>
  <div className="academic-filters monitoring-hub-filters"><label className="academic-filter monitoring-search">Search handled classes<input type="search" className="form-input" value={query} maxLength={200} onChange={e=>setFilter('q',e.target.value)} placeholder="Course, block section or student"/></label><label className="academic-filter">Year level<select className="form-input" value={year} onChange={e=>setFilter('year',e.target.value)}><option value="">All handled year levels</option>{[...new Set(cohorts.map(c=>c.year))].sort().map(y=><option key={y} value={y}>{yearLabel(y)}</option>)}</select></label><label className="academic-filter">Handled course<select className="form-input" value={course} onChange={e=>setFilter('filter-course',e.target.value)}><option value="">All handled courses</option>{data.courses.filter(c=>cohorts.some(g=>g.course.id===c.id)).map(c=><option key={c.id} value={c.id}>{c.course_code} · {c.course_title}</option>)}</select></label></div>
  {years.length?years.map(y=><section className="monitoring-year" key={y} aria-label={yearLabel(y)}><div className="monitoring-year-heading"><h2>{yearLabel(y)}</h2><span>{filtered.filter(c=>c.year===y).length} {filtered.filter(c=>c.year===y).length===1?'course block':'course blocks'}</span></div><div className="monitoring-course-grid">{filtered.filter(c=>c.year===y).map(c=><button className="monitoring-course-card" key={c.id} onClick={()=>open(c)} aria-label={`Open ${c.course.course_code} · ${c.block}`}><span className="monitoring-course-icon"><BookOpen size={22}/></span><span className="monitoring-course-copy"><strong>{c.course.course_code}</strong><span>{c.course.course_title}</span><span className="monitoring-block"><Users size={14}/>{c.block||'Block not recorded'} · {c.members.length} {c.members.length===1?'student':'students'}</span></span><ChevronRight size={20}/></button>)}</div></section>):<Empty>No handled course blocks match these filters. Register a confirmed class list for one of your courses.</Empty>}
  <details className="academic-details"><summary>Register course students</summary><StudentDirectoryPicker onRegister={register}/><details className="academic-details"><summary>Import an EduSuite class list</summary><BlockSectionUploader onRegister={register} onCancel={()=>{}}/></details></details>
  {params.has('course')&&!selected&&<p role="status">This course block is no longer available in your current roster. <button className="btn btn-secondary btn-sm" onClick={close}>Return to handled classes</button></p>}
  {selected&&<ModalLayer className="overlay-backdrop monitoring-class-overlay" onDismiss={close} onClick={close}><section className="modal-content monitoring-course-modal" role="dialog" aria-modal="true" aria-label={`${selected.course.course_code} · ${selected.block} monitoring`} onClick={e=>e.stopPropagation()}><header className="monitoring-modal-header"><div><p className="text-sm text-muted">Student Monitoring · {yearLabel(selected.year)}</p><h2>{selected.course.course_code} <span>· {selected.block}</span></h2><p>{selected.course.course_title}</p></div><button className="btn btn-secondary" onClick={close}><X size={18}/> Back to handled classes</button></header><nav className="tabs academic-tabs monitoring-tabs" aria-label="Course block monitoring views">{tabs.map(([key,title])=><button key={key} className={`tab ${tab===key?'active':''}`} aria-pressed={tab===key} onClick={()=>setFilter('tab',key)}>{title}</button>)}</nav><div className="monitoring-modal-body" ref={body}>{tab==='students'?<MonitoringRoster key={selected.id} cohort={selected}/>:<MonitoringAnalytics key={`${selected.id}:${tab}`} data={cohortRecords(data,selected)} tab={tab} scope={selected.id}/>}</div></section></ModalLayer>}
 </section>
}
