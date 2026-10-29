import {test,expect,type Page} from './fixtures'
import {mkdir} from 'node:fs/promises'
import {academicUI} from '../academic-ui-fixture'
import {makeScannedPdf} from '../fixtures'
import {scanPage} from '../scans'
const root='../feature-documentation/system-manual/12-interface-and-loading'
async function shot(page:Page,name:string,selector?:string){await mkdir(root,{recursive:true});await(selector?page.locator(selector):page).screenshot({path:`${root}/${name}.png`,animations:'disabled'})}
export function interfaceCaptures(mobile=false){
 test('interface: monitor subviews remain reachable without a sidebar',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Dean',exact:true}).click();await page.goto('/#/monitor')
  const directory='../feature-documentation/system-walkthrough/03-dean-and-associate-dean'
  for(const [label,key,name] of [['Syllabus Status','syllabi','04-monitor-syllabus-status'],['Delivery Progress','delivery','05-monitor-delivery-progress'],['Student Oversight','students','06-monitor-student-oversight'],['Alerts','alerts','07-monitor-alerts']]){
   const button=page.getByRole('navigation',{name:'Monitor views'}).getByRole('button',{name:label,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(page).toHaveURL(new RegExp('tab='+key));await expect(page.locator('.app-sidebar')).toHaveCount(0)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   if(!mobile){await page.mouse.move(2,400);await page.waitForTimeout(1800);await page.screenshot({path:`${directory}/${name}.png`,animations:'disabled',fullPage:true})}
   else if(key==='syllabi')await shot(page,'09-mobile-monitor-tabs')
  }
  if(!mobile){
   await page.evaluate(()=>localStorage.removeItem('edupulse_user'));await page.goto('/');await page.reload();await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/student-monitoring');await page.getByRole('button',{name:'Learning Material Access',exact:true}).click();await expect(page.getByText('Learning Material Access',{exact:false}).last()).toBeVisible();await page.locator('.recharts-wrapper').last().scrollIntoViewIfNeeded();await page.waitForTimeout(2000);await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'../feature-documentation/system-walkthrough/04-instructor/10-student-monitoring-material-access.png',animations:'disabled',fullPage:true})
  }
 })
 test('interface: avatar launcher and dialog beside Pulse',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=mine');await expect(page.locator('.app-sidebar')).toHaveCount(0)
  await shot(page,mobile?'06-mobile-page-tabs':'01-page-tabs');if(!mobile)await shot(page,'02-avatar-launcher','[data-pulse-ui="mascot"]')
  await page.getByTitle('View Syllabus',{exact:true}).first().click();await page.getByRole('button',{name:'Open Pulse assistant',exact:true}).click();const modal=page.locator('.overlay-backdrop > .modal-content'),panel=page.getByRole('dialog',{name:'Pulse',exact:true});await expect(panel).toBeVisible();const a=(await modal.boundingBox())!,b=(await panel.boundingBox())!;expect(mobile?a.y+a.height<=b.y:a.x+a.width<=b.x).toBe(true);await panel.getByRole('button', { name: 'Pulse options', exact: true }).click(); await panel.getByRole('button',{name:'Open workspace buddies',exact:true}).click();await expect(page.getByRole('dialog',{name:'Meet your crew.',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('[data-pulse-ui="office"]')).toHaveCount(0);await expect(modal).toBeVisible();await shot(page,mobile?'07-mobile-dialog-and-pulse':'03-dialog-and-pulse')
 })
 test('interface: academic skeleton during an actual pending request',async({page})=>{
  let release!:()=>void;const held=new Promise<void>(r=>release=r);await academicUI(page,async()=>{await held;return {json:{courses:[],publications:[],enrollments:[],attempts:[],accesses:[]}}})
  try{await page.goto('/#/dashboard');await expect(page.getByRole('region',{name:'Loading academic records'})).toBeVisible();await shot(page,mobile?'08-mobile-records-loading':'04-records-loading')}finally{release()}
 })
 if(!mobile)test('interface: file scan has progress without invented percentages',async({page,browser})=>{
  const buffer=makeScannedPdf([{jpeg:await scanPage(browser,['Section 1: Course Information','Course Code: IT 102','Course Title: Computer Programming 1','Section 5: Course Outline','Week 1','ILOs: Explain variable declarations.','Topics: Variables and assignment'],{dpi:300,degraded:false})}])
  await page.goto('/');await page.getByRole('button',{name:'Instructor',exact:true}).click();await page.goto('/#/syllabus?tab=builder');await page.getByLabel('Upload syllabus DOCX or PDF').setInputFiles({name:'synthetic-scan.pdf',mimeType:'application/pdf',buffer:Buffer.from(buffer)});await expect(page.locator('.loading-progress')).toBeVisible();await shot(page,'05-file-scan-progress','.upload-zone');await expect(page.getByText('Extracted Sections Preview',{exact:true})).toBeVisible({timeout:120000})
 })
}
export function academicCaptures(){test('academic UI fixtures: current records screens, no hosted authorization claim',async({browser})=>{
 const course={id:'course-1',course_code:'IT 102',course_title:'Computer Programming 1',active:true,source_revision:4}
 const material={id:'pub-material',course_id:course.id,active:true,type:'material',week:1,source_version:1,title:'Canary variables lesson',content:{sections:[{heading:'Variables',body:'A variable stores a value.'}]}}
 const assessment={id:'pub-assessment',course_id:course.id,active:true,type:'assessment',week:1,source_version:1,title:'Canary variables assessment',content:{questions:[{text:'Which declaration creates a binding?',options:['let','if','else','return']},{text:'Which value is a number?',options:['42','true','null','undefined']},{text:'Which operator assigns a value?',options:['=','===','!==','>']}]}}
 const data={courses:[course],publications:[material,assessment],enrollments:[{course_id:course.id,student_email:'learner@example.invalid',student_ref:'SYN-001',display_name:'Synthetic learner',block_section:'BSIT-1A'}],attempts:[{publication_id:assessment.id,source_version:1,student_email:'learner@example.invalid',score:3,max_score:3,submitted_at:'2026-10-27T03:00:00Z'}],accesses:[{publication_id:material.id,student_id:'synthetic-learner',first_opened_at:'2026-10-27T02:00:00Z'}]}
 const problems:string[]=[];const dir='../feature-documentation/system-walkthrough/08-authenticated-records';await mkdir(dir,{recursive:true})
 for(const [role,route,name,open] of [['instructor','student-monitoring','01-instructor-records',''],['student','courseware','02-student-material','Open material'],['student','assessment','03-student-assessment','Open assessment'],['student','performance','04-student-performance',''],['dean','performance','05-dean-performance',''],['associate_dean','monitor','06-associate-dean-oversight',''],['student','dashboard','07-unenrolled-student','']]){
  const page=await browser.newPage({viewport:{width:1440,height:900},baseURL:test.info().project.use.baseURL});try{page.on('pageerror',e=>problems.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|Refused to/.test(m.text()))problems.push(m.text())});const empty=name.startsWith('07');await academicUI(page,async()=>({json:empty?{}:{...data,...(role==='associate_dean'?{attempts:[]}: {})}}),role);await page.goto('/#/'+route);await expect(page.getByText('Loading authorized academic records…')).toHaveCount(0);await expect(page.locator('h1')).toBeVisible();if(open)await page.getByRole('button',{name:open,exact:true}).first().click();await page.screenshot({path:`${dir}/${name}.png`,animations:'disabled',fullPage:true})}finally{await page.close()}
 }
 expect(problems).toEqual([])
})}
