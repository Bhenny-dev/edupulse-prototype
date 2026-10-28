import {test,expect} from '@playwright/test'
import {academicUI} from '../academic-ui-fixture'

test('page navigation has one tab set and Pulse launcher is avatar only',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click()
 for(const route of ['/syllabus','/courseware','/student-monitoring','/performance']){await page.goto('/#'+route);await expect(page.locator('.app-sidebar')).toHaveCount(0);await expect(page.locator('#main-content')).toBeVisible()}
 const launcher=page.getByRole('button',{name:'Open Pulse assistant',exact:true});await expect(launcher).toHaveText('');expect(await launcher.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
})
test('syllabus dialog and assistant share space and Escape preserves the assistant',async({page,request},info)=>{
 const {DEFAULT_SYLLABI}=await import(new URL('../../src/data/mockData.js',import.meta.url).href);const current=await(await request.get('/api/ai?action=workspace')).json();const seeded=await request.put('/api/ai?action=workspace',{data:{revision:current.revision,data:{syllabi:[{...DEFAULT_SYLLABI[0],sample:true}],content:{},registrations:[]}}});expect(seeded.status()).toBe(200)
 await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=mine')
 await page.getByTitle('View Syllabus',{exact:true}).first().click();const modal=page.locator('[data-dialog="syllabus-view"]');await expect(modal).toBeVisible();const pdf=page.waitForEvent('download');await modal.getByRole('button',{name:'Download PDF',exact:true}).click();expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/)
 await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click();const panel=page.getByRole('dialog',{name:'Pulse',exact:true});await expect(panel).toBeVisible();expect(await modal.getAttribute('data-pulse-zone')).toBe('syllabus-builder');expect(await modal.locator('.modal-actions').evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');if(info.project.name==='mobile')expect((await panel.locator('.connected-pulse-feed').boundingBox())!.height).toBeGreaterThan(60)
 await expect.poll(async()=>{const a=(await modal.boundingBox())!,b=(await panel.boundingBox())!;return info.project.name==='desktop'?a.x+a.width<=b.x:a.y+a.height<=b.y}).toBe(true)
 await panel.getByRole('button',{name:'Open workspace buddies',exact:true}).click();const office=page.getByRole('dialog',{name:'Meet your crew.',exact:true});await expect(office).toBeVisible();await page.keyboard.press('Tab');await expect(office.locator(':focus')).toHaveCount(1);await page.keyboard.press('Escape');await expect(office).toHaveCount(0);await expect(modal).toBeVisible()
 await modal.getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press('Tab');await expect(panel.getByRole('button').first()).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(modal.getByRole('button',{name:'Close',exact:true})).toBeFocused();await modal.locator('.modal-close').focus();await page.keyboard.press('?');const shortcuts=page.getByRole('dialog',{name:'Keyboard shortcuts',exact:true});await expect(shortcuts).toBeVisible();await expect(modal).toBeHidden();await page.keyboard.press('Escape');await expect(shortcuts).toHaveCount(0);await expect(modal).toBeVisible();await modal.locator('.modal-close').focus();await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);await expect(panel).toBeVisible()
})
test('academic records show skeletons and respect reduced motion',async({page})=>{
 let release!:()=>void;const hold=new Promise<void>(r=>release=r);await academicUI(page,async()=>{await hold;return {json:{courses:[],publications:[],enrollments:[],attempts:[],accesses:[]}}})
 await page.goto('/#/dashboard');const loading=page.getByRole('region',{name:'Loading academic records'});await expect(loading).toBeVisible();await expect(loading.locator('.skeleton-line').first()).toBeVisible();await expect(page.getByRole('button',{name:'Refresh records',exact:true})).toBeDisabled();for(const button of await page.locator('.academic-actions > button').all())expect(await button.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)
 await page.emulateMedia({reducedMotion:'reduce'});expect(await loading.locator('.skeleton-line').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');release();await expect(loading).toHaveCount(0);await expect(page.getByRole('heading',{name:'No authorized academic records yet'})).toBeVisible();await expect(page.getByRole('button',{name:'Refresh records',exact:true})).toBeEnabled()
})

test('academic request errors clear loading without claiming an empty library and retry succeeds',async({page})=>{
 let retry=false;await academicUI(page,async()=>!retry?{status:503,json:{error:{code:'UNAVAILABLE',message:'Records are temporarily unavailable.'}}}:{json:{courses:[],publications:[],enrollments:[],attempts:[],accesses:[]}})
 await page.goto('/#/dashboard');await expect(page.getByRole('alert').filter({hasText:'Records are temporarily unavailable.'})).toBeVisible();await expect(page.getByRole('region',{name:'Loading academic records'})).toHaveCount(0);await expect(page.getByRole('heading',{name:'No authorized academic records yet'})).toHaveCount(0);retry=true;await page.getByRole('button',{name:'Refresh records',exact:true}).click();await expect(page.getByRole('heading',{name:'No authorized academic records yet'})).toBeVisible()
})

test('unique Records and Assessments destinations remain in primary navigation',async({page},info)=>{
 for(const [persona,name,path] of [['Student','Assessments','assessment'],['Dean','Records','records'],['Assoc. Dean','Records','records']]){
  await page.goto('/');await page.getByRole('button',{name:persona,exact:true}).click();if(info.project.name==='mobile')await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('link',{name,exact:true}).click();await expect(page).toHaveURL(new RegExp('#/'+path));await expect(page.locator('.app-sidebar')).toHaveCount(0)
  if(persona!=='Student'){await page.goto('/#/monitor');for(const [label,key] of [['Syllabus Status','syllabi'],['Delivery Progress','delivery'],['Student Oversight','students'],['Alerts','alerts']]){const button=page.getByRole('navigation',{name:'Monitor views'}).getByRole('button',{name:label,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(page).toHaveURL(new RegExp('tab='+key))}}
  await page.evaluate(()=>{localStorage.removeItem('edupulse_user')});await page.goto('/');await page.reload()
 }
})
