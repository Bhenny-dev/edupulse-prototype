import {test} from './fixtures.js'
import {publicPulseScenes} from './public-pulse-search-scenes.js'
test('public Pulse ranks bundled information and retains the person without an AI service',async({page})=>{await publicPulseScenes(page)})
