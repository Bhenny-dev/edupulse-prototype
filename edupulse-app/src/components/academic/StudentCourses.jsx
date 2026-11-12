import {useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import {BookOpen,ChevronRight} from 'lucide-react'
import {KPIs,Empty} from './AcademicUI'
import AcademicLibrary from './AcademicLibrary'
import {curriculumLabel} from '../../utils/curriculumMetadata'

export function enrolledCourses(data){
 const courses=new Map((data.assignedCourses||[]).map(c=>[c.id,c]))
 for(const c of data.courses)courses.set(c.id,{...courses.get(c.id),...c})
 return [...courses.values()]
}
export default function StudentCourses({data,onOpen,busy}){
 const [params,setParams]=useSearchParams(),[query,setQuery]=useState('')
 const courses=enrolledCourses(data),selected=courses.find(c=>c.id===params.get('course'))
 const change=id=>{const next=new URLSearchParams(params);if(id)next.set('course',id);else next.delete('course');setParams(next)}
 const released=data.publications.filter(p=>p.active),materials=released.filter(p=>p.type!=='assessment'),assessments=released.filter(p=>p.type==='assessment')
 const scoped=selected?{...data,courses:[selected],assignedCourses:[],publications:released.filter(p=>p.course_id===selected.id)}:null
 return <>
  <KPIs items={[["Enrolled courses",courses.length],["Delivered materials",materials.length],["Delivered assessments",assessments.length],["Materials opened",new Set(data.accesses.filter(a=>materials.some(p=>p.id===a.publication_id)).map(a=>a.publication_id)).size]]}/>
  {selected?<>
   <button className="btn btn-secondary mb-24" onClick={()=>change(null)}>Back to My Courses</button>
   <section className="card mb-24"><div className="card-body"><h2>{selected.course_code} — {selected.course_title}</h2><p>Instructor: {selected.instructor_name||'Instructor not recorded'}</p><p className="text-sm text-muted">{curriculumLabel(selected.course_code)} · {selected.block_section||'Assigned class'}</p></div></section>
   <AcademicLibrary data={scoped} onOpen={onOpen} busy={busy}/>
   <AcademicLibrary data={scoped} assessments onOpen={onOpen} busy={busy}/>
  </>:<>
   <label className="academic-filter mb-24">Search enrolled courses<input className="form-input" type="search" placeholder="Course or instructor" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <div className="monitoring-course-grid">{courses.filter(c=>`${c.course_code} ${c.course_title} ${c.instructor_name||''}`.toLowerCase().includes(query.toLowerCase())).map(c=>{
    const items=released.filter(p=>p.course_id===c.id)
    return <button className="monitoring-course-card" key={c.id} onClick={()=>change(c.id)} aria-label={`Open course ${c.course_code}`}><span className="monitoring-course-icon"><BookOpen size={24}/></span><span className="monitoring-course-copy"><strong>{c.course_code}</strong><span>{c.course_title}</span><span>Instructor: {c.instructor_name||'Instructor not recorded'}</span><span className="text-sm text-muted">{curriculumLabel(c.course_code)}</span><span>{c.suspended?'Membership suspended':items.length?`${items.length} delivered items`:'Awaiting instructor release'}</span></span><ChevronRight size={20}/></button>
   })}</div>
   {!courses.length&&<Empty>No instructor-confirmed enrollments yet.</Empty>}
  </>}
 </>
}
