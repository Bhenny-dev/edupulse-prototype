import {test} from './fixtures'
import {radarProgressScenes} from './radar-progress-scenes'
test('mobile three scored assessment radar',async({page})=>{await radarProgressScenes(page,true)})
