import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {retainedSourcesUI,sourceRefs,sourceLesson} from '../retained-sources-fixture'
import {makePdf} from '../fixtures'
test('linked sources are read before generation, cached, cited and reviewable without treating an unread book as evidence',async({page})=>{
 const fixture=await retainedSourcesUI(page);await page.goto('/#/courseware?course=retained-course')
 const panel=page.locator('.syllabus-sources');await panel.locator('summary').click();await expect(panel).toContainText('Book metadata only')
 await page.locator('[data-week="1"]').getByRole('button',{name:'Generate',exact:true}).click()
 await expect(page.locator('[data-content-id]')).toHaveCount(2,{timeout:30000});expect(fixture.reads).toContain(sourceRefs[0]!.title);expect(fixture.generation[0].syllabusReferences).toHaveLength(3)
 await expect(panel).toContainText('1 retained');await expect(panel).toContainText('Could not read linked source')
 await page.locator('[data-content-id="gen-mat-retained-course-w1"]').getByRole('button',{name:'View',exact:true}).click();await expect(page.locator('.doc-viewer-text').first()).toContainText('[1]')
 const refs=page.locator('.doc-viewer-section').filter({hasText:'References'});await expect(page.getByText(/retained 2026-11-09, SHA-256/).first()).toBeVisible();await expect(page.getByText(/Listed in the syllabus; readable text was not used/).first()).toBeVisible()
 await page.getByText(/Generation details and references/).click();await page.getByRole('button',{name:'Review retained source',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Retained source review',exact:true});await expect(dialog.locator('pre')).toContainText('Network components include hosts')
 const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download retained copy',exact:true}).click();const file=await download;expect((await readFile((await file.path())!)).toString()).toContain('<h1>Network components</h1>')
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0)
 await page.getByRole('button',{name:'Back',exact:true}).click();await page.reload();await panel.locator('summary').click();await expect(panel).toContainText('1 retained');expect(fixture.snapshots).toHaveLength(1);void refs
})
test('manual source reading works without a model, reports progress, retains book copies and preserves immutable refresh versions',async({page})=>{
 const fixture=await retainedSourcesUI(page,false);await page.goto('/#/courseware?course=retained-course');const panel=page.locator('.syllabus-sources');await panel.locator('summary').click()
 const release=fixture.holdRead();try{await panel.getByRole('button',{name:'Read linked sources',exact:true}).click();await expect(panel.getByRole('status')).toContainText('Reading and retaining sources')}finally{release()}
 await expect(panel).toContainText('1 retained');expect(fixture.generation).toHaveLength(0)
 const reads=fixture.reads.filter(title=>title===sourceRefs[0]!.title).length;await panel.getByRole('button',{name:'Read linked sources',exact:true}).click();await expect(panel.getByRole('button',{name:'Read linked sources',exact:true})).toBeEnabled();expect(fixture.reads.filter(title=>title===sourceRefs[0]!.title)).toHaveLength(reads)
 await panel.getByRole('button',{name:`Source actions for ${sourceRefs[1]!.title}`,exact:true}).click();await page.getByRole('menuitem',{name:'Attach readable copy',exact:true}).click()
 const pdf=Buffer.from(makePdf([['Sample Networks Book',...sourceLesson.match(/.{1,88}(?:\s|$)/g)||[sourceLesson]]]))
 await panel.getByLabel('Attach readable reference copy',{exact:true}).setInputFiles({name:'sample-book.pdf',mimeType:'application/pdf',buffer:pdf});await expect(panel).toContainText('2 retained')
 fixture.advanceEdition();await panel.getByRole('button',{name:`Source actions for ${sourceRefs[0]!.title}`,exact:true}).click();await page.getByRole('menuitem',{name:'Read a new version',exact:true}).click();await expect(panel).toContainText('2 saved versions');expect(fixture.snapshots).toHaveLength(3)
 await panel.getByRole('button',{name:`Source actions for ${sourceRefs[0]!.title}`,exact:true}).click();await page.getByRole('menuitem',{name:'Remove retained version',exact:true}).click();await page.getByRole('dialog',{name:'Remove retained source version'}).getByRole('button',{name:'Remove retained version',exact:true}).click();await expect(panel).not.toContainText('2 saved versions');expect(fixture.snapshots).toHaveLength(2)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
