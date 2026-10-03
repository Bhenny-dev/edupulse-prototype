import { test, expect, type Page, type Locator } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

// System walkthrough: every role's pages, tabs, popovers and modals, captured
// from the production build. Output: feature-documentation/system-walkthrough/<folder>/<name>.png
const ROOT = '../feature-documentation/system-walkthrough'
type Scene = { folder: string; name: string; title: string; path?: string; act?: (page: Page) => Promise<unknown>; element?: (page: Page) => Locator; fullPage?: boolean; keepPointer?: boolean }
const manifest: { role: string; folder: string; file: string; title: string; ok: boolean; error?: string }[] = []
const problems: string[] = []
test.describe.configure({ mode: 'serial' })

async function signIn(page: Page, persona: 'Dean' | 'Assoc. Dean' | 'Instructor' | 'Student') {
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) problems.push(`csp: ${message.text()}`) })
  await page.goto('/')
  await page.getByRole('button', { name: persona, exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
}
async function settle(page: Page) { await page.waitForLoadState('networkidle').catch(() => undefined); await page.waitForTimeout(350) }
async function run(page: Page, role: string, scenes: Scene[]) {
  for (const scene of scenes) {
    const file = `${scene.name}.png`
    try {
      await page.keyboard.press('Escape').catch(() => undefined)
      if (scene.path) { await page.goto(`/#${scene.path}`); await settle(page) }
      if (scene.act) { await scene.act(page); await page.waitForTimeout(400) }
      // Recharts draws with JavaScript animation (about 1.5 s) that `animations: 'disabled'` cannot stop.
      if (await page.locator('.recharts-wrapper').count()) await page.waitForTimeout(1800)
      // Park the pointer so chart tooltips and hover states from earlier clicks are not captured.
      if (!scene.keepPointer) await page.mouse.move(2, 400)
      // Confirmation toasts belong to the previous action, not to the screen being documented.
      for (const toast of await page.locator('.toast').all()) await toast.click().catch(() => undefined)
      await expect(page.locator('.toast')).toHaveCount(0, { timeout: 5000 }).catch(() => undefined)
      await mkdir(`${ROOT}/${scene.folder}`, { recursive: true })
      const target = scene.element ? scene.element(page) : page
      await target.screenshot({ path: `${ROOT}/${scene.folder}/${file}`, animations: 'disabled', fullPage: scene.fullPage, ...(scene.element ? { style: '.app-topbar{position:static !important}' } : {}) })
      manifest.push({ role, folder: scene.folder, file, title: scene.title, ok: true })
    } catch (error) {
      manifest.push({ role, folder: scene.folder, file, title: scene.title, ok: false, error: (error as Error).message.split('\n')[0] })
    }
  }
}
const tab = (name: string) => async (page: Page) => { await page.getByRole('button', { name, exact: true }).first().click(); await settle(page) }
const topButton = (page: Page, text: string) => page.locator('button.desktop-tool').filter({ hasText: new RegExp(`^${text}$`) }).first()

test('public site', async ({ page }) => {
  await page.goto('/')
  await run(page, 'public', [
    { folder: '01-public-site', name: '01-landing-hero', title: 'Landing page: hero and primary actions', path: '/' },
    { folder: '01-public-site', name: '02-landing-about', title: 'Landing page: role benefits', act: p => p.locator('#about').scrollIntoViewIfNeeded() },
    { folder: '01-public-site', name: '03-landing-statistics', title: 'Landing page: why it matters', act: p => p.locator('#stats').scrollIntoViewIfNeeded() },
    { folder: '01-public-site', name: '04-sign-in-panel', title: 'Sign-in panel with preview personas', act: p => p.locator('#login').scrollIntoViewIfNeeded(), element: p => p.locator('#login') },
  ])
})

test('shared interface (shown as instructor)', async ({ page }) => {
  await signIn(page, 'Instructor')
  const f = '02-shared-interface'
  await run(page, 'all roles', [
    { folder: f, name: '01-top-bar', title: 'Top bar: navigation, tools, notifications, role and account', path: '/dashboard', element: p => p.locator('header.app-topbar') },
    { folder: f, name: '02-search-overlay', title: 'Search overlay (Ctrl+K)', path: '/dashboard', act: p => p.keyboard.press('Control+k') },
    { folder: f, name: '03-keyboard-shortcuts-modal', title: 'Keyboard shortcuts modal', path: '/dashboard', act: p => p.getByTitle('Keyboard shortcuts (?)').click() },
    { folder: f, name: '04-language-menu', title: 'Language menu (English / Filipino)', path: '/dashboard', act: p => p.getByTitle('Language').click() },
    { folder: f, name: '05-notifications-dropdown', title: 'Notifications dropdown', path: '/dashboard', act: p => p.getByRole('button', { name: /^Notifications/ }).click() },
    { folder: f, name: '06-account-menu', title: 'Account menu', path: '/dashboard', act: p => p.getByRole('button', { name: 'Account menu' }).click() },
    { folder: f, name: '07-role-switch-popover', title: 'Preview role switcher (prototype only)', path: '/dashboard', act: p => topButton(p, 'Instructor').click() },
    { folder: f, name: '08-notifications-page', title: 'Notifications page', path: '/notifications' },
    { folder: f, name: '09-help-and-support', title: 'Help and support', path: '/help' },
    { folder: f, name: '10-settings-account', title: 'Settings · Account', path: '/settings?tab=account' },
    { folder: f, name: '11-settings-appearance', title: 'Settings · Appearance', path: '/settings?tab=appearance' },
    { folder: f, name: '12-settings-notifications', title: 'Settings · Notifications', path: '/settings?tab=notifications' },
    { folder: f, name: '13-settings-ai-and-knowledge', title: 'Settings · AI & Knowledge', path: '/settings?tab=ai-provider', act: p => expect(p.getByText('Last checked:')).toBeVisible({ timeout: 60_000 }), fullPage: true },
    { folder: f, name: '14-settings-data-and-privacy', title: 'Settings · Data & Privacy', path: '/settings?tab=privacy' },
    { folder: f, name: '15-dark-mode', title: 'Dark mode (Appearance)', path: '/settings?tab=appearance', act: async p => { await p.getByRole('switch', { name: 'Dark mode' }).click(); await p.goto('/#/dashboard'); await settle(p) } },
    { folder: f, name: '16-pulse-dock', title: 'Pulse assistant dock', path: '/settings?tab=appearance', act: async p => { await p.getByRole('switch', { name: 'Dark mode' }).click(); await p.goto('/#/dashboard'); await settle(p) }, element: p => p.locator('[data-pulse-ui="mascot"]') },
    { folder: f, name: '17-pulse-panel', title: 'Pulse panel (welcome)', path: '/dashboard', act: p => p.getByRole('button', { name: 'Open Pulse assistant' }).click() },
    { folder: f, name: '18-pulse-dwell-help', title: '“Ask Pulse about this” hover badge', path: '/syllabus?tab=builder', act: async p => { await p.getByLabel('Course', { exact: true }).hover(); await expect(p.locator('.pulse-dwell-help')).toBeVisible({ timeout: 5000 }) }, keepPointer: true },
  ])
})

test('dean and associate dean', async ({ page }) => {
  await signIn(page, 'Dean')
  const f = '03-dean-and-associate-dean'
  await run(page, 'dean', [
    { folder: f, name: '01-dashboard', title: 'Dean dashboard', path: '/dashboard', fullPage: true },
    { folder: f, name: '02-course-loading-loaded-courses', title: 'Course Loading · Loaded Courses', path: '/course-loading?tab=assign', fullPage: true },
    { folder: f, name: '03-course-loading-instructors', title: 'Course Loading · Instructors', path: '/course-loading?tab=instructors', fullPage: true },
    { folder: f, name: '04-monitor-syllabus-status', title: 'Monitor · Syllabus Status', path: '/monitor?tab=syllabi', fullPage: true },
    { folder: f, name: '05-monitor-delivery-progress', title: 'Monitor · Delivery Progress', path: '/monitor?tab=delivery', fullPage: true },
    { folder: f, name: '06-monitor-student-oversight', title: 'Monitor · Student Oversight', path: '/monitor?tab=students', fullPage: true },
    { folder: f, name: '07-monitor-alerts', title: 'Monitor · Alerts', path: '/monitor?tab=alerts', fullPage: true },
    { folder: f, name: '08-records-import', title: 'Records · Import EduSuite Files', path: '/records', fullPage: true },
    { folder: f, name: '09-records-blocks-and-class-lists', title: 'Records · Blocks & Class Lists', path: '/records', act: tab('Blocks & Class Lists'), fullPage: true },
    { folder: f, name: '10-records-course-catalog', title: 'Records · Course Catalog', path: '/records', act: tab('Course Catalog'), fullPage: true },
    { folder: f, name: '11-pulse-on-course-loading', title: 'Pulse focused on Course Loading', path: '/course-loading?tab=assign', act: async p => { await p.getByRole('button', { name: 'Open Pulse assistant' }).click(); await p.getByRole('button', { name: 'Guide this page' }).click() } },
  ])
})

test('associate dean', async ({ page }) => {
  await signIn(page, 'Assoc. Dean')
  await run(page, 'associate dean', [{ folder: '03-dean-and-associate-dean', name: '12-associate-dean-dashboard', title: 'Associate Dean dashboard (same shared admin role)', path: '/dashboard' }])
})

test('instructor', async ({ page, request }) => {
  // Built-in sample syllabi (marked “sample”) so every instructor page has content to show.
  const snapshot = await (await request.get('/api/ai?action=workspace')).json()
  if (!snapshot.data?.syllabi?.length) {
    const { DEFAULT_SYLLABI } = await import(new URL('../../src/data/mockData.js', import.meta.url).href)
    await request.put('/api/ai?action=workspace', { data: { revision: snapshot.revision, data: { syllabi: DEFAULT_SYLLABI.map((s: object) => ({ ...s, sample: true })), content: snapshot.data?.content || {}, registrations: [] } } })
  }
  await signIn(page, 'Instructor')
  const f = '04-instructor'
  await run(page, 'instructor', [
    { folder: f, name: '01-dashboard', title: 'Instructor dashboard', path: '/dashboard', fullPage: true },
    { folder: f, name: '02-syllabus-my-courses', title: 'Syllabus · My Courses', path: '/syllabus?tab=register', fullPage: true },
    { folder: f, name: '03-syllabus-my-syllabus', title: 'Syllabus · My Syllabus (status, actions, versions)', path: '/syllabus?tab=mine', fullPage: true },
    { folder: f, name: '04-syllabus-shared-repository', title: 'Syllabus · Shared Repository', path: '/syllabus?tab=mine', act: tab('Shared Repository') },
    { folder: f, name: '05-syllabus-builder', title: 'Syllabus Builder (upload or build the 7 sections)', path: '/syllabus?tab=builder' },
    { folder: f, name: '06-syllabus-builder-course-outline', title: 'Syllabus Builder · Section 5 Course Outline', path: '/syllabus?tab=builder', element: p => p.locator('[data-section="5"]') },
    { folder: f, name: '07-courseware-my-courseware', title: 'Courseware · My Courseware', path: '/courseware?tab=mine', fullPage: true },
    { folder: f, name: '08-courseware-builder', title: 'Courseware · Courseware Builder', path: '/courseware?tab=builder', fullPage: true },
    { folder: f, name: '09-student-monitoring-assessment-scores', title: 'Student Monitoring · Assessment Scores', path: '/student-monitoring?tab=assessments', fullPage: true },
    { folder: f, name: '10-student-monitoring-material-access', title: 'Student Monitoring · Material Access', path: '/student-monitoring?tab=materials', fullPage: true },
    { folder: f, name: '11-performance-overview', title: 'Performance · Overview', path: '/performance?tab=overview' },
    { folder: f, name: '12-performance-by-topic', title: 'Performance · By Topic', path: '/performance?tab=bytopic', fullPage: true },
    { folder: f, name: '13-performance-alerts', title: 'Performance · Alerts', path: '/performance?tab=alerts', fullPage: true },
  ])
})

test('student', async ({ page }) => {
  await signIn(page, 'Student')
  const f = '05-student'
  await run(page, 'student', [
    { folder: f, name: '01-dashboard', title: 'Student dashboard', path: '/dashboard', fullPage: true },
    { folder: f, name: '02-my-materials', title: 'My Courses · My Materials', path: '/courseware?tab=published', fullPage: true },
    { folder: f, name: '03-my-assessments', title: 'My Courses · My Assessments', path: '/assessment', fullPage: true },
    { folder: f, name: '04-performance-overview', title: 'Performance · Overview', path: '/performance?tab=overview', fullPage: true },
    { folder: f, name: '05-performance-by-topic', title: 'Performance · By Topic', path: '/performance?tab=bytopic', fullPage: true },
    { folder: f, name: '06-performance-learning-materials', title: 'Performance · Learning Materials', path: '/performance?tab=materials', fullPage: true },
    { folder: f, name: '07-performance-assessment-scores', title: 'Performance · Assessment Scores', path: '/performance?tab=scores', fullPage: true },
    { folder: f, name: '08-pulse-for-students', title: 'Pulse for students (role-scoped help)', path: '/performance?tab=overview', act: async p => { await p.getByRole('button', { name: 'Open Pulse assistant' }).click(); await p.getByRole('button', { name: 'Guide this page' }).click() } },
  ])
})

test.afterAll(async () => {
  await mkdir(ROOT, { recursive: true })
  await writeFile(`${ROOT}/capture-manifest.json`, `${JSON.stringify({ capturedAt: new Date().toISOString(), problems, scenes: manifest }, null, 2)}\n`)
})
