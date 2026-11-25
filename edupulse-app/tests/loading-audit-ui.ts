import {expect,type Page} from '@playwright/test'
import {baselineUI} from './baseline-fixture'
import {deanManagementUI} from './dean-management-fixture'
import {instructorCourseUI} from './instructor-course-fixture'

type Capture=(name:string)=>Promise<void>
const none:Capture=async()=>{}
function gate(){let release!:()=>void;const pending=new Promise<void>(r=>{release=r});return {pending,release}}
const failure={status:503,json:{error:{code:'TEMPORARY_UNAVAILABLE',message:'The service is unavailable. Try again.'}}}

export async function joinLoading(page:Page,capture:Capture=none){
 const fixture=await baselineUI(page,'student'),lookup=gate(),join=gate();let joins=0
 await page.route('**/api/ai?action=academic',async route=>{
  if(route.request().method()!=='POST')return route.fallback()
  const body=route.request().postDataJSON();if(body.operation!=='class-join')return route.fallback()
  if(body.action==='join'){joins++;await join.pending;return route.fulfill(failure)}
  await lookup.pending;return route.fulfill({json:{status:'joinable',course_open:true,course_id:fixture.records.courses[0].id,course_code:'IT 102',course_title:'Computer Programming 1',instructor_name:'Alex Reyes',block:'BSIT-1A',academic_year:'2026-2027',semester:'1st Semester'}})
 })
 await page.goto('/#/dashboard');await page.getByRole('button',{name:'Join Class',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Join Class',exact:true});await dialog.getByLabel('Class code',{exact:true}).fill('ABC2345')
 try{await dialog.getByRole('button',{name:'Find class',exact:true}).click();const button=dialog.getByRole('button',{name:'Finding class...'});await expect(button).toBeDisabled();await expect(button.locator('.loading-spinner')).toBeVisible();await capture('student-find')}finally{lookup.release()}
 await expect(dialog.getByRole('region',{name:'Class found'})).toBeVisible()
 try{await dialog.getByRole('button',{name:'Confirm Join Class'}).click();const button=dialog.getByRole('button',{name:'Joining class...'});await expect(button).toBeDisabled();await expect(button.locator('.loading-spinner')).toBeVisible();await capture('student-join')}finally{join.release()}
 await expect(dialog.getByRole('alert')).toContainText('unavailable');await expect(dialog.getByRole('button',{name:'Confirm Join Class'})).toBeEnabled();expect(joins).toBe(1)
 await page.reload();await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible();expect(joins).toBe(1)
}

export async function deanSaveLoading(page:Page,role='dean',capture:Capture=none){
 await deanManagementUI(page,role);const held=gate();let calls=0
 await page.route('**/api/ai?action=academic',async route=>{if(route.request().method()!=='POST'||route.request().postDataJSON().operation!=='dean')return route.fallback();calls++;await held.pending;return route.fulfill(failure)})
 await page.goto('/#/records');await page.getByRole('button',{name:'Add Course',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Add Course',exact:true});await dialog.getByLabel('Course code',{exact:true}).fill('IT 205');await dialog.getByLabel('Course title',{exact:true}).fill('Information Management');await dialog.getByLabel('Units',{exact:true}).fill('3')
 try{await dialog.getByRole('button',{name:'Add Course',exact:true}).click();const button=dialog.getByRole('button',{name:'Add Course',exact:true});await expect(button).toBeDisabled();await expect(button.locator('.loading-spinner')).toBeVisible();await page.emulateMedia({reducedMotion:'reduce'});expect(await button.locator('.loading-spinner').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');await capture(role+'-save')}finally{held.release()}
 await expect(dialog.getByRole('alert')).toContainText('unavailable');await expect(dialog.getByRole('button',{name:'Add Course',exact:true})).toBeEnabled();await expect(dialog.getByLabel('Course title',{exact:true})).toHaveValue('Information Management');expect(calls).toBe(1)
}

export async function announcementLoading(page:Page,capture:Capture=none){
 const fixture=await instructorCourseUI(page),held=gate();let calls=0
 await page.route('**/api/ai?action=academic',async route=>{if(route.request().method()!=='POST'||route.request().postDataJSON().operation!=='announcement')return route.fallback();calls++;await held.pending;return route.fulfill(failure)})
 await page.goto('/#/courseware?course='+fixture.syllabus.id);await page.getByRole('button',{name:'Announce something to your class',exact:true}).click()
 const form=page.getByRole('form',{name:'New announcement'});await form.getByLabel('Title',{exact:true}).fill('Weekly learning plan');await form.getByLabel('Announcement',{exact:true}).fill('Read the worked examples before our next meeting.')
 try{await form.getByRole('button',{name:'Post',exact:true}).click();const button=form.getByRole('button',{name:'Saving...'});await expect(button).toBeDisabled();await expect(button.locator('.loading-spinner')).toBeVisible();await capture('instructor-post')}finally{held.release()}
 await expect(form.getByRole('alert')).toContainText('unavailable');await expect(form.getByRole('button',{name:'Post',exact:true})).toBeEnabled();await expect(form.getByLabel('Title',{exact:true})).toHaveValue('Weekly learning plan');expect(calls).toBe(1)
}
