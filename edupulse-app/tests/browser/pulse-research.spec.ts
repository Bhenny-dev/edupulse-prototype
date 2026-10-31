import { test, expect } from '@playwright/test'

for (const restriction of ['without web research', 'only from the syllabus']) test(`Pulse week generation sends ${restriction} through the confirmation card to the API`, async ({ page, request }) => {
  const before = await (await request.get('/api/ai?action=workspace')).json()
  const syllabus = { id: 'research-preference-test', courseCode: 'IT 102', courseTitle: 'Computer Programming 1', status: 'active', sample: true, courseOutline: [{ week: 1, ilos: 'Explain variables.', contents: ['Variables'] }] }
  expect((await request.put('/api/ai?action=workspace', { data: { revision: before.revision, data: { syllabi: [syllabus], content: {}, registrations: [] } } })).ok()).toBeTruthy()
  let received: { research?: string; request?: string } | undefined
  await page.route('**/api/ai?action=courseware', async route => {
    received = route.request().postDataJSON()
    // The transport assertion needs no generated fixture or saved courseware.
    await route.fulfill({ status: 503, json: { error: { code: 'TEST_COMPLETE', message: 'Synthetic transport assertion complete.' } } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Instructor', exact: true }).click()
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  const instruction = `Generate week 1 materials for IT 102 in Filipino with two worked examples, ${restriction}`
  await pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill(instruction)
  await pulse.getByRole('button', { name: 'Send', exact: true }).click()
  const card = pulse.getByRole('region', { name: 'Generate courseware', exact: true })
  await card.getByRole('button', { name: 'Generate Week 1 drafts', exact: true }).click()
  await expect(card.getByRole('alert')).toContainText('Synthetic transport assertion complete.')
  expect(received?.research).toBe('sources')
  expect(received?.request).toBe(instruction)
})
