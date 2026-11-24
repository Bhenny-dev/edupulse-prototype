import { test, expect, type Page } from '../snapshots/fixtures'
import { instructorCourseUI } from '../instructor-course-fixture'

// UI transport only: class codes and announcements are answered here as the database functions answer them
// (tests/class-codes.test.ts exercises the SQL). No real account, code or enrollment is created.
async function classroomUI(page: Page) {
  const fixture = await instructorCourseUI(page)
  const records = fixture.records as any, sent: any[] = []
  records.classCodes = []; records.classJoins = []; records.announcements = []
  const codes = ['K7M2QXP', 'P4Q8RST', 'H3J5KMN']
  await page.route('**/api/ai?action=academic', async route => {
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null
    if (!body || !['class-code', 'announcement'].includes(body.operation)) return route.fallback()
    sent.push(body)
    if (body.operation === 'class-code') {
      const load = records.institutional.find((row: any) => row.kind === 'loads' && row.record_key === body.assignment)
      if (!load) return route.fulfill({ status: 403, json: { error: { code: 'CLASSROOM_ACTION_FAILED', message: 'Choose a course the Dean assigned to you.' } } })
      const scope = { course_code: load.data.CourseCode, block: body.block, academic_year: load.data.AcademicYear || '', semester: load.data.Semester || '' }
      records.classCodes = records.classCodes.filter((code: any) => !(code.course_code === scope.course_code && code.block === scope.block))
      if (body.action === 'disable') return route.fulfill({ json: { ...scope, code: null, disabled: true } })
      const made = { ...scope, code: codes.shift(), load_key: `${scope.course_code}|${scope.block}|1st Semester|2026-2027`, parent_key: body.assignment, created_at: new Date().toISOString() }
      records.classCodes.push(made)
      return route.fulfill({ json: { ...made, created: true } })
    }
    const command = body.command
    if (command.action === 'delete') { records.announcements = records.announcements.filter((post: any) => post.id !== command.id); return route.fulfill({ json: { id: command.id, deleted: true } }) }
    const now = new Date().toISOString(), previous = records.announcements.find((post: any) => post.id === command.id)
    const saved = { id: command.id || crypto.randomUUID(), course_code: command.course_code, academic_year: command.academic_year, semester: command.semester, block: command.block || null, week: command.week || null, title: command.title, body: command.body, attachments: command.attachments.map((link: any) => ({ kind: 'link', ...link })), created_at: previous?.created_at || now, updated_at: now }
    records.announcements = [saved, ...records.announcements.filter((post: any) => post.id !== saved.id)]
    return route.fulfill({ json: saved })
  })
  return { ...fixture, sent }
}

test('instructor Home lists the assigned courses as classes; Create class issues a code and opens the class', async ({ page, isMobile }) => {
  const fixture = await classroomUI(page)
  await page.goto('/#/dashboard')
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('navigation', { name: isMobile ? 'Mobile navigation' : 'Main navigation' }).getByRole('link', { name: 'Home', exact: true })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Close menu', exact: true }).click()
  const cards = page.locator('.instructor-course-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.filter({ hasText: 'IT 102' })).toContainText('Block BSIT-1A')
  await expect(cards.filter({ hasText: 'IT 201' })).toContainText('Syllabus not added')

  await page.getByRole('button', { name: 'Create class', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create class' })
  await expect(dialog.getByRole('combobox')).toHaveValue(/IT/)
  await expect(dialog.getByRole('radio', { name: /Block BSIT-1A/ })).toBeChecked()
  await expect(dialog.getByRole('status')).toContainText('Creates the class code for IT 102 block BSIT-1A')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page).toHaveURL(/tab=announcements/)
  await expect(page.getByRole('status').filter({ hasText: 'Class created: block BSIT-1A' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Class codes' }).getByLabel('Class code of block BSIT-1A: K 7 M 2 Q X P')).toBeVisible()
  await page.getByRole('button', { name: 'Display the class code of block BSIT-1A', exact: true }).click()
  const display = page.getByRole('dialog', { name: 'Class code display, IT 102 block BSIT-1A' })
  await expect(display).toContainText('K7M2QXP')
  await expect(display).toContainText('choose Join class')
  await page.keyboard.press('Escape')
  await expect(display).toHaveCount(0)
  const tabs = page.getByRole('navigation', { name: 'Class sections' })
  await expect(tabs.getByRole('button')).toHaveText(['Announcements', 'Teaching Materials & Assessments', 'Class List', 'Scores'])
  await expect(tabs.getByRole('button', { name: 'Announcements', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(fixture.sent.map(command => [command.operation, command.action, command.block])).toEqual([['class-code', 'create', 'BSIT-1A']])
  expect(fixture.forbidden).toEqual([])
})

test('a class card More menu opens the Class List, Scores and Block sections without opening Announcements first', async ({ page }) => {
  const fixture = await classroomUI(page)
  ;(fixture.records as any).classCodes = [{ course_code: 'IT 102', block: 'BSIT-1A', academic_year: '2026-2027', semester: '1st Semester', code: 'K7M2QXP', created_at: new Date().toISOString() }]
  await page.goto('/#/dashboard')
  const classPage = page.getByRole('dialog', { name: /^Class IT 102/ })
  const more = () => page.getByRole('button', { name: /^More for IT 102/ })
  await more().click()
  await expect(page.getByRole('menuitem')).toHaveText(['Copy class code, block BSIT-1A', 'Class List', 'Scores', 'Block sections'])
  await page.getByRole('menuitem', { name: 'Class List', exact: true }).click()
  await expect(classPage).toBeVisible()
  await expect(page).toHaveURL(/tab=class-list/)
  await expect(page.getByRole('navigation', { name: 'Class sections' }).getByRole('button', { name: 'Class List', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await more().click()
  await page.getByRole('menuitem', { name: 'Block sections', exact: true }).click()
  await expect(page).toHaveURL(/view=blocks/)
  await expect(classPage.getByRole('heading', { name: 'Block sections', exact: true })).toBeVisible()
  expect(fixture.forbidden).toEqual([])
})

test('Home lists the written responses to mark and the next openings, each opening its class', async ({ page }) => {
  const fixture = await classroomUI(page)
  const records = fixture.records as any, publication = records.publications[0], member = records.enrollments[0]
  records.attempts = [{ publication_id: publication.id, source_version: publication.source_version, student_email: member.student_email, score: 0, max_score: 2, submitted_at: new Date().toISOString(), attempt_no: 1, grading_status: 'pending_review' }]
  records.deliverySchedules = [{ ...records.deliverySchedules[0], windows: [{ week: 4, opens_at: new Date(Date.now() + 3 * 86400000).toISOString(), closes_at: null }] }]
  await page.goto('/#/dashboard')
  const review = page.getByRole('region', { name: 'To review', exact: true })
  await expect(review).toContainText('IT 102')
  await expect(review).toContainText('1 written response to mark')
  await review.getByRole('button').click()
  await expect(page).toHaveURL(/tab=scores/)
  await page.keyboard.press('Escape')
  const upcoming = page.getByRole('region', { name: 'Upcoming across classes', exact: true })
  await expect(upcoming).toContainText('Week 4 opens for block BSIT-1A')
  await upcoming.getByRole('button').first().click()
  await expect(page).toHaveURL(/tab=materials/)
  expect(fixture.forbidden).toEqual([])
})

test('an announcement with a provider link is filed under its week and the weeks collapse and expand', async ({ page }) => {
  const fixture = await classroomUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}`)
  await page.getByRole('button', { name: 'Announce something to your class', exact: true }).click()
  const form = page.getByRole('form', { name: 'New announcement' })
  await form.getByLabel('Week').selectOption('1')
  await form.getByLabel('Title').fill('Bring your laptop')
  await form.getByLabel('Announcement').fill('We trace variables together on Monday.')
  await form.getByRole('button', { name: 'Add link', exact: true }).click()
  await form.getByLabel('Link', { exact: true }).fill('https://docs.google.com/presentation/d/abc/edit')
  await expect(form.getByText('Recognized as Google Slides.', { exact: true })).toBeVisible()
  await form.getByRole('group', { name: 'Add a link' }).getByRole('button', { name: 'Add link', exact: true }).click()
  await expect(form.getByRole('article', { name: /Google Slides/ })).toBeVisible()
  await form.getByRole('button', { name: 'Post', exact: true }).click()
  const post = page.getByRole('article', { name: 'Bring your laptop' })
  await expect(post).toContainText('We trace variables together on Monday.')
  await expect(post).toContainText('Week 1')
  await expect(post.getByRole('link', { name: 'Open in Google Slides' })).toHaveAttribute('href', 'https://docs.google.com/presentation/d/abc/edit')
  await expect(post.getByRole('link', { name: 'Open in Google Slides' })).toHaveAttribute('rel', 'noopener noreferrer')
  expect(fixture.sent.at(-1)).toMatchObject({ operation: 'announcement', command: { action: 'save', course_code: 'IT 102', week: 1, title: 'Bring your laptop', attachments: [{ url: 'https://docs.google.com/presentation/d/abc/edit', provider: 'google-slides' }] } })

  await page.getByRole('navigation', { name: 'Class sections' }).getByRole('button', { name: 'Teaching Materials & Assessments', exact: true }).click()
  const week = page.locator('[data-week="1"]')
  await week.getByRole('region', { name: 'Announcements for week 1' }).getByRole('button', { name: 'Bring your laptop' }).click()
  await expect(page).toHaveURL(/tab=announcements/)
  await expect(page.locator('.class-post.is-highlighted')).toContainText('Bring your laptop')

  await page.getByRole('navigation', { name: 'Class sections' }).getByRole('button', { name: 'Teaching Materials & Assessments', exact: true }).click()
  const toggle = week.getByRole('button', { name: /^Week 1/ })
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(week).toContainText('1 teaching material · 1 assessment · 1 announcement')
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('[data-topic="variables"]')).toBeHidden()
  await page.reload()
  await expect(week.getByRole('button', { name: /^Week 1/ })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Expand all', exact: true }).click()
  await expect(week.getByRole('button', { name: /^Week 1/ })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-topic="variables"]')).toHaveAttribute('open', '')
  const filter = page.getByRole('combobox', { name: 'Show week', exact: true })
  await filter.selectOption('2')
  await expect(page.getByRole('heading', { name: /^Week 2/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Week 1/ })).toHaveCount(0)
  await filter.selectOption('')
  await expect(page.getByRole('heading', { name: /^Week 1/ })).toBeVisible()
  expect(fixture.forbidden).toEqual([])
})

test('Class List shows each block with its code; a code is replaced or turned off; the class closes back to Home', async ({ page }) => {
  const fixture = await classroomUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=class-list`)
  const block = page.getByRole('region', { name: 'Block BSIT-1A class list' })
  await expect(page.getByRole('region', { name: 'Instructor' })).toBeVisible()
  await block.getByRole('button', { name: 'Create code', exact: true }).click()
  await expect(block.getByLabel('Class code of block BSIT-1A: K 7 M 2 Q X P')).toBeVisible()
  await block.getByRole('button', { name: 'Class code actions for block BSIT-1A', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Replace code' }).click()
  const confirm = page.getByRole('dialog', { name: 'Replace class code' })
  await expect(confirm).toContainText('Students who already joined stay in the class.')
  await confirm.getByRole('button', { name: 'Replace code', exact: true }).click()
  await expect(block.getByLabel('Class code of block BSIT-1A: P 4 Q 8 R S T')).toBeVisible()
  await block.getByRole('button', { name: 'Class code actions for block BSIT-1A', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Turn off code' }).click()
  await page.getByRole('dialog', { name: 'Turn off class code' }).getByRole('button', { name: 'Turn off code', exact: true }).click()
  await expect(block.getByRole('button', { name: 'Create code', exact: true })).toBeVisible()
  expect(fixture.sent.map(command => command.action)).toEqual(['create', 'regenerate', 'disable'])
  // Invite students makes the block's code when it has none and offers the join instruction.
  await block.getByRole('button', { name: 'Invite students', exact: true }).click()
  await expect(block.getByLabel('Class code of block BSIT-1A: H 3 J 5 K M N')).toBeVisible()
  await expect(page.getByText(/Invitation for block BSIT-1A copied|Share this class code with your students: H3J5KMN/)).toBeVisible()
  expect(fixture.sent.map(command => command.action)).toEqual(['create', 'regenerate', 'disable', 'create'])

  await page.getByRole('navigation', { name: 'Class sections' }).getByRole('button', { name: 'Scores', exact: true }).click()
  await expect(page.getByText('These are EduPulse assessment scores, not official grades.', { exact: false })).toBeVisible()

  // The class is a page over Home: closing it (button, Escape or Back) returns to Home without a Course station.
  const classPage = page.getByRole('dialog', { name: /^Class IT 102/ })
  await expect(classPage).toBeVisible()
  await expect(page).toHaveURL(/#\/dashboard\?course=/)
  await page.keyboard.press('Escape')
  await expect(classPage).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Course', exact: true })).toHaveCount(0)
  await page.locator('.instructor-course-card').filter({ hasText: 'IT 102' }).click()
  await expect(classPage).toBeVisible()
  await page.goBack()
  await expect(classPage).toHaveCount(0)
  await page.goto('/#/courseware?course=UNKNOWN-COURSE')
  const unavailable = page.getByRole('dialog', { name: 'Class unavailable' })
  await expect(unavailable).toContainText('This course is not in your current teaching load.')
  await unavailable.getByRole('button', { name: 'Back to Home', exact: true }).click()
  await expect(unavailable).toHaveCount(0)
  expect(fixture.forbidden).toEqual([])
})

test('a teaching draft takes a provider link that opens with its provider, and a YouTube link can play here', async ({ page }) => {
  const fixture = await classroomUI(page)
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&tab=materials`)
  await expect(page.locator('[data-topic="variables"]')).toBeVisible()
  await page.locator('details.instructor-topic').evaluateAll(nodes => nodes.forEach(node => { (node as HTMLDetailsElement).open = true }))
  await page.locator('.instructor-sequence-item').filter({ hasText: 'Variable check' }).getByRole('button', { name: 'Open', exact: true }).click()
  const attachments = page.getByRole('region', { name: 'Attached teaching files' })
  await attachments.getByRole('button', { name: 'Add link', exact: true }).click()
  await attachments.getByLabel('Link', { exact: true }).fill('https://youtu.be/dQw4w9WgXcQ')
  await attachments.getByLabel('Title (optional)').fill('Variables explained')
  await attachments.getByRole('group', { name: 'Add a link' }).getByRole('button', { name: 'Add link', exact: true }).click()
  const card = attachments.getByRole('article', { name: 'YouTube: Variables explained' })
  await expect(card.getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute('href', 'https://youtu.be/dQw4w9WgXcQ')
  await expect.poll(() => Object.values((fixture.getWorkspace() as any).content).some((item: any) => item.content.attachments?.some((link: any) => link.kind === 'link' && link.provider === 'youtube' && link.title === 'Variables explained'))).toBe(true)
  await card.getByRole('button', { name: 'Play here', exact: true }).click()
  await expect(card.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  await attachments.getByRole('button', { name: 'Add link', exact: true }).click()
  await attachments.getByLabel('Link', { exact: true }).fill('javascript:alert(1)')
  await attachments.getByRole('group', { name: 'Add a link' }).getByRole('button', { name: 'Add link', exact: true }).click()
  await expect(attachments.getByRole('alert')).toContainText('complete link')
  expect(fixture.forbidden).toEqual([])
})
