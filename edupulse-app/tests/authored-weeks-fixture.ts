import type {Page} from '@playwright/test'
import {baselineUI,baselineWorkspace} from './baseline-fixture'
import {authoredPlan,type AuthoredInput} from '../scripts/lib/authored-weeks-plan'

// Actual authored lesson data; fictional identities and controlled UI transport.
export async function authoredWeeksUI(page:Page){
 const fixture=await baselineUI(page),owner='fe67b9d2-719b-4b10-91cd-76031ab115fe'
 const input:AuthoredInput={actor:'synthetic-admin',owners:[{id:owner,name:'Synthetic instructor',role:'instructor',workspace:{revision:1,data:{syllabi:[{id:'authored-java',courseCode:'IT 102',courseTitle:'Computer Programming 1',status:'drafted',instructorId:owner,version:1,courseOutline:Array.from({length:18},(_,i)=>({week:i+1,ilos:'',contents:[]}))}],content:{},registrations:[]}}}]}
 const data=authoredPlan(input).owners[0].workspace.data
 // UI-only approved status makes the normal reader accessible without manufacturing hosted approval.
 data.syllabi[0].status='active';data.syllabi[0].approvedFile=baselineWorkspace.syllabi[0].approvedFile as never
 fixture.setWorkspace(data)
 fixture.records.courses=[{...fixture.records.courses[0],course_code:'IT 102',course_title:'Computer Programming 1',instructor_id:owner,outline:data.syllabi[0].courseOutline,active:true,syllabus_status:'active'}]
 fixture.records.publications=[];fixture.records.attempts=[];fixture.records.accesses=[];fixture.records.notices=[];fixture.records.events=[]
 await page.route('**/api/ai?action=syllabus-sources',route=>route.request().postDataJSON()?.operation==='list'?route.fulfill({json:{sources:[]}}):route.fulfill({status:400,json:{error:{message:'Only the empty retained-source list is provided by this UI capture.'}}}))
 return {...fixture,data}
}
