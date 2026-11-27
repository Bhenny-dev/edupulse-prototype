import {test,expect} from '@playwright/test'
import {deanRecordsUI} from '../dean-records-fixture'
import {readFile} from 'node:fs/promises'

test('Dean dashboard links open the catalog and instructor directory',async({page})=>{
 await deanRecordsUI(page);await page.goto('/#/dashboard')
 const mobile=page.viewportSize()!.width<800
 if(mobile)await page.getByRole('button',{name:'Open menu',exact:true}).click()
 for(const label of ['Dashboard','Course','Instructors'])await expect(page.getByRole('link',{name:label,exact:true}).first()).toBeVisible()
 if(mobile)await page.getByRole('button',{name:'Close menu',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Instructor course loads',exact:true})).toBeVisible()
 await page.getByRole('link',{name:'Course catalog',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Courses',level:2,exact:true})).toBeVisible()
 for(const title of ['Student class lists','Syllabi','Course records'])await expect(page.getByRole('button',{name:title,exact:true})).toHaveCount(0)
 for(const title of ['Course list','Course loads'])await expect(page.getByRole('button',{name:title,exact:true})).toHaveCount(0)
 await expect(page.locator('.kpi-card .glass-icon')).toHaveCount(4)
 for(const upload of ['Upload course load','Upload class lists'])await expect(page.locator('label.dean-upload',{hasText:upload}).locator('input[type=file]')).toBeDisabled()
})

test('Program Coordinator opens the same Course, Instructors and Students pages as the Dean',async({page})=>{
 await deanRecordsUI(page,'associate_dean');await page.goto('/#/dashboard')
 const mobile=page.viewportSize()!.width<800
 if(mobile)await page.getByRole('button',{name:'Open menu',exact:true}).click()
 for(const label of ['Dashboard','Course','Instructors','Students'])await expect(page.getByRole('link',{name:label,exact:true}).first()).toBeVisible()
 for(const label of ['Records','Course Loading','Monitor'])await expect(page.getByRole('link',{name:label,exact:true})).toHaveCount(0)
 if(mobile)await page.getByRole('button',{name:'Close menu',exact:true}).click()
 await page.goto('/#/records')
 await expect(page.getByRole('heading',{name:'Courses',level:2,exact:true})).toBeVisible()
 await expect(page.getByLabel('Choose CSV for preview')).toHaveCount(0)
 await page.goto('/#/students');await expect(page).toHaveURL(/#\/students/);await expect(page.getByRole('heading',{name:'Student list',exact:true})).toBeVisible()
 await page.goto('/#/instructors');await expect(page).toHaveURL(/#\/instructors/);await expect(page.getByRole('link',{name:'View instructor Alex Sample Instructor',exact:true})).toBeVisible()
 await page.goto('/#/course-loading');await expect(page).toHaveURL(/#\/records\?tab=loads/)
})
test('one student directory keeps year/block filters, complete CSV membership, reload and withdrawn access consistent',async({page})=>{
 const fixture=await deanRecordsUI(page)
 fixture.records.enrollments.find(row=>row.student_ref==='SYN-002')!.display_name='=Sample learner'
 await page.goto('/#/students?tab=blocks')
 await expect(page.getByRole('navigation',{name:'Student views'})).toHaveCount(0)
 await page.getByRole('combobox',{name:'Department',exact:true}).selectOption('Department not recorded')
 for(const year of ['Year 1','Year 2','Year level not recorded'])await expect(page.getByRole('heading',{name:year,exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Filter students in BSIT-1A',exact:true}).click()
 const table=page.getByRole('region',{name:'Student list',exact:true})
 await expect(table.getByRole('row')).toHaveCount(3)
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).click()
 const file=await download,csv=await readFile((await file.path())!,'utf8')
 expect(csv).toContain('Riley Example');expect(csv).toContain("'=Sample learner");expect(csv).not.toContain('Taylor Example')
 fixture.calls.length=0;await page.reload();await expect(table.getByRole('row')).toHaveCount(3)
 expect(fixture.calls.every(call=>call.method==='GET')).toBe(true)
 await page.getByRole('button',{name:'View student Riley Example',exact:true}).click()
 const modal=page.getByRole('dialog',{name:'Student Riley Example',exact:true})
 await expect(modal).toBeVisible()
 fixture.records.enrollments=[];await page.reload()
 await expect(page.getByRole('dialog',{name:'Record unavailable',exact:true})).toBeVisible()
 await expect(page.getByText('Riley Example',{exact:true})).toHaveCount(0)
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.reload();await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('legacy Dean links resolve to the right workspace and instructor selection survives reload',async({page})=>{
 await deanRecordsUI(page)
 await page.goto('/#/course-loading?tab=instructors');await expect(page).toHaveURL(/#\/instructors$/)
 await page.getByRole('link',{name:'View instructor Alex Sample Instructor',exact:true}).click()
 await page.reload();await expect(page.getByRole('article',{name:'Alex Sample Instructor',exact:true})).toBeVisible()
 await expect(page.getByRole('article',{name:'Morgan Sample Instructor',exact:true})).toHaveCount(0)
 await page.goto('/#/records?tab=sections');await expect(page).toHaveURL(/#\/students$/)
 await page.goto('/#/performance');await expect(page.getByRole('heading',{name:'Performance',exact:true})).toBeVisible()
})

test('Dean record totals keep their values without test suffixes',async({page})=>{
 const fixture=await deanRecordsUI(page);await page.goto('/#/records');await expect(page.getByRole('heading',{name:'Courses',level:2,exact:true})).toBeVisible();await expect(page.locator('.academic-portal')).not.toContainText(/pipeline test|\d+ test/i);expect(fixture.records.attempts.some(a=>a.is_test)).toBe(true)
 await page.goto('/#/instructors');await expect(page.getByRole('link',{name:'View instructor Alex Sample Instructor',exact:true})).toBeVisible();await expect(page.locator('.academic-portal')).not.toContainText(/pipeline test|\d+ test/i)
})
