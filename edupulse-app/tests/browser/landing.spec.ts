import { test, expect, type Page } from '@playwright/test'

// Landing page controls: section links (the ☰ menu on phones), role tabs by keyboard,
// one open FAQ answer, the photo pause control (WCAG 2.2.2) and the reduced-motion fallback.
async function openSection(page: Page, mobile: boolean, name: string) {
  if (mobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const nav = page.getByRole('navigation', { name: mobile ? 'Landing page sections menu' : 'Landing page sections', exact: true })
  await nav.getByRole('link', { name, exact: true }).click()
  if (mobile) await expect(page.getByRole('navigation', { name: 'Landing page sections menu' })).toHaveCount(0)
}

test('section links, role tabs, FAQ and photo controls work without horizontal overflow', async ({ page }, info) => {
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
  await page.keyboard.press('ArrowRight')
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

  const pause = page.getByRole('button', { name: 'Pause photos' })
  await pause.scrollIntoViewIfNeeded()
  await pause.click()
  await expect(page.getByRole('button', { name: 'Play photos' })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.locator('.marquee-track').first().evaluate(track => getComputedStyle(track).animationPlayState)).toBe('paused')

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('with reduced motion every section is visible at once and the photos stand still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.reveal').first()).toHaveClass(/is-visible/)
  expect(await page.locator('.reveal').evaluateAll(items => items.filter(item => getComputedStyle(item).opacity !== '1').length)).toBe(0)
  expect(await page.locator('.marquee-track').first().evaluate(track => getComputedStyle(track).animationName)).toBe('none')
  await expect(page.getByRole('button', { name: 'Pause photos' })).toBeHidden()
})
