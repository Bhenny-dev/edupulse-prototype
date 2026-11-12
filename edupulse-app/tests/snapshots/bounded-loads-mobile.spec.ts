import {test} from './fixtures'
import {boundedLoadUI} from '../bounded-loads-ui'
test('bounded teaching allocation: phone retains nine course block cards',async({page})=>{
 await boundedLoadUI(page)
 await page.screenshot({path:'../feature-documentation/system-manual/37-instructor-monitoring/mobile-13-bounded-loads.png',animations:'disabled',fullPage:true})
})
