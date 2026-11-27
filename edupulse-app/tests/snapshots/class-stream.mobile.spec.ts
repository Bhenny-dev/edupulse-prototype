import { test } from './fixtures'
import { classStreamScene, matchingResponseScene } from './class-stream-scenes'
test('instructor class Stream on a phone', async ({ page }) => classStreamScene(page, true))
test('matching response and instructor marking on a phone', async ({ page }) => matchingResponseScene(page))
