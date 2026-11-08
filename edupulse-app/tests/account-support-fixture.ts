import type { Page } from '@playwright/test'
import { automaticRecordsUI } from './automatic-records-fixture'

export const supportAccounts = [
  { id: '22222222-2222-4222-8222-222222222222', name: 'Alex Sample', role: 'student', email: 'sample1@example.invalid', student_number: 'SYN-001', year_level: 1, department: 'College of IT', program: 'BSIT' },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Sam Example', role: 'student', email: 'sample2@example.invalid', student_number: 'SYN-002', year_level: 2, department: 'College of IT', program: 'BSIT' },
]
/** Synthetic UI transport. Actual SQL delegation, delivery and attribution have separate native/hosted tests. */
export async function accountSupportUI(page: Page, role = 'admin') {
  await automaticRecordsUI(page, role)
  const calls: { action: string; subject?: string; authorization?: string; operation?: string }[] = []
  let failEnter = false, failRead = false
  await page.route('**/api/ai?*', async route => {
    const request = route.request(), url = new URL(request.url()), action = url.searchParams.get('action') || ''
    const headers = request.headers(), body = request.method() === 'POST' ? request.postDataJSON() : null
    calls.push({ action, subject: headers['x-edupulse-subject'], authorization: headers.authorization, operation: body?.operation })
    if (action === 'support') {
      if (request.method() === 'POST') {
        if (failEnter) return route.fulfill({ status: 403, json: { error: { code: 'SUPPORT_UNAVAILABLE', message: 'The selected account is no longer available.' } } })
        const account = supportAccounts.find(item => item.id === body.id)!
        return route.fulfill({ json: { ...account, yearLevel: account.year_level } })
      }
      if (failRead) return route.fulfill({ status: 503, json: { error: { code: 'SUPPORT_UNAVAILABLE', message: 'Account lookup is unavailable. Retry when connected.' } } })
      const q = url.searchParams.get('q')?.toLowerCase() || ''
      const accounts = supportAccounts.filter(item => item.role === url.searchParams.get('role') && (!q || `${item.name} ${item.email} ${item.student_number}`.toLowerCase().includes(q)) && (!url.searchParams.get('year') || String(item.year_level) === url.searchParams.get('year')))
      return route.fulfill({ json: { accounts, total: accounts.length, offset: 0, pageSize: 50, departments: ['College of IT'], programs: ['BSIT'] } })
    }
    if (action === 'academic' && headers['x-edupulse-subject']) return route.fulfill({ json: { mode: 'cloud', courses: [], enrollments: [], publications: [], attempts: [], accesses: [], notices: [], events: [], faculty: [], institutional: [] } })
    if (action === 'operator') return route.fulfill({ json: { tool: 'chat', generated: true } })
    if (action === 'chat') {
      const web = /photosynthesis/i.test(body.message)
      const casual = /kumusta|salamat/i.test(body.message)
      return route.fulfill({ json: { answer: casual ? 'Kumusta! Maaari tayong mag-usap sa Tagalog, English, o mixed. Ano ang maitutulong ko?' : web ? 'Photosynthesis converts light energy into chemical energy in plants. [1]' : 'You have 1 accessible course: IT 102 — Computer Programming 1. It has 2 enrolled students and no published items yet. Enrollment does not mean the students have completed the work. [1]', requestId: 'synthetic-context-answer', mode: 'generated', task: casual || web ? 'general' : 'answer', sources: casual ? [] : [{ id: 'synthetic-source', title: web ? 'Photosynthesis' : 'Live authorized instructor records', text: web ? 'Photosynthesis converts light energy into chemical energy in plants.' : 'There is 1 accessible course and 2 enrolled students.', citation: 1, score: 1, page: null, section: null, origin: web ? 'web' : 'account', method: web ? 'web-search' : 'provided', ...(web ? { url: 'https://en.wikipedia.org/wiki/Photosynthesis' } : {}) }], verification: null, comparison: null, references: [], trace: [], agents: [], agentReport: null, warning: null, provider: 'synthetic-ui', model: 'synthetic-text-model', grounding: casual ? 'general' : 'references', policy: null } })
    }
    if (action === 'health') return route.fulfill({ json: { version: 'synthetic-ui', ready: true, provider: 'synthetic-ui', model: 'synthetic-text-model', embeddings: false, database: { ready: true, kind: 'synthetic' }, identity: { mode: 'account', role }, message: 'Synthetic account transport' } })
    return route.fallback()
  })
  return { calls, failEnter(value: boolean) { failEnter = value }, failRead(value: boolean) { failRead = value } }
}
