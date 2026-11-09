import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { provisionStaff } from '../scripts/provision-staff.mjs'
import { STAFF_ACCOUNTS } from '../scripts/lib/staff-accounts.mjs'

function fakeAuth(existing:any[] = [], failAt = 0):any {
  const users = [...existing], writes:any[] = []
  return { writes, listUsers: async ({page,perPage}:{page:number,perPage:number}) => ({data:{users:users.slice((page-1)*perPage,page*perPage)}}), createUser: async (input:any) => {
    writes.push(input)
    if(writes.length === failAt) return {error:{status:503}}
    const user={...input,id:`staff-${writes.length}`,email_confirmed_at:'2026-11-09'};users.push(user);return {data:{user}}
  }, getUserById: async (id:string) => ({data:{user:users.find(row=>row.id===id)}}) }
}
async function privateFile(t:any) {
  const directory=await mkdtemp(join(tmpdir(),'edupulse-staff-'))
  t.after(async()=>{assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('edupulse-staff-'));await rm(directory,{recursive:true,force:true})})
  return join(directory,'private.jsonl')
}
test('staff plan uses surname logins and owner-corrected roles without any writes',async()=>{
  const auth=fakeAuth(),plan=await provisionStaff(auth)
  assert.equal(plan.length,9);assert.equal(auth.writes.length,0)
  assert.equal(plan.find(row=>row.email==='guaki@edupulse.com')!.role,'dean')
  assert.equal(plan.find(row=>row.email==='nginsayan@edupulse.com')!.name,'Myriell Nginsayan')
  assert.equal(plan.find(row=>row.email==='fianza-buya@edupulse.com')!.role,'instructor')
  assert.equal(new Set(plan.map(row=>row.email)).size,9)
})
test('staff provisioning journals unique passwords, verifies roles, preserves existing users and is idempotent',async t=>{
  const file=await privateFile(t),auth=fakeAuth(),created=await provisionStaff(auth,{apply:true,credentialsFile:file})
  assert.ok(created.every(row=>row.status==='created'))
  const journal=(await readFile(file,'utf8')).trim().split('\n').map(row=>JSON.parse(row)),secrets=journal.filter(row=>row.password)
  assert.equal(secrets.length,9);assert.equal(new Set(secrets.map(row=>row.password)).size,9)
  assert.ok(auth.writes.every((row:any)=>row.email_confirm&&row.password.length>=32&&row.app_metadata.role!=='admin'))
  assert.ok(!JSON.stringify(created).includes('Ep9!'))
  assert.ok((await provisionStaff(auth,{apply:true,credentialsFile:file})).every(row=>row.status==='unchanged'))
  assert.equal(auth.writes.length,9,'rerun neither creates accounts nor resets passwords')
})
test('a conflicting account or occupied private file stops creation before any mutation',async t=>{
  const file=await privateFile(t),conflict=fakeAuth([{email:STAFF_ACCOUNTS[8].email,app_metadata:{role:'student'}}])
  await assert.rejects(provisionStaff(conflict,{apply:true,credentialsFile:file}),/conflict/);assert.equal(conflict.writes.length,0)
  const auth=fakeAuth();await writeFile(file,'existing private data')
  await assert.rejects(provisionStaff(auth,{apply:true,credentialsFile:file}),/EEXIST/);assert.equal(auth.writes.length,0);assert.equal(await readFile(file,'utf8'),'existing private data')
})
test('an ambiguous creation retains recovery credentials and stops without claiming success',async t=>{
  const file=await privateFile(t),auth=fakeAuth([],2)
  await assert.rejects(provisionStaff(auth,{apply:true,credentialsFile:file}),/could not be confirmed/)
  assert.equal(auth.writes.length,2)
  const entries=(await readFile(file,'utf8')).trim().split('\n').map(row=>JSON.parse(row))
  assert.equal(entries.filter(row=>row.status==='created').length,1);assert.equal(entries.filter(row=>row.password).length,2)
})
