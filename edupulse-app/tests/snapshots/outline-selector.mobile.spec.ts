import {test} from './fixtures'
import {selectorScene} from './outline-selector-scenes'
for(const dark of [false,true])test(`outline selector: ${dark?'dark':'light'} sections and supported assessment formats`,async({page},info)=>selectorScene(page,info,dark))
