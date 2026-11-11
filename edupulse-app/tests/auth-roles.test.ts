import test from 'node:test'
import assert from 'node:assert/strict'
import { accountUser, canSwitchRole, SYSTEM_ADMIN_EMAILS } from '../src/lib/authRoles.js'

const account = (id: string, email: string, role?: string, userRole?: string) => ({
  id, email, app_metadata: role ? { role, provider: role === 'admin' ? 'google' : 'email', providers: [role === 'admin' ? 'google' : 'email'] } : {},
  user_metadata: { full_name: 'Test User', role: userRole },
})

test('only the Google system admin can switch among five distinct views', () => {
  const admin = accountUser(account('owner', 'RiveraBenlor461@gmail.com', 'admin'))!
  assert.equal(admin.baseRole, 'admin')
  assert.equal(admin.role, 'admin')
  for (const role of ['admin', 'dean', 'associate_dean', 'instructor', 'student']) assert.equal(canSwitchRole(admin, role), true)
  assert.equal(canSwitchRole(admin, 'unknown'), false)
  for(const role of ['constructor','__proto__','toString']) {
    assert.equal(canSwitchRole(admin,role),false)
    assert.equal(accountUser(account('invalid','invalid@example.invalid',role)),null)
  }
  for (const role of ['dean', 'associate_dean', 'instructor', 'student']) {
    const member = accountUser(account(role, `${role}@example.com`, role))!
    assert.equal(member.role, role)
    assert.equal(canSwitchRole(member, 'admin'), false)
  }
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

test('both designated admins require trusted admin assignment and Google linkage', () => {
  assert.equal(SYSTEM_ADMIN_EMAILS.length, 2)
  for (const email of SYSTEM_ADMIN_EMAILS) {
    const admin=accountUser(account(email,email.toUpperCase(),'admin'))!
    for (const role of ['admin','dean','associate_dean','instructor','student']) assert(canSwitchRole(admin,role))
    assert.equal(accountUser({...account(email,email,'admin'),app_metadata:{role:'admin',providers:['email']}}),null)
    assert.equal(accountUser(account(email,email,undefined,'admin')),null)
    assert.equal(canSwitchRole(accountUser(account(email,email,'student')),'admin'),false)
  }
  for(const email of ['someone@kcp.edu.ph','2024-1-0262.botay@kcp.edu.ph.evil.invalid','2024-1-0262@gmail.com']) assert.equal(accountUser(account('not-allowed',email,'admin')),null)
})
