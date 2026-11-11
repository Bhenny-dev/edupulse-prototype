import {test} from './fixtures'
import {localModelScenes} from './local-models-scenes'
test('mobile local model choices and checked downloads',async({page})=>{await localModelScenes(page,true)})
