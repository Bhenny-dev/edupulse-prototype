import {test,expect} from '@playwright/test'
import {outlineProgressUI} from '../outline-progress-ui'

test('outline weeks appear before completion and survive later failure without overwriting manual work',async({page})=>{
 const fixture=await outlineProgressUI(page)
 await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=builder');await page.getByRole('combobox',{name:'Course',exact:true}).selectOption('IT 104')
 await page.getByRole('button',{name:'Open Pulse assistant'}).click();const chat=page.getByRole('dialog',{name:'Pulse',exact:true})
 await chat.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Complete the course outline for the selected course');await chat.getByRole('button',{name:'Send',exact:true}).click()
 const preview=page.getByRole('region',{name:'Generated outline draft',exact:true})
 await expect(preview).toContainText('2 of 16 teaching weeks ready');await expect(preview).toContainText('Generating the next week');expect(fixture.requests[0].referenceSyllabi[0].id).toBe('synthetic-reference')
 expect(fixture.writes).toHaveLength(0);await expect(page.getByPlaceholder('Contents...',{exact:true}).first()).toHaveValue('')
 fixture.release();await expect(preview).toContainText('Generation stopped. Completed weeks remain available below.')
 await chat.getByRole('button',{name:'Close Pulse',exact:true}).click()
 const second=page.locator('[data-pulse-field="courseOutline.1.sections.0.ilos"]');await second.fill('Manually reviewed second-week outcome')
 await preview.getByRole('button',{name:'Use completed weeks',exact:true}).click()
 await expect(page.getByPlaceholder('Contents...',{exact:true}).first()).toHaveValue(fixture.rows[0].contents[0]);await expect(second).toHaveValue('Manually reviewed second-week outcome');expect(fixture.writes).toHaveLength(0)
 expect(await page.evaluate(()=>innerWidth===document.documentElement.clientWidth&&document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
