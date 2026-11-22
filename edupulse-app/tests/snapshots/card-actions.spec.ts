import {test,expect} from './fixtures'
import {deanManagementUI} from '../dean-management-fixture'

for(const role of ['dean','associate_dean'])test(`${role} catalog and instructor card menus`,async({page})=>{
 await deanManagementUI(page,role)
 await page.goto('/#/records')
 await expect(page.getByRole('button',{name:'Add Course',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Add Course',exact:true}).click()
 const form=page.getByRole('dialog',{name:'Add Course',exact:true})
 await expect(form.getByRole('textbox')).toHaveCount(2)
 await expect(form.getByRole('spinbutton')).toHaveCount(1)
 await expect(form.getByRole('combobox')).toHaveCount(0)
 await form.getByRole('button',{name:'Cancel',exact:true}).click()
 await page.getByRole('button',{name:'Course actions for IT 102 Alex Sample Instructor',exact:true}).click()
 await expect(page.getByRole('menuitem',{name:'Edit course',exact:true})).toBeVisible()
 await expect(page.getByRole('menuitem',{name:'Remove course',exact:true})).toHaveCount(0)
 await page.screenshot({path:`../feature-documentation/system-manual/46-course-load-workspace/${role}-course-actions.png`,animations:'disabled'})
 await page.keyboard.press('Escape')
 await page.goto('/#/instructors')
 await page.getByRole('button',{name:'Instructor actions for Alex Sample Instructor',exact:true}).click()
 await expect(page.getByRole('menuitem',{name:'Suspend instructor',exact:true})).toBeVisible()
 await page.screenshot({path:`../feature-documentation/system-manual/46-course-load-workspace/${role}-instructor-actions.png`,animations:'disabled'})
 await page.keyboard.press('Escape')
 await expect(page.getByRole('region',{name:'Instructor accounts and course loads',exact:true})).toBeVisible()
 const detail=page.getByRole('region',{name:'Instructor accounts and course loads',exact:true})
 await detail.getByRole('button',{name:'Instructor actions for Alex Sample Instructor',exact:true}).click()
 await page.reload()
 await expect(page.getByRole('menuitem').first()).toBeFocused()
 await page.screenshot({path:`../feature-documentation/system-manual/46-course-load-workspace/${role}-instructor-dialog-actions.png`,animations:'disabled'})
})

for(const role of ['dean','associate_dean'])test(`${role} home blocks before course loading`,async({page})=>{
 const fixture=await deanManagementUI(page,role)
 fixture.records.courses=[];fixture.records.enrollments=[];fixture.records.publications=[]
 fixture.records.directory.students.push({id:'home-business',student_number:'2027-1-0099',name:'Business Example',surname:'Example',first_name:'Business',middle_name:'',email:'business@example.invalid',year_level:1,department:'Business',program:'Bachelor of Science in Accountancy',status:'active',block:'BSA-1A',type:'Regular'})
 await page.goto('/#/students?department=Business')
 await expect(page.getByRole('button',{name:'Filter students in BSA-1A',exact:true})).toContainText('1 registered student')
 await page.screenshot({path:`../feature-documentation/system-manual/16-student-directory/${role}-home-blocks.png`,animations:'disabled'})
})

test('instructor load and syllabus columns open popovers',async({page})=>{
 await deanManagementUI(page);await page.goto('/#/instructors');const row=page.getByRole('row').filter({has:page.getByText('Alex Sample Instructor',{exact:true})}).first();await expect(row.locator('details')).toHaveCount(0);await row.getByRole('button',{name:'View course loads for Alex Sample Instructor',exact:true}).click();await expect(page.getByRole('dialog',{name:'Course loads - Alex Sample Instructor',exact:true})).toBeVisible()
})
