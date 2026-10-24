import { test, expect, type Page } from './fixtures.js'
import { readFile, mkdir } from 'node:fs/promises'

// Actual password sign-in and cloud RLS; all accounts/records are temporary synthetic canaries.
const DIR = '../feature-documentation/system-walkthrough/08-authenticated-records'
const accounts = JSON.parse(await readFile('.data/academic-canaries.json', 'utf8')) as { email: string; password: string; role: string }[]
async function signIn(page: Page, index: number) {
  await page.goto('/')
  await page.getByLabel('Email', { exact: true }).fill(accounts[index].email)
  await page.getByLabel('Password', { exact: true }).fill(accounts[index].password)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  await expect(page.getByText('Account records · Instructor-confirmed EduSuite exports · No institutional grade computations')).toBeVisible()
  await expect(page.getByText('Loading authorized academic records…')).toHaveCount(0)
}
async function shot(page: Page, name: string) {
  await mkdir(DIR, { recursive: true })
  await expect(page.getByText('Loading authorized academic records…')).toHaveCount(0)
  await expect(page.locator('[role="alert"]')).toHaveCount(0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('h1')).toBeInViewport()
  await page.screenshot({ path: `${DIR}/${name}.png`, animations: 'disabled', fullPage: true })
}
test('authenticated instructor sees its own persisted academic records', async ({ page }) => {
  await signIn(page, 0)
  await page.goto('/#/student-monitoring')
  await expect(page.getByRole('heading', { name: 'Recorded assessment attempts' })).toBeVisible()
  await expect(page.getByText('3/3', { exact: true })).toBeVisible()
  await shot(page, '01-instructor-records')
})
test('authenticated student sees enrolled content, private scoring and persistent material access', async ({ page }) => {
  await signIn(page, 2)
  await page.goto('/#/courseware')
  await page.getByRole('button', { name: 'Open material', exact: true }).click()
  await expect(page.getByText('A variable stores a value.', { exact: false })).toBeVisible()
  await shot(page, '02-student-material')
  await page.goto('/#/assessment')
  await page.getByRole('button', { name: 'Open assessment', exact: true }).click()
  await expect(page.getByText('Saved score: 3/3.', { exact: false })).toBeVisible()
  await expect(page.getByText('Private canary explanation')).toHaveCount(0)
  await shot(page, '03-student-assessment')
  await page.goto('/#/performance')
  await expect(page.getByText('3/3', { exact: true })).toBeVisible()
  await shot(page, '04-student-performance')
})
test('authenticated Dean reads authorized college results', async ({ page }) => {
    await signIn(page, 4)
    await page.goto('/#/performance')
    await expect(page.getByText('3/3', { exact: true })).toBeVisible()
    await shot(page, '05-dean-performance')
})
test('authenticated Associate Dean is denied scores', async ({ page }) => {
    await signIn(page, 5)
    await page.goto('/#/performance')
    await expect(page).toHaveURL(/dashboard/)
    await page.goto('/#/monitor')
    await expect(page.getByRole('heading', { name: 'Academic Oversight', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recorded assessment attempts' })).toHaveCount(0)
    await expect(page.getByText('3/3', { exact: true })).toHaveCount(0)
    await shot(page, '06-associate-dean-oversight')
})
test('unrelated authenticated accounts receive empty records instead of fixtures', async ({ page }) => {
  await signIn(page, 3)
  await expect(page.getByRole('heading', { name: 'No authorized academic records yet' })).toBeVisible()
  await expect(page.getByTestId('performance-provenance')).toHaveCount(0)
  await shot(page, '07-unenrolled-student')
})
