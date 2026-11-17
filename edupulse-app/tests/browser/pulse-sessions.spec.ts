import { test, expect, type Page } from '@playwright/test'
import { academicUI } from '../academic-ui-fixture'
import { providerFixture } from './provider-fixture'

type Thread = { id: string; title: string; archived: boolean; updated_at: string }
const WEEK3 = '11111111-1111-4111-8111-111111111111', NETWORKS = '22222222-2222-4222-8222-222222222222'

async function sessionUI(page: Page) {
  const provider = await providerFixture(page, { identity: { mode: 'authenticated', role: 'instructor' }, database: { ready: false, kind: 'supabase', message: 'Synthetic UI fixture' } })
  provider.authorize('gemini'); provider.authorize('openai')
  await academicUI(page, async () => ({ json: {} }))
  const now = Date.now()
  let threads: Thread[] = [
    { id: WEEK3, title: 'Week 3 quiz plan', archived: false, updated_at: new Date(now - 2 * 3600e3).toISOString() },
    { id: NETWORKS, title: 'Networking references', archived: false, updated_at: new Date(now - 3 * 86400e3).toISOString() },
  ]
  const commands: Record<string, unknown>[] = [], chats: Record<string, unknown>[] = []
  let releaseChat: (() => void) | null = null, holdChat = false
  const [{ lookupAnswer }, { chatInput }] = await Promise.all([import('../../server/systemLookup'), import('../../server/contracts')])
  await page.route('**/api/ai?*', async route => {
    const url = new URL(route.request().url()), action = url.searchParams.get('action')
    if (action === 'conversations') {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON(); commands.push(body)
        if (body.operation === 'rename') threads = threads.map(thread => thread.id === body.id ? { ...thread, title: body.title } : thread)
        if (body.operation === 'archive') threads = threads.map(thread => thread.id === body.id ? { ...thread, archived: body.archived } : thread)
        if (body.operation === 'delete') threads = threads.filter(thread => thread.id !== body.id)
        if (body.operation === 'create') threads = [{ id: body.id, title: body.title, archived: false, updated_at: new Date().toISOString() }, ...threads]
        return route.fulfill({ json: { saved: true } })
      }
      const id = url.searchParams.get('id')
      return route.fulfill({ json: { threads, memories: [], automaticMemory: true, mode: 'cloud', ...(id ? { messages: [{ id: `${id}-1`, role: 'user', text: 'Plan the week 3 quiz', attachments: [] }, { id: `${id}-2`, role: 'assistant', text: 'Here is a week 3 quiz plan.', attachments: [] }] } : {}) } })
    }
    if (action === 'operator') return route.fulfill({ json: { plan: { tool: 'chat' } } })
    if (action === 'chat' || action === 'system-chat') {
      const body = route.request().postDataJSON(); chats.push({ action, ...body })
      if (holdChat) await new Promise<void>(resolve => { releaseChat = resolve })
      const input = chatInput.parse(body)
      const web = { id: 'web:https://en.wikipedia.org/?curid=1', documentId: 'https://en.wikipedia.org/?curid=1', title: 'Donald Trump', url: 'https://en.wikipedia.org/?curid=1', text: 'Donald John Trump is an American politician and businessman.', page: null, section: 'Wikipedia introductory excerpt', flagged: false, origin: 'web', method: 'web-search', similarity: null, rrf: 1, relevance: null, query: 'donald trump' }
      const answer = /internet/i.test(input.message) ? await lookupAnswer({ ...input, message: 'donald trump' }, [web as never], AbortSignal.timeout(5000), 'web', undefined, undefined, true) : await lookupAnswer(input, [], AbortSignal.timeout(5000), 'system')
      return route.fulfill({ json: answer }).catch(() => {})
    }
    return route.fallback()
  })
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Open Pulse assistant', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await expect(dialog.getByRole('button', { name: 'Conversation history', exact: true })).toBeVisible()
  return { dialog, commands, chats, hold: () => { holdChat = true }, release: () => { holdChat = false; releaseChat?.() } }
}

test('the session dropdown searches and opens chats, and the options rename, archive and delete the open one', async ({ page }) => {
  const { dialog, commands } = await sessionUI(page)
  const heading = dialog.locator('.pulse-session-name')
  await expect(heading).toHaveText('New chat')
  await dialog.getByRole('button', { name: 'Conversation history', exact: true }).click()
  const sessions = dialog.getByRole('dialog', { name: 'Conversation history', exact: true })
  await expect(sessions.getByRole('searchbox', { name: 'Search recent chats', exact: true })).toBeFocused()
  await expect(sessions.getByRole('button', { name: /Week 3 quiz plan\s*2h/ })).toBeVisible()
  await expect(sessions.getByRole('button', { name: /Networking references\s*3d/ })).toBeVisible()
  await sessions.getByRole('searchbox', { name: 'Search recent chats', exact: true }).fill('network')
  await expect(sessions.getByRole('button', { name: /Week 3 quiz plan/ })).toHaveCount(0)
  await sessions.getByRole('searchbox', { name: 'Search recent chats', exact: true }).fill('')
  await sessions.getByRole('button', { name: /Week 3 quiz plan/ }).click()
  await expect(sessions).toHaveCount(0)
  await expect(heading).toHaveText('Week 3 quiz plan')
  await expect(dialog).toContainText('Here is a week 3 quiz plan.')

  await dialog.getByRole('button', { name: 'Edit this message', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true })).toHaveValue('Plan the week 3 quiz')
  await dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('')

  await dialog.getByRole('button', { name: 'Pulse options', exact: true }).click()
  await dialog.getByRole('button', { name: 'Rename conversation', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Conversation name', exact: true }).fill('Quiz plan for week 3')
  await dialog.getByRole('textbox', { name: 'Conversation name', exact: true }).press('Enter')
  await expect(heading).toHaveText('Quiz plan for week 3')
  await expect(dialog.getByRole('status').filter({ hasText: 'Conversation renamed.' })).toBeVisible()
  expect(commands).toContainEqual({ operation: 'rename', id: WEEK3, title: 'Quiz plan for week 3' })

  await dialog.getByRole('button', { name: 'Pulse options', exact: true }).click()
  await dialog.getByRole('button', { name: 'Archive conversation', exact: true }).click()
  expect(commands).toContainEqual({ operation: 'archive', id: WEEK3, archived: true })
  await expect(heading).toHaveText('New chat')
  await dialog.getByRole('button', { name: 'Conversation history', exact: true }).click()
  await expect(sessions.getByRole('button', { name: /Quiz plan for week 3\s*Archived/ })).toBeVisible()
  await sessions.getByRole('button', { name: /Quiz plan for week 3/ }).click()
  await expect(heading).toHaveText('Quiz plan for week 3 · Archived')

  await dialog.getByRole('button', { name: 'Pulse options', exact: true }).click()
  await dialog.getByRole('button', { name: 'Delete conversation', exact: true }).click()
  await expect(dialog.getByRole('group', { name: 'Delete conversation', exact: true })).toContainText('cannot be undone')
  await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  expect(commands).toContainEqual({ operation: 'delete', id: WEEK3 })
  await expect(heading).toHaveText('New chat')
  await expect(dialog).not.toContainText('Here is a week 3 quiz plan.')
})

test('the provider and model chip switches the saved model and provider from the panel', async ({ page }) => {
  const { dialog } = await sessionUI(page)
  const chip = dialog.getByRole('button', { name: /^AI provider and model: openai · gpt-6\.1-terra/ })
  await chip.click()
  const menu = dialog.getByRole('dialog', { name: 'AI provider and model', exact: true })
  await expect(menu.getByRole('button', { name: /^OpenAI/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(menu.getByRole('region', { name: 'Models for OpenAI', exact: true }).getByRole('button', { name: /gpt-6\.1-terra/ })).toHaveAttribute('aria-pressed', 'true')
  const posted = page.waitForRequest(request => request.url().includes('action=providers') && request.method() === 'POST')
  await menu.getByRole('button', { name: /gpt-6-luna/ }).click()
  expect((await posted).postDataJSON()).toEqual({ provider: 'openai', model: 'gpt-6-luna' })
  await expect(menu).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: /^AI provider and model: openai · gpt-6-luna/ })).toBeVisible()
  await dialog.getByRole('button', { name: /^AI provider and model:/ }).click()
  await menu.getByRole('button', { name: /^Google Gemini/ }).click()
  await expect(dialog.getByRole('button', { name: /^AI provider and model: gemini/ })).toBeVisible()
  await dialog.getByRole('button', { name: /^AI provider and model:/ }).click()
  await menu.getByRole('button', { name: 'Add or manage providers', exact: true }).click()
  await expect(page).toHaveURL(/settings\?tab=ai-provider/)
})

test('an Internet search goes straight to the web and answers without a "not found in the system" preamble', async ({ page }) => {
  const fixture = await sessionUI(page), { dialog } = fixture
  fixture.hold()
  await dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('search for donald trump on the internet')
  await dialog.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(dialog.getByRole('status').filter({ hasText: 'Searching the Internet for “donald trump”' })).toBeVisible()
  fixture.release()
  await expect(dialog).toContainText('Donald John Trump is an American politician')
  await expect(dialog).toContainText('Internet search · No AI credits used')
  await expect(dialog).not.toContainText(/did not find|Internet suggestions|No matching/)
  expect(fixture.chats).toHaveLength(1)
  expect(fixture.chats[0]).toMatchObject({ action: 'system-chat', allowWeb: true, message: 'search for donald trump on the internet' })
})

test('a record search with no match ends at the pages this role can open instead of a dead end', async ({ page }) => {
  const { dialog } = await sessionUI(page)
  await dialog.getByRole('textbox', { name: 'Ask Pulse', exact: true }).fill('find Zed Quinonez in my class lists')
  await dialog.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(dialog).toContainText('No matching accessible system content was found')
  await expect(dialog).not.toContainText('No matching student, course, courseware or library title')
  await dialog.getByRole('button', { name: 'Open Student Monitoring → Students', exact: true }).click()
  await expect(page).toHaveURL(/student-monitoring\?tab=students/)
})

test('the attach menu uploads files or a picture read on this device', async ({ page }) => {
  const { dialog } = await sessionUI(page)
  await dialog.getByRole('button', { name: 'Attach reference', exact: true }).click()
  await expect(dialog.getByRole('menuitem', { name: /Upload files/ })).toBeVisible()
  const chooser = page.waitForEvent('filechooser')
  await dialog.getByRole('menuitem', { name: /Upload a picture/ }).click()
  const picker = await chooser
  expect(await picker.element().getAttribute('accept')).toBe('image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp')
  expect(picker.isMultiple()).toBe(true)
  await expect(dialog.getByRole('menu', { name: 'Attach', exact: true })).toHaveCount(0)
})
