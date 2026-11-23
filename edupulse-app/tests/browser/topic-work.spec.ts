import { test, expect } from '@playwright/test'
import { instructorCourseUI } from '../instructor-course-fixture'
import { baselineUI } from '../baseline-fixture'

const files = ['instructions.zip', 'examples.zip'].map(name => ({ name, mimeType: 'application/zip', buffer: Buffer.from(name) }))

test('instructor creates a submission bin and saves multiple topic files together', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  const uploads: string[] = []
  await page.route('**/api/ai?action=teaching-files', route => {
    const { name } = route.request().postDataJSON()
    uploads.push(name)
    return route.fulfill({ json: { bucket: 'edupulse-teaching-files', path: 'teacher/' + crypto.randomUUID() + '/' + name, token: 'fixture' } })
  })
  await page.route('**/storage/v1/object/upload/sign/**', route => route.fulfill({ json: { Key: 'fixture' } }))
  await page.goto('/#/courseware?course=' + fixture.syllabus.id)
  await page.getByRole('button', { name: 'Teaching Materials & Assessments', exact: true }).click()
  const topic = page.locator('[data-topic="variables"]')
  await topic.locator('summary').click()
  await topic.getByRole('button', { name: 'Add submission bin', exact: true }).click()
  const create = page.getByRole('dialog', { name: 'Add submission bin', exact: true })
  await create.getByLabel('Title', { exact: true }).fill('Final project')
  await create.getByLabel('Submission instructions').fill('Attach the completed project.')
  await create.getByLabel('Instructions files', { exact: false }).setInputFiles(files)
  await create.getByRole('button', { name: 'Save submission bin draft' }).click()
  const reader = page.getByRole('dialog', { name: 'Final project', exact: true })
  await expect(reader).toBeVisible()
  expect(uploads).toEqual(files.map(file => file.name))
  const workspace = fixture.getWorkspace() as { content: Record<string, { content: { title: string; submissionBin?: boolean; attachments?: { name: string }[] } }> }
  const draft = Object.values(workspace.content).find(item => item.content.title === 'Final project')
  expect(draft?.content.submissionBin).toBe(true)
  expect(draft?.content.attachments?.map(file => file.name)).toEqual(uploads)
  const privateComment = { id: crypto.randomUUID(), author: 'Synthetic learner', private: true, body: 'Please check the project.', postedAt: new Date().toISOString(), block: 'BSIT-1A' }
  const comments: (typeof privateComment & { replyTo?: string })[] = [privateComment]
  await page.route('**/api/ai?action=topic-work', route => {
    const input = route.request().postDataJSON()
    if (input.operation === 'read') return route.fulfill({ json: { bin: false, canComment: true, canSubmit: false, comments, submissions: [] } })
    expect(input).toMatchObject({ operation: 'comment', private: true, replyTo: privateComment.id })
    comments.push({ ...privateComment, id: input.id, author: 'Synthetic instructor', body: input.body, replyTo: input.replyTo })
    return route.fulfill({ json: { saved: true } })
  })
  await page.keyboard.press('Escape')
  await topic.locator('.instructor-sequence-item').filter({ hasText: 'Variables lesson' }).getByRole('button', { name: 'Open', exact: true }).click()
  const lesson = page.getByRole('dialog', { name: 'Variables lesson', exact: true })
  await lesson.getByText('Class and private comments', { exact: true }).click()
  const privateThread = lesson.getByRole('region', { name: 'Private comments', exact: true })
  await privateThread.getByRole('button', { name: 'Reply', exact: true }).click()
  await privateThread.getByLabel('Reply to Synthetic learner').fill('The introduction looks good.')
  await privateThread.getByRole('button', { name: 'Post comment' }).click()
  await expect(privateThread.getByText('The introduction looks good.', { exact: true })).toBeVisible()
})

test('student submits files and writes separate class and private comments across reload', async ({ page }) => {
  const { records } = await baselineUI(page, 'student')
  const publication = records.publications[0]
  publication.content = { ...publication.content, submissionBin: true, submissionOnly: true }
  const comments: any[] = [], submissions: any[] = [], writes: string[] = []
  await page.route('**/api/ai?action=topic-work', route => {
    const input = route.request().postDataJSON()
    if (input.operation === 'read') return route.fulfill({ json: { bin: true, canComment: true, canSubmit: !submissions.length, comments, submissions } })
    writes.push(input.operation)
    if (input.operation === 'upload') return route.fulfill({ json: { bucket: 'edupulse-student-work', path: 'student/' + publication.id + '/' + crypto.randomUUID() + '/' + input.name, token: 'fixture' } })
    const timestamp = new Date().toISOString()
    if (input.operation === 'comment') comments.push({ ...input, author: 'Synthetic learner', postedAt: timestamp })
    if (input.operation === 'submit') submissions.push({ ...input, student: 'Synthetic learner', block: 'BSIT-1A', submittedAt: timestamp, files: input.files.map((file: { path: string }) => ({ ...file, name: file.path.split('/').at(-1) })) })
    return route.fulfill({ json: { saved: true } })
  })
  await page.route('**/storage/v1/object/upload/sign/**', route => route.fulfill({ json: { Key: 'fixture' } }))
  await page.goto('/#/courseware?course=' + publication.course_id + '&item=' + publication.id)
  const reader = page.getByRole('dialog', { name: publication.title, exact: true })
  const classComments = reader.getByRole('region', { name: 'Class comments', exact: true })
  const privateComments = reader.getByRole('region', { name: 'Private comments', exact: true })
  await classComments.getByLabel('Add a class comment').fill('Where do we start?')
  await classComments.getByRole('button', { name: 'Post comment' }).click()
  await expect(classComments.getByText('Where do we start?', { exact: true })).toBeVisible()
  await privateComments.getByLabel('Message your instructor').fill('Please check my outline.')
  await privateComments.getByRole('button', { name: 'Post comment' }).click()
  await expect(privateComments.getByText('Please check my outline.', { exact: true })).toBeVisible()
  await expect(classComments).not.toContainText('Please check my outline.')
  const submission = reader.getByRole('region', { name: 'Your work', exact: true })
  await submission.getByLabel('Attach files').setInputFiles(files)
  await submission.getByLabel('Written work').fill('Our completed work is attached.')
  page.once('dialog', dialog => dialog.accept())
  await submission.getByRole('button', { name: 'Submit work' }).click()
  await expect(submission.getByRole('button', { name: 'examples.zip', exact: true })).toBeVisible()
  expect(writes).toEqual(['comment', 'comment', 'upload', 'upload', 'submit'])
  await page.reload()
  await expect(submission.getByText('Our completed work is attached.', { exact: true })).toBeVisible()
  await expect(privateComments.getByText('Please check my outline.', { exact: true })).toBeVisible()
  expect(writes).toEqual(['comment', 'comment', 'upload', 'upload', 'submit'])
})
