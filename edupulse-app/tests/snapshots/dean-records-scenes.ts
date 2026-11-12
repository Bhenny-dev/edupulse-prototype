import {readFile,writeFile} from 'node:fs/promises'
import type {Page} from '@playwright/test'
import {expect} from './fixtures'
import {deanRecordsUI} from '../dean-records-fixture'
const folder='../feature-documentation/system-manual/36-dean-activity-records'
export async function deanRecordScenes(page:Page,mobile=false){
 const fixture=await deanRecordsUI(page),prefix=mobile?'mobile-':''
 const shot=async(name:string,dialog=false)=>{if(process.env.SNAPSHOT_SCENES&&!new RegExp(process.env.SNAPSHOT_SCENES).test(name))return;await page.mouse.move(2,2);await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('.academic-loading')).toHaveCount(0);await (dialog?page.getByRole('dialog'):page).screenshot({path:`${folder}/${prefix}${name}.png`,animations:'disabled',fullPage:!dialog&&name!=='01-navigation'});const alias=!mobile&&({'02-course-records':'08-course-records','12-syllabi':'10-course-syllabi'} as Record<string,string>)[name];if(alias){await writeFile(`../feature-documentation/system-walkthrough/03-dean-and-associate-dean/${alias}.png`,await readFile(`${folder}/${name}.png`));const file='../feature-documentation/system-walkthrough/capture-manifest.json',manifest=JSON.parse(await readFile(file,'utf8')),entries=Array.isArray(manifest)?manifest:manifest.scenes,entry=entries.find((e:any)=>e.folder==='03-dean-and-associate-dean'&&e.file===alias+'.png');if(entry)Object.assign(entry,{role:'Dean',route:name==='02-course-records'?'/records?tab=courses':'/records?tab=syllabi',ok:true});await writeFile(file,JSON.stringify(manifest,null,2)+'\n')}}
 await page.goto('/#/dashboard');await expect(page.getByRole('link',{name:'Released Courses',exact:true})).toHaveAttribute('aria-description','3');await page.waitForTimeout(900)
 if(mobile){await page.getByRole('button',{name:'Open menu',exact:true}).click();await shot('01-navigation');await page.getByRole('button',{name:'Close menu',exact:true}).click()}else await shot('01-dashboard')
 await page.getByRole('link',{name:'Released Courses',exact:true}).click();await expect(page.getByRole('heading',{name:'Course records',exact:true})).toBeVisible();await shot('02-course-records')
 await page.getByRole('button',{name:'Course loads',exact:true}).click();await expect(page.getByRole('heading',{name:'Course loads',exact:true})).toBeVisible();await shot('03-course-loads')
 await page.getByRole('button',{name:'Student class lists',exact:true}).click();await shot('04-student-class-lists')
 await page.getByRole('button',{name:'Syllabi',exact:true}).click();await shot('12-syllabi')
 await page.getByRole('button',{name:'View outline',exact:true}).first().click();await shot('13-syllabus-outline',true);await page.keyboard.press('Escape')
 await page.goto('/#/instructors');await expect(page.getByRole('button',{name:'View instructor Alex Sample Instructor',exact:true})).toBeVisible();await shot('05-instructors')
 await page.getByRole('button',{name:'View instructor Alex Sample Instructor',exact:true}).click();await shot('06-instructor-detail',true);await page.keyboard.press('Escape')
 await page.getByRole('button',{name:'Instructors',exact:true}).click();await shot('14-all-instructors',true);await page.keyboard.press('Escape')
 await page.goto('/#/students');await expect(page.getByRole('heading',{name:'Year 1',exact:true})).toBeVisible();await shot('07-students-by-year')
 await page.getByRole('button',{name:'View block BSIT-1A',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('2 registered students');await shot('08-block-students',true)
 fixture.calls.length=0;await page.reload();await expect(page.getByRole('dialog',{name:'Block BSIT-1A',exact:true})).toBeVisible();await shot('09-reloaded-block',true)
 expect(fixture.calls.every(call=>call.method==='GET')).toBe(true)
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Registered students',exact:true}).click();await shot('10-all-students',true);await page.keyboard.press('Escape')
 await page.getByRole('button',{name:'Blocks / Sections',exact:true}).click();await shot('15-all-blocks',true);await page.keyboard.press('Escape')
 await page.getByRole('button',{name:'Recorded year levels',exact:true}).click();await shot('16-year-levels',true);await page.keyboard.press('Escape')
 await page.evaluate(()=>localStorage.setItem('edupulse-dark-mode','true'));await page.reload();await expect(page.locator('html')).toHaveClass(/dark-mode/);await expect(page.getByRole('button',{name:'View block BSIT-1A',exact:true})).toBeVisible();await shot('11-dark-blocks')
 await page.getByRole('button',{name:'View block BSIT-1A',exact:true}).click();fixture.records.enrollments=[];await page.reload();await expect(page.getByRole('dialog',{name:'Record unavailable',exact:true})).toBeVisible();await shot('17-record-unavailable',true)
}
