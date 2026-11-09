import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {outlineCoursewareUI} from '../outline-courseware-fixture'

test('outline-driven generation saves two complete items, replaces an obsolete AI quiz and exports the full lesson',async({page})=>{
  test.setTimeout(90000)
  const fixture=await outlineCoursewareUI(page);await page.goto(`/#/courseware?course=${fixture.syllabus.id}&week=5`)
  await page.getByRole('button',{name:'Week 5 actions',exact:true}).click();await page.getByRole('menuitem',{name:'Regenerate week',exact:true}).click()
  await expect(page.getByText('Week 5: 2 AI drafts saved for review.',{exact:true})).toBeVisible()
  expect(fixture.requests.map(row=>row.key)).toEqual(['lesson-1','lesson-2','activity'])
  expect(fixture.prompts.filter(row=>row.generationStep.startsWith('lesson')).every(row=>row.topics.length<=3)).toBeTruthy()
  await expect(page.locator('[data-content-id]')).toHaveCount(2)
  await expect(page.getByText('Previous automatic readiness quiz',{exact:true})).toHaveCount(0)
  await page.locator(`[data-content-id="${fixture.id}"]`).getByRole('button',{name:'View',exact:true}).click()
  await expect(page.getByText('Worked nested trace',{exact:true})).toBeVisible()
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click()
  const file=await (await download).path();expect(file).toBeTruthy();expect((await readFile(file!)).subarray(0,5).toString()).toBe('%PDF-')
  await page.reload();await expect(page.getByText('Previous automatic readiness quiz',{exact:true})).toHaveCount(0)
})
test('a later failed step preserves the earlier saved content and does not apply partial topic groups',async({page})=>{
  const fixture=await outlineCoursewareUI(page);fixture.failStep('activity');await page.goto(`/#/courseware?course=${fixture.syllabus.id}&week=5`)
  await page.getByRole('button',{name:'Week 5 actions',exact:true}).click();await page.getByRole('menuitem',{name:'Regenerate week',exact:true}).click()
  await expect(page.getByText('Generation did not finish',{exact:true})).toBeVisible()
  await expect(page.getByText('Previous short overview',{exact:true})).toBeVisible()
  await expect(page.getByText('Previous automatic readiness quiz',{exact:true})).toBeVisible()
  expect(fixture.requests.map(row=>row.key)).toEqual(['lesson-1','lesson-2','activity'])
})
