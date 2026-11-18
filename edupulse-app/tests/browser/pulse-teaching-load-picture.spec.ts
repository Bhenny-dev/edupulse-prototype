import { test, expect } from '@playwright/test'
import { teachingLoadPicture, teachingLoadUI } from '../teaching-load-fixture'

test('a Dean attaches a picture of a teaching load, says yes to review it, and loads it to the instructor after confirming', async ({ page }) => {
  test.setTimeout(180000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const fixture = await teachingLoadUI(page)
  await page.goto('/#/records')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  const box = pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true })
  await pulse.locator('input[type=file]').setInputFiles({ name: 'teaching-load.png', mimeType: 'image/png', buffer: await teachingLoadPicture(page) })
  // The picture is read on this device; its table becomes the same reviewable load a PDF gives.
  await expect(pulse.getByRole('button', { name: 'Remove teaching-load.png (OCR)', exact: true })).toBeVisible({ timeout: 120000 })
  await expect(pulse).toContainText('teaching load, 1 class')
  await box.fill('load the courses to Alex')
  await pulse.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(pulse).toContainText('Alex Sample’s teaching load: 1 class, 3 units, 1st Semester AY 2026-2027.')
  await expect(pulse).toContainText('Say yes to open the review.')
  // The picture went with that one message: it is not waiting in the composer for the next one.
  await expect(pulse.getByRole('button', { name: 'Remove teaching-load.png (OCR)', exact: true })).toHaveCount(0)

  await box.fill('yes')
  await pulse.getByRole('button', { name: 'Send', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Review teaching loads', exact: true })
  await expect(modal).toBeVisible()
  await expect(modal).toContainText(/IT\s*102\s*A/)
  // The instructor printed on the form is matched to the registered account.
  await expect(modal.getByRole('combobox', { name: 'Instructor', exact: true })).toHaveValue('22222222-2222-4222-8222-222222222222')
  await modal.getByLabel('Block section', { exact: true }).fill('BSIT-1A')
  await modal.getByRole('checkbox', { name: /I compared/ }).check()
  await modal.getByRole('button', { name: 'Confirm selected loads' }).click()
  await expect(modal).toContainText('Saved 1 selected loads')
  expect(fixture.commands).toHaveLength(1)
  expect(fixture.commands[0].entries[0]).toMatchObject({ instructor_id: '22222222-2222-4222-8222-222222222222', course_code: 'IT 102', block: 'BSIT-1A', semester: '1st Semester', academic_year: '2026-2027', computed_hours: 5 })
  expect(fixture.inference).toEqual([])
  // Back in the conversation (a phone shows the review full screen): the yes was sent alone, without the picture.
  await modal.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(pulse.locator('.connected-pulse-message.from-user').last()).toHaveText(/^\s*You\s*yes/)
  await expect(pulse.locator('.connected-pulse-message.from-user').last()).not.toContainText('Attached')
  await expect(pulse).toContainText('Opened the review.')
})

test('a yes with nothing offered gets a plain question back, not a search or a repeat of the last answer', async ({ page }) => {
  const fixture = await teachingLoadUI(page)
  await page.goto('/#/records')
  await page.getByRole('button', { name: 'Open Pulse assistant' }).click()
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('yes')
  await pulse.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(pulse).toContainText('Nothing is waiting for a yes right now.')
  expect(fixture.inference).toEqual([])
})
