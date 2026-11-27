import { test } from './fixtures'
import { classStreamScene, studentAnnouncementScene, deliveredAssessmentScene } from './class-stream-scenes'
test('instructor class Stream and announcement placement', async ({ page }) => classStreamScene(page))
test('student sees posted announcements before weeks and inside topics', async ({ page }) => studentAnnouncementScene(page))
test('delivered assessment form, answer key and student scores', async ({ page }) => deliveredAssessmentScene(page))
