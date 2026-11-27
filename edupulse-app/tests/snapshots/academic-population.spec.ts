import {test} from './fixtures'
import {mkdir} from 'node:fs/promises'
import {academicPopulationScene} from '../academic-population-ui'
for(const role of ['instructor','student'])test(`populated ${role} workspace`,async({page})=>{
 const folder='../feature-documentation/system-manual/56-academic-population';await mkdir(folder,{recursive:true})
 await academicPopulationScene(page,role,async name=>{if(process.env.SNAPSHOT_SCENES&&!new RegExp(process.env.SNAPSHOT_SCENES).test(name))return;await page.screenshot({path:`${folder}/${name}.png`,animations:'disabled'})})
})
