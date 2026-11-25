import { expect, type Page } from '@playwright/test'
import { PNG } from 'pngjs'
import jsQR from 'jsqr'
import { instructorCourseUI } from './instructor-course-fixture'
import { adminReloadUI } from './admin-reload-fixture'

/** Synthetic UI transport only; class-codes.test.ts exercises the actual support SQL. */
export async function classroomSupportUI(page: Page, support = false) {
  const fixture = await instructorCourseUI(page)
  const subject = support ? (await adminReloadUI(page)).account.id : fixture.records.courses[0].instructor_id!
  const records = fixture.records, workspace = fixture.getWorkspace()
  for (const course of records.courses) course.instructor_id = subject
  for (const row of records.institutional || []) if (row.kind === 'loads') row.data.InstructorID = subject
  records.classCodes = ['IT 102', 'IT 201'].map((course_code, index) => ({ course_code, block: index ? 'BSIT-2A' : 'BSIT-1A', academic_year: '2026-2027', semester: '1st Semester', code: index ? 'P4Q8RST' : 'K7M2QXP', load_key: `${course_code}|A`, parent_key: `${course_code}|A`, created_at: '2026-11-25T00:00:00Z' }))
  records.announcements = []; records.classJoins = []
  const writes: unknown[] = []
  await page.route('**/api/ai?action=workspace', route => {
    if (route.request().method() !== 'GET') { writes.push('workspace'); return route.fulfill({ status: 500, json: {} }) }
    return route.fulfill({ json: { mode: 'cloud', revision: 0, data: workspace } })
  })
  await page.route('**/api/ai?action=academic', route => {
    if (support) expect(route.request().headers()['x-edupulse-subject']).toBe(subject)
    if (route.request().method() === 'GET') return route.fulfill({ json: records })
    const input = route.request().postDataJSON(); writes.push(input)
    if (input.operation === 'class-code' && input.action === 'regenerate') {
      records.classCodes![1].code = 'H3J5KMN'
      return route.fulfill({ json: records.classCodes![1] })
    }
    return route.fulfill({ status: 500, json: {} })
  })
  return { ...fixture, writes }
}

export async function expectClassColumns(page: Page) {
  const aside = (await page.locator('.class-aside').boundingBox())!, feed = (await page.locator('.class-feed').boundingBox())!
  const card = (await page.getByRole('region', { name: 'Class Code', exact: true }).boundingBox())!
  expect(card.x).toBeGreaterThanOrEqual(aside.x - 1)
  expect(card.x + card.width).toBeLessThanOrEqual(aside.x + aside.width + 1)
  if (Math.abs(aside.x - feed.x) > 1) expect(card.x + card.width + 20).toBeLessThanOrEqual(feed.x)
  else expect(feed.y + feed.height + 12).toBeLessThanOrEqual(aside.y)
  expect(await page.locator('.class-aside').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}


/** Wait for a readable rendered QR, including the browser's actual theme paint. */
export async function expectInvitationQr(page: Page) {
 const qr=page.getByRole('img',{name:'Scan to join this class',exact:true})
 await expect(qr).toBeVisible()
 const url=await page.getByLabel('Invitation link',{exact:true}).inputValue()
 await expect.poll(async()=>{
  const pixels=PNG.sync.read(await qr.screenshot({animations:'disabled'}))
  return jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height)?.data
 }).toBe(url)
}
