import { Spinner, LoadingStatus } from '../ui/LoadingFeedback'
import MeetingDaysPicker,{validMeetingDays} from './MeetingDaysPicker'
import {useEffect,useState} from 'react'
import {scheduleHours} from '../../utils/teachingLoad'
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
 const [details,setDetails]=useState({time:load?.time||'',days:load?.days||'',units:load?.units||course.units||'',lecture:load?.lecture||'',lab:load?.lab||'',hours:load?.hours||'',room:load?.room||'',students:load?.students||'',program:load?.program||''})
 const fields=[['time','Time'],['days','Day'],['units','Units'],['lecture','Lecture units'],['lab','Lab units'],['hours','Number of hours'],['room','Room'],['students','Student number (headcount, optional)'],['program','Program']]
 const numeric=['units','lecture','lab','hours','students']
 const computed=scheduleHours(details.time,details.days)
 const save=async()=>{
  if(fields.some(([key])=>key!=='students'&&!String(details[key]).trim())||numeric.some(key=>details[key]!==''&&(!Number.isFinite(Number(details[key]))||Number(details[key])<0))||Number(details.units)<=0||Number(details.hours)<=0||computed===null||!validMeetingDays(details.days)||details.students!==''&&!Number.isInteger(Number(details.students)))return setProblem('Complete the load details with valid days, a time range, positive units/hours and nonnegative lecture/lab units. Student headcount is optional and must be a whole number.')
  if(!people.some(person=>person.id===teacher&&person.status!=='suspended'))return setProblem('Choose an active instructor.')
  const scope={academic_year:academicYear,semester}
  const command=load?{action:'course-load.update',...scope,key:load.key,expected_instructor:load.instructorId,instructor_id:teacher}:{action:'course-load.assign',...scope,course_code:course.code,instructor_id:teacher,continuation}
  command.details={...details,computed_hours:computed};
  if(await action.run(load?'Updating course instructor':'Loading course',command,()=>({text:`${course.code} course load saved.`})))onClose()
 }
 return <DeanDialog title={load?`Edit ${course.code} instructor`:`Load ${course.code}`} subtitle={`${course.title} · ${semester} · AY ${academicYear}`} icon={GraduationCap} size="form" onClose={onClose} footer={<><button className="btn btn-secondary" disabled={Boolean(action.busy)} onClick={onClose}>Cancel</button><button aria-busy={Boolean(action.busy)} className="btn btn-primary" disabled={reading||Boolean(action.busy)||!people.length} onClick={save}>{Boolean(action.busy) && <Spinner />}{load?'Save instructor':'Load course'}</button></>}>
  <div className="dean-form dean-load-details">{reading && <LoadingStatus label="Reading teaching packages..." />}
   {(problem||action.error)&&<p role="alert" className="connected-pulse-warning">{problem||action.error}</p>}
   <label className="dean-field"><span>Instructor</span><select aria-label="Instructor" className="form-select" value={teacher} onChange={event=>setTeacher(event.target.value)}>{people.map(person=><option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
   {fields.map(([key,label])=>key==='days'?<MeetingDaysPicker key={key} label={label} value={details.days} onChange={value=>setDetails(previous=>({...previous,days:value}))}/>:<label key={key} className="dean-field"><span>{label}</span><input className="form-input" aria-label={label} type={numeric.includes(key)?'number':'text'} min={['units','hours'].includes(key)?'0.01':'0'} step={key==='students'?'1':'any'} maxLength={key==='time'?150:200} required={key!=='students'} value={details[key]} placeholder={key==='time'?'7:30 AM - 10:00 AM':key==='days'?'M/W/F':key==='program'?'BSIT':undefined} onChange={event=>setDetails(previous=>({...previous,[key]:event.target.value}))}/></label>)}
   {computed!==null&&<p className="text-sm text-muted">Computed schedule: {computed} hours per week.</p>}
   <p className="text-sm text-muted">The instructor adds the approved syllabus and confirms block sections through class-list uploads or individual student selection.</p>
   {load&&<p className="text-sm text-muted">Changing the instructor continues this course’s existing teaching contents and confirmed classes. Other instructors’ course copies stay separate.</p>}
   {!load&&choices.length>0&&<label className="dean-field"><span>Teaching package</span><select className="form-select" value={continuation} onChange={event=>setContinuation(event.target.value)}><option value="new">Start without an existing syllabus</option>{choices.map(choice=><option key={choice.key} value={choice.key}>Continue from {choice.instructor_name}</option>)}</select></label>}
  </div>
 </DeanDialog>
}
