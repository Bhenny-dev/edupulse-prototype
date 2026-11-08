import { test, expect, type Page } from '@playwright/test'

// The public pages: one themed room each, opened from the bar. Each room's labels are real buttons
// (they ride over the 3D props, or sit as chips on phones and without WebGL); picking one fills the
// card beside the room. The speed dial lists the page's parts; day and night carry across pages.
const PAGES: Array<{ label: string, path: string, title: string, picks: number, second: string, card: string }> = [
  { label: 'Features', path: '/features', title: 'Five stations, one syllabus.', picks: 5, second: 'Syllabus', card: 'The Syllabus Builder' },
  { label: 'How It Works', path: '/how-it-works', title: 'Six stations, one run.', picks: 6, second: '1 · Loading', card: 'Course loading' },
  { label: 'Roles', path: '/roles', title: 'Five roles, five shapes.', picks: 5, second: 'Student', card: 'Mastery by topic' },
  { label: 'Pulse', path: '/pulse', title: 'Nine agents, one answer.', picks: 9, second: 'Planner', card: 'Plans the searches' },
  { label: 'Impact', path: '/impact', title: 'Then, now, and why.', picks: 4, second: '7.4 h', card: 'OECD' },
  { label: 'Colleges', path: '/colleges', title: 'Five colleges, CIT first.', picks: 5, second: 'CABM', card: 'BS Accountancy' },
  { label: 'Play', path: '/play', title: 'Three games. Learn by playing.', picks: 3, second: 'Agent Match', card: 'Match the job' },
  { label: 'FAQ', path: '/faq', title: 'Eight questions, eight books.', picks: 8, second: 'LMS & grades', card: 'Grades stay in the KCP sheet' },
]
// These tests are about the 3D school itself, so they ask for it (see classroom/mode.js).
test.beforeEach(async ({ page }) => { await page.context().addInitScript(() => localStorage.setItem('edupulse-walk', 'on')) })

const mobileProject = (name: string) => name === 'mobile'

async function openPage(page: Page, mobile: boolean, label: string) {
  if (mobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await page.getByRole('navigation', { name: mobile ? 'Pages menu' : 'Pages', exact: true }).getByRole('link', { name: label, exact: true }).click()
}

test('the bar opens the pages and marks the current one', async ({ page }, info) => {
  test.setTimeout(180_000)
  const mobile = mobileProject(info.project.name)
  await page.goto('/#/faq')
  for (const entry of PAGES) {
    await openPage(page, mobile, entry.label)
    await expect(page).toHaveURL(new RegExp(`#${entry.path}$`))
    // A page's code arrives on its first visit, while the last room still draws in software.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title, { timeout: 30_000 })
    if (!mobile) await expect(page.locator('.lp-nav .nav-link.is-active')).toHaveText(entry.label)
  }
})

for (const entry of PAGES) {
  test(`${entry.label}: its room, its picks and the card for the one picked`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`/#${entry.path}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title, { timeout: 30_000 })
    await expect(page.locator('.room-stage')).toHaveClass(/is-(scene|flat)/, { timeout: 60_000 })
    const picks = page.getByRole('group', { name: 'Pick something in the room' }).getByRole('button')
    await expect(picks).toHaveCount(entry.picks)
    await expect(picks.first()).toHaveAttribute('aria-pressed', 'true')
    await picks.filter({ hasText: entry.second }).click()
    await expect(picks.filter({ hasText: entry.second })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.ps-detail')).toContainText(entry.card)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll').toBe(true)
  })
}

test('the speed dial lists the page’s parts and reaches them', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/#/play')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, window.innerHeight))
  const main = page.getByRole('button', { name: /speed dial/ })
  await expect(main).toBeVisible()
  await main.click()
  const stops = page.getByRole('navigation', { name: 'Jump to a part of this page' }).getByRole('link')
  await expect(stops).toHaveText(['Back to top', 'Game room', 'Guardian Gate', 'Agent Match', 'Quick Quiz'])
  await stops.filter({ hasText: 'Quick Quiz' }).click()
  await expect.poll(() => page.locator('#quiz').evaluate(element => Math.abs(element.getBoundingClientRect().top - (document.querySelector('.lp-nav') as HTMLElement).getBoundingClientRect().bottom))).toBeLessThan(24)
  await main.click()
  await page.getByRole('navigation', { name: 'Jump to a part of this page' }).getByRole('link', { name: 'Back to top', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(4)
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
  const paper = () => page.locator('.ps-hero-copy').evaluate(element => getComputedStyle(element).backgroundColor)
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

test('the games keep score and start over', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/#/play')
  const gate = page.locator('#gate')
  await gate.scrollIntoViewIfNeeded()
  await expect(gate.locator('.ps-game-card')).toContainText('Quiz 2 answers, please.')
  await gate.getByRole('button', { name: 'Decline', exact: true }).click()
  await expect(gate.getByRole('status')).toContainText('Declined: Assessment answers')
  await expect(gate.locator('.ps-game-progress')).toContainText('Score 1')
  await gate.getByRole('button', { name: 'Decline', exact: true }).click()
  await expect(gate.getByRole('status')).toContainText('Allowed: A reminder')
  await expect(gate.locator('.ps-game-progress')).toContainText('Score 1')
  const quiz = page.locator('#quiz')
  for (const answer of ['False', 'False', 'True', 'True', 'False', 'True']) await quiz.getByRole('button', { name: answer, exact: true }).click()
  await expect(quiz.locator('.ps-game-result')).toContainText('6 / 6')
  await quiz.getByRole('button', { name: 'Play again' }).click()
  await expect(quiz.locator('.ps-game-progress')).toContainText('1 / 6')
})
