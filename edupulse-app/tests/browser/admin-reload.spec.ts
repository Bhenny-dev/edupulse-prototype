import {test,expect,type Page} from '@playwright/test'
import {ADMIN_VIEW_KEY,ADMIN_ACTOR_ID,adminReloadUI,roleReloadCases} from '../admin-reload-fixture'
import {accountSupportUI,supportAccounts} from '../account-support-fixture'
import {ADMIN_PICKER_KEY} from '../../src/lib/adminViewState'

type Fixture=Awaited<ReturnType<typeof adminReloadUI>>
const noReplayedActions=(fixture:Pick<Fixture,'calls'>)=>{
  expect(fixture.calls.filter(call=>call.action==='support'&&call.method==='POST')).toEqual([])
  expect(fixture.calls.filter(call=>['chat','operator','courseware','provider-test'].includes(call.action))).toEqual([])
  expect(fixture.calls.filter(call=>['start','respond','submit','open','grade','publish'].includes(call.operation||''))).toEqual([])
}
async function viewHint(page:Page){return page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)||'null'),ADMIN_VIEW_KEY)}

for(const {role} of roleReloadCases)test(`reload reopens the ${role} account picker without selecting a person`,async({page})=>{
  const fixture=await accountSupportUI(page)
  const index={dean:1,associate_dean:2,instructor:3,student:4}[role]
  const title={dean:'dean',associate_dean:'associate dean',instructor:'instructor',student:'student'}[role]
  await page.goto('/#/dashboard')
  await page.getByRole('button',{name:'Open view',exact:true}).nth(index).click()
  const picker=page.getByRole('dialog',{name:`Choose ${title} account`,exact:true})
  await expect(picker).toBeVisible()
  await picker.getByRole('searchbox',{name:'Search accounts',exact:true}).fill('not retained')
  expect(await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)||'null'),ADMIN_PICKER_KEY)).toEqual({accountId:ADMIN_ACTOR_ID,role})
  fixture.calls.length=0
  await page.reload()
  await expect(picker).toBeVisible()
  await expect(picker.getByRole('searchbox',{name:'Search accounts',exact:true})).toHaveValue('')
  expect(new URL(page.url()).hash).toBe('#/dashboard')
  expect(await viewHint(page)).toBeNull()
  noReplayedActions(fixture)
  await picker.getByRole('button',{name:'Close account selection',exact:true}).click()
  expect(await page.evaluate(key=>sessionStorage.getItem(key),ADMIN_PICKER_KEY)).toBeNull()
  await page.reload()
  await expect(page.getByRole('heading',{name:'System Admin',exact:true})).toBeVisible()
  await expect(picker).toHaveCount(0)
})

for(const {role,path} of roleReloadCases)test(`hard reload preserves the selected ${role} account and protected URL`,async({page})=>{
  const fixture=await adminReloadUI(page,role)
  await page.goto('/#'+path)
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
  expect(await viewHint(page)).toEqual(fixture.hint)
  fixture.calls.length=0
  const visits:string[]=[];let reloaded=false
  page.on('framenavigated',frame=>{if(frame===page.mainFrame()){visits.push(frame.url());if(!reloaded){fixture.calls.length=0;reloaded=true}}})
  const release=fixture.holdResolve()
  await page.reload()
  await expect.poll(()=>fixture.calls.filter(call=>call.lookupSubject===fixture.account.id).length).toBeGreaterThan(0)
  expect(new URL(page.url()).hash).toBe('#'+path)
  expect(visits.every(url=>!new URL(url).hash.startsWith('#/dashboard'))).toBe(true)
  expect(fixture.calls.filter(call=>['workspace','academic'].includes(call.action))).toEqual([])
  await expect(page.locator('.support-view-banner')).toHaveCount(0)
  release()
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
  expect(new URL(page.url()).hash).toBe('#'+path)
  const lookup=fixture.calls.find(call=>call.lookupSubject===fixture.account.id)!
  expect(lookup.subject).toBeUndefined()
  expect(JSON.parse(Buffer.from(lookup.authorization!.slice(7).split('.')[1],'base64url').toString()).sub).toBe(ADMIN_ACTOR_ID)
  await expect.poll(()=>fixture.calls.filter(call=>['workspace','academic'].includes(call.action)&&call.subject===fixture.account.id).length).toBeGreaterThan(0)
  noReplayedActions(fixture)
})

test('choosing a person records only minimal view hints and restores that choice on reload',async({page})=>{
  const fixture=await accountSupportUI(page),account=supportAccounts[1]
  await page.goto('/#/dashboard')
  await page.getByRole('button',{name:'Open view',exact:true}).last().click()
  const picker=page.getByRole('dialog',{name:'Choose student account',exact:true})
  await picker.getByRole('button',{name:'View Sam Example',exact:true}).click()
  await expect(page.locator('.support-view-banner')).toContainText(account.name)
  expect(await viewHint(page)).toEqual({accountId:ADMIN_ACTOR_ID,role:'student',subjectId:account.id})
  await page.goto('/#/assessment')
  await expect(page.locator('.support-view-banner')).toContainText(account.name)
  fixture.calls.length=0
  await page.reload()
  await expect(page.locator('.support-view-banner')).toContainText(account.name)
  expect(new URL(page.url()).hash).toBe('#/assessment')
  expect(fixture.calls.filter(call=>call.lookupSubject===account.id).length).toBeGreaterThan(0)
  noReplayedActions(fixture)
})

test('a legacy subjectless role hint returns to System Admin without entering an account',async({page})=>{
  const fixture=await adminReloadUI(page,'instructor',{subjectId:null})
  await page.goto('/#/syllabus?tab=mine')
  await expect(page.getByRole('heading',{name:'System Admin',exact:true})).toBeVisible()
  await page.reload();await expect(page.getByRole('heading',{name:'System Admin',exact:true})).toBeVisible()
  await expect(page.locator('.support-view-banner')).toHaveCount(0)
  expect(await viewHint(page)).toBeNull()
  expect(fixture.calls.filter(call=>call.lookupSubject||call.subject)).toEqual([])
  noReplayedActions(fixture)
})

test('a restore transport failure keeps the URL and hint until an explicit retry succeeds',async({page})=>{
  const fixture=await adminReloadUI(page,'instructor');fixture.failResolve('network')
  await page.goto('/#/syllabus?tab=mine')
  await expect(page.getByRole('heading',{name:'Could not restore your view',exact:true})).toBeVisible()
  for(const button of await page.locator('.session-recovery button').all())expect(await button.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
  expect(new URL(page.url()).hash).toBe('#/syllabus?tab=mine')
  expect(await viewHint(page)).toEqual(fixture.hint)
  expect(fixture.calls.filter(call=>['workspace','academic'].includes(call.action))).toEqual([])
  fixture.failResolve(0)
  await page.getByRole('button',{name:'Retry restoring view',exact:true}).click()
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
  expect(new URL(page.url()).hash).toBe('#/syllabus?tab=mine')
  noReplayedActions(fixture)
})

for(const failure of ['unavailable','role changed','empty response'] as const)test(`a saved account that is ${failure} stays gated and explicit exit clears the hint`,async({page})=>{
  const fixture=await adminReloadUI(page,'student')
  if(failure==='unavailable')fixture.failResolve(403)
  else if(failure==='role changed')fixture.resolveRole('instructor')
  else await page.route('**/api/ai?*',route=>new URL(route.request().url()).searchParams.has('subject')?route.fulfill({json:null}):route.fallback())
  await page.goto('/#/assessment')
  await expect(page.getByRole('heading',{name:'Could not restore your view',exact:true})).toBeVisible()
  expect(new URL(page.url()).hash).toBe('#/assessment')
  await expect(page.locator('.support-view-banner')).toHaveCount(0)
  expect(fixture.calls.filter(call=>['workspace','academic'].includes(call.action))).toEqual([])
  await page.getByRole('button',{name:'Return to System Admin',exact:true}).click()
  await expect(page.getByRole('heading',{name:'System Admin',exact:true})).toBeVisible()
  expect(await viewHint(page)).toBeNull()
  fixture.calls.length=0
  await page.reload()
  await expect(page.getByRole('heading',{name:'System Admin',exact:true})).toBeVisible()
  expect(await viewHint(page)).toBeNull()
  expect(fixture.calls.filter(call=>call.lookupSubject||call.subject)).toEqual([])
  noReplayedActions(fixture)
})

test('returning from a restored subject view clears its persisted selection before another reload',async({page})=>{
  const fixture=await adminReloadUI(page,'student')
  await page.goto('/#/assessment')
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
  await page.getByRole('button',{name:'Return to System Admin',exact:true}).click()
  await expect(page.getByRole('heading',{name:'System Admin',exact:true})).toBeVisible()
  expect(await viewHint(page)).toBeNull()
  fixture.calls.length=0
  await page.reload()
  await expect(page.getByRole('heading',{name:'System Admin',exact:true})).toBeVisible()
  expect(fixture.calls.filter(call=>call.lookupSubject||call.subject)).toEqual([])
  noReplayedActions(fixture)
})
