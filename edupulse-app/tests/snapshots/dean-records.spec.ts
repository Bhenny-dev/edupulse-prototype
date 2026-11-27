import {test} from './fixtures'
import {deanRecordScenes} from './dean-records-scenes'
test('Dean instructor course loads, assignment, course delivery and directories', async ({ page }) => { await deanRecordScenes(page) })
test('Program Coordinator instructor course loads', async ({ page }) => { await deanRecordScenes(page, false, 'associate_dean') })
