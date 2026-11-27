import {test,expect,type Page} from '@playwright/test'
import {baselineUI} from '../baseline-fixture'

function trackCommands(page:Page){
 const commands:any[]=[]
 page.on('request',request=>{if(request.url().includes('/api/ai?action=academic')&&request.method()==='POST')commands.push(request.postDataJSON())})
 return commands
}

test('student Home opens its course and preserves weekly, score and outline tabs',async({page},info)=>{
 const commands=trackCommands(page);await baselineUI(page,'student');await page.goto('/#/dashboard');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible({timeout:20000});await expect(page.getByRole('button',{name:'Join Class',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Create Class',exact:true})).toHaveCount(0)
 const opener=page.getByRole('region',{name:'Your classes'}).getByRole('button').first()
 await opener.click()
 const classPage=page.getByRole('dialog',{name:/IT 102/})
 await expect(classPage.getByRole('navigation',{name:'Student course sections'})).toBeVisible()
 await expect(page).toHaveURL(/#\/dashboard\?course=/)
 await expect(opener).toBeVisible()
 await page.getByRole('button',{name:'Teaching Materials & Assessments',exact:true}).click();await expect(page.getByText('Variables lesson',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Collapse all topics'}).click();await expect(page.getByText('Variables lesson',{exact:true})).not.toBeVisible();await page.getByRole('button',{name:'Expand all topics'}).click();await expect(page.getByText('Variables lesson',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Scores',exact:true}).click();await expect(page.getByRole('region',{name:'Personal assessment results'})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Scores',exact:true})).toHaveAttribute('aria-pressed','true',{timeout:20000});await page.screenshot({path:`.data/student-classroom-scores-${info.project.name}.png`})
 await page.getByRole('button',{name:'Syllabus / Course Outline',exact:true}).click();await expect(page.getByRole('region',{name:'Published outline'})).toBeVisible()
 await page.keyboard.press('Escape')
 await expect(classPage).toHaveCount(0)
 await expect(opener).toBeVisible()
 expect(commands.filter(c=>['respond','class-join'].includes(c.operation))).toHaveLength(0)
})

test('class joining invalid codes give feedback and existing membership opens without a write',async({page})=>{
 const f=await baselineUI(page,'student');const commands:any[]=[]
 await page.route('**/api/ai?action=academic',async route=>{if(route.request().method()!=='POST')return route.fallback();const c=route.request().postDataJSON();if(c.operation!=='class-join')return route.fallback();commands.push(c);if(c.code==='BAD2345')return route.fulfill({status:400,json:{error:{code:'CLASSROOM_ACTION_FAILED',message:'Check the code with your instructor.'}}});return route.fulfill({json:{status:'member',course_open:true,course_id:f.records.courses[0].id,course_code:'IT 102',course_title:'Computer Programming 1',instructor_name:'Synthetic instructor',block:'BSIT-1A',academic_year:'2026-2027',semester:'1st Semester'}})})
 await page.goto('/#/dashboard');await page.getByRole('button',{name:'Join Class',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Join Class',exact:true});await dialog.getByLabel('Class code',{exact:true}).fill('BAD2345');await dialog.getByRole('button',{name:'Find class'}).click();await expect(dialog.getByRole('alert')).toContainText('Check the code');await dialog.getByLabel('Class code',{exact:true}).fill('ABC2345');await dialog.getByRole('button',{name:'Find class'}).click();await expect(dialog).toContainText('already a member');expect(commands.filter(c=>c.action==='join')).toHaveLength(0);await dialog.getByRole('button',{name:'Open class',exact:true}).click();await expect(page.getByRole('navigation',{name:'Student course sections'})).toBeVisible();expect(commands.filter(c=>c.action==='join')).toHaveLength(0);await expect(page.getByRole('status').filter({hasText:'already a member'})).toBeVisible()
})

test('an assessment deep link does not start or submit on reload, and manual scores remain pending',async({page})=>{
 const commands=trackCommands(page);const f=await baselineUI(page,'student');const p=f.records.publications.find(p=>p.type==='assessment')!;const a=f.records.attempts.find(a=>a.publication_id===p.id)!;a.grading_status='pending_review'
 await page.route('**/api/ai?action=academic',r=>{if(r.request().method()==='POST'&&r.request().postDataJSON().operation==='feedback')return r.fulfill({json:{available:false,reason:'Pending instructor review'}});return r.fallback()})
 await page.goto(`/#/courseware?course=${p.course_id}&studentTab=scores&item=${p.id}`);const reader=page.getByRole('dialog',{name:p.title,exact:true});await expect(reader).toBeVisible({timeout:20000});await expect(reader).toContainText('Score pending review');await page.reload();await expect(reader).toBeVisible({timeout:20000})
 await reader.getByRole('button',{name:'Close assessment',exact:true}).click()
 const scores=page.getByRole('region',{name:'Your course scores'})
 await expect(scores.locator('.kpi-card')).toHaveCount(3)
 await expect(scores.locator('.kpi-card').filter({hasText:'Pending instructor review'})).toContainText('1')
 const results=scores.getByRole('region',{name:'Personal assessment results'})
 const row=results.getByRole('listitem').filter({hasText:p.title})
 await expect(row).toContainText('Score pending review')
 await row.getByRole('button',{name:'Review attempt'}).click()
 await expect(reader).toBeVisible()
 expect(commands.filter(c=>['start','respond'].includes(c.operation))).toHaveLength(0)
})


test('published topic coverage, canonical notices and provider links preserve course context',async({page})=>{
 const f=await baselineUI(page,'student'),course=f.records.courses[0],material=f.records.publications[0],quiz=f.records.publications[1]
 course.source_links=['https://drive.google.com/file/d/recorded-source/view']
 course.outline=[{week:1,contents:['Variables'],sections:[{id:'variables-topic',contents:['Variables topic'],ilos:'Use variables',activities:'Read and practice',assessments:'Quiz',assessmentTypes:[]}]}] as any
 material.content={...material.content,courseItemId:'material-a',courseTopicId:'variables-topic',links:[{title:'Reference document',url:'https://docs.google.com/document/d/authorized-resource/edit'}]}
 quiz.content={...quiz.content,courseTopicId:'variables-topic',teachingOrder:-1,coverage:{materialIds:['material-a','material-b']}}
 f.records.publications.push({...material,id:'material-b',title:'Variables worked example',content:{courseItemId:'material-b',courseTopicId:'variables-topic',teachingOrder:3000}})
 f.records.announcements=[{id:'notice-a',course_id:course.id,course_code:course.course_code,academic_year:'2026-2027',semester:'1st Semester',block:'BSIT-1A',week:1,title:'Class reading notice',body:'Read the published material before class.',attachments:[],created_at:'2026-11-20T01:00:00Z',updated_at:'2026-11-20T01:00:00Z'}]
 const notice=f.records.announcements[0]
 f.records.announcements.push({...notice,id:'notice-week',title:'Before week notice',placement:'before'},{...notice,id:'notice-topic',title:'Before topic notice',topic_id:'variables-topic',placement:'before'},{...notice,id:'notice-inside',title:'In topic notice',topic_id:'variables-topic',placement:'within'})
 f.records.publications.push({...material,id:'unpublished',active:false,title:'Private draft'})
 await page.goto(`/#/courseware?course=${course.id}`)
 const topic=page.locator('.student-subtopic').filter({has:page.locator('summary',{hasText:'Variables topic'})})
 await expect(topic.locator('.student-related')).toContainText('Variables quiz')
 await expect(topic.locator('article:not(.student-announcement) h3')).toHaveText(['Variables lesson','Variables worked example','Variables quiz'])
 const resources=page.getByRole('region',{name:'Weekly teaching materials and assessments'})
 await expect(resources.locator('#announcement-notice-week + details.student-topic')).toHaveCount(1)
 await expect(resources.locator('#announcement-notice-topic + details.student-subtopic')).toHaveCount(1)
 await expect(topic.getByRole('heading',{name:'In topic notice',exact:true})).toBeVisible()
 await resources.getByRole('combobox',{name:'Week',exact:true}).selectOption('1')
 await resources.getByLabel('Show resources').selectOption('assessment')
 await expect(topic.locator('.student-related')).toContainText('Variables quiz')
 await expect(topic.getByText('Covers Variables lesson, Variables worked example',{exact:true})).toBeVisible()
 await expect(resources.getByRole('button',{name:'Open material',exact:true})).toHaveCount(0)
 await resources.getByLabel('Show resources').selectOption('all')
 await expect(topic.getByText('In topic notice',{exact:true})).toBeVisible()
 await expect(page.getByText('Private draft',{exact:true})).toHaveCount(0)
 await expect(topic.getByRole('link',{name:'Open in Google Docs'})).toHaveAttribute('target','_blank')
 await expect(page.getByRole('heading',{name:'Class reading notice',exact:true})).toHaveCount(1)
 await page.getByRole('button',{name:'Announcements',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Class reading notice',exact:true})).toHaveCount(1)
 await page.locator('#announcement-notice-a').getByRole('button',{name:'View Week 1',exact:true}).click()
 await expect(page).toHaveURL(/studentTab=materials.*week=1/)
 await expect(page.locator('#week-1-heading')).toBeFocused()
 await expect(page.getByRole('heading',{name:'Class reading notice',exact:true})).toHaveCount(1)
 await page.getByRole('button',{name:'Class List',exact:true}).click()
 await expect(page.getByRole('region',{name:'Your class membership'})).toContainText('Synthetic learner')
 await expect(page.getByText('Synthetic second learner',{exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Syllabus / Course Outline',exact:true}).click()
 const sources=page.getByRole('region',{name:'Recorded course sources'})
 await expect(sources.getByRole('link',{name:'Open in Google Drive'})).toHaveAttribute('href',course.source_links[0])
})

test('a failed submission keeps responses and does not display a receipt or answer review',async({page})=>{
 const f=await baselineUI(page,'student');f.records.attempts=[]
 const publication=f.records.publications.find(p=>p.type==='assessment')!
 const commands=trackCommands(page)
 await page.route('**/api/ai?action=academic',r=>r.request().method()==='POST'&&r.request().postDataJSON().operation==='respond'?r.fulfill({status:503,json:{error:{code:'UNAVAILABLE',message:'Submission could not be confirmed. Try again.'}}}):r.fallback())
 await page.goto(`/#/courseware?course=${publication.course_id}&item=${publication.id}`)
 const reader=page.getByRole('dialog',{name:publication.title,exact:true})
 await reader.getByRole('button',{name:'Start assessment',exact:true}).click()
 for(let i=1;i<=3;i++)await reader.getByLabel(`Question ${i}: Option A`,{exact:true}).check()
 page.once('dialog',dialog=>dialog.accept())
 await reader.getByRole('button',{name:'Confirm and submit responses',exact:true}).click()
 await expect(reader.getByRole('alert')).toContainText('Submission could not be confirmed')
 await expect(reader.getByLabel('Question 1: Option A',{exact:true})).toBeChecked()
 await expect(reader.locator('.academic-result')).toHaveCount(0)
 expect(commands.filter(c=>c.operation==='feedback')).toHaveLength(0)
 page.once('dialog',dialog=>dialog.dismiss())
 await reader.getByRole('button',{name:'Close assessment',exact:true}).click()
 await expect(reader).toBeVisible()
})


test('a newly joined class refreshes Home after explicit confirmation',async({page})=>{
 test.setTimeout(60000)
 const fixture=await baselineUI(page,'student')
 const course=fixture.records.courses[0]
 const enrollments=fixture.records.enrollments.slice()
 fixture.records.courses=[]
 fixture.records.enrollments=[]
 fixture.records.publications=[]
 const commands=trackCommands(page)
 await page.route('**/api/ai?action=academic',async route=>{
  if(route.request().method()!=='POST')return route.fallback()
  const input=route.request().postDataJSON()
  if(input.operation!=='class-join')return route.fallback()
  const joined=input.action==='join'
  if(joined){
   fixture.records.courses=[course]
   fixture.records.enrollments=enrollments
  }
  return route.fulfill({json:{
   status:joined?'joined':'joinable',course_open:true,course_id:course.id,
   course_code:course.course_code,course_title:course.course_title,block:'BSIT-1A',
   academic_year:'2026-2027',semester:'1st Semester',instructor_name:'Synthetic instructor'
  }})
 })
 await page.goto('/#/dashboard')
 await expect(page.getByRole('heading',{name:'No classes in this term'})).toBeVisible({timeout:20000})
 await page.getByRole('button',{name:'Join Class',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Join Class',exact:true})
 await dialog.getByLabel('Class code',{exact:true}).fill('ABC2345')
 await page.reload({waitUntil:'domcontentloaded'})
 await expect(dialog.getByLabel('Class code',{exact:true})).toHaveValue('',{timeout:20000})
 expect(commands.filter(command=>command.operation==='class-join')).toHaveLength(0)
 await dialog.getByLabel('Class code',{exact:true}).fill('ABC2345')
 await dialog.getByLabel('Class code',{exact:true}).press('Enter')
 await expect(dialog.getByRole('region',{name:'Class found'})).toContainText(course.course_title)
 expect(commands.filter(command=>command.action==='join')).toHaveLength(0)
 await dialog.getByRole('button',{name:'Confirm Join Class'}).click()
 await expect(page.getByRole('navigation',{name:'Student course sections'})).toBeVisible()
 expect(commands.filter(command=>command.action==='join')).toHaveLength(1)
 await page.getByRole('button',{name:'Close class and return to Home',exact:true}).click()
 await expect(page.getByRole('region',{name:'Your classes'}).getByRole('button')).toHaveCount(1)
})


test('a published course notice links directly to its material without recording an open',async({page})=>{
 const commands=trackCommands(page)
 const fixture=await baselineUI(page,'student')
 const material=fixture.records.publications[0]
 Object.assign(fixture.records.notices![0],{publication_id:material.id})
 await page.goto('/#/notifications')
 const notice=page.getByText(/New published material: Variables lesson/).locator('..')
 await notice.getByRole('link',{name:'Open course item'}).click()
 await expect(page.getByRole('dialog',{name:'Variables lesson',exact:true})).toBeVisible({timeout:20000})
 expect(commands.filter(command=>command.operation==='open')).toHaveLength(0)
})


test('assessment history navigation never carries answers into another attempt',async({page})=>{
 const fixture=await baselineUI(page,'student')
 fixture.records.attempts=[]
 const [first,second]=fixture.records.publications.filter(item=>item.type==='assessment')
 const commands=trackCommands(page)
 fixture.records.sessions=[first,second].map((publication,index)=>({
  id:`00000000-1111-4000-8111-00000000000${index}`,student_id:'fe67b9d2-719b-4b10-91cd-76031ab115fe',
  publication_id:publication.id,source_version:String(publication.source_version),attempt_no:1,started_at:new Date().toISOString(),
 }))
 const path=(publication:typeof first)=>`/#/courseware?course=${publication.course_id}&item=${publication.id}`
 await page.goto(path(first))
 const firstReader=page.getByRole('dialog',{name:first.title,exact:true})
 await firstReader.getByLabel('Question 1: Option B',{exact:true}).check()
 await expect(firstReader.getByLabel('Question 1: Option B',{exact:true})).toBeChecked()

 await page.goto(path(second))
 const secondReader=page.getByRole('dialog',{name:second.title,exact:true})
 await expect(secondReader.getByLabel('Question 1: Option B',{exact:true})).not.toBeChecked()
 await expect(secondReader.getByRole('status',{name:'Assessment progress'})).toContainText('0/3 answered')
 await page.goBack()
 await expect(firstReader.getByLabel('Question 1: Option B',{exact:true})).not.toBeChecked()
 expect(commands.filter(command=>['start','respond'].includes(command.operation))).toEqual([])
})


test('class and item history return to the originating Home card',async({page})=>{
 const fixture=await baselineUI(page,'student')
 const material=fixture.records.publications.find(p=>p.type==='material')!
 await page.goto('/#/dashboard')
 const opener=page.getByRole('button',{name:'Open IT 102 Computer Programming 1',exact:true})
 await opener.click()
 const classPage=page.getByRole('dialog',{name:/IT 102/})
 await classPage.getByRole('button',{name:'Teaching Materials & Assessments',exact:true}).click()
 const materialButton=classPage.getByRole('button',{name:'Open material',exact:true}).first()
 await materialButton.click()
 const reader=page.getByRole('dialog',{name:material.title,exact:true})
 await expect(reader).toBeVisible()
 await page.goBack()
 await expect(reader).toHaveCount(0)
 await expect(materialButton).toBeFocused()
 await page.goForward()
 await expect(reader).toBeVisible()
 await reader.getByRole('button',{name:'Close material',exact:true}).click()
 await expect(reader).toHaveCount(0)
 await classPage.getByRole('button',{name:'Close class and return to Home'}).click()
 await expect(page).toHaveURL(/#\/dashboard$/)
 await expect(opener).toBeFocused()
 await page.goForward()
 await expect(classPage.getByRole('button',{name:'Teaching Materials & Assessments',exact:true})).toHaveAttribute('aria-pressed','true')
})


test('class section navigation supports the keyboard and reflows at 320 pixels',async({page})=>{
 const f=await baselineUI(page,'student')
 await page.setViewportSize({width:320,height:680})
 await page.goto('/#/dashboard?course='+f.records.courses[0].id)
 const nav=page.getByRole('navigation',{name:'Student course sections'})
 const first=nav.getByRole('button',{name:'Announcements',exact:true})
 const last=nav.getByRole('button',{name:'Syllabus / Course Outline',exact:true})
 await first.focus()
 await page.keyboard.press('End')
 await expect(last).toBeFocused()
 await page.keyboard.press('Enter')
 await expect(last).toHaveAttribute('aria-pressed','true')
 await expect(page.getByRole('heading',{name:'Published Course Outline'})).toBeVisible()
 await page.keyboard.press('Home')
 await expect(first).toBeFocused()
 await page.keyboard.press('ArrowRight')
 await expect(nav.getByRole('button',{name:'Teaching Materials & Assessments'})).toBeFocused()
 expect(await nav.evaluate(element=>element.scrollWidth)).toBeLessThanOrEqual(await nav.evaluate(element=>element.clientWidth))
 await page.keyboard.press('Enter')
 await page.getByRole('button',{name:'Collapse all topics',exact:true}).focus()
 await page.keyboard.press('Tab')
 await expect(page.locator('#week-1-heading')).toBeFocused()
})


test('Home search keeps the class filter when the modal closes',async({page})=>{
 const f=await baselineUI(page,'student')
 const course=f.records.courses[0]
 course.instructor_name='T\u00e9a Instructor'
 await page.goto('/#/dashboard')
 const search=page.getByRole('searchbox',{name:'Find a class'})
 await search.fill('tea   IT-102')
 const opener=page.getByRole('button',{name:'Open IT 102 Computer Programming 1',exact:true})
 await expect(opener).toBeVisible()
 await expect(page.getByRole('status').filter({hasText:'1 class matches'})).toBeVisible()
 await opener.click()
 await page.getByRole('button',{name:'Close class and return to Home'}).click()
 await expect(search).toHaveValue('tea   IT-102')
 await search.fill('unassigned section')
 await expect(page.getByText('No classes match your search.')).toBeVisible()
 await expect(opener).toHaveCount(0)
 await page.getByRole('button',{name:'Clear search'}).click()
 await expect(opener).toBeVisible()
})


test('an unauthorized course or foreign publication link cannot open a reader',async({page})=>{
 const commands=trackCommands(page)
 const f=await baselineUI(page,'student')
 const own=f.records.courses[0].id
 const foreign={...f.records.publications[0],id:'foreign-item',course_id:'foreign-class',title:'Foreign material'}
 f.records.publications.push(foreign)
 await page.goto('/#/dashboard?course=foreign-class')
 await expect(page.getByRole('dialog',{name:'Class unavailable'})).toContainText('no longer assigned')
 await page.goto('/#/dashboard?course='+own+'&studentTab=materials&item='+foreign.id)
 await expect(page.getByText('This item is unavailable in your class.',{exact:true})).toBeVisible()
 await expect(page.getByRole('dialog',{name:foreign.title})).toHaveCount(0)
 expect(commands.filter(command=>['open','start','respond'].includes(command.operation))).toHaveLength(0)
})
