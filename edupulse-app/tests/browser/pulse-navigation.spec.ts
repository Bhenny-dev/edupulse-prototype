import { test,expect } from '@playwright/test'
import { navigationUI,CREDIT_ERROR } from '../pulse-navigation-fixture'

test('owner requests preserve the dashboard role, including a conversational correction, without model calls',async({page})=>{
 const fixture=await navigationUI(page)
 await page.goto('/#/dashboard')
 await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click()
 const pulse=page.getByRole('dialog',{name:'Pulse',exact:true})
 // Correct the target while still in the same account conversation. A completed
 // account switch intentionally discards that conversation's private context.
 await pulse.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('open me the instructors dashboard')
 await pulse.getByRole('button',{name:'Send',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Choose instructor account',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Close account selection',exact:true}).click()
 for(const [request,title] of [["no, not mine, the dean's",'Dean'],['open me the instructors dashboard','Instructor'],["open the student's dashboard",'Student']]) {
  await pulse.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill(request)
  await pulse.getByRole('button',{name:'Send',exact:true}).click()
  await page.getByRole('button',{name:`View ${title==='Instructor'?'Rowan Instructor Demo':title==='Dean'?'Dana Dean Demo':'Alex Sample'}`,exact:true}).click()
  await expect(page.getByRole('heading',{name:`${title} Dashboard`,exact:true})).toBeVisible()
  await expect(page.getByRole('banner').getByText(`Admin · ${title}`,{exact:true})).toHaveCount(1)
  // Switching the viewed role resets Pulse's private context and closes its panel.
  await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click()
  await expect(pulse.getByRole('textbox',{name:'Ask Pulse',exact:true})).toBeVisible()
 }
 expect(fixture.modelCalls()).toBe(0)
})

test('a student cannot switch accounts by requesting another role dashboard',async({page})=>{
 const fixture=await navigationUI(page,'student')
 await page.goto('/#/dashboard')
 await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click()
 await page.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Open the instructor dashboard')
 await page.getByRole('button',{name:'Send',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Pulse',exact:true})).toContainText('Instructor Dashboard is not available for your role.')
 await expect(page.getByRole('heading',{name:'Student Dashboard',exact:true})).toBeVisible()
 expect(fixture.modelCalls()).toBe(0)
})

test('an Anthropic credit failure keeps the saved connection and explains the API balance',async({page})=>{
 await navigationUI(page,'instructor')
 await page.goto('/#/settings?tab=ai-provider')
 await expect(page.getByLabel('Available model')).toHaveValue('synthetic-claude-model')
 await page.getByRole('button',{name:'Test selected model',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:CREDIT_ERROR})).toBeVisible()
 await expect(page.getByLabel('Available model')).toHaveValue('synthetic-claude-model')
 await expect(page.getByLabel('Saved provider credential')).toBeVisible()
 await expect(page.getByRole('button',{name:'Test selected model',exact:true})).toBeEnabled()
})


test('a Claude workspace can be chosen by name and tested while keeping the saved credential and model',async({page})=>{
 await navigationUI(page,'instructor',true)
 await page.goto('/#/settings?tab=ai-provider')
 await expect(page.getByLabel('Available model')).toHaveValue('synthetic-claude-model')
 await page.getByRole('button',{name:'Test selected model',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:'Choose your Claude workspace'})).toBeVisible()
 await page.getByRole('button',{name:'Load Claude workspaces',exact:true}).click()
 await expect(page.getByLabel('Available Claude workspaces')).toHaveValue('')
 await page.getByLabel('Available Claude workspaces').selectOption({label:'Teaching'})
 await expect(page.getByLabel('Claude workspace',{exact:true})).toHaveValue('wrkspc_teaching')
 await page.getByRole('button',{name:'Save workspace and load models',exact:true}).click()
 await expect(page.getByLabel('Saved provider credential')).toBeVisible()
 await expect(page.getByLabel('Available model')).toHaveValue('synthetic-claude-model')
 await page.getByRole('button',{name:'Test selected model',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'Generation verified.'})).toBeVisible()
})
