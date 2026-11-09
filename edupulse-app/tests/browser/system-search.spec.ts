import {test,expect} from '@playwright/test'
import {systemSearchUI} from '../system-search-fixture'

test('self questions show the account username, role and work without Internet suggestions',async({page})=>{
 const fixture=await systemSearchUI(page);await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
 const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
 await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('do you know me?');await panel.getByRole('button',{name:'Send',exact:true}).click()
 await expect(panel).toContainText('Username: teacher@example.invalid');await expect(panel).toContainText('Role: Instructor');await expect(panel).toContainText('upload approved syllabi')
 await expect(panel).not.toContainText('Internet suggestions');await expect(panel.getByRole('img')).toHaveCount(0)
 expect(fixture.calls.filter(call=>['operator','provider-test'].includes(call.action))).toHaveLength(0)
})

test('System Search answers typo/name queries with no provider and shows attributed web images',async({page})=>{
  const fixture=await systemSearchUI(page)
  await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
  const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
  const ask=async(text:string)=>{await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill(text);await panel.getByRole('button',{name:'Send',exact:true}).click()}
  await ask('Do you know alexandra benlro d. sample?');await expect(panel).toContainText('Did you mean ALEXANDRA BENLOR DAYSA SAMPLE?');await expect(panel).toContainText('SYN-001');await expect(panel).toContainText('System search · No AI credits used')
  await ask('How do I publsih a sylabus?');await expect(panel).toContainText('Mark an item checked before publishing')
  await ask('How do I create a syllabus?');await expect(panel.locator('.aa-lookup')).toHaveCount(3)
  await ask('What is photosynthesis?');await expect(panel).toContainText('These are Internet suggestions')
  const image=panel.getByRole('img',{name:'Photosynthesis',exact:true});await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((node:HTMLImageElement)=>node.naturalWidth)).toBeGreaterThan(0)
  await expect(panel.getByRole('link',{name:'Image credits'})).toHaveAttribute('href',/wiki\/File:Photosynthesis_en.svg/)
  expect(fixture.calls.filter(call=>['operator','provider-test'].includes(call.action))).toHaveLength(0)
  expect(fixture.searchCalls).toHaveLength(4)
})

test('a broken public image keeps its source/credits and a readable fallback',async({page})=>{
  const fixture=await systemSearchUI(page);fixture.breakImages()
  await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
  const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
  await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('What is photosynthesis?');await panel.getByRole('button',{name:'Send',exact:true}).click()
  await expect(panel).toContainText('Image unavailable');await expect(panel.getByRole('link',{name:'Image credits'})).toBeVisible()
})

test('person follow-ups keep their system subject in English and Filipino before an explicit new topic',async({page})=>{
  const fixture=await systemSearchUI(page)
  await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
  const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
  const ask=async(text:string)=>{await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill(text);await panel.getByRole('button',{name:'Send',exact:true}).click()}
  await ask('Do you know alexandra benlro d. sample?');await expect(panel).toContainText('Did you mean ALEXANDRA BENLOR DAYSA SAMPLE?')
  await ask('Do you know him on fb?');await expect(panel).toContainText('You mean ALEXANDRA BENLOR DAYSA SAMPLE.')
  await expect(panel).toContainText('does not provide a verified Facebook link')
  await expect(panel.getByRole('link',{name:'Search Facebook for ALEXANDRA BENLOR DAYSA SAMPLE'})).toHaveAttribute('href','https://www.facebook.com/search/top?q=ALEXANDRA%20BENLOR%20DAYSA%20SAMPLE')
  await expect(panel.getByRole('img')).toHaveCount(0)
  await ask('kilala mo ba siya sa fb?');await expect(panel.getByRole('link',{name:'Search Facebook for ALEXANDRA BENLOR DAYSA SAMPLE'})).toHaveCount(2)
  await ask('What is photosynthesis?');await expect(panel).toContainText('These are Internet suggestions');await expect(panel.getByRole('img',{name:'Photosynthesis',exact:true})).toBeVisible()
  expect(fixture.calls.filter(call=>['operator','provider-test'].includes(call.action))).toHaveLength(0)
})
