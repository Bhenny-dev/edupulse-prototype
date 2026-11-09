import {expect,type Page} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import {retainedSourcesUI,sourceRefs,sourceLesson} from '../retained-sources-fixture'
import {makePdf} from '../fixtures'
const root='../feature-documentation/system-manual/31-retained-syllabus-sources'
async function shot(page:Page,name:string){await mkdir(root,{recursive:true});for(const toast of await page.locator('.toast').all())await toast.click().catch(()=>{});await page.mouse.move(2,400);await page.evaluate(async()=>{await document.fonts.ready});await page.screenshot({path:`${root}/${name}.png`,animations:'disabled',style:'.app-topbar{position:static !important}'})}
export async function sourceScene(page:Page,mobile=false,dark=false){
 if(dark)await page.addInitScript(()=>localStorage.setItem('edupulse-dark-mode','true'))
 const fixture=await retainedSourcesUI(page);await page.goto('/#/courseware?course=retained-course');const panel=page.locator('.syllabus-sources');await panel.locator('summary').click();await expect(panel).toContainText('Book metadata only')
 const prefix=mobile?'mobile-':dark?'dark-':''
 await shot(page,`${prefix}01-syllabus-sources`)
 const release=fixture.holdRead();try{await panel.getByRole('button',{name:'Read linked sources',exact:true}).click();await expect(panel.getByRole('status')).toContainText('Reading and retaining sources');if(!mobile&&!dark)await shot(page,'02-reading-sources')}finally{release()}
 await expect(panel).toContainText('1 retained');await expect(panel).toContainText('Could not read linked source');if(mobile)await panel.locator('li').nth(1).scrollIntoViewIfNeeded();await shot(page,`${prefix}03-retained-and-unread`)
 if(mobile||dark)return
 await page.locator('[data-week="1"]').getByRole('button',{name:'Generate',exact:true}).click();await expect(page.locator('[data-content-id]')).toHaveCount(2)
 await page.locator('[data-content-id="gen-mat-retained-course-w1"]').getByRole('button',{name:'View',exact:true}).click();await expect(page.locator('.doc-viewer-text').first()).toContainText('[1]');await shot(page,'04-passage-citations')
 await page.locator('.ai-draft-evidence').scrollIntoViewIfNeeded();await page.getByText(/Generation details and references/).click();await shot(page,'05-reference-provenance')
 await page.getByRole('button',{name:'Review retained source',exact:true}).click();await expect(page.getByRole('dialog',{name:'Retained source review'}).locator('pre')).toContainText('Network components include hosts');await shot(page,'06-retained-source-review');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Back',exact:true}).click();await expect(panel).toHaveJSProperty('open',true)
 await panel.getByRole('button',{name:`Source actions for ${sourceRefs[1]!.title}`,exact:true}).click();await shot(page,'07-book-source-actions');await page.getByRole('menuitem',{name:'Attach readable copy',exact:true}).click()
 const pdf=Buffer.from(makePdf([['Sample Networks Book',...sourceLesson.match(/.{1,88}(?:\s|$)/g)||[sourceLesson]],['Chapter 2: Classroom diagrams','Review the host, switch, router and link labels before revising a network diagram.']]))
 await panel.getByLabel('Attach readable reference copy',{exact:true}).setInputFiles({name:'sample-book.pdf',mimeType:'application/pdf',buffer:pdf});await expect(panel).toContainText('2 retained');await panel.locator('li').filter({has:page.getByText(sourceRefs[1]!.title,{exact:true})}).getByRole('button',{name:'View',exact:true}).click();await expect(page.getByRole('dialog',{name:'Retained source review'})).toContainText('2 pages');await shot(page,'08-retained-book-copy');await page.keyboard.press('Escape')
 fixture.advanceEdition();await panel.getByRole('button',{name:`Source actions for ${sourceRefs[0]!.title}`,exact:true}).click();await page.getByRole('menuitem',{name:'Read a new version',exact:true}).click();await expect(panel).toContainText('2 saved versions');await shot(page,'09-source-versions')
 await panel.getByRole('button',{name:`Source actions for ${sourceRefs[0]!.title}`,exact:true}).click();await shot(page,'10-retained-source-actions');await page.getByRole('menuitem',{name:'Remove retained version',exact:true}).click();await expect(page.getByRole('dialog',{name:'Remove retained source version'})).toBeVisible();await shot(page,'11-remove-confirmation');await page.getByRole('button',{name:'Cancel',exact:true}).click()
}
