import {test} from './fixtures'
import {radarProgressScenes} from './radar-progress-scenes'
test('three distinct scored assessments activate the score radar',async({page})=>{await radarProgressScenes(page)})
