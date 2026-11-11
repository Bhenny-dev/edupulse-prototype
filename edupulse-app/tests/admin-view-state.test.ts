import test from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_PICKER_KEY, ADMIN_VIEW_KEY, clearAdminPicker, clearAdminView, readAdminPicker, readAdminView, saveAdminPicker, saveAdminView } from '../src/lib/adminViewState.js'

const admin = { id: 'actor-a', authenticated: true, canSwitchRoles: true, baseRole: 'admin', email: 'riverabenlor461@gmail.com' }
const subject = '12ABCDEF-1234-4567-89AB-123456ABCDEF'
const memory = () => {
  const rows = new Map<string, string>()
  return { rows, getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => { rows.set(key, value) }, removeItem: (key: string) => { rows.delete(key) } }
}

test('restored admin view is bound to the authenticated actor and normalizes only the subject reference', () => {
  const tab = memory()
  for (const role of ['dean', 'associate_dean', 'instructor', 'student']) {
    saveAdminView(admin, role, subject, tab)
    assert.deepEqual(readAdminView(admin, tab), { accountId: admin.id, role, subjectId: subject.toLowerCase() })
    assert.equal(readAdminView({ ...admin, id: 'actor-b' }, tab), null)
  }
  saveAdminView(admin, 'instructor', null, tab)
  assert.deepEqual(readAdminView(admin, tab), { accountId: admin.id, role: 'instructor', subjectId: null })
  // An impersonated person's email cannot replace the signed-in admin account binding.
  assert.deepEqual(readAdminView({ ...admin, email: 'teacher@edupulse.com', accountEmail: admin.email }, tab), { accountId: admin.id, role: 'instructor', subjectId: null })
})

test('forged storage cannot grant role switching to a non-admin or signed-out actor', () => {
  const tab = memory()
  saveAdminView(admin, 'student', subject, tab)
  for (const actor of [
    { ...admin, authenticated: false },
    { ...admin, canSwitchRoles: false },
    { ...admin, baseRole: 'instructor' },
    { ...admin, email: 'other@edupulse.com' },
    { ...admin, accountEmail: 'other@edupulse.com' },
    { id: admin.id },
  ]) assert.equal(readAdminView(actor, tab), null)
  const forged = { ...admin, baseRole: 'student' }
  saveAdminView(forged, 'student', subject, tab)
  assert.equal(tab.rows.has(ADMIN_VIEW_KEY), false)
})

test('invalid roles, malformed UUIDs and invalid serialized hints are not restored', () => {
  const tab = memory()
  const hint = { accountId: admin.id, role: 'student', subjectId: subject }
  for (const role of ['admin', 'unknown', '', 'Student', 'constructor', '__proto__', null, 1, ['student'], { role: 'student' }]) {
    tab.rows.set(ADMIN_VIEW_KEY, JSON.stringify({ ...hint, role }))
    assert.equal(readAdminView(admin, tab), null, `invalid role: ${JSON.stringify(role)}`)
  }
  for (const subjectId of ['', 'student-a', '12345678-1234-1234-1234-123456789ab', '12345678-1234-1234-1234-123456789abz', [], 12, undefined]) {
    tab.rows.set(ADMIN_VIEW_KEY, JSON.stringify({ ...hint, subjectId }))
    assert.equal(readAdminView(admin, tab), null, `invalid subject: ${JSON.stringify(subjectId)}`)
  }
  for (const raw of ['not-json', 'null', '[]', '{}', JSON.stringify({ ...hint, accountId: 'another-actor' }), JSON.stringify({ ...hint, padding: 'x'.repeat(1001) })]) {
    tab.rows.set(ADMIN_VIEW_KEY, raw)
    assert.equal(readAdminView(admin, tab), null)
  }
  for (const [role, subjectId] of [['admin', subject], ['unknown', subject], ['student', 'invalid']] as const) {
    tab.rows.set(ADMIN_VIEW_KEY, JSON.stringify(hint))
    saveAdminView(admin, role, subjectId, tab)
    assert.equal(tab.rows.has(ADMIN_VIEW_KEY), false)
  }
})

test('stored and restored hints contain references only and discard extra authority or account fields', () => {
  const tab = memory()
  const actor = { ...admin, name: 'Private Name', credential: 'private-secret', accessToken: 'private-token' }
  saveAdminView(actor, 'student', subject, tab)
  const expected = { accountId: admin.id, role: 'student', subjectId: subject.toLowerCase() }
  assert.deepEqual(JSON.parse(tab.rows.get(ADMIN_VIEW_KEY)!), expected)
  tab.rows.set(ADMIN_VIEW_KEY, JSON.stringify({ ...expected, authenticated: true, canSwitchRoles: true, name: 'Forged Name', credential: 'forged-secret', command: 'publish' }))
  assert.deepEqual(readAdminView(admin, tab), expected)
  assert.deepEqual(Object.keys(readAdminView(admin, tab)!).sort(), ['accountId', 'role', 'subjectId'])
})

test('unavailable or denied tab storage does not break navigation or clearing the view', () => {
  const denied = { getItem: () => { throw new Error('Storage denied') }, setItem: () => { throw new Error('Storage denied') }, removeItem: () => { throw new Error('Storage denied') } }
  for (const tab of [null, denied]) {
    assert.equal(readAdminView(admin, tab), null)
    assert.doesNotThrow(() => saveAdminView(admin, 'student', subject, tab))
    assert.doesNotThrow(() => saveAdminView(admin, 'admin', null, tab))
    assert.doesNotThrow(() => clearAdminView(tab))
  }
  const tab = memory()
  saveAdminView(admin, 'student', subject, tab)
  clearAdminView(tab)
  assert.equal(readAdminView(admin, tab), null)
})

test('an open account picker stores only its verified actor and finite academic role', () => {
  const tab=memory(),namedActor={...admin,name:'Private Name',accessToken:'private-token'}
  for(const role of ['student','instructor','dean','associate_dean']){
    saveAdminPicker(namedActor,role,tab)
    assert.deepEqual(JSON.parse(tab.rows.get(ADMIN_PICKER_KEY)!),{accountId:admin.id,role})
    assert.equal(readAdminPicker(admin,tab),role)
    assert.equal(readAdminPicker({...admin,id:'another-actor'},tab),null)
    for(const actor of [{...admin,authenticated:false},{...admin,canSwitchRoles:false},{...admin,baseRole:'student'},{...admin,email:'other@example.invalid'}])assert.equal(readAdminPicker(actor,tab),null)
  }
  for(const role of ['admin','unknown','constructor','__proto__',null,1,['student']]){
    tab.rows.set(ADMIN_PICKER_KEY,JSON.stringify({accountId:admin.id,role}))
    assert.equal(readAdminPicker(admin,tab),null)
  }
  tab.rows.set(ADMIN_PICKER_KEY,JSON.stringify({accountId:admin.id,role:'student',q:'Private search',operation:'enter',subjectId:subject}))
  assert.equal(readAdminPicker(admin,tab),'student')
  clearAdminPicker(tab)
  assert.equal(readAdminPicker(admin,tab),null)
  saveAdminPicker({...admin,canSwitchRoles:false},'student',tab)
  assert.equal(tab.rows.has(ADMIN_PICKER_KEY),false)
})

test('picker hint parsing and closing tolerate unavailable storage without preserving actions',()=>{
  const tab=memory()
  for(const raw of ['not-json','null','[]','{}',' '.repeat(1001)]){
    tab.rows.set(ADMIN_PICKER_KEY,raw)
    assert.equal(readAdminPicker(admin,tab),null)
  }
  const denied={getItem:()=>{throw new Error('denied')},setItem:()=>{throw new Error('denied')},removeItem:()=>{throw new Error('denied')}}
  for(const storage of [null,denied]){
    assert.equal(readAdminPicker(admin,storage),null)
    assert.doesNotThrow(()=>saveAdminPicker(admin,'student',storage))
    assert.doesNotThrow(()=>clearAdminPicker(storage))
  }
})
