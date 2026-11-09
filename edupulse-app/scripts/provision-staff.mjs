import { randomBytes } from 'node:crypto'
import { mkdir, open } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { createAdminClient } from '@supabase/server/core'
import { STAFF_ACCOUNTS, STAFF_PROJECT_URL } from './lib/staff-accounts.mjs'

/** Preflight the whole manifest before writes. Existing passwords and ownership never change.
 * @param {Pick<ReturnType<typeof createAdminClient>['auth']['admin'], 'listUsers'|'createUser'|'getUserById'>} auth
 * @param {{apply?: boolean, credentialsFile?: string}} [options]
 */
export async function provisionStaff(auth, { apply = false, credentialsFile } = {}) {
  const users = new Map()
  for (let page = 1; ; page++) {
    if (page > 100) throw new Error('Account inventory exceeded the safe pagination limit; nothing was created.')
    const { data, error } = await auth.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Account inventory failed (${error.status || 'unavailable'}); nothing was created.`)
    for (const user of data.users) if (user.email) users.set(user.email.toLowerCase(), user)
    if (data.users.length < 1000) break
  }
  const plan = STAFF_ACCOUNTS.map(account => {
    const existing = users.get(account.email)
    if (existing && (existing.app_metadata?.role !== account.role || existing.user_metadata?.full_name !== account.name || !existing.email_confirmed_at)) throw new Error(`Account conflict for ${account.email}; no passwords or roles were changed.`)
    return { ...account, id: existing?.id, status: existing ? 'unchanged' : 'create' }
  })
  if (!apply || !plan.some(row => row.status === 'create')) return plan
  const repository = resolve(fileURLToPath(new URL('../..', import.meta.url)))
  if (!credentialsFile || !isAbsolute(credentialsFile) || !relative(repository, resolve(credentialsFile)).startsWith(`..${sep}`)) throw new Error('Use an absolute private credentials-file path outside this repository.')
  await mkdir(dirname(credentialsFile), { recursive: true, mode: 0o700 })
  const journal = await open(credentialsFile, 'wx', 0o600)
  try {
    for (const account of plan.filter(row => row.status === 'create')) {
      const password = `Ep9!${randomBytes(24).toString('base64url')}`
      // Persist first so interrupted or ambiguous requests never lose a created account's password.
      await journal.write(JSON.stringify({ ...account, password, status: 'prepared' }) + '\n')
      await journal.sync()
      const { data, error } = await auth.createUser({ email: account.email, password, email_confirm: true, app_metadata: { role: account.role }, user_metadata: { full_name: account.name, test_account: true } })
      if (error || !data?.user?.id) throw new Error(`Creation could not be confirmed for ${account.email}. Retain the private journal before retrying.`)
      const checked = await auth.getUserById(data.user.id)
      const user = checked.data?.user
      if (checked.error || user?.email !== account.email || user?.app_metadata?.role !== account.role || user?.user_metadata?.full_name !== account.name || !user?.email_confirmed_at) throw new Error(`Readback could not confirm ${account.email}. Retain the private journal.`)
      account.id = user.id; account.status = 'created'
      await journal.write(JSON.stringify({ email: account.email, id: user.id, status: 'created' }) + '\n')
      await journal.sync()
    }
  } finally { await journal.close() }
  return plan
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, 'credentials-file': { type: 'string' } } })
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY
    if (url !== STAFF_PROJECT_URL || !key?.startsWith('sb_secret_')) throw new Error('Use the EduPulse project URL and its revealed modern secret key. Legacy keys are not accepted.')
    const client = createAdminClient({ env: { url, secretKeys: { default: key } } })
    console.log(JSON.stringify(await provisionStaff(client.auth.admin, { apply: values.apply, credentialsFile: values['credentials-file'] }), null, 2))
  } catch (error) { console.error(error instanceof Error ? error.message : 'Staff provisioning failed.'); process.exitCode = 1 }
}
