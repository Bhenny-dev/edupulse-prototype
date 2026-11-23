import StudentCoursePanels from './StudentCoursePanels'
import {useState} from 'react'
import {Link,useLocation,useSearchParams} from 'react-router-dom'
import {KPIs,Table} from './AcademicUI'
import StudentProgressBar from './StudentProgressBar'
import {courseProgress,recordsNow} from './studentProgress'
import {curriculumLabel} from '../../utils/curriculumMetadata'
import {loadTerm,CURRENT_LOAD_TERM} from '../../utils/loadTerms'

export function enrolledCourses(data){
 const courses=new Map((data.assignedCourses||[]).map(c=>[c.id,c]))
 for(const c of data.courses)courses.set(c.id,{...courses.get(c.id),...c})
 return [...courses.values()]
}
const courseLabel=course=>{
 const [,semester]=loadTerm(course.academic_year||CURRENT_LOAD_TERM.split('|')[0],course.semester||'').split('|')
 return [course.units&&`${course.units} units`,semester,course.academic_year&&`AY ${course.academic_year}`].filter(Boolean).join(' · ')||curriculumLabel(course.course_code)
}
export default function StudentCourses({data,onOpen,busy}){
 const [params,setParams]=useSearchParams(),[query,setQuery]=useState('')
 const {state}=useLocation()
 const courses=enrolledCourses(data),selected=courses.find(c=>c.id===params.get('course'))
 const change=id=>{const next=new URLSearchParams(params);next.delete('item');next.delete('publication');if(id)next.set('course',id);else next.delete('course');setParams(next)}
 const released=data.publications.filter(p=>p.active),materials=released.filter(p=>p.type!=='assessment'),assessments=released.filter(p=>p.type==='assessment')
 const scoped=selected?{...data,courses:[selected],assignedCourses:[],publications:released.filter(p=>p.course_id===selected.id)}:null
 const sectionLabel=course=>course.block_section||[...new Set(data.enrollments.filter(entry=>entry.course_id===course.id).map(entry=>entry.block_section).filter(Boolean))].join(', ')||'Not recorded'
 const now=recordsNow(data),selectedProgress=selected?courseProgress(data,selected.id,now):null
 return <>
  {!selected&&<KPIs items={[["Enrolled courses",courses.length],["Delivered materials",materials.length],["Delivered assessments",assessments.length],["Materials opened",new Set(data.accesses.filter(a=>materials.some(p=>p.id===a.publication_id)).map(a=>a.publication_id)).size]]}/>}
  {selected?<>
   <div className="academic-actions mb-24">
    <Link className="btn btn-secondary" to="/dashboard">Back to Home</Link>
    <button className="btn btn-ghost" onClick={()=>change(null)}>Back to My Courses</button>
   </div>
   {state?.joinNotice&&<p role="status">{state.joinNotice}</p>}
   <section className="card mb-24"><div className="card-body"><h2>{selected.course_code} — {selected.course_title}</h2><p>Instructor: {selected.instructor_name||'Instructor not recorded'}</p><p className="text-sm text-muted">{courseLabel(selected)} · {sectionLabel(selected)}</p>{selectedProgress.total>0&&<StudentProgressBar value={selectedProgress.done} total={selectedProgress.total} label={`${selected.course_code} items done`} text={selectedProgress.label}/>}</div></section>
   {(!selected.active||selected.suspended)&&<p role="status" className="mb-16">
    {selected.suspended?'This class membership is suspended.':'Course assigned. Materials become available after syllabus approval and instructor release.'}
   </p>}
   <StudentCoursePanels key={selected.id} course={selected} data={scoped} onOpen={onOpen} busy={busy}/>
  </>:<>
   {params.has('course')&&<p role="alert">This class is unavailable in the selected term or is no longer assigned to your account.</p>}
   <label className="academic-filter mb-24">Search enrolled courses<input className="form-input" type="search" placeholder="Course or instructor" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   {data.homeBlock&&<p className="text-sm text-muted mb-16">Home block: <strong>{data.homeBlock.code}</strong> - Year {data.homeBlock.year_level} - {data.homeBlock.program}. Course sections are listed below.</p>}
   <Table label="Enrolled courses" headers={['Course','Title','Instructor','Section','Term / units','Progress','Delivery']} rows={courses.filter(c=>`${c.course_code} ${c.course_title} ${c.instructor_name||''}`.toLowerCase().includes(query.toLowerCase())).map(c=>{
    const items=released.filter(p=>p.course_id===c.id),progress=courseProgress(data,c.id,now)
    return [<button key={c.id} className="btn btn-ghost btn-sm" onClick={()=>change(c.id)} aria-label={`Open course ${c.course_code}`}>{c.course_code}</button>,c.course_title,c.instructor_name||'Instructor not recorded',sectionLabel(c),courseLabel(c),!c.suspended&&progress.total>0?<StudentProgressBar key={c.id} value={progress.done} total={progress.total} label={`${c.course_code} items done`} text={progress.label}/>:c.suspended?'Membership suspended':'No released work',items.length?`${items.length} delivered items`:'Awaiting instructor release']
   })} empty={courses.length?'No enrolled courses match this search.':'No instructor-confirmed enrollments yet.'}/>
  </>}
 </>
}
