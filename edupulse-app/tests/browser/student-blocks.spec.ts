import {test,expect} from '@playwright/test'
import {deanManagementUI} from '../dean-management-fixture'
import {academicUI} from '../academic-ui-fixture'

for(const role of ['dean','associate_dean'])test(`${role} sees department home blocks before courses are assigned`,async({page},info)=>{
 const fixture=await deanManagementUI(page,role)
 fixture.records.courses=[];fixture.records.enrollments=[];fixture.records.publications=[];fixture.records.attempts=[];fixture.records.accesses=[]
 fixture.records.directory.students.push({id:'business-student',student_number:'2027-1-0099',name:'Business Student',surname:'Student',first_name:'Business',middle_name:'',email:'business@example.invalid',year_level:1,department:'Business',program:'Bachelor of Science in Accountancy',status:'active',block:'BSA-1A',type:'Regular'})
 await page.goto('/#/students')
 await page.getByRole('combobox',{name:'Department',exact:true}).selectOption('Business')
 await expect(page.getByRole('region',{name:'Student list',exact:true})).toContainText('Business Student')
 await expect(page.getByRole('region',{name:'Student list',exact:true})).toContainText('2027-1-0099')
 await expect(page.getByRole('region',{name:'Student list',exact:true})).toContainText('Year 1')
 await page.getByRole('button',{name:'Blocks / Sections',exact:true}).first().click()
 const block=page.getByRole('button',{name:'View block BSA-1A',exact:true})
 await expect(block).toContainText('1 registered student');await expect(block).toContainText('0 course offerings')
 await block.scrollIntoViewIfNeeded()
 await page.screenshot({path:info.outputPath('department-home-blocks.png'),animations:'disabled'})
 await block.click();await page.reload()
 await expect(page.getByRole('combobox',{name:'Department',exact:true})).toHaveValue('Business')
 await expect(page.getByRole('dialog',{name:'Block BSA-1A',exact:true})).toContainText('Business Student')
 expect(fixture.commands).toHaveLength(0)
})

test('a student dashboard shows its recorded home block without a course enrollment',async({page})=>{
 await academicUI(page,async()=>({json:{courses:[],publications:[],enrollments:[],attempts:[],accesses:[],homeBlock:{code:'BSA-1A',year_level:1,students:35,department:'Business',program:'Bachelor of Science in Accountancy'}}}),'student')
 await page.goto('/#/dashboard')
 const section=page.locator('.card').filter({has:page.getByRole('heading',{name:'My Block',exact:true})})
 await expect(section).toContainText('BSA-1A');await expect(section).toContainText('Year 1');await expect(section).toContainText('35')
})
