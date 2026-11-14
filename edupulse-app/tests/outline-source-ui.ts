import {expect,type Page} from '@playwright/test'
import {retainedSourcesUI,sourceRefs} from './retained-sources-fixture'

export async function sectionReferenceScene(page:Page,capture:((name:string)=>Promise<void>)=async()=>{}) {
 const fixture=await retainedSourcesUI(page)
 const first={id:'shared-network-scope',ilos:'Identify network components and explain their roles.',contents:['Network components'],activities:'Guided discussion',assessments:'Explain the device roles.',assessmentTypes:['Multiple choice'],resources:[{name:sourceRefs[0]!.title,url:sourceRefs[0]!.url}]}
 const second={...first,id:'second-network-scope',assessmentTypes:['Essay'],resources:[{name:sourceRefs[2]!.title,url:sourceRefs[2]!.url}]}
 const syllabus={...fixture.syllabus,onlineReferences:[],courseOutline:[{week:1,resources:[{name:'Removed weekly reference',url:'https://removed.example.org/obsolete'}],sections:[first,second]},{week:2,sections:[first]}]}
 fixture.setWorkspace({...fixture.getWorkspace(),syllabi:[syllabus]})
 await page.goto('/#/courseware?course=retained-course&week=1')
 const panel=page.locator('.syllabus-sources');await panel.locator('summary').click()
 await expect(panel.locator('li')).toHaveCount(3)
 await expect(panel).toContainText(sourceRefs[0]!.title);await expect(panel).toContainText(sourceRefs[2]!.title)
 await expect(panel).not.toContainText('Removed weekly reference')
 await capture('section-reference-links')
 await panel.getByRole('button',{name:'Search and read sources',exact:true}).click()
 await expect(panel).toContainText('Source search or reading unavailable')
 await expect(panel.getByRole('button',{name:'Search and read sources',exact:true})).toBeEnabled()
 expect(fixture.snapshots).toHaveLength(1)
 await capture('section-reference-prepared')
 await page.locator('[data-week="1"]').getByRole('button',{name:'Generate',exact:true}).click()
 await expect(page.locator('[data-content-id]')).toHaveCount(4,{timeout:30000})
 expect(fixture.generation.length).toBeGreaterThan(0)
 for(const input of fixture.generation){expect(input.syllabusReferences.map((ref:any)=>ref.url)).toEqual(['',sourceRefs[0]!.url,sourceRefs[2]!.url]);expect(JSON.stringify(input)).not.toContain('removed.example.org')}
 const calls=fixture.generation.length;await page.reload()
 await expect(panel.locator('li')).toHaveCount(3);await expect(panel).toContainText('Retained')
 expect(fixture.generation).toHaveLength(calls)
}
export async function sourceSelectionScene(page:Page,capture:((name:string)=>Promise<void>)=async()=>{}) {
 const fixture=await retainedSourcesUI(page)
 await page.route('**/api/ai?action=chat',async route=>{
  const input=route.request().postDataJSON();expect(input.task).toBe('summarize');expect(input.attachments[0].text).toContain('Network components')
  await route.fulfill({json:{requestId:'synthetic-source-explanation',mode:'generated',answer:'Synthetic explanation: the selected teaching text uses the retained guide’s distinction between hosts, switches and routers. This sample demonstrates source context in Pulse.',sources:[]}})
 })
 await page.goto('/#/courseware?course=retained-course')
 await page.locator('[data-week="1"]').getByRole('button',{name:'Generate',exact:true}).click()
 await expect(page.locator('[data-content-id]')).toHaveCount(2,{timeout:30000})
 await page.locator('[data-content-id="gen-mat-retained-course-w1"]').getByRole('button',{name:'View',exact:true}).click()
 await page.locator('.doc-viewer-text').first().evaluate(element=>{
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),node=walker.nextNode()!;const range=document.createRange();range.setStart(node,0);range.setEnd(node,Math.min(120,node.textContent!.length));window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range)
 })
 await page.locator('.doc-viewer-text').first().dispatchEvent('mouseup')
 await page.getByRole('button',{name:'Find source for selection',exact:true}).click()
 const popup=page.getByRole('dialog',{name:'Source basis for selected passage',exact:true})
 await expect(popup.locator('mark').first()).toContainText('Network components')
 await capture('source-popover')
 const calls=fixture.generation.length
 await page.reload();await expect(popup.locator('mark').first()).toBeVisible();expect(fixture.generation.length).toBe(calls)
 await popup.getByRole('button',{name:'Explain in Pulse',exact:true}).first().click()
 await expect(page.getByRole('dialog',{name:'Pulse',exact:true})).toContainText('Synthetic explanation:')
 await capture('source-in-pulse')
 return fixture
}


export async function teachingAttachmentScene(page:Page,capture:()=>Promise<void>=async()=>{}) {
 const fixture=await retainedSourcesUI(page);await page.goto('/#/courseware?course=retained-course')
 await page.getByLabel('Teaching file for week 1',{exact:true}).setInputFiles({name:'classroom-guide.txt',mimeType:'text/plain',buffer:Buffer.from('Network components include hosts, switches and routers. Label the classroom network and explain how a switch forwards local frames while a router connects different networks. Check the device roles against the diagram.')})
 const item=page.locator('[data-content-id]').filter({hasText:'classroom-guide.txt'});await expect(item).toBeVisible();expect(fixture.generation).toHaveLength(0)
 await expect(page.getByText('Teaching file saved as a draft and retained as a reference.',{exact:true})).toHaveCount(0,{timeout:10000})
 await item.scrollIntoViewIfNeeded();await capture()
 await item.getByRole('button',{name:'View',exact:true}).click();await expect(page.locator('.doc-viewer-body')).toContainText('a switch forwards local frames')
 await page.reload();await expect(page.locator('.doc-viewer-body')).toContainText('a switch forwards local frames');expect(fixture.generation).toHaveLength(0)
}

export async function assessmentFormatsScene(page:Page,capture:()=>Promise<void>=async()=>{}) {
 const fixture=await retainedSourcesUI(page),id='sample-seven-format-assessment'
 const questions=['List the three network components in the diagram.','Match each component with its forwarding role.','Document the steps for labelling the classroom network.'].map((text,index)=>({id:'q'+index,text,type:'short_answer',responseFormat:['enumeration','matching','follow_along'][index],options:[],topic:'Network components',explanation:'Instructor checks the response against the classroom diagram and source notes.'}))
 fixture.setWorkspace({...fixture.getWorkspace(),content:{[id]:{id,syllabusId:fixture.syllabus.id,week:1,type:'assessment',status:'draft',title:'Network components assessment',content:{title:'Network components assessment',questions}}}})
 await page.goto('/#/courseware?course=retained-course&week=1')
 await page.locator(`[data-content-id="${id}"]`).getByRole('button',{name:'View',exact:true}).click()
 const selector=page.getByRole('combobox',{name:'Question 1 response type',exact:true})
 await expect(selector.locator('option')).toHaveText(['Multiple choice','True or false','Enumeration','Identification','Essay','Matching type','Follow-along / Step-by-step documentation guide or criteria'])
 await selector.selectOption('essay');await selector.scrollIntoViewIfNeeded();await capture()
 await page.getByRole('button',{name:'Save Assessment',exact:true}).click()
 await expect(page.locator(`[data-content-id="${id}"]`)).toBeVisible()
 await page.reload();await page.locator(`[data-content-id="${id}"]`).getByRole('button',{name:'View',exact:true}).click()
 await expect(selector).toHaveValue('essay');expect(fixture.generation).toHaveLength(0)
}
