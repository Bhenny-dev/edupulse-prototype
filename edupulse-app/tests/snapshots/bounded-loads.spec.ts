import {test} from './fixtures'
import {boundedLoadUI} from '../bounded-loads-ui'
test('bounded teaching allocation: nine saved course block cards',async({page})=>{
 await boundedLoadUI(page)
 await page.screenshot({path:'../feature-documentation/system-manual/37-instructor-monitoring/13-bounded-loads.png',animations:'disabled',fullPage:true})
})
