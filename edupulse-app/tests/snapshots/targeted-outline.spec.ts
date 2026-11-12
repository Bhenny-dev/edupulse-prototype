import {test,expect} from './fixtures'
import {targetedOutlineUI} from '../targeted-outline-ui'
import {mkdir} from 'node:fs/promises'
const dir='../feature-documentation/system-manual/38-targeted-outline-edits'
test('targeted outline review and shared-section placement',async({page},info)=>{
 await mkdir(dir,{recursive:true});const fixture=await targetedOutlineUI(page)
 await fixture.chat.locator('.connected-pulse-feed').evaluate(element=>{element.scrollTop=0});await fixture.chat.screenshot({path:`${dir}/${info.project.name}-review.png`,animations:'disabled',style:'.connected-pulse{position:relative!important;inset:auto!important;height:auto!important;max-height:none!important;overflow:visible!important}.connected-pulse-feed{overflow:visible!important;flex:none!important;max-height:none!important}.pulse-draft-review{max-height:none!important;overflow:visible!important}'})
 await fixture.chat.getByRole('button',{name:'Close Pulse',exact:true}).click()
 await expect(page.locator('[data-pulse-field="courseOutline.0.sections.0.contents"]')).toHaveValue('Research questions\nFeasibility and scope')
 await expect(page.getByLabel('Week 1 section 2 contents',{exact:true})).toHaveValue('Keep this unrelated section exactly.')
 await fixture.outline.screenshot({path:`${dir}/${info.project.name}-applied.png`,animations:'disabled',style:'.app-topbar{visibility:hidden !important}.connected-pulse-dock{visibility:hidden !important}'})
})
