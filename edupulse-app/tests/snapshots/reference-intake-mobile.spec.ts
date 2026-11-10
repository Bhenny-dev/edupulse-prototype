import {test} from './fixtures'
import {referenceIntakeScene} from './reference-intake-scenes'
test('reference intake: phone extracted citation',async({page})=>{await page.setViewportSize({width:390,height:1400});await referenceIntakeScene(page,true)})
