import {useEffect,useState} from 'react'
import {GraduationCap} from 'lucide-react'
import {aiRequest} from '../../lib/aiClient'
import {DeanDialog} from './DeanCommon'

/** A management load grants a course, never a block or a list of students. */
export default function DeanCourseAssignment({course,load,instructors,academicYear,semester,action,onClose}){
 const people=instructors.filter(person=>person.status!=='suspended'||person.id===load?.instructorId)
 const [teacher,setTeacher]=useState(load?.instructorId||people[0]?.id||''),[continuation,setContinuation]=useState('new'),[choices,setChoices]=useState([]),[reading,setReading]=useState(!load),[problem,setProblem]=useState('')
 useEffect(()=>{
  if(load)return
  const abort=new AbortController();setReading(true)
  aiRequest('academic','POST',{operation:'dean',command:{action:'course-load.continuations',course_code:course.code,academic_year:academicYear,semester}},abort.signal).then(result=>{if(!abort.signal.aborted){setChoices(result.continuations||[]);if(result.continuations?.length===1)setContinuation(result.continuations[0].key)}}).catch(error=>{if(!abort.signal.aborted)setProblem(error.message)}).finally(()=>{if(!abort.signal.aborted)setReading(false)})
  return()=>abort.abort()
 },[load,course.code,academicYear,semester])
 const save=async()=>{
  if(!people.some(person=>person.id===teacher&&person.status!=='suspended'))return setProblem('Choose an active instructor.')
  const scope={academic_year:academicYear,semester}
  const command=load?{action:'course-load.update',...scope,key:load.key,expected_instructor:load.instructorId,instructor_id:teacher}:{action:'course-load.assign',...scope,course_code:course.code,instructor_id:teacher,continuation}
  if(await action.run(load?'Updating course instructor':'Loading course',command,()=>({text:`${course.code} course load saved.`})))onClose()
 }
 return <DeanDialog title={load?`Edit ${course.code} instructor`:`Load ${course.code}`} subtitle={`${course.title} · ${semester} · AY ${academicYear}`} icon={GraduationCap} size="form" onClose={onClose} footer={<><button className="btn btn-secondary" disabled={Boolean(action.busy)} onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={reading||Boolean(action.busy)||!people.length} onClick={save}>{load?'Save instructor':'Load course'}</button></>}>
  <div className="dean-form">
   {(problem||action.error)&&<p role="alert" className="connected-pulse-warning">{problem||action.error}</p>}
   <label className="dean-field"><span>Instructor</span><select aria-label="Instructor" className="form-select" value={teacher} onChange={event=>setTeacher(event.target.value)}>{people.map(person=><option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
   <p className="text-sm text-muted">The instructor adds the approved syllabus and confirms block sections through class-list uploads or individual student selection.</p>
   {load&&<p className="text-sm text-muted">Changing the instructor continues this course’s existing teaching contents and confirmed classes. Other instructors’ course copies stay separate.</p>}
   {!load&&choices.length>0&&<label className="dean-field"><span>Teaching package</span><select className="form-select" value={continuation} onChange={event=>setContinuation(event.target.value)}><option value="new">Start without an existing syllabus</option>{choices.map(choice=><option key={choice.key} value={choice.key}>Continue from {choice.instructor_name}</option>)}</select></label>}
  </div>
 </DeanDialog>
}
