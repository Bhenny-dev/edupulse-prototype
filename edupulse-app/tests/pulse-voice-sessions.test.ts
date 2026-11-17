import test from 'node:test'
import assert from 'node:assert/strict'
import { explicitWebRequest, webTopic } from '../src/lib/systemChatPolicy.js'
import { requestGoal } from '../src/agents/requestGoal.js'
import { pagesForTopic } from '../src/agents/operator.js'
import { affirmative, declines, endsConversation, speakable, spokenSummary, VAD, vadStart, vadStep } from '../src/components/pulse/voiceConversation.js'
import { sessionAge } from '../src/components/pulse/sessionAge.js'
import { conversationCommand } from '../server/domains/conversations.js'
import { chatInput } from '../server/contracts.js'
import { systemLookup } from '../server/systemLookup.js'

test('an explicit Internet search is recognized, and its topic is the subject without the request words', () => {
  for (const text of ['search for donald trump on the internet', 'Can you search the internet for Donald Trump?', 'google donald trump', 'look up the Philippine Constitution online', 'hanapin sa internet si Jose Rizal', 'Search online for photosynthesis', 'research on the web: latest AI news', 'find Donald Trump on google'])
    assert.equal(explicitWebRequest(text), true, text)
  for (const text of ['find the online quiz for week 3', 'look at the internet connection settings', 'search for Ana Ramos', 'what is photosynthesis?'])
    assert.equal(explicitWebRequest(text), false, text)
  assert.equal(webTopic('search for donald trump on the internet'), 'donald trump')
  assert.equal(webTopic('Can you search the internet for Donald Trump?'), 'Donald Trump')
  assert.equal(webTopic('google donald trump'), 'donald trump')
  assert.equal(webTopic('look up the Philippine Constitution online'), 'the Philippine Constitution')
  assert.equal(webTopic('hanapin sa internet si Jose Rizal'), 'Jose Rizal')
  assert.equal(webTopic('Search online for photosynthesis'), 'photosynthesis')
  assert.equal(webTopic('search the web about binary search trees'), 'binary search trees', 'only the leading request verb is removed')
  assert.equal(webTopic('research on the web: latest AI news'), 'latest AI news')
  assert.equal(webTopic('Please search the internet'), '')
})

test('the goal is set before routing: memory, web, account, page, draft or System Search', () => {
  assert.equal(requestGoal('search for donald trump on the internet').kind, 'web-search')
  assert.equal(requestGoal('search for donald trump on the internet').label, 'Searching the Internet for “donald trump”')
  assert.equal(requestGoal('remember that I prefer short answers').kind, 'remember')
  assert.equal(requestGoal('what did we discuss last time?').route, 'memory')
  assert.equal(requestGoal('open the account of Juan Dela Cruz', { role: 'admin', canSwitchRoles: true }).kind, 'open-account')
  assert.deepEqual(requestGoal('open the syllabus builder', { role: 'instructor' }), { kind: 'navigate', route: 'app', label: 'Opening Syllabus > Syllabus Builder' })
  assert.equal(requestGoal('generate a quiz about loops', { role: 'instructor' }).route, 'model')
  assert.equal(requestGoal('who teaches IT 102?').route, 'system-search')
  assert.equal(requestGoal('summarize this', { attachments: 2 }).label, 'Working with your attached files')
})

test('a reply with no matching record offers the pages this role can open', () => {
  assert.deepEqual(pagesForTopic('find the student named Zed in my class lists', 'instructor'), [{ path: '/student-monitoring?tab=students', label: 'Student Monitoring → Students' }])
  assert.deepEqual(pagesForTopic('find the student named Zed', 'dean').map(page => page.path), ['/students'])
  assert.deepEqual(pagesForTopic('what is photosynthesis?', 'instructor'), [])
  assert.ok(pagesForTopic('show my assessments', 'student').every(page => page.path !== '/students'), 'other roles’ pages are never offered')
})

test('a voice conversation ends on a closing phrase, and yes accepts the suggested next step', () => {
  for (const text of ["That's ok, you can stop.", 'okay you can stop now', 'stop', 'Turn off the voice', 'no thanks', "No, that's all, thanks.", 'nothing else', 'Thank you!', 'tama na po', 'wala na', 'goodbye pulse', "I'm done"])
    assert.equal(endsConversation(text), true, text)
  for (const text of ['stop the timer on the quiz', 'open the syllabus builder', 'yes', "what's the weather"])
    assert.equal(endsConversation(text), false, text)
  assert.equal(declines('No.'), true); assert.equal(declines('no, open settings'), false)
  assert.equal(affirmative('Yes please'), true); assert.equal(affirmative('sige po'), true); assert.equal(affirmative('yes open the settings page'), false)
})

test('voice activity detection waits for speech, then a pause, and gives up on silence', () => {
  let vad = vadStart(0), events: string[] = []
  const feed = (level: number, from: number, to: number) => { for (let now = from; now <= to; now += 50) { const step = vadStep(vad, level, now); vad = step.vad; if (step.event) events.push(`${step.event}@${now}`) } }
  feed(0.004, 50, 400)
  feed(0.2, 450, 1500)
  assert.match(events[0] || '', /^speech@/)
  feed(0.005, 1550, 3500)
  assert.ok(events.some(event => event.startsWith('end@')), 'a pause after speech ends the utterance')
  let quiet = vadStart(0), idle = false
  for (let now = 50; now <= VAD.idleMs + 100 && !idle; now += 50) { const step = vadStep(quiet, 0.003, now); quiet = step.vad; idle = step.event === 'idle' }
  assert.equal(idle, true, 'no speech within the idle window restarts listening')
  let noisy = vadStart(0), started = false
  for (let now = 50; now <= 3000; now += 50) { const step = vadStep(noisy, now < 400 ? 0.03 : 0.035, now); noisy = step.vad; started ||= step.event === 'speech' }
  assert.equal(started, false, 'steady background noise is calibrated away')
})

test('spoken summaries say what happened and offer one next step, never a voice confirmation', () => {
  const navigated = spokenSummary([{ from: 'user', text: 'open settings' }, { from: 'pulse', mode: 'actions', proposals: [{ type: 'navigate', label: 'Settings' }] }])
  assert.equal(navigated.speech, 'I opened Settings.'); assert.equal(navigated.suggestion, 'Guide me through this page')
  const review = spokenSummary([{ from: 'pulse', mode: 'actions', proposals: [{ type: 'register' }] }])
  assert.match(review.speech, /class list registration for your review/); assert.match(review.follow, /press Confirm.*do not confirm changes by voice/)
  const answer = spokenSummary([{ from: 'pulse', text: 'Donald Trump is an American politician [1]. He served as president. More text follows here. https://example.org' }])
  assert.equal(answer.speech, 'Donald Trump is an American politician. He served as president.')
  assert.equal(spokenSummary([], 'Your OpenAI API credit balance is exhausted.').follow, 'Do you want to try something else?')
  assert.equal(speakable('**Bold** [link](https://x.org) text.'), 'Bold link text.')
})

test('session ages are short, and a conversation can be renamed but not to an empty name', () => {
  const now = Date.parse('2026-11-17T12:00:00Z')
  assert.equal(sessionAge('2026-11-17T10:00:00Z', now), '2h'); assert.equal(sessionAge('2026-11-14T12:00:00Z', now), '3d'); assert.equal(sessionAge('2026-11-03T12:00:00Z', now), '2w'); assert.equal(sessionAge('2026-11-17T11:59:40Z', now), 'now')
  const id = '0f4c1e8a-5b8b-4c38-9c3e-2a0d8c4f9b11'
  assert.deepEqual(conversationCommand.parse({ operation: 'rename', id, title: '  Week 3 quiz plan ' }), { operation: 'rename', id, title: 'Week 3 quiz plan' })
  assert.throws(() => conversationCommand.parse({ operation: 'rename', id, title: '   ' }))
})

test('an Internet search the person asked for goes straight to the web, with no "not found in the system" preamble', async t => {
  const oldFetch = globalThis.fetch, queries: string[] = []
  t.after(() => { globalThis.fetch = oldFetch })
  globalThis.fetch = async value => {
    const url = new URL(String(value))
    if (url.hostname !== 'en.wikipedia.org') throw new Error(`Only public search may run: ${url.href}`)
    queries.push(url.searchParams.get('gsrsearch') || '')
    return Response.json({ query: { pages: { '1': { pageid: 1, index: 1, title: 'Donald Trump', extract: 'Donald John Trump is an American politician and businessman. He served as the 45th president of the United States.' } } } })
  }
  const guest = { id: 'guest', role: 'guest' as const, local: true }
  const found = await systemLookup(chatInput.parse({ message: 'search for donald trump on the internet' }), guest, guest, AbortSignal.timeout(5000), { force: true, allowWeb: true })
  assert.deepEqual(queries, ['donald trump'])
  assert.equal(found?.lookup?.scope, 'web'); assert.equal(found?.lookup?.requested, true)
  assert.match(found?.answer || '', /Donald John Trump is an American politician/)
  assert.doesNotMatch(found?.answer || '', /did not find|Internet suggestions|No matching accessible system content/)
  assert.equal(found?.trace.at(-1)?.action, 'search the public web')
  const blank = await systemLookup(chatInput.parse({ message: 'please search the internet' }), guest, guest, AbortSignal.timeout(5000), { force: true, allowWeb: true })
  assert.match(blank?.answer || '', /What should I search the Internet for/); assert.equal(queries.length, 1)
  globalThis.fetch = async () => Response.json({ query: { pages: {} } })
  const empty = await systemLookup(chatInput.parse({ message: 'search the web for zxqv plorb' }), guest, guest, AbortSignal.timeout(5000), { force: true, allowWeb: true })
  assert.match(empty?.answer || '', /No Internet results were found for “zxqv plorb”/); assert.equal(empty?.warning, null, 'the reason is said once, not repeated as a warning')
})
