import { test, expect } from './fixtures'
import { managedClassUI, uploadInClass } from '../managed-classes-ui'
import { baselineUI } from '../baseline-fixture'
const folder='../feature-documentation/system-manual/54-management-loaded-classes'
test('student Home offers the class code form before the first enrollment', async ({page}) => {
 const {records} = await baselineUI(page, 'student')
 records.courses = []
 records.enrollments = []
 records.publications = []
 records.notices = []
 await page.goto('/#/dashboard')
 await expect(page.getByRole('region', {name: 'No classes in this term'})).toContainText('Have a code from your instructor?')
 const join = page.getByRole('button', {name: 'Join Class', exact: true})
 await expect(join).toBeVisible()
 await page.mouse.move(0, 0)
 await page.screenshot({path: `${folder}/10-student-home-empty.png`, animations: 'disabled'})
 await join.click()
 await expect(page.getByRole('dialog', {name: 'Join Class', exact: true}).getByLabel('Class code')).toBeVisible()
 await page.screenshot({path: `${folder}/11-student-join-code.png`, animations: 'disabled'})
})

test('management-loaded Home and in-class approved syllabus intake',async({page})=>{
 await managedClassUI(page)
 await page.goto('/#/dashboard');await expect(page.locator('.instructor-course-card')).toHaveCount(2)
 await page.screenshot({path:`${folder}/01-instructor-home.png`,animations:'disabled'})
 await page.locator('.instructor-course-card').filter({hasText:'IT 201'}).click()
 await page.getByRole('button',{name:'Teaching Materials & Assessments',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Upload syllabi',exact:true})).toBeVisible()
 await page.screenshot({path:`${folder}/02-empty-course-upload.png`,animations:'disabled'})
 await uploadInClass(page)
 await page.locator('.class-modal .page-modal-body').evaluate(node => { node.scrollTop=0 })
 await page.screenshot({path:`${folder}/03-approved-outline.png`,animations:'disabled'})
 await page.getByRole('button',{name:'Syllabus',exact:true}).click()
 await expect(page.getByRole('region',{name:'Uploaded syllabus',exact:true})).toContainText('algorithms-approved.pdf')
 await page.screenshot({path:`${folder}/04-original-syllabus.png`,animations:'disabled'})
 await page.getByRole('button',{name:'Class List',exact:true}).click()
 await expect(page.getByRole('button',{name:'Copy invitation link for block BSIT-2A',exact:true})).toBeVisible()
 await page.screenshot({path:`${folder}/05-existing-class-list.png`,animations:'disabled'})
})
test('student invitation offers sign-in and reload offers explicit enrollment',async({page})=>{
 await baselineUI(page,'student')
 await page.route('**/api/ai?action=academic',r=>{const c=r.request().method()==='POST'?r.request().postDataJSON():null;return c?.operation==='class-join'?r.fulfill({status:503,json:{error:{code:'UNAVAILABLE',message:'The connection was interrupted. Try again.'}}}):r.fallback()})
 await page.goto('/#/join/K7M2QXP');await expect(page.getByRole('alert')).toBeVisible()
 await page.reload();await expect(page.getByRole('button',{name:'Join class',exact:true})).toBeVisible()
 await page.screenshot({path:`${folder}/06-invitation-reload.png`,animations:'disabled'})
})
test('signed-out invitation retains its class code for sign-in',async({page})=>{
 await managedClassUI(page)
 await page.addInitScript(()=>localStorage.removeItem('sb-xyziepdkdvvuhgkymooo-auth-token'))
 await page.route('https://*.supabase.co/auth/v1/settings',r=>r.fulfill({json:{external:{google:false}}}))
 await page.goto('/#/join/K7M2QXP');await expect(page.getByLabel('Email',{exact:true})).toBeVisible()
 await page.screenshot({path:`${folder}/07-invitation-sign-in.png`,animations:'disabled'})
})
