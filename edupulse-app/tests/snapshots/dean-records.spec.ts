import {test} from './fixtures'
import {deanRecordScenes} from './dean-records-scenes'
test('Dean activity records, shared cards, year groups and authorized dialog restoration',async({page})=>{await deanRecordScenes(page)})
