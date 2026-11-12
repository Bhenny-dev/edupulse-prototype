import {test,expect,type Page} from '@playwright/test'
import {monitoringUI,monitoringStore} from '../monitoring-fixture'

const open=async(page:Page)=>{await page.goto('/#/student-monitoring');await page.getByRole('button',{name:'Open IT 102 · BSIT-1A',exact:true}).click();return page.getByRole('dialog',{name:'IT 102 · BSIT-1A monitoring',exact:true})}
test('monitoring combines year/course/block discovery and scoped scores with a restored student breakdown',async({page})=>{
 await monitoringUI(page);await page.goto('/#/student-monitoring')
 await expect(page.getByRole('navigation').getByRole('link',{name:'Performance',exact:true})).toHaveCount(0)
 await expect(page.getByRole('region',{name:'Year 1',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Year 2',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Open IT 102 · BSIT-1A',exact:true}).click();const dialog=page.getByRole('dialog',{name:'IT 102 · BSIT-1A monitoring',exact:true})
 await expect(dialog.getByRole('region',{name:'Enrolled students table',exact:true})).toContainText('Synthetic second learner');await expect(dialog).not.toContainText('Different block learner')
 await dialog.getByRole('button',{name:'Assessment Scores',exact:true}).click();await expect(dialog.getByRole('heading',{name:'Assessment score radar',exact:true})).toBeVisible()
 await expect(dialog.getByRole('region',{name:'Block assessment scores',exact:true})).not.toContainText('Not enrolled')
 await dialog.getByRole('button',{name:'Synthetic learner',exact:true}).click();const detail=page.getByRole('dialog',{name:'Student assessment breakdown',exact:true});await expect(detail).toContainText('Final average raw score: 67%')
 await page.reload();await expect(detail).toBeVisible();await expect(detail).toContainText('Arrays quiz');await detail.getByRole('button',{name:'Close student breakdown'}).click()
 await page.goto('/#/performance');await expect(page).toHaveURL(/student-monitoring/)
})
test('material charts and student popover use only this block and real section confirmations',async({page})=>{
 await monitoringUI(page);const dialog=await open(page);await dialog.getByRole('button',{name:'Learning Material Access',exact:true}).click()
 await expect.poll(()=>dialog.locator('.monitoring-modal-body').evaluate((element:any)=>element.scrollTop)).toBe(0)
 const row=dialog.getByRole('region',{name:'Block learning material progress',exact:true}).locator('tbody tr').first();await expect(row.locator('td').nth(2)).toContainText('1/3');await expect(row.getByRole('progressbar')).toHaveAttribute('value','3');await expect(row.getByRole('progressbar')).toHaveAttribute('max','6')
 for(const title of ['Learning material access radar','Material access history','Class access per material','Reading completion per material','Student reading progress'])await expect(dialog.getByRole('heading',{name:title,exact:true})).toBeVisible()
 await dialog.getByRole('button',{name:'Synthetic learner',exact:true}).click();const detail=page.getByRole('dialog',{name:'Student material progress',exact:true});await expect(detail).toContainText('Final reading average: 50%');await expect(detail.getByRole('progressbar')).toHaveCount(3)
 await page.reload();await expect(detail).toContainText('50%');await detail.getByRole('button',{name:'Close student breakdown'}).click();await expect(dialog).not.toContainText('Different block learner')
})
test('roster edits persist, failed saves stay visible, and removal requires prior suspension',async({page})=>{
 const {store}=await monitoringUI(page);const dialog=await open(page)
 await expect(dialog.getByRole('button',{name:'Remove Synthetic learner',exact:true})).toBeDisabled()
 await dialog.getByRole('button',{name:'Edit Synthetic learner',exact:true}).click();const edit=page.getByRole('dialog',{name:'Edit student membership',exact:true});await edit.getByLabel('Roster name',{exact:true}).fill('Edited learner');store.failSave=true;await edit.getByRole('button',{name:'Save roster changes',exact:true}).click();await expect(edit.getByRole('alert')).toContainText('not confirmed');await expect(edit.getByLabel('Roster name',{exact:true})).toHaveValue('Edited learner')
 await edit.getByRole('button',{name:'Save roster changes',exact:true}).click();await expect(edit).toHaveCount(0);await page.reload()
 await dialog.getByRole('button',{name:'Suspend Edited learner',exact:true}).click();const suspend=page.getByRole('dialog',{name:'Suspend student membership',exact:true});const writes=store.commands.filter(c=>c.operation==='workspace').length;await page.reload();await expect(suspend).toBeVisible();expect(store.commands.filter(c=>c.operation==='workspace')).toHaveLength(writes)
 await suspend.getByRole('button',{name:'Confirm suspension',exact:true}).click();await expect(suspend).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Remove Edited learner',exact:true})).toBeEnabled();await dialog.getByRole('button',{name:'Remove Edited learner',exact:true}).click();await page.getByRole('button',{name:'Confirm removal',exact:true}).click();await expect(dialog.getByRole('region',{name:'Enrolled students table',exact:true})).not.toContainText('Edited learner')
 expect(store.records.attempts).toHaveLength(5)
})
test('students explicitly confirm reading in sequence, and reload never replays opens or progress',async({page})=>{
 const store=monitoringStore();store.records.reading=[];await monitoringUI(page,'student',store);await page.goto('/#/courseware');await page.getByRole('button',{name:/^Open course /}).first().click();await page.getByRole('button',{name:'Open material',exact:true}).first().click()
 await expect(page.getByRole('button',{name:'Confirm section 2 read',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Confirm section 1 read',exact:true}).click();await expect(page.getByRole('region',{name:'Your reading progress',exact:true})).toContainText('1/2')
 const count=store.commands.length;await page.reload();await expect(page.getByRole('region',{name:'Your reading progress',exact:true})).toContainText('1/2');expect(store.commands.filter(c=>['open','read-section'].includes(c.operation))).toHaveLength(2)
 await page.getByRole('button',{name:'Confirm section 2 read',exact:true}).click();await expect(page.getByRole('region',{name:'Your reading progress',exact:true})).toContainText('2/2');expect(store.commands.length).toBeGreaterThan(count)
})
test('course modal fits desktop and narrow phones with keyboard exit and scoped reload',async({page})=>{
 await monitoringUI(page);const dialog=await open(page);await dialog.getByRole('button',{name:'Learning Material Access',exact:true}).click()
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(dialog).toBeVisible();expect(await dialog.locator('.monitoring-modal-body .card-header').evaluateAll(headers=>headers.every(header=>{const title=header.querySelector('h2'),button=header.querySelector('button');if(!title||!button)return true;const a=title.getBoundingClientRect(),b=button.getBoundingClientRect();return a.right<=b.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1}))).toBe(true)}
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Open IT 102 · BSIT-1A',exact:true})).toBeFocused()
})

test('course filters and new roster registration stay within the selected course/block',async({page})=>{
 await monitoringUI(page);await page.goto('/#/student-monitoring');await page.getByRole('combobox',{name:'Year level',exact:true}).selectOption('2');await expect(page.getByRole('button',{name:'Open IT 202 · BSIT-2A',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Open IT 102 · BSIT-1A',exact:true})).toHaveCount(0)
 await page.getByRole('combobox',{name:'Year level',exact:true}).selectOption('');await page.getByRole('searchbox',{name:'Search handled classes',exact:true}).fill('BSIT-1A');await expect(page.getByRole('button',{name:'Open IT 102 · BSIT-1B',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Open IT 102 · BSIT-1A',exact:true}).click();const dialog=page.getByRole('dialog',{name:'IT 102 · BSIT-1A monitoring',exact:true});await dialog.getByText('Add students to this block',{exact:true}).click();await dialog.getByRole('button',{name:'Choose students',exact:true}).click();await dialog.getByRole('checkbox',{name:'Select New enrolled learner',exact:true}).check();await expect(dialog.getByLabel('Course for selected students',{exact:true})).toBeDisabled();await expect(dialog.getByRole('textbox',{name:'Block section',exact:true})).not.toBeEditable();await dialog.getByRole('button',{name:'Register selected students (1)',exact:true}).click();await expect(dialog.getByRole('region',{name:'Enrolled students table',exact:true})).toContainText('New enrolled learner');await page.reload();await expect(dialog.getByRole('region',{name:'Enrolled students table',exact:true})).toContainText('New enrolled learner')
})
