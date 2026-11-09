import {test,expect} from '@playwright/test'
import {componentBuilder} from '../pulse-component-fixture'

test('categorized outline selectors stay above the table, search, preserve fields and close accessibly',async({page})=>{
 await componentBuilder(page)
 const outline=page.getByRole('region',{name:'Course Outline editor',exact:true})
 await outline.getByRole('combobox',{name:'Outline week',exact:true}).selectOption('1')
 const activities=page.getByLabel('Week 1 activities',{exact:true});await activities.fill('Keep my discussion instructions')
 const trigger=page.getByRole('button',{name:'Week 1 teaching materials',exact:true});await trigger.click()
 const panel=page.getByRole('dialog',{name:'Week 1 teaching materials',exact:true}),search=panel.getByRole('searchbox')
 await expect(search).toBeFocused();await search.fill('reflection')
 const choices=panel.getByRole('checkbox');expect(await choices.count()).toBeGreaterThan(0);const option=await choices.first().getAttribute('aria-label')||await choices.first().locator('..').innerText();await choices.first().check()
 await expect(trigger).toHaveText('1 selected');await expect(activities).toHaveValue('Keep my discussion instructions')
 const box=(await panel.boundingBox())!,viewport=page.viewportSize()!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height)
 expect(await panel.evaluate(el=>!el.closest('.outline-table-scroll')&&getComputedStyle(el.querySelector('.outline-options-list')!).overflowY==='auto')).toBe(true)
 await search.fill('');const labels=await panel.locator('label').evaluateAll(rows=>rows.map(row=>({top:row.getBoundingClientRect().top,bottom:row.getBoundingClientRect().bottom,height:row.getBoundingClientRect().height})));expect(labels.every((row,index)=>row.height>=44&&(!index||row.top>=labels[index-1].bottom))).toBe(true)
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(trigger).toBeFocused()
 await trigger.press('ArrowDown');await expect(panel.getByRole('checkbox',{name:option.trim(),exact:true})).toBeChecked();await panel.getByRole('button',{name:'Done',exact:true}).click()
 await outline.getByRole('button',{name:'Expand outline',exact:true}).click();await trigger.click();await page.keyboard.press('Escape');await expect(outline).toHaveClass(/is-expanded/)
 const assessment=page.getByRole('button',{name:'Week 1 assessment types',exact:true});await assessment.click();const assessmentPanel=page.getByRole('dialog',{name:'Week 1 assessment types',exact:true});await assessmentPanel.getByRole('searchbox').fill('quiz');await expect(assessmentPanel.getByRole('checkbox').first()).toBeVisible();await assessmentPanel.getByRole('checkbox').first().check();await assessmentPanel.getByRole('button',{name:'Clear selections',exact:true}).click();await expect(assessment).toContainText('Assessment type');await assessmentPanel.getByRole('button',{name:'Done',exact:true}).click()
 await expect(page.getByRole('button',{name:new RegExp(`^Remove ${option.trim()}`)})).toBeVisible();await page.getByRole('button',{name:new RegExp(`^Remove ${option.trim()}`)}).click();await expect(trigger).toContainText('Teaching materials')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
test('dark selector search and dismissal leave the expanded outline available',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('edupulse-dark-mode','true'));await componentBuilder(page)
 const outline=page.getByRole('region',{name:'Course Outline editor',exact:true});await outline.getByRole('combobox',{name:'Outline week',exact:true}).selectOption('1');await outline.getByRole('button',{name:'Expand outline',exact:true}).click()
 await page.getByRole('button',{name:'Week 1 teaching materials',exact:true}).click();const panel=page.getByRole('dialog',{name:'Week 1 teaching materials',exact:true});await panel.getByRole('searchbox').fill('no-such-choice');await expect(panel.getByText('No matching options.',{exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(outline).toHaveClass(/is-expanded/)
})
