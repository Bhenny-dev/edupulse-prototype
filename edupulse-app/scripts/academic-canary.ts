// Synthetic hosted accounts only. Secrets remain in memory or ignored .data;
// output contains counts/statuses, never credentials or personal records.
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { createAdminClient, createContextClient } from '@supabase/server/core'
import { handleRequest } from '../server/http.js'
import { makePdf } from '../tests/fixtures.js'

const FILE = '.data/academic-canaries.json'
// This exceptional audit mode requires explicit owner permission; modern keys remain the default.
const legacyAudit = process.argv.includes('--allow-legacy-audit')
const cli = process.env.EDUPULSE_SUPABASE_CLI_JS || join(process.env.APPDATA || '', 'npm/node_modules/supabase/dist/supabase.js')
function discoveredKeys(): { api_key: string; name?: string }[] {
  if (process.env.SUPABASE_SECRET_KEY) return []
  let output = ''
  try { output = execFileSync(process.execPath, [cli, 'projects', 'api-keys', '--project-ref', 'xyziepdkdvvuhgkymooo', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) }
  catch (error: any) { output = typeof error.stdout === 'string' ? error.stdout : '' }
  try { const keys = JSON.parse(output); if (Array.isArray(keys) && keys.every(key => typeof key.api_key === 'string')) return keys }
  catch { /* Never include the CLI exception: its stdout can contain credentials. */ }
  throw new Error('Project key discovery did not return usable JSON. No credential output is emitted.')
}
const keys = discoveredKeys()
const secret = process.env.SUPABASE_SECRET_KEY || keys.find(key => legacyAudit ? key.name === 'service_role' : key.api_key.startsWith('sb_secret_'))?.api_key
process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL
process.env.SUPABASE_PUBLISHABLE_KEY ||= process.env.VITE_SUPABASE_PUBLISHABLE_KEY || keys.find(key => key.api_key.startsWith('sb_publishable_'))?.api_key
if (!(secret && (/^sb_secret_[A-Za-z0-9_-]{20,}$/.test(secret) || (legacyAudit && secret.startsWith('eyJ')))) || new URL(process.env.SUPABASE_URL || '').hostname !== 'xyziepdkdvvuhgkymooo.supabase.co') throw new Error('Expected EduPulse and an unredacted modern secret, or an explicitly authorized temporary legacy audit. A masked CLI value is not a usable credential.')
process.env.SUPABASE_SECRET_KEY = secret
const admin = createAdminClient()
delete process.env.SUPABASE_SECRET_KEY
process.env.AI_VECTOR_STORE = 'supabase'
type Account = { id: string; role: string; email: string; password: string; token: string }
let accounts: Account[] = []
const api = async (account: Account, action: string, method = 'GET', body?: unknown) => {
  const endpoint = process.env.CANARY_API_ORIGIN
  const url = `${endpoint || 'http://localhost'}/api/ai?action=${action}`
  const request = new Request(url, { method, headers: { Authorization: `Bearer ${account.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const response = endpoint ? await fetch(request) : await handleRequest(request)
  const value = await response.json()
  if (!response.ok) throw new Error(`Canary ${action} returned ${response.status}/${value.error?.code || 'unknown'}`)
  return value
}
async function cleanup() {
  if (!accounts.every(account => /^edupulse\.canary\.[a-f0-9-]+\.[a-z-]+@example\.invalid$/.test(account.email) && /^[a-f0-9-]{36}$/.test(account.id))) throw new Error('Cleanup requires this helper\'s synthetic account receipt.')
  // Publication notices retain a non-cascading publication FK. Remove notices
  // addressed to this run's synthetic recipients before cascading its courses.
  for (const account of accounts) {
    const notices = await admin.from('edupulse_notices').delete().eq('recipient_id', account.id)
    if (notices.error) throw new Error('Synthetic notice cleanup failed; retain the private receipt and retry --cleanup.')
  }
  // Delete student sessions/attempts before their instructor's publications.
  const deletionOrder = [...accounts].sort((a, b) => Number(b.role === 'student') - Number(a.role === 'student'))
  for (const account of deletionOrder) {
    // Revoke refresh sessions, then remove only the accounts created by this run.
    if (account.token) await admin.auth.admin.signOut(account.token, 'global')
    // Workspace revision events deliberately retain their actor FK. Remove this
    // run's synthetic events before deleting its temporary Auth identity.
    const events = await admin.from('edupulse_academic_events').delete().eq('actor_id', account.id)
    if (events.error) throw new Error('Synthetic event cleanup failed; retain the private receipt and retry --cleanup.')
    const { error } = await admin.auth.admin.deleteUser(account.id)
    if (error && error.status !== 404) throw new Error('Canary cleanup failed; retry --cleanup with the existing ignored credential file.')
  }
  await unlink(FILE).catch(() => undefined)
}
if (process.argv.includes('--cleanup')) {
  accounts = JSON.parse(await readFile(FILE, 'utf8'))
  await cleanup(); console.log(JSON.stringify({ cleanedAccounts: accounts.length }));
} else if (process.argv.includes('--prepare')) {
  if (await access(FILE).then(() => true, () => false)) throw new Error('A private canary receipt already exists. Complete its validation or cleanup before preparing another run.')
  const suffix = randomUUID().slice(0, 8)
  await mkdir('.data', { recursive: true })
  try {
    for (const [label, role] of [['instructor', 'instructor'], ['other-instructor', 'instructor'], ['student', 'student'], ['outsider', 'student'], ['dean', 'dean'], ['associate-dean', 'associate_dean']]) {
      const email = `edupulse.canary.${suffix}.${label}@example.invalid`, password = randomBytes(30).toString('base64url')
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role }, user_metadata: { full_name: `Canary ${label}`, department: 'Synthetic validation' } })
      if (created.error || !created.data.user) throw new Error(`Temporary canary account could not be created (${created.error?.status}/${created.error?.code || 'unknown'}).`)
      const account = { id: created.data.user.id, role, email, password, token: '' }
      accounts.push(account)
      await writeFile(FILE, JSON.stringify(accounts), { mode: 0o600 })
      const client = createContextClient()
      const signedIn = await client.auth.signInWithPassword({ email, password })
      if (signedIn.error || !signedIn.data.session) throw new Error('Temporary canary sign-in failed.')
      account.token = signedIn.data.session.access_token
      await writeFile(FILE, JSON.stringify(accounts), { mode: 0o600 })
    }
    const pdf = Buffer.from(makePdf([['SYNTHETIC CANARY — NOT AN OFFICIAL APPROVAL', 'Course Code: IT 102', 'Week 1: Variables']]))
    const syllabus = { id: 'canary-syllabus', courseCode: 'IT 102', courseTitle: 'Synthetic canary: Programming', status: 'active', courseOutline: [{ week: 1, ilos: 'Explain variables', contents: ['Variables'] }], approvedFile: { name: 'synthetic-approved.pdf', size: pdf.length, base64: pdf.toString('base64'), sha256: createHash('sha256').update(pdf).digest('hex'), uploadedAt: new Date().toISOString(), approvalAttested: true }, provenance: 'synthetic-hosted-canary' }
    const data = { syllabi: [syllabus], registrations: [{ id: 'canary-registration', courseCode: 'IT 102', blockSection: 'CANARY-1A', status: 'active', uploadedBy: accounts[0].id, students: [{ Name: 'Canary Student', StudentID: 'CANARY-001', Email: accounts[2].email }] }], content: {
      material: { syllabusId: syllabus.id, week: 1, type: 'material', status: 'checked', content: { title: 'Canary variable notes', sections: [{ heading: 'Variables', body: 'A variable stores a value. This synthetic text validates access and publication.' }] } },
      quiz: { syllabusId: syllabus.id, week: 1, type: 'assessment', status: 'checked', content: { title: 'Canary variable quiz', questions: [0, 1, 2].map(correctIndex => ({ text: `Synthetic question ${correctIndex + 1}`, topic: 'Variables', options: ['A', 'B', 'C', 'D'], correctIndex, explanation: 'Private canary explanation' })) } },
    } }
    const checked = await api(accounts[0], 'workspace', 'PUT', { revision: 0, data })
    data.content.material.status = 'published'; data.content.quiz.status = 'published'
    await api(accounts[0], 'workspace', 'PUT', { revision: checked.revision, data })
    console.log(JSON.stringify({ preparedSyntheticAccounts: accounts.length, provenance: 'synthetic-hosted-canary' }))
  } catch (error) { await cleanup(); throw error }
} else {
  accounts = JSON.parse(await readFile(FILE, 'utf8'))
  const student = await api(accounts[2], 'academic')
  assert.equal(student.publications.length, 2)
  assert.equal(JSON.stringify(student).includes('correctIndex'), false)
  const quiz = student.publications.find((item: { type: string }) => item.type === 'assessment')
  const material = student.publications.find((item: { type: string }) => item.type === 'material')
  await api(accounts[2], 'academic', 'POST', { operation: 'open', publication: material.id, version: material.source_version })
  const command = { operation: 'submit', publication: quiz.id, version: quiz.source_version, responses: [0, 1, 2] }
  const first = await api(accounts[2], 'academic', 'POST', command)
  assert.equal(first.score, 3)
  assert.deepEqual(await api(accounts[2], 'academic', 'POST', { ...command, responses: [3, 3, 3] }), first)
  assert.equal((await api(accounts[3], 'academic')).publications.length, 0)
  assert.equal((await api(accounts[1], 'academic')).attempts.length, 0)
  assert.equal((await api(accounts[4], 'academic')).attempts.filter((attempt: { publication_id: string }) => attempt.publication_id === quiz.id).length, 1)
  assert.equal((await api(accounts[5], 'academic')).attempts.length, 0)
  const own = await api(accounts[2], 'academic')
  assert.equal(own.accesses.filter((item: { publication_id: string }) => item.publication_id === material.id).length, 1)
  assert.equal(own.attempts.find((attempt: { publication_id: string }) => attempt.publication_id === quiz.id)?.topic_scores?.[0]?.topic, 'Variables')
  const report = { checkedAt: new Date().toISOString(), origin: process.env.CANARY_API_ORIGIN || 'local-handler/real-hosted-auth-and-database', syntheticAccounts: 6, enrolledPublications: 2, answerKeysExposed: false, duplicateSubmission: 'same-saved-result', recordedMaterialOpen: true, mappedTopicResult: true, outsiderPublicationCount: 0, unrelatedInstructorAttemptCount: 0, deanAttemptCount: 1, associateDeanAttemptCount: 0, provenance: 'synthetic-hosted-canary' }
  await writeFile('.data/academic-canary-results.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
}
