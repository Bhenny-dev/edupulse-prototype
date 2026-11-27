import {test} from './fixtures'
import {deanRecordScenes} from './dean-records-scenes'
test('Dean instructor assignments and course delivery on a phone', async ({ page }) => { await deanRecordScenes(page, true) })
test('Program Coordinator instructor course loads on a phone', async ({ page }) => { await deanRecordScenes(page, true, 'associate_dean') })
