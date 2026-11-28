import {test,expect} from '@playwright/test'
import {studentLearningUI} from '../student-learning-ui'

test('scheduled material rechecks on explicit open and reload never records an open',async({page})=>{
 const {store}=await studentLearningUI(page),material=store.records.publications[0],content=structuredClone(material.content),commands:any[]=[]
 Object.assign(material,{delivery_mode:'block_schedule',delivery_state:'scheduled',delivery_open_at:new Date(Date.now()+86400000).toISOString(),delivery_close_at:null,content:null})
 await page.route('**/api/ai?action=academic',async route=>{
  if(route.request().method()==='GET')return route.fallback()
  const input=route.request().postDataJSON();commands.push(input)
  if(input.operation==='read-publication')return route.fulfill({json:material})
  return route.fallback()
 })
 await page.goto('/#/courseware');await page.getByRole('region',{name:'Your classes'}).getByRole('button',{name:/^Open IT 102 /}).click()
 await page.getByRole('button',{name:'Open material',exact:true}).first().click()
 const reader=page.getByRole('dialog',{name:'Advanced variables reading',exact:true})
 await expect(reader).toContainText('Course content is available during your block’s class delivery window.')
 await expect(reader.getByRole('navigation',{name:'Material reader views'})).toHaveCount(0)
 expect(commands.filter(command=>command.operation!=='feedback').map(command=>command.operation)).toEqual(['read-publication'])
 await page.reload();await expect(reader).toBeVisible();expect(commands.filter(command=>command.operation!=='feedback')).toHaveLength(1)
 await page.keyboard.press('Escape')
 Object.assign(material,{content,delivery_state:'open',delivery_open_at:new Date(Date.now()-3600000).toISOString()})
 await page.getByRole('button',{name:'Open material',exact:true}).first().click()
 await expect(reader.getByRole('navigation',{name:'Material reader views'})).toBeVisible()
 await expect.poll(()=>commands.filter(command=>command.operation==='open').length).toBe(1)
 const writes=commands.length
 await page.reload();await expect(reader.getByRole('navigation',{name:'Material reader views'})).toBeVisible();expect(commands).toHaveLength(writes)
})

test('closed scheduled assessment keeps its saved result without rendering questions or starting a session',async({page})=>{
 const {store}=await studentLearningUI(page),quiz=store.records.publications.find(item=>item.type==='assessment')!,commands:any[]=[]
 Object.assign(quiz,{delivery_mode:'block_schedule',delivery_state:'closed',delivery_open_at:new Date(Date.now()-86400000).toISOString(),delivery_close_at:new Date(Date.now()-3600000).toISOString(),content:null})
 await page.route('**/api/ai?action=academic',async route=>{
  if(route.request().method()==='GET')return route.fallback()
  const input=route.request().postDataJSON();commands.push(input)
  if(input.operation==='read-publication')return route.fulfill({json:quiz})
  if(input.operation==='feedback')return route.fulfill({json:{available:false,reason:'Review is unavailable for this version.'}})
  return route.fallback()
 })
 await page.goto('/#/courseware');await page.getByRole('region',{name:'Your classes'}).getByRole('button',{name:/^Open IT 102 /}).click()
 await page.getByRole('button',{name:'Review assessment',exact:true}).first().click()
 const reader=page.getByRole('dialog',{name:quiz.title,exact:true})
 await expect(reader).toContainText('Class closed')
 await expect(reader).toContainText('Saved score:')
 await expect(reader.locator('.academic-question')).toHaveCount(0)
 await expect(reader.getByRole('button',{name:'Confirm and submit responses',exact:true})).toHaveCount(0)
 expect(commands.filter(command=>command.operation!=='feedback').map(command=>command.operation)).toEqual(['read-publication'])
 await page.reload({waitUntil:'domcontentloaded',timeout:20000});await expect(reader).toContainText('Saved score:',{timeout:20000});expect(commands.filter(command=>command.operation!=='feedback')).toHaveLength(1)
})
