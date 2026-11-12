import { test,expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { directoryFixture,DIRECTORY_PROGRAM,DIRECTORY_DEPARTMENT } from '../student-directory-fixture'
import { academicUI } from '../academic-ui-fixture'
const DIR='../feature-documentation/system-manual/16-student-directory'
test('student directory selection and confirmed roster save',async({page})=>{
 await mkdir(DIR,{recursive:true});await directoryFixture(page)
 await page.goto('/#/student-monitoring?tab=students');await page.getByText('Register course students',{exact:true}).click();await page.getByRole('button',{name:'Choose students',exact:true}).click()
 const directory=page.getByRole('region',{name:'Official student directory'})
 await directory.getByLabel('Department',{exact:true}).selectOption(DIRECTORY_DEPARTMENT)
 await directory.getByLabel('Program',{exact:true}).selectOption(DIRECTORY_PROGRAM)
 await directory.getByLabel('Search students',{exact:true}).fill('Riley')
 await expect(directory.getByRole('status').filter({ hasText: /matching students/ })).toContainText('1 matching students')
 await directory.screenshot({path:`${DIR}/01-directory-filters.png`,animations:'disabled'})
 await directory.getByLabel('Select Riley Demo',{exact:true}).check()
 await directory.getByLabel('Course for selected students',{exact:true}).selectOption('IT 102')
 await directory.getByLabel('Block section',{exact:true}).fill('BSIT-1A')
 await directory.screenshot({path:`${DIR}/02-student-selection.png`,animations:'disabled'})
 await directory.getByRole('button',{name:'Register selected students (1)',exact:true}).click()
 await expect(directory).toContainText('Students registered and saved')
 await page.reload();await page.getByRole('button',{name:'Open IT 102 · BSIT-1A',exact:true}).click();await expect(page.getByRole('region',{name:'Enrolled students table'})).toBeVisible()
 await page.getByRole('region',{name:'Enrolled students table'}).scrollIntoViewIfNeeded()
 await page.screenshot({path:`${DIR}/03-saved-roster.png`,animations:'disabled'})
})
test('student account shows its imported profile fields',async({page})=>{
 await mkdir(DIR,{recursive:true})
 await academicUI(page,async()=>({json:{courses:[],publications:[],enrollments:[],attempts:[],accesses:[]}}),'student',{full_name:'Riley Demo',student_number:'SAMPLE-001',year_level:1,department:DIRECTORY_DEPARTMENT,program:DIRECTORY_PROGRAM})
 await page.goto('/#/settings?tab=account');await expect(page.getByLabel('Student number',{exact:true})).toHaveValue('SAMPLE-001')
 await page.screenshot({path:`${DIR}/04-student-profile.png`,animations:'disabled'})
})
