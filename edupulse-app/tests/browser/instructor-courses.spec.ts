import { test, expect } from '../snapshots/fixtures'
import { instructorCourseUI } from '../instructor-course-fixture'

test.setTimeout(60_000)

test('assigned-only course cards, separate syllabus and an empty assigned course intake work on reload', async ({ page, isMobile }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('navigation', { name: isMobile ? 'Mobile navigation' : 'Main navigation' }).getByRole('link', { name: 'Syllabus', exact: true })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Close menu', exact: true }).click()
  // Home lists one card per assigned course; the Course station without a class returns to Home.
  await expect(page.locator('.instructor-course-card')).toHaveCount(2)
  await page.goto('/#/courseware')
  await expect(page).toHaveURL(/#\/dashboard/)
  await expect(page.locator('.instructor-course-card')).toHaveCount(2)
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 201' }).click()
  await expect(page.getByRole('heading', { name: 'Add the approved syllabus', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Class sections' }).getByRole('button', { name: 'Teaching Materials & Assessments', exact: true }).click()
  // The empty class accepts an approved file directly; drafts remain on the Syllabus page.
  await expect(page.getByRole('heading', { name: 'Upload syllabi', exact: true })).toBeVisible()
  await page.reload(); await expect(page.getByRole('heading', { name: 'Upload syllabi', exact: true })).toBeVisible({ timeout: 20000 })
  await expect(page.getByLabel('Upload approved syllabus PDF or DOCX')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /shared syllabus/i })).toHaveCount(0)
  await page.goto(`/#/syllabus?tab=mine&course=${fixture.syllabus.id}`)
  await expect(page).toHaveURL(/syllabus\?tab=mine/)
  await expect(page.getByRole('navigation', { name: 'Syllabus sections' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Class sections' })).toHaveCount(0)
  expect(fixture.forbidden).toEqual([])
})

test('topic form saves actual material, preserves content metadata when editing and rejects an incomplete assessment', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=materials`)
  const topic = page.locator('[data-topic="variables"]')
  await topic.locator('summary').click(); await page.reload(); await expect(topic).toHaveAttribute('open', '', { timeout: 20000 })
  await topic.getByRole('button', { name: 'Add teaching material', exact: true }).click()
  const form = page.getByRole('form', { name: 'Add teaching material' })
  await form.getByLabel('Title', { exact: true }).fill('Worked assignment example')
  await form.getByLabel('Teaching content', { exact: true }).fill('Begin with count = 1. Assign count = count + 1. The stored result is 2.')
  await form.getByRole('button', { name: 'Save material draft' }).click()
  await expect(page.getByRole('dialog', { name: 'Worked assignment example' })).toBeVisible()
  await expect.poll(() => Object.values((fixture.getWorkspace() as any).content).some((item: any) => item.content.title === 'Worked assignment example')).toBe(true)
  await page.getByRole('button', { name: 'Close course content' }).click()
  await topic.getByRole('button', { name: 'Add overall assessment', exact: true }).click()
  await page.getByLabel('Assessment type', { exact: true }).selectOption('true_false')
  await page.getByRole('button', { name: 'Write assessment questions', exact: true }).click()
  await page.getByRole('button', { name: 'Save Assessment', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Complete every assessment question' }).first()).toBeVisible()
  for (let i = 1; i <= 3; i++) await page.getByLabel(`Question ${i} text`, { exact: true }).fill(`Statement ${i}: a variable stores a value.`)
  await page.getByRole('button', { name: 'Save Assessment', exact: true }).click()
  await expect.poll(() => Object.values((fixture.getWorkspace() as any).content).filter((item: any) => item.content.overallAssessment).length).toBe(1)
  const overall = Object.values((fixture.getWorkspace() as any).content).find((item: any) => item.content.overallAssessment) as any
  expect(overall.content.coverage.materialIds).toHaveLength(2); expect(overall.content.questions).toHaveLength(3)
  expect(fixture.forbidden).toEqual([])
})

test('week move confirms release withdrawal, keeps chronological labels and never repeats on reload', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=materials`)
  await page.getByRole('button', { name: 'Move week 1 down', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Move delivered teaching week' })).toBeVisible()
  expect(fixture.commands.filter(row => row.action === 'workspace')).toHaveLength(0)
  await page.reload(); await expect(page.getByRole('dialog', { name: 'Move delivered teaching week' })).toBeVisible()
  await page.getByRole('button', { name: 'Move weeks and prepare drafts' }).click()
  await expect(page.getByRole('dialog', { name: 'Move delivered teaching week' })).toHaveCount(0)
  const saved = fixture.getWorkspace() as any
  expect(saved.syllabi[0].courseOutline.map((row: any) => row.week)).toEqual([1, 2, 3, 9]); expect(saved.content.lesson.week).toBe(2); expect(saved.content.lesson.status).toBe('draft')
  const writes = fixture.commands.filter(row => row.action === 'workspace').length
  await page.reload(); await expect(page.locator('[data-week="2"] [data-topic="variables"]')).toBeVisible()
  expect(fixture.commands.filter(row => row.action === 'workspace')).toHaveLength(writes)
})

test('topic AI assessment reads the covered teaching file before drafting and never reruns on reload', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  const workspace = fixture.getWorkspace() as any
  const file = { name: 'loop-notes.txt', path: 'owner/course/loop-notes.txt', mime: 'text/plain', size: 80 }
  const teaching = 'In the supplied example, marker 99 ends the loop before the count changes.'
  workspace.content.lesson.content = { ...workspace.content.lesson.content, readableTeaching: false, sections: [{ heading: 'File', body: 'Open the attached files.' }], attachments: [file] }
  fixture.setWorkspace(workspace)
  let readable = false, downloads = 0, generations = 0
  await page.route('**/api/ai?action=teaching-files', async route => {
    expect(route.request().postDataJSON()).toEqual({ operation: 'download', path: file.path })
    downloads++
    await route.fulfill({ json: { url: 'https://files.example.invalid/loop-notes.txt' } })
  })
  await page.route('https://files.example.invalid/loop-notes.txt', route => route.fulfill({ body: teaching, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' } }))
  await page.route('**/api/ai?action=extract', route => route.fulfill({ json: { kind: 'text', text: readable ? teaching : '' } }))
  await page.route('**/api/ai?action=courseware', async route => {
    generations++
    const request = route.request().postDataJSON()
    expect(request).toMatchObject({ topicAssessment: true, stepKey: 'assessment' })
    expect(request.generatedTeaching).toContain(teaching)
    expect(request.generatedTeaching).not.toContain('Open the attached files.')
    const { draftCoursewareStep } = await import('../../src/lib/rag/courseware')
    const result = await draftCoursewareStep(request, AbortSignal.timeout(10000), {
      provider: 'controlled teaching fixture',
      search: async () => { throw new Error('Unexpected unrelated research') },
      generate: async () => JSON.stringify({ assessment: { title: 'Source-based check', questions: [1, 2, 3].map(index => ({ text: `Trace ${index} stops when marker 99 appears.`, type: 'true_false', topic: 'Variables and named values', options: ['True', 'False'], correctIndex: 0, explanation: 'Marker 99 ends the loop before the count changes.' })) } }),
    })
    await route.fulfill({ json: result })
  })

  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=materials`)
  const topic = page.locator('[data-topic="variables"]')
  await topic.locator('summary').click()
  await topic.getByRole('button', { name: 'Add overall assessment', exact: true }).click()
  const form = page.getByRole('form', { name: 'Add overall assessment' })
  await form.getByRole('combobox', { name: 'Add as' }).selectOption('generate')
  await form.getByRole('button', { name: 'Generate draft' }).click()
  await expect(form.getByRole('alert')).toContainText('Add readable teaching text or a readable teaching file')
  expect(generations).toBe(0)
  expect(downloads).toBe(1)
  await page.reload()
  await expect(form).toBeVisible({ timeout: 20000 })
  expect(downloads).toBe(1)
  readable = true
  await form.getByRole('combobox', { name: 'Add as' }).selectOption('generate')
  await form.getByRole('combobox', { name: 'Assessment type' }).selectOption('true_false')
  await form.getByRole('button', { name: 'Generate draft' }).click()
  const assessment = () => Object.values((fixture.getWorkspace() as { content: Record<string, { status: string; content: { overallAssessment?: boolean; coverage: { materialIds: string[] }; questions: { text: string }[] } }> }).content).find(item => item.content.overallAssessment)
  await expect.poll(() => assessment()?.status, { timeout: 20000 }).toBe('draft')
  const saved = assessment()!
  expect(saved.content.coverage.materialIds).toEqual(['lesson'])
  expect(saved.content.questions[0].text).toContain('marker 99')
  expect(generations).toBe(1)
  await page.reload()
  await expect(page.getByRole('dialog', { name: /overall assessment/i })).toBeVisible()
  expect(downloads).toBe(2)
  expect(generations).toBe(1)
})

test('system citations restore after reload and open readonly material without an inference or academic mutation', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto('/#/courseware')
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  await page.getByLabel('Ask Pulse', { exact: true }).fill('What does the variable lesson say about named values?')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Open source 1', exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Open source 1', exact: true }).first().click()
  await expect(page.getByRole('dialog', { name: 'System source reference' })).toContainText('A variable stores a value')
  await expect(page.locator('.pulse-context-status')).toHaveText('Conversation saved')
  const sourceHint = await page.evaluate(() => Object.values(sessionStorage).flatMap(value => { try { return JSON.parse(value).entries || [] } catch { return [] } }).find(entry => entry[0] === 'pulse-source')?.[1])
  expect(sourceHint?.threadId).toBeTruthy()
  expect(fixture.threads.get(sourceHint.threadId)?.some(message => message.id === sourceHint.messageId)).toBe(true)
  await page.reload(); await expect(page.getByRole('dialog', { name: 'System source reference' })).toContainText('A variable stores a value')
  await page.getByRole('link', { name: 'Open teaching material', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Variables lesson' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Variables lesson' }).getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
  expect(fixture.forbidden).toEqual([]); expect(fixture.commands.filter(row => row.action === 'workspace')).toHaveLength(0)
})

test('checked topic content is explicitly delivered and failed saves do not claim success', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=materials`)
  await page.locator('[data-topic="variables"] > summary').click()
  const quiz = page.locator('.instructor-sequence-item').filter({ has: page.getByText('Variable check', { exact: true }) })
  fixture.failSave(true)
  await quiz.getByRole('button', { name: 'Mark checked', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Current teaching content changed' }).first()).toBeVisible()
  expect((fixture.getWorkspace() as any).content.quiz.status).toBe('draft')
})

test('delivery requires a checked save and is not repeated by reload', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=materials`)
  await page.locator('[data-topic="variables"] > summary').click()
  const quiz = page.locator('.instructor-sequence-item').filter({ has: page.getByText('Variable check', { exact: true }) })
  await quiz.getByRole('button', { name: 'Mark checked', exact: true }).click()
  await quiz.getByRole('button', { name: 'Deliver to students', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Deliver course content' })).toBeVisible()
  await page.reload(); await expect(page.getByRole('dialog', { name: 'Deliver course content' })).toBeVisible()
  expect((fixture.getWorkspace() as any).content.quiz.status).toBe('checked')
  await page.getByRole('button', { name: 'Deliver checked content', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Deliver course content' })).toHaveCount(0)
  expect((fixture.getWorkspace() as any).content.quiz.status).toBe('published')
  expect(fixture.forbidden).toEqual([])
})

test('advanced reading is marked when a material is created and switched on its draft, and the marker persists', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  const saved = () => Object.values((fixture.getWorkspace() as any).content).find((item: any) => item.content.title === 'Beyond the lesson') as any
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=materials`)
  const topic = page.locator('[data-topic="variables"]')
  await topic.locator('summary').click(); await expect(topic).toHaveAttribute('open', '', { timeout: 20000 })
  await topic.getByRole('button', { name: 'Add teaching material', exact: true }).click()
  const form = page.getByRole('form', { name: 'Add teaching material' })
  await form.getByLabel('Title', { exact: true }).fill('Beyond the lesson')
  await form.getByLabel('Teaching content', { exact: true }).fill('Constants keep one value for the whole run; a variable may be reassigned many times.')
  await form.getByLabel('Advanced reading (students can take a mock quiz from it)', { exact: true }).check()
  await form.getByRole('button', { name: 'Save material draft' }).click()
  await expect.poll(() => saved()?.content.advancedReading).toBe(true)
  const reader = page.getByRole('dialog', { name: 'Beyond the lesson' })
  const marker = reader.getByLabel('Advanced reading', { exact: true })
  await expect(marker).toBeChecked(); await expect(marker).toBeEnabled()
  await marker.uncheck()
  await expect.poll(() => saved()?.content.advancedReading).toBe(false)
  await expect(marker).not.toBeChecked()
  expect(fixture.forbidden).toEqual([])
})

test('insufficient sources is a choice: the form names the topic and generates from what is available only when asked', async ({ page }) => {
  const fixture = await instructorCourseUI(page)
  const requests: any[] = []
  const body = Array.from({ length: 12 }, (_, n) => `Variables and named values keep data for later steps; trace ${n + 1} assigns a value, reads it and explains why the name makes the program easier to read.`).join(' ')
  await page.route('**/api/ai?action=courseware', async route => {
    const request = route.request().postDataJSON(); requests.push(request)
    if (!request.allowLimitedSources) return route.fulfill({ status: 422, json: { error: { code: 'SOURCE_NOT_READY', message: 'No matching retained reference passage was available for this section. Read or attach its source before generation.' } } })
    const { draftCoursewareStep } = await import('../../src/lib/rag/courseware')
    const result = await draftCoursewareStep(request, AbortSignal.timeout(10000), {
      provider: 'controlled limited-source fixture',
      search: async () => ({ evidence: [] }),
      sourceEvidence: async () => ({ evidence: [] }),
      generate: async () => JSON.stringify({ material: { title: 'Variables and named values', sections: [{ heading: 'Variables and named values', body }, { heading: 'Practice', body }] } }),
    })
    await route.fulfill({ json: result })
  })
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=materials`)
  const topic = page.locator('[data-topic="variables"]')
  await topic.locator('summary').click(); await expect(topic).toHaveAttribute('open', '', { timeout: 20000 })
  await topic.getByRole('button', { name: 'Add teaching material', exact: true }).click()
  const form = page.getByRole('form', { name: 'Add teaching material' })
  await form.getByRole('combobox', { name: 'Add as' }).selectOption('generate')
  await form.getByRole('button', { name: 'Generate draft' }).click()
  const notice = form.getByRole('alert', { name: 'Not enough source context' })
  await expect(notice).toContainText('Not enough source context for Variables and named values.')
  await expect(notice.getByRole('button', { name: 'Attach more sources', exact: true })).toBeVisible()
  expect(requests.every(request => !request.allowLimitedSources)).toBe(true)
  const before = Object.keys((fixture.getWorkspace() as any).content).length
  await notice.getByRole('button', { name: 'Generate from what is available', exact: true }).click()
  await expect.poll(() => Object.keys((fixture.getWorkspace() as any).content).length).toBe(before + 1)
  expect(requests.at(-1).allowLimitedSources).toBe(true)
  const created = Object.values((fixture.getWorkspace() as any).content).find((item: any) => item.status === 'draft' && item.type === 'material' && item.content.ai) as any
  expect(created.content.ai.warning).toContain('no saved reference passage covered this topic')
  expect(fixture.forbidden).toEqual([])
})
