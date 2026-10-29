import { test, expect, type Page } from '@playwright/test'

// Landing page controls: section links (the ☰ menu on phones), role tabs by keyboard,
// one open FAQ answer, drifting photographs that pause on hover, focus or tap, two pinned
// scenes and the phase timeline on desktop, the skip link, no horizontal scrolling, and
// the complete still layout with reduced motion.
async function openSection(page: Page, mobile: boolean, name: string) {
  if (mobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const nav = page.getByRole('navigation', { name: mobile ? 'Landing page sections menu' : 'Landing page sections', exact: true })
  await nav.getByRole('link', { name, exact: true }).click()
  if (mobile) await expect(page.getByRole('navigation', { name: 'Landing page sections menu' })).toHaveCount(0)
}

test('section links, role tabs and FAQ work without horizontal overflow', async ({ page }, info) => {
  test.setTimeout(60_000) // the development server compiles the page on the first visit
  const mobile = info.project.name === 'mobile'
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('One shared home for')

  await openSection(page, mobile, 'Colleges')
  await expect(page.locator('#colleges')).toBeInViewport()
  await expect(page.locator('#colleges')).toContainText('Now serving')
  await expect(page.locator('#colleges .college-card')).toHaveCount(4)

  await openSection(page, mobile, 'Roles')
  const instructor = page.getByRole('tab', { name: 'Instructor', exact: true })
  await expect(instructor).toHaveAttribute('aria-selected', 'true')
  await instructor.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('tab', { name: 'Student', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('Pulse will not answer or hint at assessment items.')
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'System Admin', exact: true })).toBeFocused()
  await expect(page.getByRole('tabpanel')).toContainText('Accounts, health and accountability')
  await page.keyboard.press('Home')
  await expect(instructor).toHaveAttribute('aria-selected', 'true')

  await openSection(page, mobile, 'FAQ')
  const first = page.getByRole('button', { name: 'Who can sign in to EduPulse?' })
  const second = page.getByRole('button', { name: 'Does EduPulse replace our LMS or the official grading sheet?' })
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await second.click()
  await expect(second).toHaveAttribute('aria-expanded', 'true')
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('grades stay in the official KCP grading sheet', { exact: false }).first()).toBeVisible()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('the photographs drift and pause on hover, keyboard focus or a tap', async ({ page }, info) => {
  test.setTimeout(60_000)
  const mobile = info.project.name === 'mobile'
  await page.goto('/')
  // There is no button: hover (mouse), keyboard focus or a tap (touch) eases the rows to a
  // stop, so the movement can always be paused (WCAG 2.2.2).
  const rail = page.getByRole('region', { name: 'CIT community photographs' })
  const track = page.locator('.photo-track').first()
  await track.scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: /pause photos/i })).toHaveCount(0)
  const x = () => track.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m41)
  const stopsMoving = async () => { await page.waitForTimeout(1600); const held = await x(); await page.waitForTimeout(800); expect(Math.abs((await x()) - held)).toBeLessThan(1) }
  const start = await x(); await page.waitForTimeout(800)
  expect(await x()).not.toBe(start)
  if (mobile) {
    await rail.tap()
    await expect(rail).toHaveAttribute('data-paused', 'true')
    await stopsMoving()
    await rail.tap()
    await expect(rail).toHaveAttribute('data-paused', 'false')
  } else {
    await track.hover()
    await stopsMoving()
    await page.mouse.move(2, 2)
    await expect(rail).toHaveAttribute('data-paused', 'false')
    await rail.focus()
    await expect(rail).toHaveAttribute('data-paused', 'true')
    await stopsMoving()
  }
})

test('only the hero and the product chapters pin; the six phases draw a timeline', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'phones use the still, stacked layout')
  await page.goto('/')
  await expect(page.locator('#features')).toHaveClass(/is-live/)
  await expect(page.locator('#features .reel-chapter')).toHaveCount(4)
  await expect(page.locator('.pin-spacer')).toHaveCount(2)
  await expect(page.locator('#flow .pin-spacer')).toHaveCount(0)

  const flow = page.locator('#flow')
  await expect(flow).toHaveClass(/is-live/)
  await expect(flow.locator('.rail-panel')).toHaveCount(6)
  await expect(flow.locator('.rail-line')).toHaveCount(5)
  await expect(flow.locator('.rail-panel.is-reached')).toHaveCount(0)
  // Scrolling through the section draws the line and lights every phase in turn.
  const box = await flow.evaluate(element => { const rect = element.getBoundingClientRect(); return { top: rect.top + window.scrollY, height: rect.height } })
  for (let y = box.top - 600; y <= box.top + box.height; y += 250) { await page.evaluate(to => window.scrollTo({ top: to, behavior: 'instant' }), y); await page.waitForTimeout(60) }
  await expect(flow.locator('.rail-panel.is-reached')).toHaveCount(6)
  expect(await flow.locator('.rail-line span').first().evaluate(element => new DOMMatrix(getComputedStyle(element).transform).d)).toBeGreaterThan(0.99)
})

test('the skip link moves focus past the hero and stays on the landing page', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'keyboard navigation')
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  // HashRouter would read "#main-content" as a route; the link moves focus instead.
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.locator('.landing-page')).toBeVisible()
  expect(page.url()).not.toContain('main-content')
})

test('no horizontal scrolling at phone, tablet, laptop and desktop widths', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'widths are set explicitly')
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
    await page.waitForTimeout(200)
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `width ${width}`).toBeLessThanOrEqual(width + 1)
  }
})

test('with reduced motion every section is complete and still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.landing-intro')).toHaveCount(0)
  await expect(page.locator('#features')).not.toHaveClass(/is-live/)
  await expect(page.locator('#flow')).not.toHaveClass(/is-live/)
  await expect(page.locator('.split-line')).toHaveCount(0)
  await expect(page.locator('#impact')).toContainText('7.4 h')
  await expect(page.locator('#impact')).toContainText('31%')
  await expect(page.locator('#features .reel-inline-shot').first()).toBeVisible()
  expect(await page.locator('h2').evaluateAll(headings => headings.filter(h => getComputedStyle(h).opacity !== '1').length)).toBe(0)
})
