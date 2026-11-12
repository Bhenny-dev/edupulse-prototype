import {test,expect} from './fixtures'
import {pipelineProgressUI} from '../pipeline-progress-fixture'
import {mkdir} from 'node:fs/promises'
const dir='../feature-documentation/system-manual/33-pipeline-progress'
// Student scenes retain public content/progress after metadata hardening. The native SQL test
// verifies private teacher traces/keys never enter publication rows; UI transports cannot prove RLS.
for(const [role,path,name] of [['instructor','student-monitoring?course='+ 'a'.repeat(32)+'&block=BSIT-1A&tab=assessments','01-instructor-scores'],['instructor','student-monitoring?course='+ 'a'.repeat(32)+'&block=BSIT-1A&tab=materials','02-instructor-opens'],['student','assessment','03-student-score'],['student','courseware','04-student-opens']])test(`pipeline progress: ${name}`,async({page})=>{
 await pipelineProgressUI(page,role);await page.goto('/#/'+path)
 if(name==='03-student-score'){await page.getByRole('button',{name:'Open assessment',exact:true}).first().click();await expect(page.getByRole('status').filter({hasText:'Saved score: 1/3'})).toBeVisible();await page.getByRole('status').filter({hasText:'Saved score: 1/3'}).scrollIntoViewIfNeeded()}
 else if(role==='instructor')await expect(page.getByRole('heading',{name:name==='01-instructor-scores'?'Assessment scores by student':'Learning material access by student',exact:true})).toBeVisible()
 else {await page.getByRole('button',{name:/^Open course /}).first().click();await expect(page.getByText('material · Opened',{exact:true})).toBeVisible()}
 await expect(page.getByText(/Pipeline test|labelled pipeline/i)).toHaveCount(0)
 await mkdir(dir,{recursive:true});await page.screenshot({path:`${dir}/${name}.png`,fullPage:name!=='03-student-score',animations:'disabled'})
})

for(const [role,path,name] of [['student','performance?tab=scores','08-student-attempts'],['student','dashboard','09-student-dashboard'],['instructor','dashboard','10-instructor-dashboard']])test(`progress labels removed: ${name}`,async({page})=>{
 await pipelineProgressUI(page,role);await page.goto('/#/'+path);await expect(page.getByRole('heading',{name:path.startsWith('performance')?'Recorded assessment attempts':role==='student'?'Student Dashboard':'Instructor Dashboard',exact:true})).toBeVisible();await expect(page.getByText(/Pipeline test|labelled pipeline/i)).toHaveCount(0);await page.screenshot({path:`${dir}/${name}.png`,fullPage:true,animations:'disabled'})
})
