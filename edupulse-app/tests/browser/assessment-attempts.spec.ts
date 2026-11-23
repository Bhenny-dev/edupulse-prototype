import { test, expect } from '@playwright/test'
import { baselineUI } from '../baseline-fixture'
import { instructorCourseUI } from '../instructor-course-fixture'

test('an instructor answers their own assessment as a student, marked with the answer key and never saved', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto('/#/courseware')
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 102' }).first().click()
  await page.getByRole('button', { name: 'Weeks and topics', exact: true }).click()
  await page.locator('details.instructor-topic').evaluateAll(nodes => nodes.forEach(node => { (node as HTMLDetailsElement).open = true }))
  const saved = fixture.commands.length
  await page.locator('.instructor-sequence-item').filter({ hasText: 'Variable check' }).getByRole('button', { name: 'Open', exact: true }).click()
  await page.getByRole('button', { name: 'Test attempt', exact: true }).click()
  const trial = page.getByRole('region', { name: 'Test attempt', exact: true })
  await expect(trial.getByRole('note')).toContainText('never saved or counted as a student score')
  await expect(trial.getByRole('button', { name: 'Check my answers', exact: true })).toBeDisabled()
  await trial.getByLabel('Question 1: True', { exact: true }).check()
  await trial.getByLabel('Question 2: True', { exact: true }).check()
  await trial.getByLabel('Question 3: False', { exact: true }).check()
  await trial.getByRole('button', { name: 'Check my answers', exact: true }).click()
  await expect(trial.getByRole('status')).toHaveText('Test score: 2/3. Nothing was saved.')
  await expect(trial.getByText('Your answer: B. Answer key: A.', { exact: true })).toBeVisible()
  await expect(trial.getByText('Correct.', { exact: true })).toHaveCount(2)
  await trial.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(trial.getByRole('status')).toHaveCount(0)
  await expect(trial.getByLabel('Question 1: True', { exact: true })).not.toBeChecked()
  await trial.getByRole('button', { name: 'Back to the assessment', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Test attempt', exact: true })).toBeVisible()
  expect(fixture.commands.length, 'a test attempt writes nothing').toBe(saved)
  expect(fixture.forbidden).toEqual([])
})

test('a student sees how many attempts there are, that the latest counts, and no restart after the last one', async ({ page }) => {
  const fixture = await baselineUI(page, 'student')
  fixture.records.attempts = []
  const publication = fixture.records.publications.find(item => item.type === 'assessment')!
  publication.content = { ...publication.content, assessmentPolicy: { maxAttempts: 2 }, questions: [{ text: 'Choose A', topic: 'Variables', options: ['A', 'B', 'C', 'D'] }, { text: 'Choose B', topic: 'Functions', options: ['A', 'B', 'C', 'D'] }] }
  let made = 0
  await page.route('**/api/ai?action=academic', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    const command = route.request().postDataJSON()
    if (command.operation === 'start') {
      const next = command.retake ? made + 1 : Math.max(1, made)
      if (next > 2) return route.fulfill({ status: 422, json: { error: { code: '22023', message: 'Assessment is closed, awaiting marking or attempt limit reached' } } })
      return route.fulfill({ json: { id: `99999999-1111-4111-8111-00000000000${next}`, started_at: new Date().toISOString(), attempt_no: next, duration_seconds: 0, max_attempts: 2 } })
    }
    if (command.operation === 'respond') {
      made++
      const points = [0, 1].map(index => (command.responses[index] === index ? 1 : 0))
      const attempt = { id: crypto.randomUUID(), publication_id: publication.id, source_version: publication.source_version, student_email: 'ui.fixture@example.invalid', student_id: 'synthetic-learner', score: points[0]! + points[1]!, max_score: 2, submitted_at: new Date(Date.now() + made * 1000).toISOString(), attempt_no: made, grading_status: 'graded', answers: command.responses, question_scores: points, topic_scores: [{ topic: 'Variables', score: points[0]!, max_score: 1 }, { topic: 'Functions', score: points[1]!, max_score: 1 }] }
      fixture.records.attempts.push(attempt)
      return route.fulfill({ json: attempt })
    }
    return route.fallback()
  })
  await page.goto('/#/assessment')
  await page.getByRole('button', { name: 'Open assessment', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: publication.title, exact: true })
  await expect(dialog).toContainText('2 allowed attempt(s)');await expect(page.getByRole('button',{name:'Open Pulse assistant',exact:true})).toHaveCount(0)
  await dialog.getByLabel('Question 1: A', { exact: true }).check()
  await dialog.getByLabel('Question 2: C', { exact: true }).check()
  await dialog.getByRole('button', { name: 'Confirm and submit responses', exact: true }).click()
  await expect(page.getByRole('button',{name:'Open Pulse assistant',exact:true})).toBeVisible()
  await expect(dialog.getByRole('status').filter({ hasText: 'Saved score: 1/2.' })).toContainText('Attempt 1 of 2. Your latest attempt is the one recorded.')
  await dialog.getByRole('button', { name: 'Start next allowed attempt', exact: true }).click()
  await expect(dialog.getByRole('status', { name: 'Assessment progress' })).toContainText('Attempt 2');await expect(page.getByRole('button',{name:'Open Pulse assistant',exact:true})).toHaveCount(0)
  await dialog.getByLabel('Question 1: A', { exact: true }).check()
  await dialog.getByLabel('Question 2: B', { exact: true }).check()
  await dialog.getByRole('button', { name: 'Confirm and submit responses', exact: true }).click()
  await expect(dialog.getByRole('status').filter({ hasText: 'Saved score: 2/2.' })).toContainText('Attempt 2 of 2. No attempts left.')
  await expect(dialog.getByRole('button', { name: 'Start next allowed attempt', exact: true })).toHaveCount(0)
})
