import {test,expect} from '@playwright/test'
import {pipelineProgressUI} from '../pipeline-progress-fixture'

test('monitoring excludes scripted activity without deleting or relabelling audit records',async({page})=>{
 const fixture=await pipelineProgressUI(page);await page.goto('/#/student-monitoring?course='+ 'a'.repeat(32)+'&block=BSIT-1A&tab=assessments')
 await expect(page.getByRole('button',{name:'Average raw score',exact:true})).toContainText('83%')
 await page.getByText('Topic mastery and follow-up',{exact:true}).click()
 const table=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Recorded assessment attempts',exact:true})})
 await expect(table.locator('tbody tr')).toHaveCount(fixture.records.attempts.filter(a=>!a.is_test).length);await expect(table).not.toContainText('1/3')
 await expect(page.getByText(/Pipeline test|labelled pipeline/i)).toHaveCount(0)
 expect(fixture.records.attempts.length).toBeGreaterThan(0);expect(fixture.records.attempts[0].is_test).toBe(true)
})

test('student saved scores and material access omit test indicators without altering records',async({page})=>{
 const fixture=await pipelineProgressUI(page,'student');await page.goto('/#/assessment');await expect(page.getByRole('cell',{name:'1/3',exact:true}).first()).toBeVisible()
 await page.getByRole('button',{name:'Open assessment',exact:true}).first().click();await expect(page.getByRole('status').filter({hasText:'Saved score: 1/3'})).toBeVisible();await expect(page.getByText(/Pipeline test/i)).toHaveCount(0);await page.keyboard.press('Escape')
 await page.goto('/#/courseware');await page.getByRole('button',{name:/^Open course /}).first().click();await expect(page.getByText(/^material .* Opened$/)).toBeVisible();await expect(page.getByText(/Pipeline test/i)).toHaveCount(0)
 await page.goto('/#/performance?tab=materials');const access=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Recorded material access',exact:true})});await expect(access.getByRole('columnheader',{name:'Activity',exact:true})).toHaveCount(0);expect(fixture.records.accesses.at(-1)!.is_test).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
