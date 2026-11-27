import { DEFAULT_SYLLABI, INSTRUCTORS, STUDENT_RECORDS, BLOCK_SECTIONS, CURRICULUM_COURSES } from '../../data/mockData'
import { CURRENT_TERM } from '../../utils/teachingLoad'

// Preview-only samples never enter the signed-in projection or produce saved activity.
export function deanPreview() {
  const courses=DEFAULT_SYLLABI.map(s=>({id:String(s.id),course_code:s.courseCode,course_title:s.courseTitle,instructor_id:String(s.instructorId),instructor_name:INSTRUCTORS.find(i=>i.id===s.instructorId)?.name,active:s.status==='active',syllabus_status:s.status,outline:s.courseOutline||[],block_info:BLOCK_SECTIONS.map(b=>({block:b.code,yearLevel:b.yearLevel}))}))
  const loads = courses.filter(course => course.instructor_name).map(course => ({
    kind: 'loads', record_key: `sample:${course.id}`, data: {
      CourseCode: course.course_code, CourseTitle: course.course_title, LoadType: 'course',
      InstructorID: course.instructor_id, InstructorName: course.instructor_name,
      Semester: CURRENT_TERM.semester, AcademicYear: CURRENT_TERM.academicYear,
    },
  }))
  return {courses,enrollments:STUDENT_RECORDS.flatMap(student=>student.courses.flatMap(course=>courses.filter(c=>c.course_code===course.code).map(c=>({course_id:c.id,student_email:student.email,display_name:student.name,student_ref:student.id,block_section:student.section})))),faculty:INSTRUCTORS.map(i=>({id:String(i.id),name:i.name,email:i.email})),institutional:[...CURRICULUM_COURSES.map(c=>({kind:'courses',record_key:c.code,data:{CourseCode:c.code,CourseTitle:c.title}})), ...loads],publications:[],attempts:[],accesses:[],events:[],notices:[]}
}
