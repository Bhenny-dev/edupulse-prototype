import { test, expect, type Page, type Locator } from '@playwright/test'

// The public landing page: the opening (on every load at the top, with no skip control; section
// links and other routes bypass it), the hero emblem, section links clear of the fixed bar, the
// synchronized feature stage, the six-phase connector, the agents scope, the agent workspace,
// role tabs, FAQ, the photo rows and their pause control, sign-in, legal-page transitions and
// history, reduced motion, missing WebGL and overflow.

// The landing page always starts with the opening; most tests begin where it ends, on the hero.
async function afterOpening(page: Page, path = '/') {
  await page.goto(path)
  const prelude = page.locator('.lp-prelude')
  if (!(await prelude.count())) return
  await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.85) + 4))
  await expect(prelude).toHaveClass(/is-gone/)
}
const mobileProject = (name: string) => name === 'mobile'

async function openSection(page: Page, mobile: boolean, name: string) {
  if (mobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const nav = page.getByRole('navigation', { name: mobile ? 'Landing page sections menu' : 'Landing page sections', exact: true })
  await nav.getByRole('link', { name, exact: true }).click()
  if (mobile) await expect(page.getByRole('navigation', { name: 'Landing page sections menu' })).toHaveCount(0)
}
// After a section link, the section starts right under the fixed bar (not behind it).
async function expectBelowBar(page: Page, section: Locator) {
  const id = await section.getAttribute('id')
  await expect.poll(async () => {
    const [top, bar] = await Promise.all([section.evaluate(element => element.getBoundingClientRect().top), page.locator('.lp-nav').evaluate(element => element.getBoundingClientRect().bottom)])
    return Math.round(Math.abs(top - bar))
  }, { timeout: 20_000, message: `#${id} should start right under the bar` }).toBeLessThanOrEqual(3)
}

// The previous smooth scroll has finished (two frames apart at the same position).
async function scrollAtRest(page: Page) {
  await expect.poll(() => page.evaluate(() => new Promise<boolean>(resolve => { const y = window.scrollY; requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.scrollY === y))) })), { timeout: 8000 }).toBe(true)
}

test('a fresh visit opens on the logo and name; scrolling opens the aperture into the hero and back', async ({ page }) => {
  await page.goto('/')
  const prelude = page.locator('.lp-prelude')
  await expect(prelude).toBeVisible()
  await expect(page.locator('.prelude-word')).toHaveText('EduPulse')
  await expect(page.locator('.lp-opening')).toHaveAttribute('data-intro', 'ready', { timeout: 6000 })
  await expect(page.getByRole('button', { name: 'Skip intro' })).toHaveCount(0)
  await expect(page.locator('.prelude-cue')).toHaveText('Scroll to explore')
  // While the field is closed the bar is out of sight and out of the tab order.
  await expect(page.locator('.lp-nav')).toHaveAttribute('inert', '')

  // About one viewport of scrolling opens it, and then nothing of it intercepts the page.
  const travel = await page.evaluate(() => Math.round(window.innerHeight * 0.85))
  await page.evaluate(y => window.scrollTo(0, y), travel + 4)
  await expect(prelude).toHaveClass(/is-gone/)
  await expect(page.locator('.lp-nav')).not.toHaveAttribute('inert', '')
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('One shared home for')
  // The hero: the title, two actions and the emblem, with no screen or photograph that a later
  // section shows. The 3D scene draws the emblem's ring and seals over its box.
  const hero = page.locator('.lp-hero')
  await expect(hero.locator('.hero-seal img')).toHaveCount(2)
  await expect(hero.locator('figure, .hero-lede, .hero-notes')).toHaveCount(0)
  await expect(hero.locator('.hero-emblem')).toHaveAttribute('data-drawn', '', { timeout: 15_000 })
  await expect(hero.locator('.hero-emblem')).toBeInViewport()

  // It follows the scroll back up, and a fast jump to the end of the page is never held.
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(prelude).not.toHaveClass(/is-gone/)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(page.locator('footer.lp-footer')).toBeInViewport()
})

test('a keyboard user who tabs into the hero plays the opening forward instead of skipping it', async ({ page }, info) => {
  test.skip(mobileProject(info.project.name), 'keyboard navigation')
  test.setTimeout(90_000)
  await page.goto('/')
  await expect(page.locator('.lp-prelude')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page.locator('.lp-prelude')).not.toHaveClass(/is-gone/)
  // The bar is out of the tab order while the facets are closed, so the next stop is the hero.
  await page.keyboard.press('Tab')
  const start = page.locator('.lp-hero').getByRole('link', { name: 'Get started' })
  await expect(start).toBeFocused()
  await expect(page.locator('.lp-prelude')).toHaveClass(/is-gone/)
  await expect(page.locator('.lp-prelude')).toHaveCount(1) // played to its end, not removed
  await expect(start).toBeInViewport()
  await expect(page.locator('.lp-nav')).not.toHaveAttribute('inert', '')
})

test('keyboard focus on a hero action survives the page re-measuring itself', async ({ page }, info) => {
  test.skip(mobileProject(info.project.name), 'keyboard navigation')
  test.setTimeout(90_000)
  await page.goto('/')
  await expect(page.locator('.lp-prelude')).toBeVisible()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const start = page.locator('.lp-hero').getByRole('link', { name: 'Get started' })
  await expect(start).toBeFocused()
  await expect(page.locator('.lp-prelude')).toHaveClass(/is-gone/)
  // A resize makes ScrollTrigger re-measure the pinned sections, as fonts and photographs do;
  // the hero is inside the pinned opening, which a refresh takes out of its spacer and back.
  const size = page.viewportSize()!
  await page.setViewportSize({ width: size.width, height: size.height + 40 })
  await page.waitForTimeout(600)
  await expect(start).toBeFocused()
})

test('the opening plays on every load at the top, a reload included; section links and other routes bypass it', async ({ page }) => {
  test.setTimeout(90_000) // three tabs, each compiled by the development server
  await page.goto('/')
  await expect(page.locator('.lp-prelude')).toBeVisible()
  await page.reload()
  await expect(page.locator('.lp-prelude')).toBeVisible()
  await expect(page.locator('.prelude-word')).toHaveText('EduPulse')

  const direct = await page.context().newPage()
  await direct.goto('/#/?section=faq')
  await expect(direct.locator('.lp-prelude')).toHaveCount(0)
  await expect(direct.locator('#faq')).toBeInViewport()

  const legal = await page.context().newPage()
  await legal.goto('/#/privacy')
  await legal.getByRole('link', { name: 'Back to Home' }).click()
  await expect(legal.getByRole('heading', { level: 1 })).toContainText('One shared home for')
  await expect(legal.locator('.lp-prelude')).toHaveCount(0)
})

test('header links reach their sections below the bar; role tabs and the FAQ work; no horizontal overflow', async ({ page }, info) => {
  test.setTimeout(90_000) // the development server compiles the page on the first visit
  const mobile = mobileProject(info.project.name)
  await afterOpening(page)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('One shared home for')
  await page.evaluate(() => document.fonts.ready)

  for (const [name, id] of [['Why EduPulse', 'problem'], ['Features', 'features'], ['How It Works', 'flow'], ['Roles', 'roles'], ['Impact', 'impact'], ['Colleges', 'colleges'], ['FAQ', 'faq']]) {
    await openSection(page, mobile, name)
    await expectBelowBar(page, page.locator(`#${id}`))
    expect(page.url(), 'section links leave the route alone').not.toContain(id)
  }
  await expect(page.locator('#colleges')).toContainText('Now serving')
  await expect(page.locator('#colleges .college-card')).toHaveCount(4)
  await expect(page.locator('#colleges .college-card .college-status')).toHaveText(['Planned', 'Planned', 'Planned', 'Planned'])

  await openSection(page, mobile, 'Roles')
  const instructor = page.getByRole('tab', { name: 'Instructor', exact: true })
  await expect(instructor).toHaveAttribute('aria-selected', 'true')
  const panelHeight = () => page.locator('.role-panels').evaluate(element => element.getBoundingClientRect().height)
  const height = await panelHeight()
  await instructor.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('tab', { name: 'Student', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: 'Student', exact: true })).toBeFocused()
  await expect(page.getByRole('tabpanel')).toContainText('Pulse will not answer or hint at assessment items.')
  expect(await panelHeight(), 'switching roles never changes the height').toBe(height)
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'System Admin', exact: true })).toBeFocused()
  await expect(page.getByRole('tabpanel')).toContainText('Accounts, health and accountability')
  await page.keyboard.press('Home')
  await expect(instructor).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab')).toHaveCount(5)

  await openSection(page, mobile, 'FAQ')
  await expect(page.locator('.faq-question')).toHaveCount(8)
  const first = page.getByRole('button', { name: 'Who can sign in to EduPulse?' })
  const second = page.getByRole('button', { name: 'Does EduPulse replace our LMS or the official grading sheet?' })
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await second.click()
  await expect(second).toHaveAttribute('aria-expanded', 'true')
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText('grades stay in the official KCP grading sheet', { exact: false }).first()).toBeVisible()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('footer links reach their sections and the legal pages', async ({ page }) => {
  test.setTimeout(90_000)
  await afterOpening(page)
  await page.evaluate(() => document.fonts.ready)
  const footer = page.getByRole('navigation', { name: 'Footer: page sections' })
  for (const [name, id] of [['Impact', 'impact'], ['How It Works', 'flow'], ['Why EduPulse', 'problem']]) {
    await scrollAtRest(page)
    await footer.getByRole('link', { name, exact: true }).click()
    await expectBelowBar(page, page.locator(`#${id}`))
  }
  await expect(page.getByRole('navigation', { name: 'Footer: legal' }).getByRole('link')).toHaveText(['Privacy', 'Terms'])
})

test('the four feature steps stay in step forwards, backwards and under rapid scrolling', async ({ page }, info) => {
  test.setTimeout(90_000)
  test.skip(mobileProject(info.project.name), 'phones show the steps stacked')
  await afterOpening(page)
  const section = page.locator('#features')
  await expect(section).toHaveClass(/is-live/)
  const titles = await section.locator('.fs-chapter h3').allTextContents()
  const screens = ['Records page', 'Syllabus Builder', 'My Courseware list', 'My Performance page']
  expect(titles).toHaveLength(4)
  const range = await section.evaluate(element => {
    const spacer = element.querySelector('.pin-spacer') as HTMLElement
    const stage = element.querySelector('.fs-stage') as HTMLElement
    const bar = (document.querySelector('.lp-nav') as HTMLElement).offsetHeight
    return { start: spacer.getBoundingClientRect().top + window.scrollY - bar, distance: spacer.offsetHeight - stage.offsetHeight }
  })
  const state = () => section.evaluate(element => ({
    count: element.querySelector('.fs-count span')?.textContent,
    active: element.querySelector('.fs-chapter.is-active h3')?.textContent,
    shown: [...element.querySelectorAll('.fs-chapter')].filter(chapter => Number(getComputedStyle(chapter).opacity) > 0.99).map(chapter => chapter.querySelector('h3')?.textContent),
    shot: [...element.querySelectorAll('.fs-shot')].findIndex(shot => shot.classList.contains('is-active')),
    caption: element.querySelector('.fs-caption strong')?.textContent,
    control: element.querySelector('.fs-step[aria-current="step"] .fs-step-name')?.textContent,
  }))
  const expectStep = async (i: number) => {
    await expect.poll(state, { timeout: 4000 }).toEqual({ count: `0${i + 1}`, active: titles[i], shown: [titles[i]], shot: i, caption: screens[i], control: titles[i] })
  }
  const go = (fraction: number) => page.evaluate(y => window.scrollTo(0, y), Math.round(range.start + fraction * range.distance))
  for (const [fraction, step] of [[0.1, 0], [0.4, 1], [0.6, 2], [0.9, 3], [0.6, 2], [0.35, 1], [0.05, 0]] as const) {
    await go(fraction)
    await expectStep(step)
  }
  for (const fraction of [0.9, 0.1, 0.65, 0.3, 0.88]) { await go(fraction); await page.waitForTimeout(25) }
  await expectStep(3)
  await section.getByRole('button', { name: /The Syllabus Builder/ }).click()
  await expectStep(1)
})

test('the agents scope names all nine agents in order, then opens into the next section', async ({ page }) => {
  test.setTimeout(90_000)
  await afterOpening(page)
  const section = page.locator('#agents')
  await expect(section).toHaveClass(/is-live/)
  await expect(section.locator('.scope-svg')).toHaveAttribute('aria-hidden', 'true')
  const names = await section.locator('.agents-list h3').allTextContents()
  expect(names).toEqual(['Guardian', 'Planner', 'Researcher', 'Librarian', 'Ranker', 'Comparator', 'Writer', 'Verifier', 'Corrector'])
  // One unit of the scroll-linked timeline per agent, then 1.6 for the core's opening. The pinned
  // range is measured at every step, because a refresh (fonts, photographs) can move it.
  const units = names.length + 1.6
  const go = (time: number, past = 0) => section.evaluate((element, [fraction, extra]) => {
    const spacer = element.parentElement as HTMLElement
    const start = spacer.getBoundingClientRect().top + window.scrollY
    const distance = spacer.offsetHeight - (element as HTMLElement).offsetHeight
    window.scrollTo(0, Math.round(start + fraction * distance + extra))
  }, [time / units, past])
  const caption = section.locator('.agents-name')
  for (const [i, name] of names.entries()) {
    await go(i + 0.5)
    await expect.poll(() => caption.textContent(), { timeout: 5000 }).toBe(name)
    await expect(section.locator('.scope-ring').nth(i)).toHaveClass(/is-active/)
    await expect(section.locator('.agents-count')).toHaveText(`0${i + 1} / 09`)
  }
  await go(2.5)
  await expect.poll(() => caption.textContent(), { timeout: 5000 }).toBe('Researcher')
  // The core opens into white, and the next section follows.
  await go(units)
  await expect.poll(() => section.locator('.scope-light').evaluate(element => Number(getComputedStyle(element).opacity)), { timeout: 5000 }).toBeGreaterThan(0.98)
  await go(units, 300)
  await expect(page.locator('#workspace')).toBeInViewport()
})

test('with reduced motion the agents are one still picture and a list of all nine', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const section = page.locator('#agents')
  await expect(section.locator('.agents-list li')).toHaveCount(9)
  await expect(section).not.toHaveClass(/is-live/)
  await expect(section.getByRole('heading', { level: 3, name: 'Guardian' })).toBeVisible()
  await expect(section.getByRole('heading', { level: 3, name: 'Corrector' })).toBeVisible()
  await expect(section.locator('.agents-caption')).toBeHidden()
  expect(await section.evaluate(element => element.parentElement?.classList.contains('pin-spacer'))).toBe(false)
})

test('the agent workspace is the room alone on the screen and answers a tap on a robot or on its button', async ({ page }, info) => {
  test.setTimeout(120_000)
  await page.goto('/#/?section=workspace')
  const section = page.locator('#workspace')
  const answer = section.locator('.ws-answer')
  await expect(section.locator('.ws-stage')).toHaveClass(/is-scene/, { timeout: 20_000 })
  await expect(section.locator('.ws-canvas')).toHaveAttribute('aria-hidden', 'true')
  await expect(section.locator('.ws-stage')).toHaveAttribute('data-assembled', '', { timeout: 20_000 })
  // Nothing but the room: no request panel and no conversation beside it.
  await expect(section.getByText('Try a request')).toHaveCount(0)
  await expect(section.locator('.ws-chat, .ws-log')).toHaveCount(0)
  const room = await section.locator('.ws-room').boundingBox()
  expect(Math.abs((room?.width ?? 0) - (page.viewportSize()?.width ?? 0))).toBeLessThanOrEqual(20)
  if (!mobileProject(info.project.name)) {
    // A tap in the middle of the room picks the Comparator's sofa in 3D.
    await section.locator('.ws-canvas').click()
    await expect(section.getByRole('button', { name: 'Comparator', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(answer).toContainText('Compare my syllabus with last year’s.')
    await expect(answer).toContainText('I’ll line them up')
  }
  await section.getByRole('button', { name: 'Guardian', exact: true }).click()
  await expect(answer).toContainText('That breaks the assessment rule, so I stop the request here')
  await expect(section.locator('.ws-bubble')).toHaveClass(/is-on/)
  await expect(section.locator('.ws-bubble')).toContainText('Can you give me the quiz answers?')
  await section.getByRole('button', { name: 'Pause motion' }).click()
  await expect(section.getByRole('button', { name: 'Play motion' })).toBeVisible()
})

test('with reduced motion the workspace is one screen and a button answers at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/?section=workspace')
  const section = page.locator('#workspace')
  await section.getByRole('button', { name: 'Planner', exact: true }).click()
  await expect(section.locator('.ws-answer')).toContainText('I’ll plan the searches')
  await expect(section.getByText('Try a request')).toHaveCount(0)
})

test('the six phases draw their connector; every phase keeps its AI and People duties', async ({ page }) => {
  await afterOpening(page)
  const flow = page.locator('#flow')
  await expect(flow).toHaveClass(/is-live/)
  await expect(flow.locator('.flow-phase')).toHaveCount(6)
  await expect(flow.locator('.flow-node')).toHaveText(['00', '01', '02', '03', '04', '05'])
  await expect(flow.locator('.flow-duty.is-ai dt')).toHaveText(Array(6).fill('AI'))
  await expect(flow.locator('.flow-duty.is-people dt')).toHaveText(Array(6).fill('People'))
  await expect(flow.locator('.pin-spacer')).toHaveCount(0)
  await expect(flow.locator('.flow-phase.is-reached')).toHaveCount(0)
  const box = await flow.evaluate(element => { const rect = element.getBoundingClientRect(); return { top: rect.top + window.scrollY, height: rect.height } })
  for (let y = box.top - 600; y <= box.top + box.height; y += 220) { await page.evaluate(to => window.scrollTo(0, to), y); await page.waitForTimeout(60) }
  await expect(flow.locator('.flow-phase.is-reached')).toHaveCount(6)
  await expect.poll(() => flow.locator('.flow-line-draw').evaluate(path => Number.parseFloat(getComputedStyle(path).strokeDashoffset))).toBeLessThan(2)
  await expect(flow.locator('.flow-body').last()).toHaveCSS('opacity', '1')
})

test('the photographs drift; the pause control, hover, focus and a tap stop them', async ({ page }, info) => {
  test.setTimeout(60_000)
  const mobile = mobileProject(info.project.name)
  await afterOpening(page)
  const rail = page.getByRole('region', { name: 'CIT community photographs' })
  const track = page.locator('.photo-track').first()
  await track.scrollIntoViewIfNeeded()
  await expect(rail).toHaveAttribute('data-paused', 'false')
  const x = () => track.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m41)
  const stopsMoving = async () => { await page.waitForTimeout(1600); const held = await x(); await page.waitForTimeout(800); expect(Math.abs((await x()) - held)).toBeLessThan(1) }
  const start = await x(); await page.waitForTimeout(800)
  expect(await x()).not.toBe(start)

  // The persistent control holds the rows until it is pressed again.
  const press = (control: Locator) => (mobile ? control.tap() : control.click())
  await press(page.getByRole('button', { name: 'Pause photo movement' }))
  if (!mobile) await page.mouse.move(2, 2)
  await expect(rail).toHaveAttribute('data-paused', 'true')
  await stopsMoving()
  await press(page.getByRole('button', { name: 'Play photo movement' }))
  if (!mobile) await page.mouse.move(2, 2)
  await expect(rail).toHaveAttribute('data-paused', 'false')

  if (mobile) {
    // The rail itself is the target: the drifting track never holds still for a pointer.
    await rail.tap({ position: { x: 24, y: 24 } })
    await expect(rail).toHaveAttribute('data-paused', 'true')
    await stopsMoving()
    await rail.tap({ position: { x: 24, y: 24 } })
    await expect(rail).toHaveAttribute('data-paused', 'false')
  } else {
    await rail.hover({ position: { x: 24, y: 24 } })
    await expect(rail).toHaveAttribute('data-paused', 'true')
    await page.mouse.move(2, 2)
    await expect(rail).toHaveAttribute('data-paused', 'false')
    await rail.focus()
    await expect(rail).toHaveAttribute('data-paused', 'true')
    await stopsMoving()
  }
  await expect(page.locator('#campus')).toContainText("Photos: King's College of the Philippines (kcp.edu.ph)")
})

test('the sign-in panel keeps its fields, hints and validation, and holds still while used', async ({ page }) => {
  await afterOpening(page)
  await page.locator('.lp-nav').getByRole('link', { name: 'Sign In', exact: true }).click()
  const email = page.getByLabel('Email', { exact: true })
  const password = page.getByLabel('Password', { exact: true })
  await expect(email).toHaveAttribute('type', 'email')
  await expect(email).toHaveAttribute('autocomplete', 'email')
  await expect(password).toHaveAttribute('type', 'password')
  await expect(password).toHaveAttribute('autocomplete', 'current-password')
  await expect(page.getByText('Use the email and password assigned to your EduPulse account.')).toBeVisible()
  // Nothing is submitted: the empty form is stopped by the browser's own validation.
  await page.locator('#login').getByRole('button', { name: 'Sign In', exact: true }).click()
  expect(await email.evaluate(input => (input as HTMLInputElement).validity.valueMissing)).toBe(true)
  await expect(page).toHaveURL(/:\d+\/(#\/?)?$/)
  const before = await email.boundingBox()
  await email.fill('reader@example.com')
  await page.waitForTimeout(400)
  expect((await email.boundingBox())?.y).toBe(before?.y)
  // The aperture belongs to the welcome picture; the form itself is never masked or moved.
  expect(await page.locator('.signin-form').evaluate(element => getComputedStyle(element).clipPath)).toBe('none')
  expect(await page.locator('.signin-frame').evaluate(element => getComputedStyle(element).clipPath)).toBe('none')
})

test('Privacy and Terms open with a short reveal at the top; Back returns to the same place', async ({ page }) => {
  test.setTimeout(90_000)
  await afterOpening(page)
  const legal = page.getByRole('navigation', { name: 'Footer: legal' })
  await legal.scrollIntoViewIfNeeded()
  // Where the links sat on screen: the return starts without the opening (and its pin's own
  // scroll length), so the place is compared on screen, not as a scroll offset.
  const where = () => legal.evaluate(element => Math.round(element.getBoundingClientRect().top))
  const left = await where()
  await legal.getByRole('link', { name: 'Privacy' }).click()
  await expect(page).toHaveURL(/#\/privacy$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  expect(await page.locator('.public-page').evaluate(element => getComputedStyle(element).animationName)).toBe('public-page-rect')
  await expect.poll(() => page.locator('.public-page').evaluate(element => getComputedStyle(element).clipPath), { timeout: 2000 }).toBe('none')
  await expect(page.locator('.lp-prelude, .landing-intro')).toHaveCount(0)

  await page.goBack()
  await expect(page.locator('.landing-page')).toBeVisible()
  await expect(page.locator('.lp-prelude')).toHaveCount(0)
  await expect.poll(async () => Math.abs((await where()) - left), { timeout: 4000 }).toBeLessThan(80)

  await page.getByRole('navigation', { name: 'Footer: legal' }).getByRole('link', { name: 'Terms' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeFocused()
  expect(await page.locator('.public-page').evaluate(element => getComputedStyle(element).animationName)).toBe('public-page-diagonal')
  await page.goBack()
  await expect(page).toHaveURL(/:\d+\/(#\/?)?$/)
})

test('Back from a legal page returns mid-page to the same place, although the opening has gone', async ({ page }) => {
  test.setTimeout(90_000)
  await afterOpening(page)
  // The opening is on the page with its pin; the return will start without it.
  const faq = page.locator('#faq'), faqTop = () => faq.evaluate(element => Math.round(element.getBoundingClientRect().top))
  await page.evaluate(() => { const top = document.getElementById('faq')!.getBoundingClientRect().top + window.scrollY; window.scrollTo(0, top - 120) })
  await scrollAtRest(page)
  await page.waitForTimeout(400)
  const start = await faqTop()
  await page.evaluate(() => { window.location.hash = '#/privacy' })
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()
  await page.goBack()
  await expect(page.locator('.lp-prelude')).toHaveCount(0)
  await expect.poll(async () => Math.abs((await faqTop()) - start), { timeout: 4000 }).toBeLessThan(80)
})

test('the skip link moves focus past the hero and stays on the landing page', async ({ page }, info) => {
  test.skip(mobileProject(info.project.name), 'keyboard navigation')
  await afterOpening(page)
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.locator('.landing-page')).toBeVisible()
  expect(page.url()).not.toContain('main-content')
})

test('no horizontal scrolling at desktop, laptop, tablet, phone and narrow phone widths, also after resizing', async ({ page }, info) => {
  test.skip(mobileProject(info.project.name), 'widths are set explicitly')
  test.setTimeout(180_000)
  await afterOpening(page)
  // One page, resized through the widths (a resize or a turned phone must not break the layout either).
  for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 740]]) {
    await page.setViewportSize({ width, height })
    for (const fraction of [0, 0.3, 0.6, 1]) {
      await page.evaluate(f => window.scrollTo(0, document.documentElement.scrollHeight * f), fraction)
      await page.waitForTimeout(200)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `width ${width}`).toBeLessThanOrEqual(width + 1)
    }
  }
})

test('with reduced motion there is no opening and every section is complete and still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.lp-prelude')).toHaveCount(0)
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  await expect(page.locator('#features')).not.toHaveClass(/is-live/)
  await expect(page.locator('#flow')).not.toHaveClass(/is-live/)
  await expect(page.locator('.split-line')).toHaveCount(0)
  await expect(page.locator('.lp-opening')).not.toHaveClass(/has-scene/)
  await expect(page.locator('#impact')).toContainText('7.4 h')
  await expect(page.locator('#impact')).toContainText('31%')
  await expect(page.locator('#features .fs-inline img').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /photo movement/ })).toBeHidden()
  expect(await page.locator('h2').evaluateAll(headings => headings.filter(h => getComputedStyle(h).opacity !== '1').length)).toBe(0)
  // No arrivals: no block waits to come in, and nothing is moved or faded.
  await expect(page.locator('[data-arrival]')).toHaveCount(0)
  expect(await page.locator('.why-card, .flow-card, .evidence-item').evaluateAll(cards => cards.filter(card => card.style.opacity !== '').length)).toBe(0)
  await expect(page.locator('.hero-seal img')).toHaveCount(2)
})

test('arriving cards ease in from a side and leave no styles once in place, in both directions', async ({ page }, info) => {
  test.skip(mobileProject(info.project.name), 'the same arrivals run on phones; one width is enough here')
  test.setTimeout(90_000)
  await afterOpening(page)
  expect(await page.locator('[data-arrival]').count()).toBeGreaterThan(20)
  // Places a block's centre at a share of the viewport's height (1.3 is below the screen, 0.5 is its middle).
  const place = (selector: string, share: number) => page.evaluate(([selector, share]) => {
    const block = document.querySelector(String(selector))!
    const box = block.getBoundingClientRect()
    window.scrollBy(0, box.top + Math.min(box.height, window.innerHeight) / 2 - window.innerHeight * Number(share))
  }, [selector, share])
  const style = (card: Locator) => card.evaluate(element => ({ opacity: (element as HTMLElement).style.opacity, translate: (element as HTMLElement).style.translate }))
  for (const selector of ['#problem .why-card', '#flow .flow-card', '#impact .evidence-item', '#colleges .college-card']) {
    const card = page.locator(selector).first()
    // Below the screen the card waits, faded out and off to its side.
    await place(selector, 1.4)
    await expect(card).not.toHaveAttribute('data-arriving', { timeout: 10_000 })
    // The jump to the Impact cards crosses the workspace, whose 3D room loads on the way and
    // holds the page for seconds under software rendering (2.6 to 4.3 s measured here).
    await expect.poll(() => style(card).then(value => value.opacity), { timeout: 15_000 }).toBe('0')
    // Coming up the screen it eases in, from a side, rather than being built or cut in.
    await place(selector, 0.6)
    await expect(card).toHaveAttribute('data-arriving', '')
    await expect.poll(() => style(card).then(value => value.translate)).not.toBe('')
    // In place: the card is itself again, with no styles left on it or its parts.
    await expect(card).not.toHaveAttribute('data-arriving', { timeout: 10_000 })
    await expect.poll(() => card.evaluate(element => [element, ...element.querySelectorAll('*')].filter(node => (node as HTMLElement).style.opacity !== '' || (node as HTMLElement).style.translate !== '').length)).toBe(0)
  }
  // A heading's lines come in too.
  await place('#roles .lp-head', 1.3)
  await place('#roles .lp-head', 0.9)
  await expect(page.locator('#roles .lp-head')).toHaveAttribute('data-arriving', '')
  // Scrolling back below the screen takes a card out again, and back up it comes in again.
  await place('#problem .why-card', 1.4)
  await expect.poll(() => style(page.locator('#problem .why-card').first()).then(value => value.opacity), { timeout: 10_000 }).toBe('0')
  await place('#problem .why-card', 0.6)
  await expect(page.locator('#problem .why-card').first()).toHaveAttribute('data-arriving', '')
})

test('without WebGL the page keeps its flat emblem and the opening still works', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/i.test(type) ? null : (original as (...args: unknown[]) => unknown).call(this, type, ...rest)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
  const problems: string[] = []
  page.on('pageerror', error => problems.push(error.message))
  page.on('console', message => { if (message.type() === 'error') problems.push(message.text()) })
  await page.goto('/')
  await expect(page.locator('.lp-opening')).toHaveClass(/no-scene/, { timeout: 15_000 })
  // The opening has no skip control: scrolling opens it here too.
  await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.85) + 4))
  await expect(page.locator('.lp-prelude')).toHaveClass(/is-gone/)
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
  // Without WebGL the flat emblem stays: the SVG ring around the two seal images.
  await expect(page.locator('.pulse-ring-svg')).toBeVisible()
  await expect(page.locator('.hero-seal img')).toHaveCount(2)
  await expect(page.locator('.hero-emblem')).not.toHaveAttribute('data-drawn')
  const workspace = page.locator('#workspace')
  await workspace.scrollIntoViewIfNeeded()
  await expect(workspace.locator('.ws-stage')).toHaveClass(/is-flat/, { timeout: 15_000 })
  await workspace.getByRole('button', { name: 'Planner', exact: true }).click()
  await expect(workspace.locator('.ws-answer')).toContainText('I’ll plan the searches')
  await page.locator('#login').scrollIntoViewIfNeeded()
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  expect(problems).toEqual([])
})
