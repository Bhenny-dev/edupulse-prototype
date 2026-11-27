import { test } from './fixtures'
import { classStreamScene } from './class-stream-scenes'
test('instructor class Stream on a phone', async ({ page }) => classStreamScene(page, true))
