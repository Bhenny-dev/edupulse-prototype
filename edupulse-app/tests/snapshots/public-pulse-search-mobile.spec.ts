import {test} from './fixtures.js'
import {publicPulseScenes} from './public-pulse-search-scenes.js'
test.use({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true})
test('public Pulse information and corrections fit a phone',async({page})=>{await publicPulseScenes(page,true)})
