import {test,expect} from '@playwright/test'
import {retainedSourcesUI} from '../retained-sources-fixture'

test('source basis stays bound to the inspected quote when another passage is selected',async({page})=>{
 await retainedSourcesUI(page);await page.goto('/#/courseware?course=retained-course')
 await page.locator('[data-week="1"]').getByRole('button',{name:'Generate',exact:true}).click();await expect(page.locator('[data-content-id]')).toHaveCount(2,{timeout:30000})
 await page.locator('[data-content-id="gen-mat-retained-course-w1"]').getByRole('button',{name:'View',exact:true}).click()
 const select=async(start:number,end:number)=>{
  const selected=await page.locator('.doc-viewer-text').first().evaluate((element,{start,end})=>{const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),node=walker.nextNode()!,range=document.createRange();range.setStart(node,start);range.setEnd(node,Math.min(end,node.textContent!.length));window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);return range.toString()},{start,end})
  await page.locator('.doc-viewer-text').first().dispatchEvent('mouseup');return selected
 }
 const first=await select(0,100);await page.getByRole('button',{name:'Find source for selection',exact:true}).click()
 const popup=page.getByRole('dialog',{name:'Source basis for selected passage',exact:true});await expect(popup.locator('mark')).toBeVisible();await expect(popup.locator('blockquote')).toHaveText(first)
 const second=await select(8,40);expect(second).not.toBe(first);await expect(popup.locator('blockquote')).toHaveText(first)
 await page.getByRole('button',{name:'Find source for selection',exact:true}).click();await expect(popup.locator('blockquote')).toHaveText(second);await expect(popup.locator('mark')).toBeVisible()
 await page.route('**/api/ai?action=chat',async route=>{expect(route.request().postDataJSON().message.endsWith(second)).toBe(true);await route.fulfill({json:{mode:'generated',answer:'Synthetic checked selection context.',sources:[]}})})
 await popup.getByRole('button',{name:'Explain in Pulse',exact:true}).first().click();await expect(page.getByRole('dialog',{name:'Pulse',exact:true})).toContainText('Synthetic checked selection context.')
})
