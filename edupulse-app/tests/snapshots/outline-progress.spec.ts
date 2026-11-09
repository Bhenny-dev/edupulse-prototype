import {test,expect} from './fixtures'
import {outlineProgressUI} from '../outline-progress-ui'
import {mkdir} from 'node:fs/promises'
const dir='../feature-documentation/system-manual/34-progressive-outlines'
test('progressive outline: visible completed weeks, stopped prefix and safe placement',async({page})=>{
 const fixture=await outlineProgressUI(page);await mkdir(dir,{recursive:true})
 try{
  await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=builder');await page.getByRole('combobox',{name:'Course',exact:true}).selectOption('IT 104')
  await page.getByRole('button',{name:'Open Pulse assistant'}).click();const chat=page.getByRole('dialog',{name:'Pulse',exact:true})
  await chat.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Complete the course outline for the selected course');await chat.getByRole('button',{name:'Send',exact:true}).click()
  const preview=page.getByRole('region',{name:'Generated outline draft',exact:true});await expect(preview).toContainText('2 of 16 teaching weeks ready')
  await chat.getByRole('button',{name:'Close Pulse',exact:true}).click();await preview.scrollIntoViewIfNeeded()
  await expect(preview).toContainText('Generating the next week');await preview.screenshot({path:dir+'/01-weeks-arrive.png',animations:'disabled'})
  fixture.release();await expect(preview).toContainText('Generation stopped. Completed weeks remain available below.');await preview.screenshot({path:dir+'/02-stopped-prefix.png',animations:'disabled'})
  await preview.getByRole('button',{name:'Use completed weeks',exact:true}).click();await preview.getByRole('button',{name:'Dismiss preview',exact:true}).click()
  await expect(page.getByPlaceholder('Topic...',{exact:true}).first()).toHaveValue(fixture.rows[0].contents[0]);const editor=page.getByRole('region',{name:'Course Outline editor',exact:true});await editor.evaluate(el=>el.scrollIntoView({block:'start'}));await page.evaluate(()=>window.scrollBy(0,-110));const bounds=(await editor.boundingBox())!;await page.screenshot({path:dir+'/03-editable-weeks.png',animations:'disabled',clip:{x:bounds.x,y:bounds.y,width:bounds.width,height:Math.min(bounds.height,700)}})
 }finally{fixture.release()}
})
