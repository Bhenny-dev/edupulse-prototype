import { nameMatch, words, wordMatch } from './rag/lookup.js'

export const ACCOUNT_ROLES = ['student', 'instructor', 'dean', 'associate_dean'] as const
export type AccountRole = (typeof ACCOUNT_ROLES)[number]
export type AccountRow = { id: string; name: string; email?: string; student_number?: string | null; year_level?: number | null; department?: string; program?: string | null }
export type FoundAccount = AccountRow & { role: AccountRole; score: number }
/** One page of the System Admin account directory for one role; the server matches `q` as a plain substring. */
export type AccountSearch = (role: AccountRole, q: string) => Promise<{ accounts: AccountRow[]; total: number }>

const MATCH = 0.82, SURE = 0.9

/** How well one directory row answers the typed name. An email must match exactly, a student number exactly. */
function score(query: string, row: AccountRow) {
  if (query.includes('@')) return (row.email || '').toLowerCase() === query.trim().toLowerCase() ? 1 : 0
  return nameMatch(query, row.name || '', row.student_number || '')
}
/** Share of the typed words found in the name (typos tolerated): the basis for "closest" suggestions. */
function overlap(query: string, row: AccountRow) {
  const parts = words(query).filter(word => word.length > 2), have = words(`${row.name || ''} ${(row.email || '').split('@')[0]}`)
  if (!parts.length) return 0
  return parts.filter(part => have.some(word => word === part || wordMatch(part, word) >= 0.7 || word.startsWith(part))).length / parts.length
}

/**
 * Finds the accounts a typed name can mean across the four account roles. The directory only matches a whole
 * substring, so a name stored in another order ("Rivera, Bhenny") or with a typo is found with its longest
 * words, then their first letters, and every candidate is ranked by the same word matching System Search uses.
 */
export async function findAccounts(search: AccountSearch, name: string, { role }: { role?: AccountRole } = {}) {
  const query = name.trim().slice(0, 120), roles = role ? [role] : ACCOUNT_ROLES
  const found = new Map<string, FoundAccount>()
  if (query) {
    const parts = words(query).filter(word => word.length > 2).sort((a, b) => b.length - a.length).slice(0, 2)
    for (const stage of [[query], parts, parts.filter(word => word.length >= 4).map(word => word.slice(0, 3))]) {
      const pages = await Promise.all([...new Set(stage)].flatMap(q => roles.map(async accountRole => ({ accountRole, page: await search(accountRole, q) }))))
      for (const { accountRole, page } of pages) for (const row of page.accounts) if (!found.has(row.id)) found.set(row.id, { ...row, role: accountRole, score: score(query, row) })
      if ([...found.values()].some(item => item.score >= SURE)) break
    }
  }
  const all = [...found.values()], order = (a: FoundAccount, b: FoundAccount) => b.score - a.score || a.name.localeCompare(b.name)
  const matches = all.filter(item => item.score >= MATCH).sort(order).slice(0, 8)
  const closest = matches.length ? [] : all.map(item => ({ ...item, score: overlap(query, item) })).filter(item => item.score >= 0.5).sort(order).slice(0, 5)
  return { matches, closest }
}

type RegisteredStudent = { student_number: string; email?: string; full_name: string; year_level?: number | null; department?: string; program?: string | null }
/** Registered class-list students (records, not accounts) that fit a name: it explains why no account could be opened. */
export async function findRegisteredStudents(read: (q: string) => Promise<{ students: RegisteredStudent[]; total: number }>, name: string) {
  const { matches } = await findAccounts(async (_role, q) => {
    const found = await read(q)
    return { accounts: found.students.map(student => ({ id: student.student_number, name: student.full_name, email: student.email, student_number: student.student_number, year_level: student.year_level, department: student.department, program: student.program })), total: found.total }
  }, name, { role: 'student' })
  return matches
}
