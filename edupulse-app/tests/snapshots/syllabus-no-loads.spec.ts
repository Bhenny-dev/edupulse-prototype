import {test,expect} from './fixtures'
import {academicUI} from '../academic-ui-fixture'
import {mkdir} from 'node:fs/promises'
test('syllabus omits the course-load summary even when assigned loads exist',async({page})=>{
 await academicUI(page,async()=>({json:{courses:[],enrollments:[],publications:[],attempts:[],accesses:[],institutional:[{kind:'loads',record_key:'sample-load',data:{InstructorID:'fe67b9d2-719b-4b10-91cd-76031ab115fe',CourseCode:'IT 102',Block:'BSIT-1A',Semester:'1'}}],faculty:[],notices:[],events:[]}}))
 await page.goto('/#/syllabus?tab=mine')
 await expect(page.getByRole('heading',{name:'Syllabus',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Confirmed course loads',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'My Syllabus',exact:true})).toBeVisible()
 await mkdir('../feature-documentation/system-manual/02-syllabus-lifecycle',{recursive:true})
 await page.locator('#main-content').screenshot({path:'../feature-documentation/system-manual/02-syllabus-lifecycle/40-without-course-load-summary.png',animations:'disabled'})
})
