import test from 'node:test'
import assert from 'node:assert/strict'
import { accountRequest, planOperator } from '../src/agents/operator.js'
import { findAccounts, findRegisteredStudents, type AccountRole, type AccountRow, type AccountSearch } from '../src/lib/accountSearch.js'

test('a request to open a named person’s account is read by rules, with the role when one is named', () => {
  assert.deepEqual(accountRequest('can you redirect me to the authenticated ui of bhenny benlor rivera?'), { name: 'bhenny benlor rivera' })
  assert.deepEqual(accountRequest('Open the account of Juan Dela Cruz'), { name: 'Juan Dela Cruz' })
  assert.deepEqual(accountRequest("open Juan Dela Cruz's account"), { name: 'Juan Dela Cruz' })
  assert.deepEqual(accountRequest('open bhenny benlor rivera account'), { name: 'bhenny benlor rivera' })
  assert.deepEqual(accountRequest('Switch to the instructor account of Maria Santos please.'), { name: 'Maria Santos', role: 'instructor' })
  assert.deepEqual(accountRequest('take me to the student view of Sam Example'), { name: 'Sam Example', role: 'student' })
  assert.deepEqual(accountRequest('open the program coordinator account of Casey Associate Demo'), { name: 'Casey Associate Demo', role: 'associate_dean' })
  assert.deepEqual(accountRequest('log in as 2021-1-0001'), { name: '2021-1-0001' })
  assert.deepEqual(accountRequest('impersonate Maria Santos'), { name: 'Maria Santos' })
  assert.deepEqual(accountRequest('open the account of Bhenny Benlor Rivera as student'), { name: 'Bhenny Benlor Rivera', role: 'student' })
  assert.deepEqual(accountRequest('open the account of Juan Dela Cruz as an associate dean'), { name: 'Juan Dela Cruz', role: 'associate_dean' })
  assert.deepEqual(accountRequest('buksan mo ang account ni Juan Dela Cruz'), { name: 'Juan Dela Cruz' })
  assert.deepEqual(accountRequest('show me the dashboard of Rowan Instructor Demo and then the scores'), { name: 'Rowan Instructor Demo' })
})

test('role names, pronouns and page names are not people, so ordinary navigation and lookups are untouched', () => {
  for (const message of [
    'open the dean dashboard', 'take me to the dashboard of the dean', 'show me the dashboard for instructors', 'open my account', 'open student account',
    'switch to student view', 'open the courseware page', 'redirect me to the student monitoring page', 'open the account of my instructor', 'log in as a student',
    'show me the view of student monitoring', 'buksan mo ang dashboard', 'Who is Bhenny Benlor Rivera?', 'show me the profile of Juan Dela Cruz', 'open the syllabus of IT 102',
  ]) assert.equal(accountRequest(message), null, message)
})

test('only the verified System Admin gets an account to open; everyone else is told the limit and nothing is searched', () => {
  const ask = 'can you redirect me to the authenticated ui of bhenny benlor rivera?'
  assert.deepEqual(planOperator({ message: ask, role: 'dean', canSwitchRoles: true }), { proposals: [{ type: 'open-account', name: 'bhenny benlor rivera' }], chat: false, task: 'auto', mentioned: [] })
  for (const role of ['dean', 'instructor', 'student', 'guest']) {
    const plan = planOperator({ message: ask, role, canSwitchRoles: false })
    const [proposal] = plan.proposals
    assert.equal(plan.proposals.length, 1)
    assert.ok(proposal?.type === 'notice', role)
    assert.match(proposal.text, /limited to the verified System Admin/)
    assert.match(proposal.text, /Who is bhenny benlor rivera\?/)
    assert.equal(plan.chat, false)
  }
})

test('a named course is not a person: the account request is dropped and the message keeps its ordinary meaning', () => {
  const catalog = [{ code: 'IT 102', title: 'Computer Programming 1', description: '', outcomes: [], syllabus: null, yours: false }]
  const plan = planOperator({ message: 'open the view of IT 102', role: 'admin', canSwitchRoles: true, catalog })
  assert.ok(plan.proposals.every(proposal => proposal.type !== 'open-account'))
  assert.deepEqual(plan.mentioned.map(course => course.code), ['IT 102'])
})

const directory: Record<AccountRole, AccountRow[]> = {
  student: [
    { id: 's1', name: 'Rivera, Bhenny Benlor', email: 'b.rivera@example.invalid', student_number: '2021-1-0001', year_level: 3, program: 'BSIT' },
    { id: 's2', name: 'Bhenny Cruz', email: 'cruz@example.invalid', student_number: '2021-1-0002' },
    { id: 's3', name: 'Sam Example', email: 'sam@example.invalid', student_number: '2021-1-0003' },
  ],
  instructor: [{ id: 'i1', name: 'Maria Santos', email: 'maria@example.invalid' }],
  dean: [{ id: 'd1', name: 'Dana Dean Demo', email: 'dean@example.invalid' }],
  associate_dean: [],
}
const lookup = () => {
  const calls: string[] = []
  const search: AccountSearch = async (role, q) => {
    calls.push(`${role}:${q}`)
    const accounts = directory[role].filter(row => `${row.name} ${row.email} ${row.student_number || ''}`.toLowerCase().includes(q.toLowerCase()))
    return { accounts, total: accounts.length }
  }
  return { calls, search }
}

test('a name is found as typed with one request per role, and a different order, a typo or a number still finds the account', async () => {
  const exact = lookup()
  const sam = await findAccounts(exact.search, 'sam example')
  assert.deepEqual(sam.matches.map(row => [row.id, row.role]), [['s3', 'student']])
  assert.equal(exact.calls.length, 4, 'a sure match stops the search after the first stage')

  const reordered = await findAccounts(lookup().search, 'bhenny benlor rivera')
  assert.deepEqual(reordered.matches.map(row => row.id), ['s1'], 'Rivera, Bhenny Benlor is the same person; Bhenny Cruz is not')
  const typo = await findAccounts(lookup().search, 'benny rivera')
  assert.deepEqual(typo.matches.map(row => row.id), ['s1'])
  assert.deepEqual((await findAccounts(lookup().search, '2021-1-0001')).matches.map(row => row.id), ['s1'])
  assert.deepEqual((await findAccounts(lookup().search, 'maria@example.invalid')).matches.map(row => [row.id, row.role]), [['i1', 'instructor']])
  assert.deepEqual((await findAccounts(lookup().search, 'maria@example')).matches, [], 'an email must match exactly before an account opens')
})

test('a named role limits the directories searched, and the closest names are offered only when nothing matches', async () => {
  const limited = lookup()
  assert.deepEqual((await findAccounts(limited.search, 'maria santos', { role: 'instructor' })).matches.map(row => row.id), ['i1'])
  assert.ok(limited.calls.length && limited.calls.every(call => call.startsWith('instructor:')))

  const near = await findAccounts(lookup().search, 'bhenny benlor santos')
  assert.deepEqual(near.matches, [])
  assert.deepEqual(near.closest.map(row => row.id), ['s1'], 'two of the three words match one account')

  const none = await findAccounts(lookup().search, 'zed nobody')
  assert.deepEqual({ matches: none.matches, closest: none.closest }, { matches: [], closest: [] })
  assert.deepEqual(await findAccounts(lookup().search, '   '), { matches: [], closest: [] })
})

test('a registered student is matched by the same name rules, so a missing account can be explained rather than called unknown', async () => {
  const roster = [{ student_number: '2021-1-0009', email: 'q@example.invalid', full_name: 'RIVERA, BHENNY BENLOR', year_level: 2, department: 'College of Information Technology', program: 'BSIT' }]
  const read = async (q: string) => {
    const students = roster.filter(row => `${row.full_name} ${row.student_number}`.toLowerCase().includes(q.toLowerCase()))
    return { students, total: students.length }
  }
  const found = await findRegisteredStudents(read, 'bhenny benlor rivera')
  assert.deepEqual(found.map(row => [row.name, row.student_number]), [['RIVERA, BHENNY BENLOR', '2021-1-0009']])
  assert.deepEqual(await findRegisteredStudents(read, 'zed nobody'), [])
})

test('a failed directory read is an error, never a claim that the account does not exist', async () => {
  await assert.rejects(findAccounts(async () => { throw new Error('Account lookup is unavailable. Retry when connected.') }, 'sam example'), /unavailable/)
})
