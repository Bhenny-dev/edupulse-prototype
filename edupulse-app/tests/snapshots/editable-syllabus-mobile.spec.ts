import {test} from './fixtures'
import {editableSyllabusScene} from '../editable-syllabus-ui'
import {mkdir} from 'node:fs/promises'
const folder='../feature-documentation/system-manual/42-editable-syllabus-workspace'
test('direct syllabus drafts, continuation, saved builder and progressive fields',async({page})=>{test.setTimeout(90000);await mkdir(folder,{recursive:true});await editableSyllabusScene(page,async(name,target=page)=>{await target.screenshot({path:`${folder}/mobile-${name}.png`,animations:'disabled',timeout:30000,style:'.app-topbar{visibility:hidden!important}.outline-table thead th{position:static!important}[data-pulse-ui=mascot]{visibility:hidden!important}.connected-pulse{position:relative!important;inset:auto!important;height:auto!important;max-height:none!important;overflow:visible!important}.connected-pulse-feed{overflow:visible!important;flex:none!important;max-height:none!important}.pulse-draft-review{max-height:none!important;overflow:visible!important}'})})})
