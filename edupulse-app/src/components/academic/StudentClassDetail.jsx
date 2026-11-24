import StudentCoursePanels from './StudentCoursePanels'
import {useLocation} from 'react-router-dom'
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
export function StudentClassDetail({ selected, data, onOpen, busy }) {
 const {state}=useLocation()
 const scoped={...data,courses:[selected],assignedCourses:[],publications:data.publications.filter(item=>item.active&&item.course_id===selected.id)}
 const progress=courseProgress(data,selected.id,recordsNow(data))
 return <>
   {state?.joinNotice&&<p role="status">{state.joinNotice}</p>}
   {progress.total>0&&<StudentProgressBar value={progress.done} total={progress.total} label={selected.course_code+' items done'} text={progress.label}/>}
   {(!selected.active||selected.suspended)&&<p role="status" className="mb-16">
     {selected.suspended?'This class membership is suspended.':'Course assigned. Materials become available after syllabus approval and instructor release.'}
   </p>}
   <StudentCoursePanels key={selected.id} course={selected} data={scoped} onOpen={onOpen} busy={busy}/>
 </>
}
export function studentClassSubtitle(course,data){
 const blocks=course.block_section||[...new Set(data.enrollments.filter(entry=>entry.course_id===course.id).map(entry=>entry.block_section).filter(Boolean))].join(', ')
 return [course.instructor_name||'Instructor not recorded',courseLabel(course),blocks].filter(Boolean).join(' · ')
}
