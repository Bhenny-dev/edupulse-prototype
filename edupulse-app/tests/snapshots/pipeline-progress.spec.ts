import {test,expect} from './fixtures'
import {pipelineProgressUI} from '../pipeline-progress-fixture'
import {mkdir} from 'node:fs/promises'
const dir='../feature-documentation/system-manual/33-pipeline-progress'
for(const [role,path,name] of [['instructor','student-monitoring?tab=assessments','01-instructor-scores'],['instructor','student-monitoring?tab=materials','02-instructor-opens'],['student','assessment','03-student-score'],['student','courseware','04-student-opens']])test(`pipeline progress: ${name}`,async({page})=>{
 await pipelineProgressUI(page,role);await page.goto('/#/'+path)
 if(name==='03-student-score'){await page.getByRole('button',{name:'Open assessment',exact:true}).first().click();await expect(page.getByRole('status').filter({hasText:'Pipeline test · Saved score: 1/3'})).toBeVisible()}
 else await expect(page.getByText(/Pipeline test|labelled pipeline/).first()).toBeVisible()
 await mkdir(dir,{recursive:true});await page.screenshot({path:`${dir}/${name}.png`,fullPage:true,animations:'disabled'})
})
