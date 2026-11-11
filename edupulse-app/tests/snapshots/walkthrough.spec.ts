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
// A capture taller than the window can wait for a frame that never comes; a repaint lets the next attempt through.
async function capture(page: Page, shoot: () => Promise<unknown>) {
  for (let attempt = 1; ; attempt++) {
    try { return await shoot() } catch (error) {
      if (attempt === 3 || !/Timeout/.test((error as Error).message)) throw error
      await page.evaluate(() => new Promise(done => { document.body.style.outline = '1px solid transparent'; requestAnimationFrame(() => { document.body.style.outline = ''; requestAnimationFrame(done) }) }))
    }
  }
}
async function settle(page: Page) { await page.waitForLoadState('networkidle').catch(() => undefined); await page.waitForTimeout(350) }
async function run(page: Page, role: string, scenes: Scene[]) {
  for (const scene of scenes) {
    if (process.env.SNAPSHOT_SCENES && !new RegExp(process.env.SNAPSHOT_SCENES).test(`${scene.folder}/${scene.name}`)) continue
    const file = `${scene.name}.png`
    try {
      await page.keyboard.press('Escape').catch(() => undefined)
      if (scene.path) { await page.goto(`/#${scene.path}`); await settle(page) }
      if (scene.folder === '03-dean-and-associate-dean' && scene.name === '02-course-loading-loaded-courses') await expect(page.getByRole('heading', {name:'Course loads',exact:true})).toBeVisible()
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
      await capture(page, () => target.screenshot({ path: `${ROOT}/${scene.folder}/${file}`, animations: 'disabled', fullPage: scene.fullPage, timeout: 45_000, ...(style ? { style } : {}) }))
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
  // Lazy pictures below the fold would stall a tall element's screenshot: load and decode this section's now.
  await page.evaluate(async selector => {
    const pictures = [...document.querySelectorAll(`${selector} img`)] as HTMLImageElement[]
    pictures.forEach(picture => { picture.loading = 'eager' })
    await Promise.all(pictures.map(picture => picture.decode().catch(() => undefined)))
  }, selector)
  await page.waitForTimeout(400)
}
// Section images: the fixed bar and the speed dial stay out of the crop.
const LANDING_CROP = '.lp-nav{position:static !important}.room-dial{display:none !important}'
const section = (selector: string) => ({ act: (p: Page) => showSection(p, selector), element: (p: Page) => p.locator(selector), style: LANDING_CROP })

test('public site', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const f = '01-public-site'
  await run(page, 'public', [
    { folder: f, name: '01-landing-hero', title: 'Landing page: hero, institution lockup and primary actions', path: '/' },
    { folder: f, name: '02-landing-navigation', title: 'The bar after scrolling: the pages, day and night, Sign In and reading progress', act: p => showSection(p, '#features'), element: p => p.locator('header.lp-nav') },
    { folder: f, name: '03-landing-why-edupulse', title: 'Landing page: why EduPulse (course preparation today and with EduPulse)', ...section('#problem') },
    { folder: f, name: '04-landing-features', title: 'Landing page: features (four parts of one workflow)', ...section('#features') },
    { folder: f, name: '05-landing-how-it-works', title: 'Landing page: how it works (six-phase timeline)', ...section('#flow') },
    { folder: f, name: '06-landing-roles', title: 'Landing page: roles (Instructor tab)', ...section('#roles') },
    { folder: f, name: '07-landing-roles-student', title: 'Landing page: roles (Student tab)', ...section('#roles'), act: async p => { await showSection(p, '#roles'); await p.getByRole('tab', { name: 'Student', exact: true }).click(); await expect(p.getByRole('tabpanel')).toContainText('Everything for your courses') } },
    { folder: f, name: '08-landing-pulse', title: 'Landing page: Pulse and its boundaries', ...section('#ai') },
    { folder: f, name: '08b-landing-agents', title: 'Landing page: the agents behind Pulse', ...section('#agents') },
    { folder: f, name: '08c-landing-workspace', title: 'Landing page: the agent workspace (the Comparator answering)', ...section('#workspace'), act: async p => { await showSection(p, '#workspace'); const workspace = p.locator('#workspace'); await expect(workspace.locator('.ws-stage')).toHaveAttribute('data-assembled', '', { timeout: 30000 }); await workspace.getByRole('button', { name: 'Comparator', exact: true }).click(); await expect(workspace.locator('.ws-answer')).toContainText('I’ll line them up'); await p.waitForTimeout(1500) } },
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

// The walk through the 3D school, as a visitor with motion allowed sees it: each room at rest.
const room = (id: string) => async (page: Page) => {
  await page.evaluate(id => {
    const element = document.getElementById(id) as HTMLElement
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY + 1)
  }, id)
  await expect.poll(() => page.locator(`#${id} .room-view`).evaluate(element => (element as HTMLElement).style.transform), { timeout: 60_000 }).toBe('translate3d(0px, 0px, 0px)')
  // The pops have played and the photographs and textures of this room have arrived.
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(2500)
}
// The agents section holds the screen while its timeline follows the scroll: 1.6 units for the clock
// to become the scope, one per agent and 2.4 for the window to open out (see AgentsSection.jsx).
const agentsAt = (time: number) => async (page: Page) => {
  await page.evaluate(time => {
    const element = document.getElementById('agents') as HTMLElement
    const spacer = element.parentElement as HTMLElement
    const start = spacer.getBoundingClientRect().top + window.scrollY
    const distance = spacer.offsetHeight - element.offsetHeight
    window.scrollTo(0, Math.round(start + (time / (1.6 + 9 + 2.4)) * distance))
  }, time)
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(7000)
}
// The flight from the hall out through its window to the yard, half way: the lawn with its students.
const windowOnYard = async (page: Page) => {
  await page.evaluate(() => {
    const top = (id: string) => (document.getElementById(id) as HTMLElement).getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, Math.round(top('colleges') + 0.5 * (top('campus') - top('colleges'))))
  })
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(7000)
}
test('public site: the walk through the 3D school', async ({ page }) => {
  await page.context().addInitScript(() => localStorage.setItem('edupulse-walk', 'on'))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.world-canvas')).toHaveClass(/is-ready/, { timeout: 120_000 })
  const f = '01-public-site'
  await run(page, 'public', [
    { folder: f, name: '19-walk-campus', title: 'The walk: the hero on the campus lawn, with the KCP building', act: async p => { await p.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.85) + 8)); await p.waitForTimeout(6000) } },
    { folder: f, name: '20-walk-bulletin-board', title: 'The walk: Why EduPulse on the corridor bulletin board', act: room('problem') },
    { folder: f, name: '21-walk-blackboard', title: 'The walk: Features on the classroom blackboard', act: room('features') },
    { folder: f, name: '22-walk-class-seats', title: 'The walk: How it works on the class seats, from above', act: room('flow') },
    { folder: f, name: '23-walk-classmates', title: 'The walk: Roles with the classmates on their tier', act: room('roles') },
    { folder: f, name: '24-walk-teachers-desk', title: "The walk: Pulse at the teacher's end of the classroom", act: room('ai') },
    { folder: f, name: '24b-walk-clock-letters', title: 'The walk: the wall clock grows and its hands come apart into letters', act: agentsAt(0.8) },
    { folder: f, name: '24c-walk-scope-agent', title: 'The walk: the scope of nine rings with the Guardian in the lens', act: agentsAt(1.6 + 0.5) },
    { folder: f, name: '24d-walk-agents-line-up', title: 'The walk: the nine agents line up as the window opens onto the workspace', act: agentsAt(1.6 + 9 + 1.1) },
    { folder: f, name: '25-walk-gallery', title: 'The walk: Why it matters in frames along the gallery wall', act: room('impact') },
    { folder: f, name: '26-walk-front-stage', title: 'The walk: Colleges on the front stage', act: room('colleges') },
    { folder: f, name: '26b-walk-yard-window', title: 'The walk: the hall window onto the yard, where students picnic, stroll, toss a ball and eat', act: windowOnYard },
    { folder: f, name: '27-walk-courtyard', title: 'The walk: community photographs on lines above the KCP building', act: room('campus') },
    { folder: f, name: '28-walk-notebook', title: 'The walk: FAQ in an open notebook on the desk', act: room('faq') },
    { folder: f, name: '29-walk-door', title: 'The walk: sign-in on the door of the study', act: room('login') },
  ])
})

// The public pages: each a themed room with robots and a cat, captured with motion allowed once the
// room is drawn and its labels sit over their props. Then night (the app's dark mode) on the walk
// and on a page, and the speed dial open on a page.
// A label rides over a prop that may be moving, so the button itself is asked rather than aimed at.
const things = (page: Page) => page.getByRole('group', { name: 'Things in the room' }).getByRole('button')
const themed = (path: string, pick?: string) => async (page: Page) => {
  await page.goto(`/#${path}`)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('.room-stage')).toHaveClass(/is-scene/, { timeout: 120_000 })
  if (pick) await things(page).filter({ hasText: pick }).first().evaluate(element => (element as HTMLElement).click())
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(3500)
}
// The Pulse page is the agents' studio from the home page with a chat beside it.
const pulseChat = (...lines: string[]) => async (page: Page) => {
  await page.goto('/#/pulse')
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('.ps-pulse-stage')).toHaveClass(/is-scene/, { timeout: 120_000 })
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(3500)
  const field = page.locator('#ps-chat-field')
  for (const line of lines) { await field.fill(line); await field.press('Enter'); await page.waitForTimeout(2500) }
}
// The robot walks to the cabinet, reaches for the keys and plays on the screen.
const playAtCabinet = async (page: Page) => {
  await themed('/play', 'Guardian Gate')(page)
  await page.locator('.ps-panel').getByRole('button', { name: 'Play', exact: true }).click()
  const screen = page.locator('.ps-arcade-screen')
  await expect(screen).toBeVisible({ timeout: 120_000 })
  await screen.getByRole('button', { name: 'Decline', exact: true }).click()
  await expect(screen.getByRole('status')).toContainText('Decline: Assessment answers')
  await page.waitForTimeout(3000)
}
// The black cat sits on the bench of the Colleges room. Three quick taps annoy it: it bolts off the
// bench with an angry mark and follows the pointer along the floor while the pointer is near.
const annoyTheCat = async (page: Page) => {
  await page.goto('/#/faq')
  await themed('/colleges')(page)
  await page.mouse.move(2, 400)
  await page.waitForTimeout(2500)
  await page.mouse.move(650, 534)
  await page.waitForTimeout(300)
  for (let i = 0; i < 3; i++) { await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150) }
  await page.mouse.move(430, 660, { steps: 6 })
  await page.waitForTimeout(2500)
}
const night = async (page: Page, on: boolean) => { await page.evaluate(on => localStorage.setItem('edupulse-dark-mode', String(on)), on); await page.reload() }
test('public site: the themed pages, night and the dial', async ({ page }) => {
  await page.context().addInitScript(() => localStorage.setItem('edupulse-walk', 'on'))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#/features')
  await night(page, false)
  const f = '01-public-site'
  await run(page, 'public', [
    { folder: f, name: '30-page-features', title: 'Features page: the science lab, one station per feature', act: themed('/features') },
    { folder: f, name: '30b-page-features-zoom', title: 'Features page: the Courseware flask zoomed in, its card open beside it', act: themed('/features', 'Courseware') },
    { folder: f, name: '31-page-how-it-works', title: 'How It Works page: the physics room, the phases along a marble run', act: themed('/how-it-works') },
    { folder: f, name: '32-page-roles', title: 'Roles page: the math room, one shape per role', act: themed('/roles') },
    { folder: f, name: '33-page-pulse', title: 'Pulse page: the agents studio with the chat beside it', act: pulseChat() },
    { folder: f, name: '34-page-impact', title: 'Impact page: the history room, findings as exhibits and the goals on a globe', act: themed('/impact') },
    { folder: f, name: '35-page-colleges', title: 'Colleges page: the gallery, one framed picture per college', act: themed('/colleges') },
    { folder: f, name: '36-page-play', title: 'Play page: the game room, one cabinet per game', act: themed('/play') },
    { folder: f, name: '37-page-faq', title: 'FAQ page: the library, one book per question', act: themed('/faq') },
    { folder: f, name: '38-page-roles-board', title: 'Roles page: the board, which pages each role opens', act: themed('/roles', 'The board') },
    { folder: f, name: '39-page-pulse-chat', title: 'Pulse page: the Guardian answers a request for quiz answers, firmly', act: pulseChat('Can you give me the answers to quiz 2?') },
    { folder: f, name: '40-page-play-cabinet', title: 'Play page: the robot at the Guardian Gate cabinet, playing on its screen', act: playAtCabinet },
    { folder: f, name: '41-page-dial', title: 'A page with the speed dial open: the things in the room and the pause control', keepPointer: true, act: async p => { await p.goto('/#/faq'); await themed('/play')(p); await p.getByRole('button', { name: /speed dial/ }).click(); await p.waitForTimeout(700) } },
    { folder: f, name: '41b-page-cat', title: 'Colleges page: the black cat after three quick taps, off its bench with an angry mark, following the pointer', keepPointer: true, act: annoyTheCat },
    { folder: f, name: '42-night-page-features', title: 'Night: the science lab with moonlight and the lamps on', act: async p => { await p.goto('/#/features'); await night(p, true); await themed('/features')(p) } },
    { folder: f, name: '43-night-walk-campus', title: 'Night: the hero on the campus lawn, stars and the moon over the KCP building', act: async p => { await p.goto('/'); await night(p, true); await expect(p.locator('.world-canvas')).toHaveClass(/is-ready/, { timeout: 120_000 }); await p.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.85) + 8)); await p.waitForTimeout(6000) } },
    { folder: f, name: '44-night-walk-teachers-desk', title: "Night: Pulse at the teacher's end of the classroom", act: room('ai') },
  ])
  await night(page, false)
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
    { folder: f, name: '18-pulse-dwell-help', title: '“Ask Pulse about this” hover badge', path: '/syllabus?tab=builder', act: async p => { await p.getByRole('combobox', { name: 'Course', exact: true }).hover(); await expect(p.locator('.pulse-dwell-help')).toBeVisible({ timeout: 5000 }) }, keepPointer: true },
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
    { folder: f, name: '04-monitor-syllabus-status', title: 'Monitor - Syllabus & Delivery', path: '/monitor?tab=overview', fullPage: true },
    { folder: f, name: '06-monitor-student-oversight', title: 'Monitor · Student Oversight', path: '/monitor?tab=students', fullPage: true },
    { folder: f, name: '07-monitor-alerts', title: 'Monitor · Alerts', path: '/monitor?tab=alerts', fullPage: true },
    { folder: f, name: '08-course-records', title: 'Dean Course records', path: '/records', fullPage: true },
    { folder: f, name: '09-students-by-year', title: 'Dean Students grouped by year', path: '/students', fullPage: true },
    { folder: f, name: '10-course-syllabi', title: 'Dean Course syllabi', path: '/records?tab=syllabi', fullPage: true },
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
    { folder: f, name: '02-monitoring-course-students', title: 'Student Monitoring · Students', path: '/student-monitoring?tab=students', fullPage: true },
    { folder: f, name: '03-syllabus-my-syllabus', title: 'Syllabus · My Syllabus (approved uploads, saved syllabi and unified history)', path: '/syllabus?tab=mine', fullPage: true },
    { folder: f, name: '04-syllabus-shared-repository', title: 'Syllabus · Shared Repository', path: '/syllabus?tab=mine', act: tab('Shared Repository') },
    { folder: f, name: '05-syllabus-builder', title: 'Syllabus Builder (upload or build the 7 sections)', path: '/syllabus?tab=builder', act: async p => { await expect(p.getByRole('heading', {name:'Syllabus Builder',exact:true})).toBeVisible(); await expect(p.getByRole('button', {name:'Load curriculum outline',exact:true})).toHaveCount(0) } },
    // The outline headings stick under the top bar while scrolling; in a capture taller than the window they stay at the top of the table.
    { folder: f, name: '06-syllabus-builder-course-outline', title: 'Syllabus Builder · Section 5 Course Outline', path: '/syllabus?tab=builder', element: p => p.locator('[data-section="5"]'), style: '.outline-table thead th{position:static !important}' },
    { folder: f, name: '07-courseware-my-courseware', title: 'Course · combined course list and approved syllabus intake', path: '/courseware', fullPage: true },
    { folder: f, name: '08-courseware-builder', title: 'Courseware · weekly workspace', path: '/courseware?course=syl-1', fullPage: true },
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
    { folder: f, name: '02-my-materials', title: 'My Courses · course list', path: '/courseware', fullPage: true },
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
