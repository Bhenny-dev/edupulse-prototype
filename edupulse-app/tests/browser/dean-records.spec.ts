import {test,expect} from '@playwright/test'
import {deanRecordsUI} from '../dean-records-fixture'
import {readFile} from 'node:fs/promises'

test('Dean navigation and dashboard summaries open matching read-only record views',async({page})=>{
 await deanRecordsUI(page);await page.goto('/#/dashboard')
 const mobile=page.viewportSize()!.width<800
 if(mobile)await page.getByRole('button',{name:'Open menu',exact:true}).click()
 for(const label of ['Dashboard','Course','Instructors','Students'])await expect(page.getByRole('link',{name:label,exact:true}).first()).toBeVisible()
 if(mobile)await page.getByRole('button',{name:'Close menu',exact:true}).click()
 for(const [label,url] of [['Released Courses','/records?tab=courses'],['Courses Loaded','/records?tab=loads'],['Approved Syllabi','/records?tab=syllabi&status=approved'],['Not Yet Routed for Approval','/records?tab=syllabi&status=not-routed']]){
  const card=page.getByRole('link',{name:label,exact:true});await expect(card).toHaveAttribute('href',`#${url}`)
 }
 await page.getByRole('link',{name:'Approved Syllabi',exact:true}).click()
 await expect(page.getByRole('combobox',{name:'Syllabus status',exact:true})).toHaveValue('approved')
 for(const title of ['Course records','Course loads','Student class lists','Syllabi']){
  await page.getByRole('button',{name:title,exact:true}).click()
  await expect(page.locator('input[type=file]')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Templates',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'History',exact:true})).toHaveCount(0)
  await expect(page.locator('.kpi-card .kpi-icon')).toHaveCount(4)
 }
})

test('Program Coordinator retains the existing shared import workflow and cannot open Dean-only pages',async({page})=>{
 await deanRecordsUI(page,'associate_dean');await page.goto('/#/records')
 await expect(page.getByLabel('Choose CSV for preview')).toBeVisible()
 await page.goto('/#/students');await expect(page).toHaveURL(/dashboard/)
 await page.goto('/#/instructors');await expect(page).toHaveURL(/dashboard/)
})
test('year groups, complete downloadable block membership, reload and withdrawn access remain consistent',async({page})=>{
 const fixture=await deanRecordsUI(page)
 fixture.records.enrollments.find(row=>row.student_ref==='SYN-002')!.display_name='=Sample learner'
 await page.goto('/#/students')
 for(const year of ['Year 1','Year 2','Year level not recorded'])await expect(page.getByRole('heading',{name:year,exact:true})).toBeVisible()
 await page.getByRole('button',{name:'View block BSIT-1A',exact:true}).click()
 const modal=page.getByRole('dialog',{name:'Block BSIT-1A',exact:true})
 await expect(modal).toContainText('2 registered students')
 await expect(modal.locator('table')).toHaveCSS('display','table')
 await expect(modal.locator('thead')).toHaveCSS('display','table-header-group')
 await expect(modal.getByRole('cell',{name:'Riley Example',exact:true})).toHaveCSS('display','table-cell')
 await expect(modal.getByRole('row').filter({hasText:'Riley Example'})).toHaveCount(1)
 const download=page.waitForEvent('download');await modal.getByRole('button',{name:'Download CSV',exact:true}).click()
 const file=await download;const csv=await readFile((await file.path())!,'utf8')
 expect(csv).toContain('Riley Example');expect(csv).toContain("'=Sample learner");expect(csv).not.toContain('Taylor Example')
 fixture.calls.length=0;await page.reload();await expect(modal).toBeVisible()
 expect(fixture.calls.every(call=>call.method==='GET')).toBe(true)
 fixture.records.enrollments=[];await page.reload()
 await expect(page.getByRole('dialog',{name:'Record unavailable',exact:true})).toBeVisible()
 await expect(page.getByText('Riley Example',{exact:true})).toHaveCount(0)
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.reload();await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('legacy Dean links resolve to the new hubs while Program Coordinator imports remain separate',async({page})=>{
 await deanRecordsUI(page)
 await page.goto('/#/course-loading?tab=instructors');await expect(page).toHaveURL(/#\/instructors$/)
 await page.getByRole('button',{name:'View instructor Alex Sample Instructor',exact:true}).click()
 await page.reload();await expect(page.getByRole('dialog',{name:'Instructor Alex Sample Instructor',exact:true})).toBeVisible()
 await page.keyboard.press('Escape')
 await page.goto('/#/records?tab=sections');await expect(page).toHaveURL(/#\/students$/)
 await page.goto('/#/performance');await expect(page.getByRole('heading',{name:'Performance',exact:true})).toBeVisible()
})

test('Dean record totals keep their values without test suffixes',async({page})=>{
 const fixture=await deanRecordsUI(page);await page.goto('/#/records');await expect(page.getByRole('heading',{name:'Course records',exact:true})).toBeVisible();await expect(page.locator('.academic-portal')).not.toContainText(/pipeline test|\d+ test/i);expect(fixture.records.attempts.some(a=>a.is_test)).toBe(true)
 await page.goto('/#/instructors');await expect(page.getByRole('button',{name:'View instructor Alex Sample Instructor',exact:true})).toBeVisible();await expect(page.locator('.academic-portal')).not.toContainText(/pipeline test|\d+ test/i)
})
