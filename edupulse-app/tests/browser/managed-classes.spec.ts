import { test, expect } from '../snapshots/fixtures'

import { managedClassUI, uploadInClass } from '../managed-classes-ui'
import { baselineUI } from '../baseline-fixture'
import { makePdf } from '../fixtures'
import { approvedLines } from '../approved-syllabus-fixture'

test.setTimeout(60_000)

test('in-class drag and drop saves one approved original, hides intake, and reload does not save again',async({page})=>{
 const fixture=await managedClassUI(page)
 await page.goto('/#/dashboard?course=IT%20201&tab=materials')
 await expect(page.getByRole('button',{name:'Syllabus',exact:true})).toHaveCount(0)
 await expect(page.getByLabel('Upload approved syllabus PDF or DOCX')).toHaveCount(1)
 await uploadInClass(page)
 const saved=(fixture.getWorkspace() as any).syllabi.find((s:any)=>s.courseCode==='IT 201')
 expect(saved.status).toBe('active');expect(saved.approvedFile.approvalAttested).toBe(true)
 expect(saved.approvedFile.name).toBe('algorithms-approved.pdf')
 expect(saved.courseOutline.length).toBeGreaterThan(0)
 expect(page.url()).toContain('tab=materials');expect(page.url()).not.toContain('/syllabus')
 const writes=fixture.commands.filter(c=>c.action==='workspace').length
 await page.reload()
 await expect(page.getByRole('heading',{name:'Upload syllabi',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Syllabus',exact:true}).click()
 await expect(page.getByRole('region',{name:'Uploaded syllabus',exact:true})).toContainText('algorithms-approved.pdf')
 expect(fixture.commands.filter(c=>c.action==='workspace')).toHaveLength(writes)
 expect(fixture.forbidden).toEqual([])
})

test('invitation copy uses an existing code without a command and existing roster entry restores on reload',async({page})=>{
 const fixture=await managedClassUI(page), commands:any[]=[]
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{(window as any).__copied=text}},configurable:true})})
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('action=academic'))commands.push(r.postDataJSON())})
 await page.goto('/#/dashboard?course=IT%20201&tab=class-list')
 await expect(page.getByRole('button',{name:'Add block section',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Copy invitation link for block BSIT-2A',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as any).__copied)).toBe(new URL('/#/join/K7M2QXP',page.url()).href)
 expect(commands).toEqual([])
 await page.getByRole('button',{name:'Add students',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Course class list',exact:true})).toBeVisible()
 await page.reload()
 await expect(page.getByRole('dialog',{name:'Course class list',exact:true})).toBeVisible()
 expect(commands).toEqual([]);expect(fixture.forbidden).toEqual([])
})

test('student invitation joins once, replaces the invitation URL and reload never reenrolls',async({page})=>{
 const fixture=await baselineUI(page,'student'), commands:any[]=[]
 await page.route('**/api/ai?action=academic',async r=>{
  const c=r.request().method()==='POST'?r.request().postDataJSON():null
  if(c?.operation!=='class-join')return r.fallback()
  commands.push(c);return r.fulfill({json:{status:'member',course_id:fixture.records.courses[0].id,academic_year:'2026-2027',semester:'1st Semester'}})
 })
 await page.goto('/#/join/K7M2QXP')
 await expect(page.getByRole('navigation',{name:'Student course sections'})).toBeVisible()
 expect(commands).toEqual([{operation:'class-join',action:'join',code:'K7M2QXP'}])
 await page.reload();await expect(page.getByRole('navigation',{name:'Student course sections'})).toBeVisible()
 expect(commands).toHaveLength(1)
})

test('failed invitation retains its URL; reload requires explicit retry and wrong roles cannot join',async({page})=>{
 await baselineUI(page,'student');const commands:any[]=[]
 await page.route('**/api/ai?action=academic',r=>{const c=r.request().method()==='POST'?r.request().postDataJSON():null;if(c?.operation!=='class-join')return r.fallback();commands.push(c);return r.fulfill({status:400,json:{error:{code:'CLASSROOM_ACTION_FAILED',message:'This class code was turned off or replaced.'}}})})
 await page.goto('/#/join/K7M2QXP');await expect(page.getByRole('alert')).toContainText('turned off or replaced')
 await page.reload();await expect(page.getByRole('button',{name:'Join class',exact:true})).toBeVisible()
 expect(commands).toHaveLength(1)
 await page.getByRole('button',{name:'Join class',exact:true}).click();await expect(page.getByRole('alert')).toContainText('turned off or replaced');expect(commands).toHaveLength(2)
})

test('instructor invitation cannot enroll and invalid invitations cannot issue commands',async({page})=>{
 await managedClassUI(page);const commands:any[]=[]
 page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('action=academic'))commands.push(r.postDataJSON())})
 await page.goto('/#/join/K7M2QXP');await expect(page.getByRole('alert')).toContainText('own student account')
 await page.goto('/#/join/invalid');await expect(page.getByRole('alert')).toContainText('invalid')
 expect(commands).toEqual([])
})


test('management-loaded student classes appear before a syllabus is uploaded',async({page})=>{
 const fixture=await baselineUI(page,'student')
 fixture.records.courses=[];fixture.records.publications=[];fixture.records.enrollments=[]
 fixture.records.assignedCourses=[{id:'loaded-only',course_code:'IT 201',course_title:'Algorithms',active:true,block_section:'BSIT-2A',suspended:false,units:'3',year_level:'2',semester:'1st Semester',academic_year:'2026-2027',instructor_name:'Synthetic instructor'}]
 await page.goto('/#/dashboard')
 await expect(page.locator('.class-card').filter({hasText:'IT 201'})).toContainText('BSIT-2A')
 await page.reload();await expect(page.locator('.class-card').filter({hasText:'IT 201'})).toBeVisible({timeout:20000})
})

test('signed-out invitation keeps its code through student email sign-in, then joins automatically',async({page})=>{
 const fixture=await baselineUI(page,'student'),commands:any[]=[]
 await page.addInitScript(()=>{localStorage.removeItem('sb-xyziepdkdvvuhgkymooo-auth-token')})
 await page.route('https://*.supabase.co/auth/v1/settings',r=>r.fulfill({json:{external:{google:false}}}))
 await page.route('https://*.supabase.co/auth/v1/token?*',async r=>{
  const user={id:'fe67b9d2-719b-4b10-91cd-76031ab115fe',email:'ui.fixture@example.invalid',app_metadata:{role:'student',provider:'email'},user_metadata:{full_name:'Synthetic student'},aud:'authenticated',created_at:'2026-10-27T00:00:00Z'}
  const part=(x:object)=>Buffer.from(JSON.stringify(x)).toString('base64url')
  return r.fulfill({json:{access_token:`${part({alg:'HS256'})}.${part({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.synthetic`,refresh_token:'synthetic-only',expires_in:3600,token_type:'bearer',user}})
 })
 await page.route('**/api/ai?action=academic',r=>{const c=r.request().method()==='POST'?r.request().postDataJSON():null;if(c?.operation!=='class-join')return r.fallback();commands.push(c);return r.fulfill({json:{status:'member',course_id:fixture.records.courses[0].id,academic_year:'2026-2027',semester:'1st Semester'}})})
 await page.goto('/#/join/K7M2QXP')
 await expect(page.getByText('Sign in with your student account to join this class.',{exact:true})).toBeVisible()
 await page.getByLabel('Email',{exact:true}).fill('ui.fixture@example.invalid');await page.getByLabel('Password',{exact:true}).fill('synthetic-only-not-a-real-password')
 await page.getByRole('button',{name:'Sign In',exact:true}).click()
 await expect(page.getByRole('navigation',{name:'Student course sections'})).toBeVisible({timeout:20000})
 expect(commands).toHaveLength(1)
})


test('an uploaded approved file for another semester cannot replace the selected class identity',async({page})=>{
 const fixture=await managedClassUI(page)
 await page.goto('/#/dashboard?course=IT%20201&tab=materials')
 const lines=approvedLines.map(line=>line.replace('IT 202','IT 201').replace('Fundamentals of Networking','Algorithms'))
 await page.getByLabel('Upload approved syllabus PDF or DOCX').setInputFiles({name:'second-semester.pdf',mimeType:'application/pdf',buffer:Buffer.from(makePdf([lines]))})
 await expect(page.getByRole('region',{name:'Extracted approved course outline',exact:true})).toBeVisible()
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Use syllabus for course',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('academic year and semester')
 expect(fixture.commands.filter(c=>c.action==='workspace')).toHaveLength(0)
 await expect(page.getByRole('button',{name:'Syllabus',exact:true})).toHaveCount(0)
})
