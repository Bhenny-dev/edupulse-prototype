import {expect,type Page} from './fixtures'
import {radarProgressUI} from '../radar-progress-fixture'
export async function radarProgressScenes(page:Page,mobile=false){
 if(mobile)await page.setViewportSize({width:390,height:1200})
 const fixture=await radarProgressUI(page,2)
 await page.goto('/#/student-monitoring?course='+ 'a'.repeat(32)+'&block=BSIT-1A&tab=assessments');await expect(page.getByText('At least three scored assessments are needed for a meaningful radar. 2 available.')).toBeVisible()
 const chart=page.getByRole('heading',{name:'Assessment score radar',exact:true}).locator('../..')
 await chart.screenshot({path:`../feature-documentation/system-manual/33-pipeline-progress/${mobile?'mobile-':''}06-two-assessments.png`,animations:'disabled',style:'.connected-pulse-dock{visibility:hidden!important}'})
 const ready=await radarProgressUI(page,3)
 await page.goto('/#/student-monitoring?course='+ 'a'.repeat(32)+'&block=BSIT-1A&tab=assessments');await page.reload()
 await expect(page.getByRole('img',{name:/^Assessment score radar:/})).toHaveAttribute('aria-label',/Interpretation 75%.*Limits 92%.*Interpretation 58%/)
 await chart.screenshot({path:`../feature-documentation/system-manual/33-pipeline-progress/${mobile?'mobile-':''}07-three-assessment-radar.png`,animations:'disabled',style:'.connected-pulse-dock{visibility:hidden!important}'})
 expect(fixture.records.attempts).toHaveLength(6);expect(ready.records.attempts).toHaveLength(9)
}
