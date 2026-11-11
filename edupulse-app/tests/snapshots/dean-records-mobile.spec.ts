import {test} from './fixtures'
import {deanRecordScenes} from './dean-records-scenes'
test('Dean records and block roster remain usable on a phone',async({page})=>{await deanRecordScenes(page,true)})
