import {expect,type Page} from '@playwright/test'
import {operatorInput,planValidatedTool} from '../src/agents/toolPlanner'

export async function targetedOutlineUI(page:Page){
 const calls:any[]=[],writes:any[]=[]
 await page.route('**/api/ai?action=workspace',route=>{if(route.request().method()!=='GET')writes.push(route.request().postDataJSON());return route.fulfill({json:{mode:'preview',revision:0}})})
 await page.route('**/api/ai?action=operator',async route=>{
  const input=operatorInput.parse(route.request().postDataJSON());calls.push(input)
  const result=await planValidatedTool(input,{id:'synthetic-instructor',role:'instructor',local:true},AbortSignal.timeout(10000),async(_system,prompt)=>{
   const task=JSON.parse(prompt)
   return JSON.stringify({edits:task.targets.map((target:{target:number;fields:string[]})=>({target:target.target,changes:Object.fromEntries(target.fields.map(field=>[field,{ilos:'Evaluate a research question using feasibility criteria.',contents:['Research questions','Feasibility and scope'],activities:'Compare two research questions and explain the stronger scope.',assessments:'Write a feasible question and justify the chosen scope.',assessmentTypes:['Essay']}[field]]))}))})
  },6000,async()=>({evidence:[]}))
  return route.fulfill({json:result})
 })
 await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=builder')
 await page.getByRole('combobox',{name:'Course',exact:true}).selectOption('IT 104')
 const outline=page.getByRole('region',{name:'Course Outline editor',exact:true})
 await outline.getByRole('combobox',{name:'Outline week',exact:true}).selectOption('1')
 await outline.getByRole('button',{name:'Add section to week 1',exact:true}).click()
 await page.getByLabel('Week 1 section 2 contents',{exact:true}).fill('Keep this unrelated section exactly.')
 const share=outline.locator('.outline-section-controls').first();await share.getByText('Share section across weeks',{exact:true}).click();await share.getByLabel('Week 1 section 1 last shared week',{exact:true}).fill('2');await share.getByRole('button',{name:'Apply week range',exact:true}).click()
 await page.getByRole('button',{name:'Open Pulse assistant'}).click()
 const chat=page.getByRole('dialog',{name:'Pulse',exact:true})
 await chat.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Complete Week 1 Section 1 only');await chat.getByRole('button',{name:'Send',exact:true}).click()
 const review=chat.getByRole('region',{name:'Review content edit',exact:true})
 await expect(review).toContainText('Targeted edit: week 1, section 1')
 await expect(page.locator('[data-pulse-field="courseOutline.0.sections.0.contents"]')).toHaveValue('')
 return {calls,writes,chat,review,outline}
}
