import {test,expect} from './fixtures'
import {pipelineProgressUI} from '../pipeline-progress-fixture'
import {mkdir} from 'node:fs/promises'
const dir='../feature-documentation/system-manual/33-pipeline-progress'
for(const role of ['student','instructor'])test(`pipeline progress mobile: ${role}`,async({page})=>{
 await pipelineProgressUI(page,role);await page.goto('/#/'+(role==='student'?'assessment':'student-monitoring?tab=assessments'))
 await expect(page.getByText(/Pipeline test|labelled pipeline/).first()).toBeVisible();await mkdir(dir,{recursive:true})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:`${dir}/05-mobile-${role}.png`,fullPage:true,animations:'disabled'})
})
