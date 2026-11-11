import { test,expect } from './fixtures'
import { mkdir } from 'node:fs/promises'
import { navigationUI,CREDIT_ERROR } from '../pulse-navigation-fixture'
const DIR='../feature-documentation/system-manual/17-pulse-navigation-and-provider-recovery'

test('synthetic owner opens named role dashboards and retains the correction conversation',async({page})=>{
 await mkdir(DIR,{recursive:true});const fixture=await navigationUI(page)
 await page.goto('/#/dashboard')
 await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click()
 for(const [request,title,file] of [['open me the instructors dashboard','Instructor','01-instructor-view'],["open the dean's dashboard",'Dean','02-role-correction']]) {
  if(!await page.getByRole('dialog',{name:'Pulse',exact:true}).isVisible())await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click()
  await page.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill(request)
  await page.getByRole('button',{name:'Send',exact:true}).click()
  await page.getByRole('button',{name:`View ${title==='Instructor'?'Rowan Instructor Demo':title==='Dean'?'Dana Dean Demo':'Alex Sample'}`,exact:true}).click()
  await expect(page.getByRole('heading',{name:`${title} Dashboard`,exact:true})).toBeVisible()
  await expect(page.locator('.support-view-banner')).toContainText(title==='Instructor'?'Rowan Instructor Demo':'Dana Dean Demo')
  await page.screenshot({path:`${DIR}/${file}.png`,animations:'disabled'})
 }
 expect(fixture.modelCalls()).toBe(0)
})

test('synthetic Anthropic API credit failure explains recovery without replacing the saved key',async({page})=>{
 await mkdir(DIR,{recursive:true});await navigationUI(page,'instructor')
 await page.goto('/#/settings?tab=ai-provider')
 await expect(page.getByLabel('Available model')).toHaveValue('synthetic-claude-model')
 await page.getByRole('button',{name:'Test selected model',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:CREDIT_ERROR})).toBeVisible()
 await page.locator('[data-pulse-target="AI connection"]').screenshot({path:`${DIR}/03-anthropic-api-credits.png`,animations:'disabled',style:'.app-topbar{position:static !important}'})
})


test('synthetic Claude workspace recovery preserves the saved credential and selected model',async({page})=>{
 await mkdir(DIR,{recursive:true});await navigationUI(page,'instructor',true)
 await page.goto('/#/settings?tab=ai-provider')
 await expect(page.getByLabel('Available model')).toHaveValue('synthetic-claude-model')
 await page.getByRole('button',{name:'Load Claude workspaces',exact:true}).click()
 await page.getByLabel('Available Claude workspaces').selectOption({label:'Teaching'})
 await page.getByRole('button',{name:'Save workspace and load models',exact:true}).click()
 await page.getByRole('button',{name:'Test selected model',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'Generation verified.'})).toBeVisible()
 await page.locator('[data-pulse-target="AI connection"]').screenshot({path:`${DIR}/04-claude-workspace.png`,animations:'disabled',style:'.app-topbar{position:static !important}'})
})
