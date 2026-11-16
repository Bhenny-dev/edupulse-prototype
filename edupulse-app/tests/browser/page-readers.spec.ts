import {test,expect,type Locator,type Page} from '../snapshots/fixtures'
import {instructorCourseUI} from '../instructor-course-fixture'
import {studentLearningUI} from '../student-learning-ui'
import {deanManagementUI} from '../dean-management-fixture'

const path='11111111-1111-4111-8111-111111111111/22222222-1111-4111-8111-111111111111/guide.zip'
const attachment={name:'guide.zip',path,size:16,mime:'application/zip'}
async function files(page:Page){
 let uploads=0
 await page.route('**/api/ai?action=teaching-files',async route=>{
  const body=route.request().postDataJSON()
  if(body.operation==='upload'){uploads++;return route.fulfill({json:{bucket:'edupulse-teaching-files',path,token:'synthetic-upload'}})}
  return route.fulfill({json:{url:'https://files.example.invalid/guide.zip?download=guide.zip'}})
 })
 await page.route('**/storage/v1/object/upload/sign/**',route=>route.fulfill({json:{Key:path}}))
 await page.route('https://files.example.invalid/**',route=>route.fulfill({body:'Attachment bytes',headers:{'content-disposition':'attachment; filename="guide.zip"','content-type':'application/octet-stream','access-control-allow-origin':'*'}}))
 return ()=>uploads
}
async function fits(page:Page,dialog:Locator){
 await expect(dialog).toHaveClass(/page-modal/)
 const box=(await dialog.boundingBox())!,viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}))
 expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0)
 expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+1)
 expect(box.height).toBeGreaterThan(viewport.height*.85)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
}
async function openLesson(page:Page,id:string){
 await page.goto(`/#/courseware?course=${id}`)
 const topic=page.locator('[data-topic="variables"]')
 await topic.locator('summary').click()
 await topic.locator('.instructor-sequence-item').filter({has:page.getByText('Variables lesson',{exact:true})}).getByRole('button',{name:'Open',exact:true}).click()
 return page.getByRole('dialog',{name:'Variables lesson',exact:true})
}

test('Instructor page reader keeps its header visible and explicitly attaches any file to a checked draft',async({page},info)=>{
 const fixture=await instructorCourseUI(page),workspace=fixture.getWorkspace() as any,uploads=await files(page)
 workspace.content.lesson.status='checked'
 workspace.content.lesson.content.sections=Array.from({length:12},(_,i)=>({heading:`Section ${i+1}`,body:'Use a meaningful variable name. '.repeat(35)}))
 fixture.setWorkspace(workspace)
 const dialog=await openLesson(page,fixture.syllabus.id)
 await fits(page,dialog)
 const top=(await dialog.locator('.page-modal-header').boundingBox())!.y
 await dialog.locator('.page-modal-body').evaluate(element=>{element.scrollTop=element.scrollHeight})
 await expect(dialog.getByRole('button',{name:'Close course content',exact:true})).toBeVisible()
 expect((await dialog.locator('.page-modal-header').boundingBox())!.y).toBe(top)
 await dialog.getByLabel('Choose teaching attachment').setInputFiles({name:'guide.zip',mimeType:'application/zip',buffer:Buffer.from('Attachment bytes')})
 expect(uploads()).toBe(0)
 await dialog.getByRole('button',{name:'Save attachment',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'guide.zip',exact:true})).toBeVisible()
 expect(uploads()).toBe(1)
 const saved=(fixture.getWorkspace() as any).content.lesson
 expect(saved.status).toBe('draft');expect(saved.content.attachments).toEqual([attachment])
 const writes=fixture.commands.filter(c=>c.action==='workspace').length
 await page.reload();await expect(dialog).toBeVisible();expect(uploads()).toBe(1)
 expect(fixture.commands.filter(c=>c.action==='workspace')).toHaveLength(writes)
 const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'guide.zip',exact:true}).click();expect((await download).suggestedFilename()).toBe('guide.zip')
 await dialog.screenshot({path:`.data/page-reader-${info.project.name}-final.png`})
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0)
})

test('attachment picker remains usable with a pending failed journal; only persistence waits for recovery',async({page})=>{
 const fixture=await instructorCourseUI(page),workspace=fixture.getWorkspace() as any
 workspace.content.lesson.status='draft';fixture.setWorkspace(workspace)
 await page.addInitScript(data=>sessionStorage.setItem('edupulse-workspace-v2-fe67b9d2-719b-4b10-91cd-76031ab115fe',JSON.stringify({data,revision:0,dirty:true})),workspace)
 await page.route('**/api/ai?action=workspace',route=>route.request().method()==='PUT'?route.fulfill({status:503,json:{error:{message:'Cloud save unavailable. Pending changes are retained.'}}}):route.fallback())
 const dialog=await openLesson(page,fixture.syllabus.id)
 await expect(page.getByTestId('workspace-save-state')).toContainText('Cloud save unavailable')
 await expect(dialog.getByRole('button',{name:'Attach file',exact:true})).toBeEnabled()
 await dialog.getByLabel('Choose teaching attachment').setInputFiles({name:'guide.zip',mimeType:'application/zip',buffer:Buffer.from('Attachment bytes')})
 await expect(dialog).toContainText('guide.zip')
 await expect(dialog.getByRole('button',{name:'Save attachment',exact:true})).toBeDisabled()
 await expect(dialog.getByRole('status')).toContainText('Cloud save unavailable')
})

test('prepared syllabus can receive a private file draft before approval without activation or delivery',async({page})=>{
 const fixture=await instructorCourseUI(page),workspace=fixture.getWorkspace() as any
 workspace.syllabi[0].status='drafted';fixture.setWorkspace(workspace);await files(page)
 await page.goto(`/#/courseware?course=${fixture.syllabus.id}`)
 const topic=page.locator('[data-topic="variables"]');await topic.locator('summary').click()
 await topic.getByRole('button',{name:'Add teaching material',exact:true}).click()
 const form=page.getByRole('form',{name:'Add teaching material',exact:true})
 await form.getByLabel('Title',{exact:true}).fill('Attached preparation')
 await form.getByLabel('Add as',{exact:true}).selectOption('file')
 await form.getByLabel('Teaching file',{exact:false}).setInputFiles({name:'guide.zip',mimeType:'application/zip',buffer:Buffer.from('Attachment bytes')})
 await form.getByRole('button',{name:'Save material draft',exact:true}).click()
 const reader=page.getByRole('dialog',{name:'Attached preparation',exact:true});await expect(reader).toBeVisible();await fits(page,reader)
 expect((fixture.getWorkspace() as any).syllabi[0].status).toBe('drafted')
 const created=Object.values((fixture.getWorkspace() as any).content).find((item:any)=>item.content.title==='Attached preparation') as any
 expect(created.status).toBe('draft');expect(created.content.attachments).toEqual([attachment])
})

test('assessment draft attachments preserve questions and published materials have an explicit revision path',async({page})=>{
 const fixture=await instructorCourseUI(page),questions=structuredClone((fixture.getWorkspace() as any).content.quiz.content.questions);await files(page)
 await page.goto(`/#/courseware?course=${fixture.syllabus.id}`)
 const topic=page.locator('[data-topic="variables"]');await topic.locator('summary').click()
 await topic.locator('.instructor-sequence-item').filter({has:page.getByText('Variable check',{exact:true})}).getByRole('button',{name:'Open',exact:true}).click()
 let dialog=page.getByRole('dialog',{name:'Variable check',exact:true});await fits(page,dialog)
 await dialog.getByLabel('Choose teaching attachment').setInputFiles({name:'guide.zip',mimeType:'application/zip',buffer:Buffer.from('Attachment bytes')})
 await dialog.getByRole('button',{name:'Save attachment',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'guide.zip',exact:true})).toBeVisible()
 expect((fixture.getWorkspace() as any).content.quiz.content.questions).toEqual(questions)
 await page.keyboard.press('Escape')
 await topic.locator('.instructor-sequence-item').filter({has:page.getByText('Variables lesson',{exact:true})}).getByRole('button',{name:'Open',exact:true}).click()
 dialog=page.getByRole('dialog',{name:'Variables lesson',exact:true})
 await expect(dialog.getByRole('button',{name:'Attach file',exact:true})).toHaveCount(0)
 await dialog.getByRole('button',{name:'Prepare draft revision',exact:true}).click()
 await page.getByRole('dialog',{name:'Prepare draft revision',exact:true}).getByRole('button',{name:'Prepare draft revision',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Attach file',exact:true})).toBeEnabled()
 expect((fixture.getWorkspace() as any).content.lesson.status).toBe('draft')
})

test('failed attachment download releases its button and does not lock other files',async({page})=>{
 const {store}=await studentLearningUI(page)
 store.records.publications[0].content!.attachments=[attachment,{...attachment,name:'other.zip',path:path.replace('guide.zip','other.zip')}]
 let requested=false, rejectDownload:()=>Promise<void>=async()=>{}
 await page.route('**/api/ai?action=teaching-files',route=>new Promise<void>(resolve=>{requested=true;rejectDownload=async()=>{await route.fulfill({status:403,json:{error:{message:'The file is unavailable. Retry when connected.'}}});resolve()}}))
 await page.goto('/#/courseware');await page.getByRole('button',{name:'Open course IT 102',exact:true}).click()
 await page.getByRole('button',{name:'Open material',exact:true}).first().click()
 const dialog=page.getByRole('dialog',{name:'Advanced variables reading',exact:true})
 await dialog.getByRole('button',{name:'guide.zip',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Preparing download...',exact:true})).toBeDisabled()
 await expect(dialog.getByRole('button',{name:'other.zip',exact:true})).toBeEnabled()
 await expect.poll(()=>requested).toBe(true);await rejectDownload()
 await expect(dialog.getByRole('alert')).toContainText('The file is unavailable.')
 await expect(dialog.getByRole('button',{name:'guide.zip',exact:true})).toBeEnabled()
})

for(const support of [false,true])test(`${support?'Admin support':'Student'} reader downloads attachments without authoring controls or reload writes`,async({page})=>{
 const {store}=await studentLearningUI(page,support),commands:string[]=[]
 store.records.publications[0].content!.attachments=[attachment];await files(page)
 page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('action=academic'))commands.push(request.postDataJSON().operation)})
 await page.goto('/#/courseware');await page.getByRole('button',{name:'Open course IT 102',exact:true}).click()
 await page.getByRole('button',{name:'Open material',exact:true}).first().click()
 const dialog=page.getByRole('dialog',{name:'Advanced variables reading',exact:true});await fits(page,dialog)
 await expect(dialog.getByRole('button',{name:'Attach file',exact:true})).toHaveCount(0)
 const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'guide.zip',exact:true}).click();expect((await download).suggestedFilename()).toBe('guide.zip')
 const before=commands.length;await page.reload();await expect(dialog).toBeVisible();expect(commands).toHaveLength(before)
})

for(const role of ['dean','associate_dean'])test(`${role} course inspection uses a page modal and available readonly attachments`,async({page})=>{
 const fixture=await deanManagementUI(page,role);(fixture.inspection.items[0]!.content as any).attachments=[attachment];await files(page)
 await page.goto('/#/records')
 await page.getByRole('button',{name:/^IT 102 Programming foundations,/}).click()
 await page.getByRole('button',{name:'Inspect Alex Sample Instructor BSIT-1A',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Syllabus and teaching contents',exact:true});await fits(page,dialog)
 await dialog.getByRole('button',{name:'View Function calls',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Attach file',exact:true})).toHaveCount(0)
 const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'guide.zip',exact:true}).click();expect((await download).suggestedFilename()).toBe('guide.zip')
 expect(fixture.commands).toEqual([])
})
