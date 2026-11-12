import {test,expect} from './fixtures'
import {teachingSetsUI} from '../teaching-sets-fixture'
const folder='../feature-documentation/system-manual/40-teaching-sets'
test('four own syllabi, two complete drafts and two received sources stay distinct after reload',async({page})=>{
 const f=await teachingSetsUI(page);await page.goto('/#/syllabus?tab=mine')
 await expect(page.getByText('4 own syllabi',{exact:true})).toBeVisible();await expect(page.getByText('2 shared with me',{exact:true})).toBeVisible();await expect(page.getByText('2 complete drafts',{exact:true})).toBeVisible()
 await expect(page.locator('.syllabus-list tbody tr')).toHaveCount(6)
 await expect(page.locator('[data-shared-id]')).toHaveCount(2)
 await page.screenshot({path:`${folder}/01-primary-eight.png`,fullPage:true,animations:'disabled'})
 await page.getByRole('button',{name:'Show all syllabi',exact:true}).click();await expect(page.locator('.syllabus-list tbody tr')).toHaveCount(8)
 await page.reload();await expect(page.locator('.syllabus-list tbody tr')).toHaveCount(8)
 await page.getByRole('button',{name:'Show teaching set',exact:true}).click()
 const row=page.locator('.syllabus-list tbody tr').filter({hasText:f.draft.courseCode});await row.getByTitle('View Syllabus',{exact:true}).click()
 const modal=page.locator('.syllabus-view-modal');await expect(modal).toContainText('Final Examination');await expect(modal).toContainText('Proposed draft assessment plan')
 await modal.getByText('Proposed draft assessment plan',{exact:false}).scrollIntoViewIfNeeded()
 await modal.screenshot({path:`${folder}/02-complete-draft.png`,animations:'disabled'})
 await modal.getByRole('button',{name:'Close syllabus details',exact:true}).click()
 await page.getByRole('heading',{name:'Shared with me',exact:true}).locator('../..').screenshot({path:`${folder}/03-two-received-syllabi.png`,animations:'disabled'})
})
test('prepared unapproved courses can be reviewed while Publish remains disabled',async({page})=>{
 const f=await teachingSetsUI(page);await page.goto('/#/courseware')
 await expect(page.getByRole('table',{name:'Courseware courses'}).locator('tbody tr')).toHaveCount(8)
 await page.screenshot({path:`${folder}/04-owned-courseware.png`,animations:'disabled'})
 await page.goto(`/#/courseware?course=${f.draft.id}&week=1`)
 await expect(page.getByText(/Awaiting syllabus approval. Review these prepared drafts/)).toBeVisible()
 const item=page.locator(`[data-content-id="gen-mat-${f.draft.id}-w1"]`);await item.getByRole('button',{name:/actions/i}).click()
 await expect(page.getByRole('menuitem',{name:'Publish',exact:true})).toBeDisabled()
 await page.screenshot({path:`${folder}/05-approval-boundary.png`,animations:'disabled'})
})
test('the released practice assessment preserves fixed True and False choices',async({page})=>{
 const f=await teachingSetsUI(page),course=f.owner.workspace.data.syllabi.find(s=>s.courseCode==='WMAD303')!
 await page.goto(`/#/courseware?course=${course.id}&week=1`)
 await page.locator(`[data-content-id="gen-assess-${course.id}-w1"]`).getByRole('button',{name:'View',exact:true}).click()
 await expect(page.getByRole('combobox',{name:'Question 1 response type',exact:true})).toHaveValue('true_false')
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${folder}/06-true-false.png`,animations:'disabled'})
 await page.setViewportSize({width:390,height:844});await page.goto('/#/syllabus?tab=mine');await expect(page.getByText('2 complete drafts',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`${folder}/07-phone-teaching-set.png`,animations:'disabled'})
})
