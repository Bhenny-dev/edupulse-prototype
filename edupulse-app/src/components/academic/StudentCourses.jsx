import {useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import ClassCard,{ClassCardGrid} from '../ui/ClassCard'
import {toneFor} from '../ui/classTone'
import {KPIs,Empty,useAcademicTabs} from './AcademicUI'
import AcademicLibrary from './AcademicLibrary'
import StudentProgressBar from './StudentProgressBar'
import {courseProgress,recordsNow} from './studentProgress'
import {curriculumLabel} from '../../utils/curriculumMetadata'

export function enrolledCourses(data){
 const courses=new Map((data.assignedCourses||[]).map(c=>[c.id,c]))
 for(const c of data.courses)courses.set(c.id,{...courses.get(c.id),...c})
 return [...courses.values()]
}
const courseLabel=c=>[c.units?`${c.units} units`:'',c.semester,c.academic_year?`AY ${c.academic_year}`:''].filter(Boolean).join(' · ')||curriculumLabel(c.course_code)
export default function StudentCourses({data,onOpen,busy}){
 const [params,setParams]=useSearchParams(),[query,setQuery]=useState('')
 const {key:contentType,nav:contentTabs}=useAcademicTabs({items:[['all','All'],['materials','Teaching Materials'],['assessments','Assessments']],label:'Course content views',parameter:'content'})
 const courses=enrolledCourses(data),selected=courses.find(c=>c.id===params.get('course'))
 const change=id=>{const next=new URLSearchParams(params);if(id)next.set('course',id);else next.delete('course');setParams(next)}
 const released=data.publications.filter(p=>p.active),materials=released.filter(p=>p.type!=='assessment'),assessments=released.filter(p=>p.type==='assessment')
 const scoped=selected?{...data,courses:[selected],assignedCourses:[],publications:released.filter(p=>p.course_id===selected.id)}:null
 const now=recordsNow(data),selectedProgress=selected?courseProgress(data,selected.id,now):null
 return <>
  <KPIs items={[["Enrolled courses",courses.length],["Delivered materials",materials.length],["Delivered assessments",assessments.length],["Materials opened",new Set(data.accesses.filter(a=>materials.some(p=>p.id===a.publication_id)).map(a=>a.publication_id)).size]]}/>
  {selected?<>
   <button className="btn btn-secondary mb-24" onClick={()=>change(null)}>Back to My Courses</button>
   {/* Classroom class banner for the open course. */}
   <section className={`page-header class-banner class-tone-${toneFor(selected.course_code)}`}><div style={{flex:1,minWidth:0}}><h2>{selected.course_code} — {selected.course_title}</h2><p>Instructor: {selected.instructor_name||'Instructor not recorded'}</p><p>{courseLabel(selected)} · {selected.block_section||'Assigned class'}</p>{selectedProgress.total>0&&<StudentProgressBar value={selectedProgress.done} total={selectedProgress.total} label={`${selected.course_code} items done`} text={selectedProgress.label}/>}</div></section>
   {contentTabs}
   <AcademicLibrary data={scoped} all={contentType==='all'} assessments={contentType==='assessments'} progress onOpen={onOpen} busy={busy}/>
  </>:<>
   <label className="academic-filter mb-24">Search enrolled courses<input className="form-input" type="search" placeholder="Course or instructor" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   {/* Classroom Home cards: course and instructor on the banner, the next due items below. */}
   <ClassCardGrid>{courses.filter(c=>`${c.course_code} ${c.course_title} ${c.instructor_name||''}`.toLowerCase().includes(query.toLowerCase())).map(c=>{
    const items=released.filter(p=>p.course_id===c.id),progress=courseProgress(data,c.id,now)
    const due=items.filter(p=>p.due_at&&new Date(p.due_at).getTime()>=now).sort((a,b)=>a.due_at.localeCompare(b.due_at)).map(p=>({key:p.id,label:p.title,detail:`Due ${new Date(p.due_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`}))
    return <ClassCard className="monitoring-course-card" key={c.id} onClick={()=>change(c.id)} label={`Open course ${c.course_code}`} code={c.course_code} title={c.course_title}
     subtitle={`${c.instructor_name||'Instructor not recorded'} · ${curriculumLabel(c.course_code)}`} items={c.suspended?[]:due} emptyItems={c.suspended?'Membership suspended':items.length?'No work due soon.':'Awaiting instructor release'}
     meta={<span>{items.length} delivered items</span>}>{!c.suspended&&progress.total>0&&<StudentProgressBar value={progress.done} total={progress.total} label={`${c.course_code} items done`} text={progress.label}/>}</ClassCard>
   })}</ClassCardGrid>
   {!courses.length&&<Empty>No instructor-confirmed enrollments yet.</Empty>}
  </>}
 </>
}
