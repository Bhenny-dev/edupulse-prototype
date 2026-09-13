import { test, expect } from '@playwright/test'

test('preview connects to real health API and shows source-grounded chat without overflow', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  await expect(page.getByRole('dialog', { name: 'Pulse', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'AI and knowledge settings' }).click()
  await expect(page.getByRole('heading', { name: 'AI connection' })).toBeVisible()
  await expect(page.getByText('Last checked:')).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('heading', { name: 'Reference documents' })).toBeVisible()
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  await page.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('How do I publish courseware?')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByText(/View sources \(/)).toBeVisible({ timeout: 125000 })
  await page.getByText(/View sources \(/).click()
  await expect(page.getByRole('blockquote').first()).toBeVisible()
  const size = await page.evaluate(() => ({ viewport: window.innerWidth, width: document.documentElement.scrollWidth }))
  expect(size.width).toBeLessThanOrEqual(size.viewport + 1)
  expect(errors).toEqual([])
  await page.screenshot({ path: `test-results/pulse-${test.info().project.name}.png`, fullPage: false })
})

test('profile saves, survives reload, and preview password editing is disabled', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.goto('/#/settings')
  await page.getByLabel('Full Name', { exact: true }).fill('Preview Test Instructor')
  await expect(page.getByLabel('New Password', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('Full Name', { exact: true })).toHaveValue('Preview Test Instructor')
})

test('courseware edits persist, require review again, and document downloads work', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.evaluate(() => {
    const base = { status: 'checked', week: 1, syllabusId: 'syl-1' }
    localStorage.setItem('edupulse-content-v1-preview', JSON.stringify({
      'gen-mat-syl-1-w1': { ...base, type: 'material', title: 'Browser test lesson', content: { title: 'Browser test lesson', viewMode: 'document', sections: [{ heading: 'Learning outcome', body: 'Explain the difference between a JavaScript variable and a constant binding.' }, { heading: 'Practice', body: 'Use let for a binding that needs reassignment, and const when it does not.' }] } },
      'gen-assess-syl-1-w1': { ...base, type: 'assessment', title: 'Browser test assessment', content: { title: 'Browser test assessment', viewMode: 'assessment', questions: [{ id: 'q1', text: 'Which binding cannot be reassigned?', options: [{ label: 'A', text: 'const' }, { label: 'B', text: 'let' }, { label: 'C', text: 'var' }, { label: 'D', text: 'Both let and var' }], correctIndex: 0, explanation: 'A const binding cannot be reassigned.' }] } },
    }))
  })
  await page.reload()
  await page.goto('/#/courseware')
  await page.getByRole('button', { name: 'View Items', exact: true }).first().click()
  // Synthetic content tests the actual editors and storage without a model dependency.
  await page.getByTitle('Open document').first().click()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.locator('.doc-edit-body').first().fill('Reviewed courseware text saved by the browser workflow test.')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Reviewed courseware text saved by the browser workflow test.', { exact: true })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download text' }).click()
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.txt$/)
  const saved = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('edupulse-content-v1-preview') || '{}')) as { status: string; content: { sections?: { body: string }[] } }[])
  expect(saved.find(item => item.content.sections?.some(section => section.body === 'Reviewed courseware text saved by the browser workflow test.'))?.status).toBe('draft')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByTitle('Open assessment').first().click()
  await page.getByLabel('Answer explanation').first().fill('The answer was reviewed against the course reference by the instructor.')
  await page.getByRole('button', { name: 'Save Assessment', exact: true }).click()
  await page.reload()
  const assessments = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('edupulse-content-v1-preview') || '{}')) as { status: string; content: { questions?: { explanation?: string }[] } }[])
  expect(assessments.find(item => item.content.questions?.some(q => q.explanation === 'The answer was reviewed against the course reference by the instructor.'))?.status).toBe('draft')
})
