import {test} from './fixtures'
import {overviewScene,previewScene} from './oversight-scenes'
for(const dark of [false,true])test(`oversight: mobile ${dark?'dark':'light'} records`,async({page})=>overviewScene(page,'associate_dean',true,dark))
test('oversight: mobile preview navigation',async({page})=>previewScene(page,true))
