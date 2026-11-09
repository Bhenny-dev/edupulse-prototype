import {test} from './fixtures'
import {sourceScene,formattedSourceScene} from './retained-sources-scenes'
test.describe.configure({timeout:60000})
test('retained sources: references, passage citations, book attachment and version review',async({page})=>sourceScene(page))
test('retained sources: dark readable source states',async({page})=>sourceScene(page,false,true))
test('retained sources: formatted reading and PDF actions',async({page})=>formattedSourceScene(page))
test('retained sources: dark formatted reading',async({page})=>formattedSourceScene(page,false,true))
