import {test,expect} from './fixtures'
import {adminReloadUI,roleReloadCases} from '../admin-reload-fixture'
import {mkdir} from 'node:fs/promises'

const folder='../feature-documentation/system-manual/23-account-support-and-pulse-context'
const shot=async(page:any,file:string)=>{await mkdir(folder,{recursive:true});await page.screenshot({path:`${folder}/${file}.png`,animations:'disabled'})}

for(const [index,{role,path}] of roleReloadCases.entries())test(`account support reload: ${role} remains selected on the protected page`,async({page})=>{
  const fixture=await adminReloadUI(page,role)
  await page.goto('/#'+path)
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
  await page.reload()
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
  expect(new URL(page.url()).hash).toBe('#'+path)
  await expect(page.getByTestId('workspace-save-state')).toHaveText('Saved')
  await shot(page,`${10+index}-reload-${role}`)
})

test('account support reload: pending verification and explicit recovery retain the URL',async({page})=>{
  const fixture=await adminReloadUI(page,'instructor')
  const release=fixture.holdResolve()
  await page.goto('/#/syllabus?tab=mine')
  await expect.poll(()=>fixture.calls.some(call=>Boolean(call.lookupSubject))).toBe(true)
  await expect(page.getByText('Restoring your session…',{exact:true})).toBeVisible()
  await shot(page,'14-reload-verifying')
  fixture.failResolve(503);release()
  await expect(page.getByRole('heading',{name:'Could not restore your view',exact:true})).toBeVisible()
  expect(new URL(page.url()).hash).toBe('#/syllabus?tab=mine')
  await shot(page,'15-reload-recovery')
  fixture.failResolve(0)
  await page.getByRole('button',{name:'Retry restoring view',exact:true}).click()
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
})

test('account support reload: account popover and pending person selection reopen',async({page})=>{
  await adminReloadUI(page,'instructor')
  await page.goto('/#/syllabus?tab=mine')
  await page.getByRole('button',{name:'Account menu',exact:true}).click()
  await expect(page.getByRole('link',{name:'Settings',exact:true})).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link',{name:'Settings',exact:true})).toBeVisible()
  await shot(page,'18-reloaded-account-popover')
  await page.getByRole('button',{name:'Switch view',exact:true}).click()
  await page.getByRole('button',{name:/^Student Open materials/}).click()
  const picker=page.getByRole('dialog',{name:'Choose student account',exact:true})
  await expect(picker).toBeVisible();await page.reload();await expect(picker).toBeVisible()
  await expect(picker.getByRole('button',{name:'View Alex Sample',exact:true})).toBeVisible()
  await picker.screenshot({path:`${folder}/19-reloaded-account-selection.png`,animations:'disabled'})
})
