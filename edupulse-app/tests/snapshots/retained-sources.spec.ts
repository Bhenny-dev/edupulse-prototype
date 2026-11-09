import {test} from './fixtures'
import {sourceScene} from './retained-sources-scenes'
test.describe.configure({timeout:60000})
test('retained sources: references, passage citations, book attachment and version review',async({page})=>sourceScene(page))
test('retained sources: dark readable source states',async({page})=>sourceScene(page,false,true))
