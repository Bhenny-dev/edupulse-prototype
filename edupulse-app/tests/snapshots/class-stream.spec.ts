import { test } from './fixtures'
import { classStreamScene, studentAnnouncementScene } from './class-stream-scenes'
test('instructor class Stream and announcement placement', async ({ page }) => classStreamScene(page))
test('student sees posted announcements before weeks and inside topics', async ({ page }) => studentAnnouncementScene(page))
