import {test,expect} from '@playwright/test'
import {pipelineProgressUI} from '../pipeline-progress-fixture'

test('instructor monitoring includes labelled test progress and can filter the same records',async({page})=>{
 await pipelineProgressUI(page);await page.goto('/#/student-monitoring?tab=assessments')
 await expect(page.getByText('2 labelled pipeline test record(s)',{exact:false})).toBeVisible()
 const table=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Recorded assessment attempts',exact:true})})
 await expect(table.getByRole('cell',{name:'Pipeline test',exact:true})).toHaveCount(1)
 await page.getByLabel('Activity records',{exact:true}).selectOption('student')
 await expect(table.getByRole('cell',{name:'Pipeline test',exact:true})).toHaveCount(0)
 await page.getByLabel('Activity records',{exact:true}).selectOption('test')
 await expect(table.getByRole('cell',{name:'Pipeline test',exact:true})).toHaveCount(1)
 await expect(table.getByRole('cell',{name:'Student activity',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Download CSV'}).first()).toBeVisible()
})

test('student sees the same saved labelled score and labelled material access',async({page})=>{
 await pipelineProgressUI(page,'student');await page.goto('/#/assessment')
 await expect(page.getByText('Saved result: 1/3 · Pipeline test',{exact:false})).toBeVisible()
 await page.getByRole('button',{name:'Open assessment',exact:true}).first().click()
 await expect(page.getByRole('status').filter({hasText:'Pipeline test · Saved score: 1/3'})).toBeVisible()
 await page.goto('/#/courseware')
 await expect(page.getByText('Opened · Pipeline test',{exact:false})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
