// Synthetic hosted accounts only. Secrets remain in memory or ignored .data;
// output contains counts/statuses, never credentials or personal records.
import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { createAdminClient, createContextClient } from '@supabase/server/core'
import { handleRequest } from '../server/http.js'
import { makePdf } from '../tests/fixtures.js'

const FILE = '.data/academic-canaries.json'
const cli = process.env.EDUPULSE_SUPABASE_CLI_JS || join(process.env.APPDATA || '', 'npm/node_modules/supabase/dist/supabase.js')
const keys = process.env.SUPABASE_SECRET_KEY ? [] : JSON.parse(execFileSync(process.execPath, [cli, 'projects', 'api-keys', '--project-ref', 'xyziepdkdvvuhgkymooo', '--reveal', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) as { api_key: string }[]
const secret = process.env.SUPABASE_SECRET_KEY || keys.find(key => key.api_key.startsWith('sb_secret_'))?.api_key
if (!secret || new URL(process.env.SUPABASE_URL || '').hostname !== 'xyziepdkdvvuhgkymooo.supabase.co') throw new Error('Expected EduPulse project and a modern secret key.')
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
  for (const account of accounts) {
    // Revoke refresh sessions, then remove only the accounts created by this run.
    if (account.token) await admin.auth.admin.signOut(account.token, 'global')
    const { error } = await admin.auth.admin.deleteUser(account.id)
    if (error) throw new Error('Canary cleanup failed; retry --cleanup with the existing ignored credential file.')
  }
  await unlink(FILE).catch(() => undefined)
}
if (process.argv.includes('--cleanup')) {
  accounts = JSON.parse(await readFile(FILE, 'utf8'))
  await cleanup(); console.log(JSON.stringify({ cleanedAccounts: accounts.length }));
} else if (process.argv.includes('--prepare')) {
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
      quiz: { syllabusId: syllabus.id, week: 1, type: 'assessment', status: 'checked', content: { title: 'Canary variable quiz', questions: [0, 1, 2].map(correctIndex => ({ text: `Synthetic question ${correctIndex + 1}`, options: ['A', 'B', 'C', 'D'], correctIndex, explanation: 'Private canary explanation' })) } },
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
  const command = { operation: 'submit', publication: quiz.id, version: quiz.source_version, responses: [0, 1, 2] }
  const first = await api(accounts[2], 'academic', 'POST', command)
  assert.equal(first.score, 3)
  assert.deepEqual(await api(accounts[2], 'academic', 'POST', { ...command, responses: [3, 3, 3] }), first)
  assert.equal((await api(accounts[3], 'academic')).publications.length, 0)
  assert.equal((await api(accounts[1], 'academic')).attempts.length, 0)
  assert.equal((await api(accounts[4], 'academic')).attempts.length, 1)
  assert.equal((await api(accounts[5], 'academic')).attempts.length, 0)
  const report = { checkedAt: new Date().toISOString(), origin: process.env.CANARY_API_ORIGIN || 'local-handler/real-hosted-auth-and-database', syntheticAccounts: 6, enrolledPublications: 2, answerKeysExposed: false, duplicateSubmission: 'same-saved-result', outsiderPublicationCount: 0, unrelatedInstructorAttemptCount: 0, deanAttemptCount: 1, associateDeanAttemptCount: 0, provenance: 'synthetic-hosted-canary' }
  await writeFile('.data/academic-canary-results.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
}
