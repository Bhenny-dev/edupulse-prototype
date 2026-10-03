import test from 'node:test'
import assert from 'node:assert/strict'
import { accountUser, canSwitchRole } from '../src/lib/authRoles.js'

const account = (id: string, email: string, role?: string, userRole?: string) => ({
  id, email, app_metadata: role ? { role, provider: role === 'admin' ? 'google' : 'email', providers: [role === 'admin' ? 'google' : 'email'] } : {},
  user_metadata: { full_name: 'Test User', role: userRole },
})

test('only the named, server-assigned admin can switch among three views', () => {
  const admin = accountUser(account('owner', 'RiveraBenlor461@gmail.com', 'admin'))!
  assert.equal(admin.baseRole, 'admin')
  assert.equal(admin.role, 'admin')
  for (const role of ['admin', 'instructor', 'student']) assert.equal(canSwitchRole(admin, role), true)
  assert.equal(canSwitchRole(admin, 'unknown'), false)
  const instructor = accountUser(account('teacher', 'instructor@example.com', 'instructor'))!
  assert.equal(canSwitchRole(instructor, 'admin'), false)
  assert.equal(accountUser(account('other', 'other@example.com', 'admin')), null)
  assert.equal(accountUser({ ...account('owner', 'riverabenlor461@gmail.com', 'admin'), app_metadata: { role: 'admin', providers: ['email'] } }), null)
  assert.equal(accountUser(account('forged', 'other@example.com', undefined, 'admin')), null)
})

test('admin view persists only for the same authenticated account', () => {
  const admin = accountUser(account('owner', 'riverabenlor461@gmail.com', 'admin'))!
  const studentView = { ...admin, role: 'student', title: 'Student' }
  assert.equal(accountUser(account('owner', admin.email, 'admin'), studentView)?.role, 'student')
  assert.equal(accountUser(account('different', admin.email, 'admin'), studentView)?.role, 'admin')
  assert.equal(accountUser(account('owner', 'other@example.com', 'instructor'), studentView)?.role, 'instructor')
})
