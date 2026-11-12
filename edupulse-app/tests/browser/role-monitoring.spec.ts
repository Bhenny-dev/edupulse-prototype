import {test,expect} from '@playwright/test'
import {roleMonitoringChecks,roleMonitoringUI} from '../role-monitoring-fixture'
import {accountSupportUI} from '../account-support-fixture'
test('role monitoring is filtered, reloadable and never enters another account',async({page})=>roleMonitoringChecks(page))
test('support action opens a named account picker without entering an account',async({page})=>{
 const fixture=await roleMonitoringUI(page)
 await page.goto('/#/dashboard?role=dean')
 await page.getByRole('button',{name:'Choose account view',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Choose dean account',exact:true})).toBeVisible()
 expect(fixture.calls.filter(call=>call.action==='support'&&call.method==='POST')).toEqual([])
})
test('an unavailable overview reports failure rather than a zero account count',async({page})=>{
 await roleMonitoringUI(page)
 await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_overview',route=>route.fulfill({status:503,json:{message:'Synthetic read failure'}}))
 await page.goto('/#/dashboard?role=student')
 await expect(page.getByRole('alert').filter({hasText:'admin overview could not be loaded'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Role accounts',exact:true})).toHaveAttribute('aria-description','—')
 await expect(page.getByRole('button',{name:'Choose account view',exact:true})).toBeDisabled()
})
test('role monitoring selectors cannot turn an instructor into an admin',async({page})=>{
 await accountSupportUI(page,'instructor')
 await page.goto('/#/dashboard?role=dean&monitorTab=accounts')
 await expect(page.getByRole('heading',{name:'Dean monitoring',exact:true})).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'Instructor Dashboard',exact:true})).toBeVisible()
})
