import {expect,type Page,type TestInfo} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import {componentBuilder} from '../pulse-component-fixture'
const root='../feature-documentation/system-manual/28-outline-selectors'
export async function selectorScene(page:Page,info:TestInfo,dark:boolean){
 await page.route('**/api/ai?action=workspace',route=>route.request().method()==='GET'?route.fulfill({json:{mode:'preview',revision:0}}):route.fallback())
 await mkdir(root,{recursive:true});if(dark)await page.addInitScript(()=>localStorage.setItem('edupulse-dark-mode','true'));await componentBuilder(page)
 const outline=page.getByRole('region',{name:'Course Outline editor',exact:true});await outline.getByRole('combobox',{name:'Outline week',exact:true}).selectOption('1');await outline.getByRole('button',{name:'Expand outline',exact:true}).focus();await page.keyboard.press('Enter')
 await page.getByLabel('Week 1 learning outcomes',{exact:true}).fill('Explain classroom expectations and identify multimedia formats.')
 await page.getByLabel('Week 1 contents',{exact:true}).fill('Class orientation\nLesson 1: Introduction to multimedia\nElements of multimedia and file formats')
 await page.getByLabel('Week 1 activities',{exact:true}).fill('Discussion and guided reading with an annotated classroom example.')
 await page.getByLabel('Week 1 assessment details',{exact:true}).fill('Explain and compare multimedia formats using the reference guide.')
 await page.getByLabel('Week 1 assessment types',{exact:true}).selectOption({label:'Matching type'})
 await outline.getByRole('button',{name:'Add section to week 1',exact:true}).click()
 await page.getByLabel('Week 1 section 2 learning outcomes',{exact:true}).fill('Demonstrate a multimedia file workflow.')
 await page.getByLabel('Week 1 section 2 contents',{exact:true}).fill('Lesson 2: Creating a multimedia file')
 await page.getByLabel('Week 1 section 2 activities',{exact:true}).fill('Follow a worked example and document each step.')
 await page.getByLabel('Week 1 section 2 assessment types',{exact:true}).selectOption({label:'Follow-along / Step-by-step documentation guide or criteria'})
 const share=outline.locator('.outline-section-controls').first();await share.getByText('Share section across weeks',{exact:true}).click();await share.getByLabel('Week 1 section 1 last shared week',{exact:true}).fill('2');await share.getByRole('button',{name:'Apply week range',exact:true}).click()
 await expect(outline.getByText('Shared: weeks 1, 2',{exact:true})).toBeVisible()
 await outline.locator('.outline-table-scroll').evaluate(element=>{element.scrollLeft=0;element.scrollTop=0})
 await page.mouse.move(0,0)
 await outline.screenshot({path:`${root}/${info.project.name}-${dark?'dark':'light'}-outline.png`,animations:'disabled',style:'.app-topbar{position:static !important}.connected-pulse-dock{visibility:hidden !important}'})
}
