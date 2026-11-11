import {test,type Page,type Locator} from './fixtures'
import {mkdir} from 'node:fs/promises'
import {instructorDashboardScene,instructorSyllabusScene,instructorSharingScene} from '../instructor-updates-ui'
const folder='../feature-documentation/system-manual/36-instructor-syllabi'
const shot=(page:Page)=>async(name:string,target:Page|Locator=page)=>{await mkdir(folder,{recursive:true});await target.screenshot({path:`${folder}/mobile-${name}.png`,animations:'disabled',style:'.app-topbar{position:static !important}[data-pulse-ui=mascot]{visibility:hidden !important}'})}
test('phone dashboard course blocks and saved score results',async({page})=>{await instructorDashboardScene(page,shot(page))})
test('phone syllabus table, merged history and confirmed deletion',async({page})=>{await instructorSyllabusScene(page,shot(page))})
test('phone own repository and received syllabi',async({page})=>{await instructorSharingScene(page,shot(page))})
