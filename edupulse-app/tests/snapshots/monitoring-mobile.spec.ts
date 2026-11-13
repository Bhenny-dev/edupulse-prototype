import {test,type Page,type Locator} from './fixtures'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {monitoringScenes,monitoringReadingScene,monitoringAvailabilityScenes} from '../monitoring-ui'
const root='../feature-documentation/system-manual/37-instructor-monitoring'
const aliases:Record<string,string>={}
const shot=(page:Page)=>async(name:string,target:Page|Locator=page)=>{
 if(process.env.SNAPSHOT_SCENES&&!new RegExp(process.env.SNAPSHOT_SCENES).test(name))return
 await mkdir(root,{recursive:true});await page.mouse.move(1,1)
 await target.screenshot({path:`${root}/mobile-${name}.png`,animations:'disabled',scale:'css',...(target===page?{fullPage:true}:{}),style:'.app-topbar{position:static !important}[data-pulse-ui=mascot]{visibility:hidden !important}'})
 if(aliases[name]){
  const directory='../feature-documentation/system-walkthrough/04-instructor';await writeFile(`${directory}/${aliases[name]}.png`,await readFile(`${root}/${name}.png`))
  const file='../feature-documentation/system-walkthrough/capture-manifest.json',manifest=JSON.parse(await readFile(file,'utf8'));const entries=Array.isArray(manifest)?manifest:manifest.scenes
  const entry=entries.find((e:any)=>e.folder==='04-instructor'&&e.file===aliases[name]+'.png');if(entry)Object.assign(entry,{role:'Instructor',title:'Course-scoped Student Monitoring',route:'/student-monitoring',ok:true});await writeFile(file,JSON.stringify(manifest,null,2)+'\n')
 }
}
test('monitoring class discovery, scoped charts and membership dialogs',async({page})=>{await page.setViewportSize({width:390,height:1400});await monitoringScenes(page,shot(page))})
test('student confirms sections in the full material reader',async({page})=>{await page.setViewportSize({width:390,height:1400});await monitoringReadingScene(page,shot(page))})

test('monitoring explains the unreleased course without invented results',async({page})=>{await page.setViewportSize({width:390,height:1400});await monitoringAvailabilityScenes(page,shot(page))})
