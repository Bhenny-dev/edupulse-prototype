import { test, expect, type Page, type Locator } from './fixtures.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

// System walkthrough: every role's pages, tabs, popovers and modals, captured
// from the production build. Output: feature-documentation/system-walkthrough/<folder>/<name>.png
const ROOT = '../feature-documentation/system-walkthrough'
// `style` adds capture-only CSS, for example to show a scroll-linked effect in its finished state.
type Scene = { folder: string; name: string; title: string; path?: string; act?: (page: Page) => Promise<unknown>; element?: (page: Page) => Locator; fullPage?: boolean; keepPointer?: boolean; hide?: string; style?: string }
// `route` is the page each image shows; scripts/docs-check.mjs uses it to confirm every app route is documented.
const manifest: { role: string; folder: string; file: string; title: string; route?: string; ok: boolean; error?: string }[] = []
const problems: string[] = []
test.describe.configure({ mode: 'serial' })

async function signIn(page: Page, persona: 'System Admin' | 'Dean' | 'Assoc. Dean' | 'Instructor' | 'Student') {
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) problems.push(`csp: ${message.text()}`) })
  await page.goto('/')
  await page.getByRole('button', { name: persona, exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
}
async function settle(page: Page) { await page.waitForLoadState('networkidle').catch(() => undefined); await page.waitForTimeout(350) }
async function run(page: Page, role: string, scenes: Scene[]) {
  for (const scene of scenes) {
    if (process.env.SNAPSHOT_SCENES && !new RegExp(process.env.SNAPSHOT_SCENES).test(`${scene.folder}/${scene.name}`)) continue
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
      const style = [scene.element ? '.app-topbar{position:static !important}' : '', scene.hide ? `${scene.hide}{display:none !important}` : '', scene.style || ''].join('')
      await target.screenshot({ path: `${ROOT}/${scene.folder}/${file}`, animations: 'disabled', fullPage: scene.fullPage, ...(style ? { style } : {}) })
      const route = new URL(page.url()).hash.replace(/^#/, '').split('?')[0] || '/'
      manifest.push({ role, folder: scene.folder, file, title: scene.title, route, ok: true })
    } catch (error) {
      manifest.push({ role, folder: scene.folder, file, title: scene.title, ok: false, error: (error as Error).message.split('\n')[0] })
    }
  }
}
const tab = (name: string) => async (page: Page) => { await page.getByRole('button', { name, exact: true }).first().click(); await settle(page) }

// The landing page is captured with reduced motion: every section is then complete and
// still (no opening, pinned scenes, agent rings in motion, scroll-drawn lines, 3D scene or drifting photographs), and
// the guides describe what changes when motion is allowed.
async function showSection(page: Page, selector: string) {
  const top = await page.locator(selector).evaluate(element => element.getBoundingClientRect().top + window.scrollY)
  await page.evaluate(to => window.scrollTo({ top: to, behavior: 'instant' }), top - 72)
  await page.waitForTimeout(400)
}
// Section images: the fixed bar and the back-to-top button stay out of the crop.
const LANDING_CROP = '.lp-nav{position:static !important}.landing-to-top{display:none !important}'
const section = (selector: string) => ({ act: (p: Page) => showSection(p, selector), element: (p: Page) => p.locator(selector), style: LANDING_CROP })

test('public site', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const f = '01-public-site'
  await run(page, 'public', [
    { folder: f, name: '01-landing-hero', title: 'Landing page: hero, institution lockup and primary actions', path: '/' },
    { folder: f, name: '02-landing-navigation', title: 'Landing navigation after scrolling: active section and reading progress', act: p => showSection(p, '#features'), element: p => p.locator('header.lp-nav') },
    { folder: f, name: '03-landing-why-edupulse', title: 'Landing page: why EduPulse (course preparation today and with EduPulse)', ...section('#problem') },
    { folder: f, name: '04-landing-features', title: 'Landing page: features (four parts of one workflow)', ...section('#features') },
    { folder: f, name: '05-landing-how-it-works', title: 'Landing page: how it works (six-phase timeline)', ...section('#flow') },
    { folder: f, name: '06-landing-roles', title: 'Landing page: roles (Instructor tab)', ...section('#roles') },
    { folder: f, name: '07-landing-roles-student', title: 'Landing page: roles (Student tab)', ...section('#roles'), act: async p => { await showSection(p, '#roles'); await p.getByRole('tab', { name: 'Student', exact: true }).click(); await expect(p.getByRole('tabpanel')).toContainText('Everything for your courses') } },
    { folder: f, name: '08-landing-pulse', title: 'Landing page: Pulse and its boundaries', ...section('#ai') },
    { folder: f, name: '08b-landing-agents', title: 'Landing page: the agents behind Pulse', ...section('#agents') },
    { folder: f, name: '08c-landing-workspace', title: 'Landing page: the agent workspace (the Comparator answering)', ...section('#workspace'), act: async p => { await showSection(p, '#workspace'); const workspace = p.locator('#workspace'); await expect(workspace.locator('.ws-stage')).toHaveAttribute('data-assembled', '', { timeout: 30000 }); await workspace.getByRole('button', { name: 'Comparator', exact: true }).click(); await expect(workspace.getByRole('list', { name: 'Conversation' }).locator('.is-agent')).toHaveCount(1); await p.waitForTimeout(1500) } },
    { folder: f, name: '09-landing-why-it-matters', title: 'Landing page: why it matters (research findings and SDGs)', ...section('#impact') },
    { folder: f, name: '10-landing-colleges', title: 'Landing page: colleges', ...section('#colleges') },
    { folder: f, name: '11-landing-community', title: 'Landing page: CIT community photographs', ...section('#campus') },
    { folder: f, name: '12-landing-faq', title: 'Landing page: frequently asked questions', ...section('#faq') },
    { folder: f, name: '13-sign-in-panel', title: 'Sign-in panel as on the hosted site', ...section('#login'), hide: '.login-quick-access' },
    // Preview personas exist only in development and in this capture build; shown separately so the hosted panel above stays exact.
    { folder: f, name: '14-preview-personas', title: 'Preview personas (local development and documentation capture only)', act: p => p.locator('.login-quick-access').scrollIntoViewIfNeeded(), element: p => p.locator('.login-quick-access'), style: LANDING_CROP },
    { folder: f, name: '15-landing-footer', title: 'Landing page: footer', ...section('footer.lp-footer') },
    { folder: f, name: '16-privacy', title: 'Privacy page', path: '/privacy', act: p => p.evaluate(() => window.scrollTo(0, 0)) }, // hash navigation keeps the landing page scroll position
    { folder: f, name: '17-terms', title: 'Terms of use page', path: '/terms', act: p => p.evaluate(() => window.scrollTo(0, 0)) }, // hash navigation keeps the landing page scroll position
    { folder: f, name: '18-server-error', title: 'Server error page', path: '/500' },
  ])
})

test('shared interface (shown as instructor)', async ({ page }) => {
  await signIn(page, 'Instructor')
  const f = '02-shared-interface'
  await run(page, 'all roles', [
    { folder: f, name: '01-top-bar', title: 'Top bar: navigation, tools, notifications, role and account', path: '/dashboard', element: p => p.locator('header.app-topbar') },
    { folder: f, name: '02-search-overlay', title: 'Search overlay (Ctrl+K)', path: '/dashboard', act: p => p.keyboard.press('Control+k') },
    { folder: f, name: '03-settings-keyboard-shortcuts', title: 'Settings - Keyboard Shortcuts', path: '/settings?tab=keyboard-shortcuts' },
    { folder: f, name: '04-language-menu', title: 'Language menu (English / Filipino)', path: '/dashboard', act: p => p.getByTitle('Language').click() },
    { folder: f, name: '05-notifications-dropdown', title: 'Notifications dropdown', path: '/dashboard', act: p => p.getByRole('button', { name: /^Notifications/ }).click() },
    { folder: f, name: '06-account-menu', title: 'Account menu', path: '/dashboard', act: p => p.getByRole('button', { name: 'Account menu' }).click() },
    // 07 (role switcher) was removed: only the owner admin account can switch views, and that needs its Google session.
    { folder: f, name: '08-notifications-page', title: 'Notifications page', path: '/notifications' },
    { folder: f, name: '09-help-and-support', title: 'Settings - Help and Support', path: '/settings?tab=help' },
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

test('system admin', async ({ page }) => {
  await signIn(page, 'System Admin')
  await run(page, 'system admin', [
    { folder: '07-system-admin', name: '01-system-console', title: 'System Admin console (preview sample data)', path: '/dashboard', fullPage: true },
    { folder: '07-system-admin', name: '02-health-and-role-coverage', title: 'System health checks and role coverage', path: '/dashboard', element: p => p.locator('.grid-2').first() },
    { folder: '07-system-admin', name: '03-manage-accounts', title: 'Manage accounts: create an account or change a role', path: '/dashboard', element: p => p.locator('section.card').filter({ has: p.getByRole('heading', { name: 'Manage accounts' }) }) },
    { folder: '07-system-admin', name: '04-audit-activity', title: 'Audit activity with All, Successes and Failures filters', path: '/dashboard', element: p => p.locator('section.card').filter({ has: p.getByRole('heading', { name: 'Audit activity' }) }) },
    { folder: '07-system-admin', name: '05-agent-activity', title: 'Agent activity: each named agent, its task, goal and tracked results', path: '/dashboard', element: p => p.locator('section.card').filter({ has: p.getByRole('heading', { name: 'Agent activity' }) }) },
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
    { folder: f, name: '11-pulse-on-course-loading', title: 'Pulse focused on Course Loading', path: '/course-loading?tab=assign', act: async p => { await p.getByRole('button', { name: 'Open Pulse assistant' }).click(); await p.getByRole('button', { name: 'Pulse options', exact: true }).click(); await p.getByRole('button', { name: 'Guide this page' }).click() } },
  ])
})

test('associate dean', async ({ page }) => {
  await signIn(page, 'Assoc. Dean')
  await run(page, 'associate dean', [
    { folder: '03-dean-and-associate-dean', name: '12-associate-dean-dashboard', title: 'Associate Dean dashboard (distinct account)', path: '/dashboard' },
    { folder: '03-dean-and-associate-dean', name: '13-performance-access-denied', title: 'Associate Dean: performance route and Pulse access denied', path: '/performance', act: async p => {
      await expect(p).toHaveURL(/dashboard/)
      await p.getByRole('button', { name: 'Open Pulse assistant' }).click()
      await p.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('open performance')
      await p.getByRole('button', { name: 'Send', exact: true }).click()
      await expect(p.getByText('Performance is not available for your role.', { exact: true })).toBeVisible()
    }, element: p => p.getByRole('dialog', { name: 'Pulse', exact: true }) },
  ])
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
    { folder: f, name: '10-student-monitoring-material-access', title: 'Student Monitoring · Material Access', path: '/student-monitoring', act: tab('Learning Material Access'), fullPage: true },
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
    { folder: f, name: '08-pulse-for-students', title: 'Pulse for students (role-scoped help)', path: '/performance?tab=overview', act: async p => { await p.getByRole('button', { name: 'Open Pulse assistant' }).click(); await p.getByRole('button', { name: 'Pulse options', exact: true }).click(); await p.getByRole('button', { name: 'Guide this page' }).click() } },
    // Appropriate use (FR-AGENT-02): the Guardian declines a request for assessment answers before any other agent works.
    { folder: f, name: '09-pulse-declines-assessment-answers', title: 'Pulse declines a request for quiz answers (Guardian)', path: '/dashboard', act: async p => { await p.getByRole('button', { name: 'Open Pulse assistant' }).click(); await p.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('Give me the answers to quiz 2'); await p.getByRole('button', { name: 'Send', exact: true }).click(); await p.getByText('Declined by the Guardian · appropriate-use rule').waitFor({ state: 'attached' }) }, element: p => p.getByRole('dialog', { name: 'Pulse', exact: true }) },
  ])
})

test.afterAll(async () => {
  await mkdir(ROOT, { recursive: true })
  const previous = process.env.SNAPSHOT_SCENES ? JSON.parse(await readFile(`${ROOT}/capture-manifest.json`, 'utf8')) : { scenes: [] }
  const replaced = new Set(manifest.map(scene => `${scene.folder}/${scene.file}`))
  // Earlier entries for renamed or removed scenes are dropped once their image is gone.
  const kept = (scene: { folder: string; file: string }) => !replaced.has(`${scene.folder}/${scene.file}`) && existsSync(`${ROOT}/${scene.folder}/${scene.file}`)
  const scenes = [...previous.scenes.filter(kept), ...manifest]
  await writeFile(`${ROOT}/capture-manifest.json`, `${JSON.stringify({ capturedAt: new Date().toISOString(), problems, scenes }, null, 2)}\n`)
  expect(manifest.filter(scene => !scene.ok), 'every selected scene must capture successfully').toEqual([])
})
