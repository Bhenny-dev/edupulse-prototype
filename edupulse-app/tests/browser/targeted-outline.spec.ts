import {test,expect} from '@playwright/test'
import {targetedOutlineUI} from '../targeted-outline-ui'
test('targeted Pulse preview applies only the selected shared section without saving unrelated content',async({page})=>{
 const fixture=await targetedOutlineUI(page)
 expect(fixture.calls).toHaveLength(1);expect(fixture.writes).toHaveLength(0)
 await fixture.chat.getByRole('button',{name:'Close Pulse',exact:true}).click()
 await expect(page.locator('[data-pulse-field="courseOutline.0.sections.0.contents"]')).toHaveValue('Research questions\nFeasibility and scope')
 await expect(page.getByLabel('Week 1 section 2 contents',{exact:true})).toHaveValue('Keep this unrelated section exactly.')
 await fixture.outline.getByRole('combobox',{name:'Outline week',exact:true}).selectOption('2')
 await expect(page.locator('[data-pulse-field="courseOutline.1.sections.0.contents"]')).toHaveValue('Research questions\nFeasibility and scope')
 expect(fixture.writes).toHaveLength(0)
})
