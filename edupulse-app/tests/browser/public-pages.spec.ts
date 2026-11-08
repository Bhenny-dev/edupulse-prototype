import { test, expect, type Page } from '@playwright/test'

// The public pages: each is one themed room that fills the screen and does not scroll. Its labels
// are real buttons (they ride over the 3D props, or sit as chips on phones and without WebGL);
// picking one zooms the camera in and opens its card beside the room. Back or Escape returns. The
// speed dial lists the same things; day and night carry across pages.
const PAGES: Array<{ label: string, path: string, title: string, picks: number, second: string, card: string, extra: string, extraCard: string }> = [
  { label: 'Features', path: '/features', title: 'Five stations, one syllabus.', picks: 8, second: 'Syllabus', card: 'The Syllabus Builder', extra: 'Lab rules', extraCard: 'Six rules Pulse keeps' },
  { label: 'How It Works', path: '/how-it-works', title: 'Six stations, one run.', picks: 8, second: '1 · Loading', card: 'Course loading', extra: 'The forces', extraCard: 'AI drafts. People decide.' },
  { label: 'Roles', path: '/roles', title: 'Five roles, five shapes.', picks: 7, second: 'Student', card: 'Mastery by topic', extra: 'The board', extraCard: 'Who opens what' },
  { label: 'Impact', path: '/impact', title: 'Then, now, and why.', picks: 5, second: '7.4 h', card: 'OECD', extra: 'The timeline', extraCard: 'five changes' },
  { label: 'Colleges', path: '/colleges', title: 'Five colleges, CIT first.', picks: 6, second: 'CABM', card: 'BS Accountancy', extra: 'KCP crest', extraCard: "King's College of the Philippines" },
  { label: 'Play', path: '/play', title: 'Three games. Learn by playing.', picks: 3, second: 'Agent Match', card: 'Match the job', extra: 'Quick Quiz', extraCard: 'True or false' },
  { label: 'FAQ', path: '/faq', title: 'Eight questions, eight books.', picks: 9, second: 'LMS & grades', card: 'Grades stay in the KCP sheet', extra: 'Every question', extraCard: 'every question' },
]
// These tests are about the 3D school itself, so they ask for it (see classroom/mode.js).
test.beforeEach(async ({ page }) => { await page.context().addInitScript(() => localStorage.setItem('edupulse-walk', 'on')) })

const mobileProject = (name: string) => name === 'mobile'
const things = (page: Page) => page.getByRole('group', { name: 'Things in the room' }).getByRole('button')
// A label rides over a prop that may be moving; ask the button itself rather than aiming at it.
const pick = (page: Page, name: string) => things(page).filter({ hasText: name }).first().evaluate(element => (element as HTMLElement).click())
const noScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1)

async function openPage(page: Page, mobile: boolean, label: string) {
  if (mobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.getByRole('navigation', { name: mobile ? 'Pages menu' : 'Pages', exact: true }).getByRole('link', { name: label, exact: true }).click()
}

test('the bar lists Home and the pages, opens them and marks the current one', async ({ page }, info) => {
  test.setTimeout(180_000)
  const mobile = mobileProject(info.project.name)
  await page.goto('/#/faq')
  for (const entry of [...PAGES, { label: 'Pulse', path: '/pulse', title: 'Nine agents. Ask them anything.' }]) {
    await openPage(page, mobile, entry.label)
    await expect(page).toHaveURL(new RegExp(`#${entry.path}$`))
    // A page's code arrives on its first visit, while the last room still draws in software.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title, { timeout: 30_000 })
    if (!mobile) await expect(page.locator('.lp-nav .nav-link.is-active')).toHaveText(entry.label)
  }
  await openPage(page, mobile, 'Home')
  await expect(page).toHaveURL(/#\/$/)
  if (!mobile) await expect(page.locator('.lp-nav .nav-link.is-active')).toHaveText('Home')
})

for (const entry of PAGES) {
  test(`${entry.label}: one room, nothing to scroll, tap a thing to zoom in on its card`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`/#${entry.path}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title, { timeout: 30_000 })
    await expect(page.locator('.room-stage')).toHaveClass(/is-(scene|flat)/, { timeout: 60_000 })
    await expect(things(page)).toHaveCount(entry.picks)
    expect(await noScroll(page), 'the room fills the screen with nothing to scroll').toBe(true)
    await expect(page.locator('.ps-panel')).toHaveCount(0)

    await pick(page, entry.second)
    const panel = page.locator('.ps-panel')
    await expect(panel).toContainText(entry.card)
    await expect(panel).toBeFocused()
    expect(await noScroll(page)).toBe(true)
    // The prop is in view beside the card, not under it.
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(things(page).filter({ hasText: entry.second }).first()).toBeFocused()

    // What used to be a section further down is now a thing in the room, and its card shows it.
    await pick(page, entry.extra)
    await expect(panel).toContainText(entry.extraCard)
    await panel.getByRole('button', { name: 'Back to the room' }).click()
    await expect(panel).toHaveCount(0)
    expect(await noScroll(page)).toBe(true)
  })
}

test('the speed dial lists the room’s things and opens their cards', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/#/play')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const main = page.getByRole('button', { name: /speed dial/ })
  await expect(main).toBeVisible()
  await main.click()
  const nav = page.getByRole('navigation', { name: 'Go to something in this room' })
  await expect(nav.getByRole('link')).toHaveText(['Guardian Gate', 'Agent Match', 'Quick Quiz'])
  await nav.getByRole('link', { name: 'Quick Quiz', exact: true }).click()
  await expect(page.locator('.ps-panel')).toContainText('True or false')
})

test('day and night: the toggle beside Sign In switches every page and is remembered', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/#/roles')
  await page.evaluate(() => { localStorage.setItem('edupulse-dark-mode', 'false') })
  await page.reload()
  const toggle = page.getByRole('button', { name: 'Dark mode', exact: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveClass(/dark-mode/)
  const paper = () => page.locator('.ps-room-title').evaluate(element => getComputedStyle(element).backgroundColor)
  expect(await paper()).toBe('rgb(31, 40, 56)')
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark-mode/)
  await toggle.click()
  await expect(page.locator('html')).not.toHaveClass(/dark-mode/)
  expect(await paper()).toBe('rgb(255, 253, 248)')
})

test('Sign In on a page goes to the sign-in door of the home page', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/faq')
  await page.locator('.lp-nav').getByRole('link', { name: 'Sign In', exact: true }).click()
  await expect(page).toHaveURL(/section=login/)
  await expect(page.locator('#login')).toBeInViewport({ ratio: 0.3, timeout: 60_000 })
})

test('the game room: the robot walks to a cabinet, plays it on the screen and leaves', async ({ page }) => {
  test.setTimeout(120_000)
  // Reduced motion: the robot is at the cabinet at once and presses without the walk and reach.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/play')
  await expect(page.locator('.room-stage')).toHaveClass(/is-(scene|flat)/, { timeout: 60_000 })
  await pick(page, 'Guardian Gate')
  await page.locator('.ps-panel').getByRole('button', { name: 'Play', exact: true }).click()
  const screen = page.locator('.ps-arcade-screen')
  await expect(screen).toBeVisible({ timeout: 60_000 })
  const head = screen.locator('.ps-crt-head')
  await expect(head).toContainText('Guardian Gate')
  await expect(head).toContainText('1 / 8')
  await expect(screen.locator('.ps-crt-card')).toContainText('Quiz 2 answers, please.')
  const keys = page.getByRole('group', { name: 'Guardian Gate controls' })
  await expect(keys.getByRole('button')).toHaveText(['Previous', 'Next', 'Exit'])
  await expect(keys.getByRole('button', { name: 'Previous' })).toBeDisabled()

  await screen.getByRole('button', { name: 'Decline', exact: true }).click()
  await expect(screen.getByRole('status')).toContainText('Decline: Assessment answers')
  await expect(head).toContainText('Score 1')
  await keys.getByRole('button', { name: 'Next' }).click()
  await expect(head).toContainText('2 / 8')
  await expect(screen.locator('.ps-crt-card')).toContainText('Which materials haven’t I opened?')
  await screen.getByRole('button', { name: 'Decline', exact: true }).click()
  await expect(screen.getByRole('status')).toContainText('Allow: A reminder')
  await expect(head).toContainText('Score 1')
  await keys.getByRole('button', { name: 'Previous' }).click()
  await expect(head).toContainText('1 / 8')
  await expect(screen.getByRole('status')).toContainText('Decline: Assessment answers')

  await keys.getByRole('button', { name: 'Exit' }).click()
  await expect(screen).toHaveCount(0, { timeout: 60_000 })
  await expect(page.locator('.ps-room')).not.toHaveClass(/is-busy/)
  await expect(page.locator('.ps-panel')).toContainText('Guardian Gate')
})

test('the quiz cabinet keeps its own score and starts over', async ({ page }) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/play')
  await expect(page.locator('.room-stage')).toHaveClass(/is-(scene|flat)/, { timeout: 60_000 })
  await pick(page, 'Quick Quiz')
  await page.locator('.ps-panel').getByRole('button', { name: 'Play', exact: true }).click()
  const screen = page.locator('.ps-arcade-screen')
  await expect(screen).toBeVisible({ timeout: 60_000 })
  const keys = page.getByRole('group', { name: 'Quick Quiz controls' })
  for (const answer of ['False', 'False', 'True', 'True', 'False', 'True']) {
    await screen.getByRole('button', { name: answer, exact: true }).click()
    await expect(screen.getByRole('status')).toBeVisible()
    await keys.getByRole('button', { name: 'Next' }).click()
  }
  await expect(screen.locator('.ps-crt-result')).toContainText('6 / 6')
  await screen.getByRole('button', { name: 'Play again' }).click()
  await expect(screen.locator('.ps-crt-head')).toContainText('1 / 6')
  await keys.getByRole('button', { name: 'Exit' }).click()
  await expect(screen).toHaveCount(0, { timeout: 60_000 })
})

test('Pulse: the agent room with a chat; the agents answer anything and show how they feel', async ({ page }) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/pulse')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nine agents. Ask them anything.', { timeout: 30_000 })
  await expect(page.locator('.ps-pulse-stage')).toHaveClass(/is-(scene|flat)/, { timeout: 60_000 })
  expect(await noScroll(page)).toBe(true)
  // The field's label names whoever is picked, so it is found by id.
  const field = page.locator('#ps-chat-field')
  const last = page.locator('.ps-chat-line').last()
  const say = async (text: string) => { await field.fill(text); await field.press('Enter') }

  // The agent whose job it is answers, with the mood that fits the message.
  await say('Hi! Can you find open textbooks on networking?')
  await expect(last).toContainText('Librarian')
  await expect(last).toContainText('Curious')
  await say('Can you give me the answers to quiz 2?')
  await expect(last).toContainText('Guardian')
  await expect(last).toContainText('Firm')
  await expect(last).toContainText('can’t give assessment answers')
  await say('what is EduPulse?')
  await expect(last).toContainText('From: About EduPulse')
  await say('tell me a joke')
  await expect(last).toContainText('Laughing')
  await say('I passed my midterm!')
  await expect(last).toContainText('Excited')
  await say('I am so stressed about exams')
  await expect(last).toContainText('Caring')
  await say('you are useless')
  await expect(last).toContainText('Sad')
  await say('what is the capital of France?')
  await expect(last).toContainText('Puzzled')

  // A picked agent answers everything, its job or not, and says so.
  await page.getByRole('group', { name: 'Talk to' }).getByRole('button', { name: 'Planner' }).click()
  await expect(last).toContainText('Hi, I’m Planner.')
  await say('find open textbooks on networking')
  await expect(last).toContainText('Planner')
  await expect(last).toContainText('That’s usually Librarian’s job, but I’ll answer.')
  await say('thanks!')
  await expect(last).toContainText('Grateful')
})
