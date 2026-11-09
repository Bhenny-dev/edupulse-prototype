import {test,expect} from './fixtures'
import {outlineCoursewareUI} from '../outline-courseware-fixture'
const folder='../feature-documentation/system-manual/26-outline-driven-courseware'
test('substantive outline lesson, planned discussion and final review remain in the existing workspace',async({page})=>{
  const fixture=await outlineCoursewareUI(page);await page.goto(`/#/courseware?course=${fixture.syllabus.id}&week=5`)
  await page.getByRole('button',{name:'Week 5 actions',exact:true}).click();await page.getByRole('menuitem',{name:'Regenerate week',exact:true}).click()
  await expect(page.getByText('Week 5: 2 AI drafts saved for review.',{exact:true})).toBeVisible()
  await expect(page.getByText('Week 5: 2 AI drafts saved for review.',{exact:true})).toHaveCount(0,{timeout:10000})
  await page.screenshot({path:`${folder}/01-planned-items.png`,animations:'disabled'})
  await page.locator(`[data-content-id="${fixture.id}"]`).getByRole('button',{name:'View',exact:true}).click()
  await expect(page.getByText('State, conditions and loop counters',{exact:true})).toBeVisible();await page.screenshot({path:`${folder}/02-lesson-context.png`,animations:'disabled'})
  await page.getByText('Worked nested trace',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${folder}/03-worked-example.png`,animations:'disabled'})
  await page.locator('.ai-draft-evidence').scrollIntoViewIfNeeded();await page.screenshot({path:`${folder}/04-final-review.png`,animations:'disabled'})
  await page.getByRole('button',{name:'Back',exact:true}).click()
  await page.locator(`[data-content-id="gen-act-${fixture.syllabus.id}-w5"]`).getByRole('button',{name:'View',exact:true}).click()
  await expect(page.getByText('Discussion tasks',{exact:true})).toBeVisible();await page.screenshot({path:`${folder}/05-discussion-guide.png`,animations:'disabled'})
})
