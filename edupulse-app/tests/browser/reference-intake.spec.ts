import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {extractText} from 'unpdf'
import {referenceIntakeUI,referenceHtml,referenceUrl} from '../reference-intake-fixture'

test('link and dropped reference file extract citation details, preserve failed-index copies and save only on request',async({page},testInfo)=>{
 test.setTimeout(60000) // Includes a real PDF/font load and subsequent debounced workspace save.
 const fixture=await referenceIntakeUI(page,true)
 await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=builder');await page.getByRole('combobox',{name:'Course',exact:true}).selectOption('IT 202')
 const section=page.getByRole('region',{name:'Reference links and files',exact:true})
 await expect(section.getByPlaceholder('Authors',{exact:true})).toHaveCount(0)
 await section.getByRole('textbox',{name:'Source link',exact:true}).fill(referenceUrl);await section.getByRole('button',{name:'Add link',exact:true}).click()
 await expect(section).toContainText('Classroom Network Guide');await expect(section).toContainText('Sample Teaching Team');await expect(section).toContainText('2025');await expect(section).toContainText('Sample Teaching Press');await expect(section).toContainText('Reference retained. Knowledge indexing did not finish')
 await section.getByRole('button',{name:'Reference actions for Classroom Network Guide',exact:true}).click();await page.getByRole('menuitem',{name:'Index for search',exact:true}).click();await expect(section).toContainText('Indexed for private search')
 const data=await page.evaluateHandle(html=>{const transfer=new DataTransfer();transfer.items.add(new File([html.replace('Classroom Network Guide','Uploaded Network Notes')],'notes.html',{type:'text/html'}));return transfer},referenceHtml)
 await section.locator('.reference-file-drop').dispatchEvent('drop',{dataTransfer:data});await expect(section).toContainText('Uploaded Network Notes');await expect(section.getByText('Indexed for private search',{exact:true})).toHaveCount(2)
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF draft',exact:true}).click();const file=await download;await file.saveAs(`.data/reference-intake-${testInfo.project.name}.pdf`);const text=await extractText(new Uint8Array(await readFile((await file.path())!)),{mergePages:true});expect(text.text).toContain('Sample Teaching Team');expect(text.text).toContain('Sample Teaching Press');expect(text.text).toContain('Uploaded Network Notes')
 expect(fixture.writes).toHaveLength(0);expect(fixture.requests.filter(request=>request.operation==='index').every(request=>request.course==='IT 202')).toBe(true)
 await page.getByPlaceholder('Program outcome 1',{exact:true}).fill('Explain network forwarding using a labelled topology.');await page.getByRole('button',{name:'Save as Drafted',exact:true}).click()
 await expect.poll(()=>fixture.writes.length).toBe(1);const saved=fixture.writes[0].data.syllabi.find((row:any)=>row.courseCode==='IT 202')
 expect(saved.books[0].title).toBe('Uploaded Network Notes');expect(saved.onlineReferences[0].authors).toBe('Sample Teaching Team');expect(JSON.stringify(saved.books)).not.toContain('base64')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
