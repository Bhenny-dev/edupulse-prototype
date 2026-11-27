import {test} from './fixtures'
import {mkdir} from 'node:fs/promises'
import {academicPopulationScene} from '../academic-population-ui'
for(const role of ['instructor','student'])test(`populated ${role} workspace on phone`,async({page})=>{
 const folder='../feature-documentation/system-manual/56-academic-population';await mkdir(folder,{recursive:true})
 await academicPopulationScene(page,role,async name=>{if(process.env.SNAPSHOT_SCENES&&!new RegExp(process.env.SNAPSHOT_SCENES).test(name))return;if(name==='instructor-stream')await page.getByRole('region',{name:'Week 5',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${folder}/phone-${name}.png`,animations:'disabled'})})
})
