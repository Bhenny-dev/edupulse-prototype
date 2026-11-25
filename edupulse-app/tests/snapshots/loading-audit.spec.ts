import {test} from './fixtures'
import type {Page} from '@playwright/test'
import {mkdir} from 'node:fs/promises'
import {joinLoading,deanSaveLoading,announcementLoading} from '../loading-audit-ui'
const mobile=false
for(const [name,run]of [['join',joinLoading],['dean',(p:Page,c:(name:string)=>Promise<void>)=>deanSaveLoading(p,'dean',c)],['coordinator',(p:Page,c:(name:string)=>Promise<void>)=>deanSaveLoading(p,'associate_dean',c)],['announcement',announcementLoading]] as const)test(`loading audit ${name} ${mobile?'phone':'desktop'}`,async({page})=>{
 if(mobile)await page.setViewportSize({width:390,height:844})
 const root='../feature-documentation/system-manual/57-loading-audit';await mkdir(root,{recursive:true})
 await run(page,async name=>{await page.screenshot({path:`${root}/${mobile?'phone-':''}${name}.png`,animations:'disabled'})})
})
