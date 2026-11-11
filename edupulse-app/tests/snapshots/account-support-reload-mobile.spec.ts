import {test,expect} from './fixtures'
import {adminReloadUI} from '../admin-reload-fixture'

const folder='../feature-documentation/system-manual/23-account-support-and-pulse-context'
test('account support reload mobile: selected student and recoverable service failure',async({page})=>{
  const fixture=await adminReloadUI(page,'student')
  await page.goto('/#/assessment')
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
  await page.reload()
  await expect(page.locator('.support-view-banner')).toContainText(fixture.account.name)
  expect(new URL(page.url()).hash).toBe('#/assessment')
  await page.screenshot({path:`${folder}/16-mobile-reloaded-view.png`,animations:'disabled'})
  fixture.failResolve(503);await page.reload()
  await expect(page.getByRole('button',{name:'Retry restoring view',exact:true})).toBeVisible()
  for(const button of await page.locator('.session-recovery button').all())expect(await button.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
  expect(new URL(page.url()).hash).toBe('#/assessment')
  await page.screenshot({path:`${folder}/17-mobile-recovery.png`,animations:'disabled'})
})
