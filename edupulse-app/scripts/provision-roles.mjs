import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !secret || !publishable) throw new Error('SUPABASE_URL, SUPABASE_SECRET_KEY, and SUPABASE_PUBLISHABLE_KEY are required.')
if (!process.argv.includes('--apply')) throw new Error('Pass --apply to provision the three requested accounts.')

const accounts = [
  { email: 'riverabenlor461@gmail.com', role: 'admin', name: 'EduPulse Admin', google: true },
  { email: 'edupulse.instructor@example.com', role: 'instructor', name: 'EduPulse Instructor' },
  { email: 'edupulse.student@example.com', role: 'student', name: 'EduPulse Student' },
]
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
const credentials = []

async function findUser(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const found = data.users.find(user => user.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < 100) return null
  }
  throw new Error('Too many users to safely determine whether this account already exists.')
}

for (const account of accounts) {
  const existing = await findUser(account.email)
  if (existing && !account.google) throw new Error(`${account.email} already exists. No password was changed.`)
  if (account.google) {
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        app_metadata: { ...existing.app_metadata, role: 'admin' },
      })
      if (error) throw error
    } else {
      // The verified Google identity links to this confirmed email on first sign-in.
      const { error } = await admin.auth.admin.createUser({
        email: account.email, email_confirm: true,
        app_metadata: { role: account.role }, user_metadata: { full_name: account.name },
      })
      if (error) throw error
    }
    credentials.push({ role: account.role, email: account.email, signIn: 'Google button' })
    continue
  }
  const password = randomBytes(24).toString('base64url')
  const { data, error } = await admin.auth.admin.createUser({
    email: account.email, password, email_confirm: true,
    app_metadata: { role: account.role }, user_metadata: { full_name: account.name },
  })
  if (error) throw error
  const client = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } })
  const result = await client.auth.signInWithPassword({ email: account.email, password })
  if (result.error || result.data.user?.id !== data.user?.id || result.data.user?.app_metadata?.role !== account.role) {
    throw new Error(`Created ${account.email}, but password sign-in could not be verified.`)
  }
  await client.auth.signOut()
  credentials.push({ role: account.role, email: account.email, password })
}

console.log(JSON.stringify({ project: new URL(url).hostname, verifiedAccounts: credentials }, null, 2))
