import {expect,type Page,type TestInfo} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import {componentBuilder} from '../pulse-component-fixture'
const root='../feature-documentation/system-manual/28-outline-selectors'
export async function selectorScene(page:Page,info:TestInfo,dark:boolean){
 await page.route('**/api/ai?action=workspace',route=>route.request().method()==='GET'?route.fulfill({json:{mode:'preview',revision:0}}):route.fallback())
 await mkdir(root,{recursive:true});if(dark)await page.addInitScript(()=>localStorage.setItem('edupulse-dark-mode','true'));await componentBuilder(page)
 const outline=page.getByRole('region',{name:'Course Outline editor',exact:true});await outline.getByRole('combobox',{name:'Outline week',exact:true}).selectOption('1');await outline.getByRole('button',{name:'Expand outline',exact:true}).click()
 await page.getByRole('button',{name:'Week 1 teaching materials',exact:true}).click();const panel=page.getByRole('dialog',{name:'Week 1 teaching materials',exact:true});await panel.getByRole('searchbox').fill('reflection');await panel.getByRole('checkbox').first().check();await expect(panel.getByRole('checkbox').first()).toBeChecked();await page.mouse.move(2,400)
 await page.screenshot({path:`${root}/${info.project.name}-${dark?'dark':'light'}-materials.png`,animations:'disabled'})
 await panel.getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('button',{name:'Week 1 assessment types',exact:true}).click();const assessment=page.getByRole('dialog',{name:'Week 1 assessment types',exact:true});await assessment.getByRole('searchbox').fill('quiz');await expect(assessment.getByRole('checkbox').first()).toBeVisible();await page.mouse.move(2,400);await page.screenshot({path:`${root}/${info.project.name}-${dark?'dark':'light'}-assessments.png`,animations:'disabled'})
}
