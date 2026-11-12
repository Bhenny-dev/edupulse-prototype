import {test,expect} from './fixtures'
import {roleMonitoringUI} from '../role-monitoring-fixture'
const folder='../feature-documentation/system-walkthrough/07-system-admin'
test('role monitoring pages and tabs',async({page})=>{
 await roleMonitoringUI(page)
 await page.goto('/#/dashboard')
 await expect(page.getByRole('heading',{name:'System Admin',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled()
  await page.screenshot({path:`${folder}/01-system-console.png`,fullPage:true})
 for(const role of ['dean','associate_dean','instructor','student']){
  await page.goto(`/#/dashboard?role=${role}`)
  await expect(page.getByRole('heading',{name:/monitoring$/})).toBeVisible()
  await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled()
  await page.screenshot({path:`${folder}/monitor-${role}.png`,fullPage:true})
 }
 for(const tab of ['accounts','activity','ai','health']){
  await page.goto(`/#/dashboard?role=instructor&monitorTab=${tab}`)
  await expect(page.getByRole('button',{name:{accounts:'Accounts',activity:'Activity & logs',ai:'AI usage',health:'Health'}[tab],exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled()
  await page.screenshot({path:`${folder}/monitor-${tab}.png`,fullPage:true})
 }
 await page.setViewportSize({width:390,height:844})
 await page.goto('/#/dashboard?role=student')
 await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled()
 await page.screenshot({path:`${folder}/monitor-mobile.png`,fullPage:true})
})
