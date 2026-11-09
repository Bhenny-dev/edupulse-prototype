import {test,expect} from './fixtures'
import {outlineProgressUI} from '../outline-progress-ui'
import {mkdir} from 'node:fs/promises'
const dir='../feature-documentation/system-manual/34-progressive-outlines'
test('progressive outline mobile: completed preview and retained failure state',async({page})=>{
 const fixture=await outlineProgressUI(page);await mkdir(dir,{recursive:true})
 try{
  await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=builder');await page.getByRole('combobox',{name:'Course',exact:true}).selectOption('IT 104')
  await page.getByRole('button',{name:'Open Pulse assistant'}).click();const chat=page.getByRole('dialog',{name:'Pulse',exact:true})
  await chat.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Complete the course outline for the selected course');await chat.getByRole('button',{name:'Send',exact:true}).click()
  const preview=page.getByRole('region',{name:'Generated outline draft',exact:true});await expect(preview).toContainText('2 of 16 teaching weeks ready')
  await chat.getByRole('button',{name:'Close Pulse',exact:true}).click();await page.setViewportSize({width:390,height:1400});await preview.scrollIntoViewIfNeeded();await expect(preview).toContainText('Generating the next week')
  await preview.screenshot({path:dir+'/04-mobile-progress.png',animations:'disabled'});fixture.release();await expect(preview).toContainText('Generation stopped. Completed weeks remain available below.')
  await preview.screenshot({path:dir+'/05-mobile-stopped.png',animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{fixture.release()}
})
