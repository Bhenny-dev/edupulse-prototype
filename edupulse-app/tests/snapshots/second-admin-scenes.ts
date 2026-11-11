import type {Page} from '@playwright/test'
import {expect} from './fixtures'
import {secondAdminUI} from '../second-admin-fixture'
export async function secondAdminScenes(page:Page,mobile=false){
 const fixture=await secondAdminUI(page),folder='../feature-documentation/system-walkthrough/07-system-admin',prefix=mobile?'mobile-':''
 await page.goto('/#/dashboard')
 await expect(page.getByRole('heading',{name:'Role coverage',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Open view',exact:true})).toHaveCount(5)
 await expect(page.getByText('Protected',{exact:true})).toHaveCount(2)
 const coverage=page.getByRole('heading',{name:'Role coverage',exact:true}).locator('../..')
 await expect(coverage).toContainText('2 accounts')
 await coverage.screenshot({path:`${folder}/${prefix}06-two-admins.png`,animations:'disabled'})
 await coverage.getByText('Instructor',{exact:true}).locator('..').getByRole('button',{name:'Open view',exact:true}).click()
 await page.getByRole('button',{name:'View Synthetic Instructor',exact:true}).click()
 await page.goto('/#/performance?tab=materials')
 await expect(page.locator('.support-view-banner')).toContainText('Synthetic Instructor')
 fixture.calls.length=0
 await page.reload()
 await expect(page.locator('.support-view-banner')).toContainText('Synthetic Instructor')
 await expect(page).toHaveURL(/performance\?tab=materials/)
 await expect(page.getByRole('heading',{name:'Performance',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'No authorized academic records yet',exact:true})).toBeVisible()
 expect(fixture.calls.filter(call=>call.action==='support'&&call.method==='POST')).toEqual([])
 expect(fixture.calls.filter(call=>['chat','courseware','operator','provider-test'].includes(call.action)||['start','respond','submit','open','publish'].includes(call.operation||''))).toEqual([])
 await page.screenshot({path:`${folder}/${prefix}07-second-admin-reloaded-view.png`,animations:'disabled'})
}
