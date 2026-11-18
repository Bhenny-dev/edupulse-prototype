import{expect,type Page}from'@playwright/test'
import{deanManagementUI}from'./dean-management-fixture'

export async function historicalLoadsScene(page:Page,role:string,capture:(name:string)=>Promise<void>){
 const fixture=await deanManagementUI(page,role)
 const add=(id:string,name:string,degree:string)=>{
  fixture.records.institutional!.push({kind:'loads',record_key:`past:${id}`,data:{LoadType:'course',Block:'',CourseCode:'QA PAST',InstructorID:id,InstructorName:name,Email:`${id}@example.invalid`,Semester:'2nd Semester',AcademicYear:'2025-2026',SourceFile:'approved-past.pdf',HighestDegree:degree,HasMasters:degree==='Masters'?'Yes':'No',AllocationSource:'approved-historical-teaching-load',SourceRows:[{page:1,row:1,subject_code:'QA PAST-2',source_title:'Historical course',degree,time:'7:30 - 10:30',days:'M',units:3,hours:3,computed_hours:3,students:60}] as any,SourceForms:[{page:1,units:6,computedUnits:3,hours:3,computedHours:3}] as any}})
 }
 fixture.records.institutional!.push({kind:'course_terms',record_key:'past-course',data:{CourseCode:'QA PAST',CourseTitle:'Historical course',Units:'3',AcademicYear:'2025-2026',Semester:'2nd Semester',Status:'active'}})
 add('teacher-a','Alex Sample Instructor','Bachelor');add('archive-only','Archived Teacher','Masters');add('manager-id','Past Teaching Manager','Bachelor')
 await page.goto('/#/instructors')
 await expect(page.getByText('Master in Information Technology',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'View instructor Archived Teacher',exact:true})).toHaveCount(0)
 await page.getByLabel('Academic term',{exact:true}).selectOption('2025-2026|2nd Semester')
 await expect(page.getByRole('button',{name:/View instructor /})).toHaveCount(3)
 await expect(page.getByRole('button',{name:'Add instructor',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:/Instructor actions for/})).toHaveCount(0)
 await page.getByRole('button',{name:'View instructor Alex Sample Instructor',exact:true}).click()
 const modal=page.getByRole('dialog',{name:'Instructor Alex Sample Instructor',exact:true})
 await expect(modal).toContainText('Historical teaching record');await expect(modal.locator('dl').first().getByText('Bachelor',{exact:true})).toBeVisible()
 await expect(modal.locator('.kpi-card').filter({hasText:'Units loaded'})).toContainText('3')
 await expect(modal.locator('.kpi-card').filter({hasText:'Computed hours / week'})).toContainText('3')
 await modal.getByText('1 retained source schedule row',{exact:true}).click()
 await expect(modal).toContainText('approved-past.pdf');await expect(modal).toContainText('Students listed');await expect(modal).toContainText('60')
 await expect(modal).toContainText('printed units total differs')
 expect(await modal.locator('.teaching-load-source').evaluate(el=>el.clientWidth<=window.innerWidth-80)).toBe(true)
 await capture('historical-instructor')
 await page.reload();await expect(modal).toContainText('Bachelor')
 await page.keyboard.press('Escape')
 await page.goto('/#/records');await expect(page.getByRole('button',{name:/^QA PAST Historical course,/})).toBeVisible()
 await expect(page.getByRole('button',{name:'Add Course',exact:true})).toHaveCount(0)
 await page.getByLabel('Academic term',{exact:true}).selectOption('2026-2027|1st Semester')
 await page.goto('/#/instructors');await expect(page.getByText('Master in Information Technology',{exact:true})).toBeVisible()
 expect(fixture.commands).toHaveLength(0)
}
