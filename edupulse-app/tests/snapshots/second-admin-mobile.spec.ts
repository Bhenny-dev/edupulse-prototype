import {test} from './fixtures'
import {secondAdminScenes} from './second-admin-scenes'
test('second admin retains the selected account and page on a phone',async({page})=>{await secondAdminScenes(page,true)})
