import {test} from './fixtures'
import {readOnlyDashboard} from '../dashboard-readonly-ui'
for(const support of [false,true])test(`read-only dashboard ${support?'support':'instructor'}`,async({page})=>{
 test.setTimeout(60000)
 await readOnlyDashboard(page,support)
 await page.screenshot({path:`../feature-documentation/system-manual/23-account-support-and-pulse-context/${support?'11-support-dashboard':'10-read-only-dashboard'}.png`,animations:'disabled',fullPage:true})
})
