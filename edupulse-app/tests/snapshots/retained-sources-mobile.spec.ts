import {test} from './fixtures'
import {sourceScene} from './retained-sources-scenes'
test.describe.configure({timeout:60000})
test('retained sources: mobile readable source states',async({page})=>sourceScene(page,true))
