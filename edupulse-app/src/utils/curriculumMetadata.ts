import {CURRICULUM_COURSES} from '../data/curriculum'

export const curriculumKey=(code:string)=>code.toUpperCase().replace(/\s|-/g,'').replace(/AD$/,'').replace(/^WMAD3031$/,'WMAD303')
export const curriculumCourse=(code:string)=>CURRICULUM_COURSES.find(c=>curriculumKey(c.code)===curriculumKey(code))
export function curriculumLabel(code:string){
 const course=curriculumCourse(code)
 return course?`${course.units} ${course.units===1?'unit':'units'} · Year ${course.yearLevel} · ${course.semester==='summer'?'Summer':`${course.semester===1?'1st':'2nd'} Semester`}`:'Curriculum units not recorded'
}
