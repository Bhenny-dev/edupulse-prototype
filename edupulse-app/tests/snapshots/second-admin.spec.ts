import {test} from './fixtures'
import {secondAdminScenes} from './second-admin-scenes'
test('second admin sees two protected admins and restores an authorized account view',async({page})=>{await secondAdminScenes(page)})
