import {test} from './fixtures'
import {selectorScene} from './outline-selector-scenes'
for(const dark of [false,true])test(`outline selector: ${dark?'dark':'light'} searchable options`,async({page},info)=>selectorScene(page,info,dark))
