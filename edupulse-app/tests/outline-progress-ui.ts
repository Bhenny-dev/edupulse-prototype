import {expect,type Page} from '@playwright/test'
import {researchMethodsDraft} from './syllabus-draft-fixture'

// Synthetic transport exercises the actual planner client, mounted builder and preview controls.
export async function outlineProgressUI(page:Page) {
 const requests:Record<string,any>[]=[],writes:unknown[]=[];let release=()=>{}
 const held=new Promise<void>(resolve=>{release=resolve})
 const rows=researchMethodsDraft.courseOutline.filter(row=>row.week<=2)
 const syllabus={id:'synthetic-reference',sample:true,courseCode:'IT 104',courseTitle:'Research Methods',version:2,status:'active',courseOutline:researchMethodsDraft.courseOutline}
 await page.route('**/api/ai?action=workspace',async route=>{
  if(route.request().method()==='PUT')writes.push(route.request().postDataJSON())
  return route.fulfill({json:{revision:0,mode:'local',data:{syllabi:[syllabus],content:{},registrations:[]}}})
 })
 await page.route('**/api/ai?action=operator',async route=>{
  const input=route.request().postDataJSON();requests.push(input)
  if(!input.continuation)return route.fulfill({json:{pending:true,continuation:'synthetic-initial',generated:false}})
  if(input.continuation==='synthetic-initial')return route.fulfill({json:{pending:true,continuation:'synthetic-week-one',generated:true,progress:{rows:rows.slice(0,1),total:16}}})
  if(input.continuation==='synthetic-week-one')return route.fulfill({json:{pending:true,continuation:'synthetic-week-two',generated:true,progress:{rows,total:16}}})
  await held
  return route.fulfill({status:502,json:{error:{code:'INCOMPLETE_RESPONSE',message:'The synthetic model stopped during a later week.'}}})
 })
 return {requests,writes,release,rows}
}

export async function outlineProgressScene(page:Page,capture?:(name:string,target:any)=>Promise<void>){
 const fixture=await outlineProgressUI(page)
 try{
  await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=builder');await page.getByRole('combobox',{name:'Course',exact:true}).selectOption('IT 104')
  await page.getByRole('button',{name:'Open Pulse assistant'}).click();const chat=page.getByRole('dialog',{name:'Pulse',exact:true})
  await chat.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Complete the course outline for the selected course');await chat.getByRole('button',{name:'Send',exact:true}).click()
  await expect(chat).toContainText('2 draft weeks placed; continuing...');await expect(page.getByLabel('Week 1 contents',{exact:true})).toHaveValue(fixture.rows[0]!.contents[0]!);await expect(page.getByLabel('Week 2 contents',{exact:true})).toHaveValue(fixture.rows[1]!.contents[0]!)
  expect(fixture.requests[0].referenceSyllabi[0].id).toBe('synthetic-reference');expect(fixture.writes).toHaveLength(0);await expect(page.getByRole('region',{name:'Generated outline draft',exact:true})).toHaveCount(0)
  await page.getByLabel('Week 1 learning outcomes',{exact:true}).scrollIntoViewIfNeeded();await capture?.('progress',page)
  fixture.release();await expect(chat).toContainText('Completed draft weeks remain in the form.');await capture?.('stopped',chat)
  await chat.getByRole('button',{name:'Close Pulse',exact:true}).click();const second=page.getByLabel('Week 2 learning outcomes',{exact:true});await second.fill('Manually reviewed second-week outcome');await expect(second).toHaveValue('Manually reviewed second-week outcome');await expect(page.getByLabel('Week 1 contents',{exact:true})).toHaveValue(fixture.rows[0]!.contents[0]!)
  expect(fixture.writes).toHaveLength(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await capture?.('editable',page.getByRole('region',{name:'Course Outline editor',exact:true}))
 }finally{fixture.release()}
}
