import {expect,type Page} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import {referenceIntakeUI,referenceUrl} from '../reference-intake-fixture'
const dir='../feature-documentation/system-manual/35-reference-intake'
export async function referenceIntakeScene(page:Page,mobile=false,dark=false){
 if(dark)await page.addInitScript(()=>localStorage.setItem('edupulse-dark-mode','true'))
 const fixture=await referenceIntakeUI(page,true);await mkdir(dir,{recursive:true})
 await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=builder');await page.getByRole('combobox',{name:'Course',exact:true}).selectOption('IT 202')
 const section=page.locator('[data-section="7"]'),intake=page.getByRole('region',{name:'Reference links and files',exact:true}),prefix=mobile?'mobile-':dark?'dark-':''
 const shot=async(name:string)=>{await section.scrollIntoViewIfNeeded();await page.mouse.move(2,300);await section.screenshot({path:`${dir}/${prefix}${name}.png`,animations:'disabled',style:'.app-topbar{position:static !important}'})}
 if(!mobile&&!dark)await shot('01-link-or-file')
 await intake.getByRole('textbox',{name:'Source link',exact:true}).fill(referenceUrl+'/hold');await intake.getByRole('button',{name:'Add link',exact:true}).click()
 try{await expect(intake).toContainText('Reading reference and extracting citation details');if(!mobile&&!dark)await shot('02-reading-reference')}finally{fixture.release()}
 await expect(intake).toContainText('Reference retained. Knowledge indexing did not finish')
 if(!mobile&&!dark)await shot('03-indexing-retry')
 await intake.getByRole('button',{name:'Reference actions for Classroom Network Guide',exact:true}).click();await page.getByRole('menuitem',{name:'Index for search',exact:true}).click();await expect(intake).toContainText('Indexed for private search')
 await intake.getByText('Citation details',{exact:true}).click();await shot('04-extracted-citation')
 if(mobile||dark)return
 await intake.getByRole('button',{name:'View',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Retained source review',exact:true});await expect(dialog).toContainText('Trace a packet');await dialog.screenshot({path:dir+'/05-retained-reading.png',animations:'disabled'});await dialog.getByRole('button',{name:'Close retained source',exact:true}).click()
 await intake.getByLabel('Reference file',{exact:true}).setInputFiles({name:'network-notes.md',mimeType:'text/markdown',buffer:Buffer.from('# Network practice notes\n\nA switch forwards frames within a local network. A router forwards packets between networks. Compare the local and remote destination paths in a labelled classroom diagram. The source supplies no author or publication year.')})
 await expect(intake.getByText('Indexed for private search',{exact:true})).toHaveCount(2);const fileRow=intake.getByRole('listitem').filter({hasText:'Network practice notes'});await fileRow.getByText('Citation details',{exact:true}).click();await expect(fileRow).toContainText('Not supplied by source: author, publication year, publisher.');await shot('06-missing-metadata')
}
