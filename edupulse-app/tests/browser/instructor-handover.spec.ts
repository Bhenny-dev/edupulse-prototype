import {test,expect,type Locator} from '@playwright/test'
import {deanManagementUI} from '../dean-management-fixture'

// A management load grants a whole course (e3b3f481); blocks come from class lists, so the Load dialog has no block choice.
const fillLoad=async(modal:Locator)=>{for(const [name,value]of Object.entries({'Time':'7:30 AM - 10:00 AM','Units':'3','Lecture units':'2','Lab units':'1','Number of hours':'2.5','Room':'A310','Program':'BSIT'}))await modal.getByLabel(name,{exact:true}).fill(value);await modal.getByText('Choose days',{exact:true}).click();await modal.getByRole('checkbox',{name:'Friday F',exact:true}).check()}

for(const role of ['dean','associate_dean'])test(`${role} instructor details follow loads through assignment, removal and reload`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 const fixture=await deanManagementUI(page,role)
 fixture.records.institutional=fixture.records.institutional!.filter(r=>r.kind!=='loads')
 // The Instructors page lists each instructor's current course loads in its table row.
 const teacherRow=async()=>{
  await page.goto('/#/instructors')
  const table=page.getByRole('region',{name:'Instructor accounts and course loads',exact:true})
  await expect(table).toBeVisible()
  return table.getByRole('row').filter({hasText:'Alex Sample Instructor'})
 }
 const empty=await teacherRow()
 await expect(empty).toContainText('No course loads');await expect(empty).not.toContainText('IT 102')
 await page.reload()
 await expect((await teacherRow())).toContainText('No course loads')
 expect(fixture.commands).toHaveLength(0)

 await page.goto('/#/records')
 await page.getByRole('button',{name:'Course actions for IT 102',exact:true}).click();await page.getByRole('menuitem',{name:'Add instructor',exact:true}).click()
 const assign=page.getByRole('dialog',{name:'Load IT 102',exact:true})
 await assign.getByLabel('Instructor',{exact:true}).selectOption('teacher-a');await fillLoad(assign)
 await assign.getByRole('button',{name:'Load course',exact:true}).click()
 await expect(assign).toHaveCount(0)
 expect(fixture.commands[0]).toMatchObject({action:'course-load.assign',course_code:'IT 102',instructor_id:'teacher-a'})

 const loaded=await teacherRow()
 await expect(loaded).toContainText('IT 102');await expect(loaded).not.toContainText('IT 301');await expect(loaded).not.toContainText('No course loads')

 await page.goto('/#/records')
 await page.getByRole('button',{name:'Course actions for IT 102 Alex Sample Instructor',exact:true}).click();await page.getByRole('menuitem',{name:'Remove instructor load',exact:true}).click()
 const removal=page.getByRole('dialog',{name:'Remove course load',exact:true})
 await expect(removal).toContainText('retained for the replacement instructor')
 await removal.getByRole('button',{name:'Remove load',exact:true}).click()
 await expect(removal).toHaveCount(0)
 expect(fixture.commands[1]).toMatchObject({action:'course-load.remove',expected_instructor:'teacher-a'})

 const removed=await teacherRow()
 await expect(removed).toContainText('No course loads')
 await page.reload();await expect((await teacherRow())).toContainText('No course loads')
 expect(fixture.commands).toHaveLength(2)
})
