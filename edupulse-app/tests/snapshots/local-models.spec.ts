import {test} from './fixtures'
import {localModelScenes} from './local-models-scenes'
test('local model choices, checked cache, retained selection and removal',async({page})=>{await localModelScenes(page)})
