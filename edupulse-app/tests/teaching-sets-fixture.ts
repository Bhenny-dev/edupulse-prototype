import type {Page} from '@playwright/test'
import {deliveryFixtureInput} from './delivery-fixture-data'
import {deliveryPlan} from '../scripts/lib/delivery-plan'
import {instructorUpdatesUI,sharedStore,sender} from './instructor-updates-fixture'
export async function teachingSetsUI(page:Page){
 const input=deliveryFixtureInput(),plan=deliveryPlan(input),store=sharedStore()
 store.workspaces=Object.fromEntries(plan.owners.map(o=>[o.id,o.workspace.data]));store.revisions=Object.fromEntries(plan.owners.map(o=>[o.id,1]))
 store.shares=plan.shares.map((share,index)=>{
  const from=plan.owners.find(o=>o.id===share.sender)!,to=plan.owners.find(o=>o.id===share.recipient)!,source=from.workspace.data.syllabi.find(s=>s.id===share.syllabus)!
  const {approvedFile:_file,...snapshot}=source
  return {id:`${String(index+1).padStart(8,'0')}-1111-4111-8111-111111111111`,sender_id:from.id,recipient_id:to.id,syllabus_id:source.id,sender_name:'Synthetic '+from.name,recipient_name:'Synthetic '+to.name,created_at:'2026-11-12T04:00:00Z',courseCode:source.courseCode,courseTitle:source.courseTitle,snapshot,recipient_hidden:false}
 })
 const owner=plan.owners.find(o=>o.id===sender)!,draft=owner.workspace.data.syllabi.find(s=>s.teachingSetRole==='draft')!
 // One saved check exposes the disabled Publish action before actual approval.
 owner.workspace.data.content[`gen-mat-${draft.id}-w1`].status='checked'
 const fixture=await instructorUpdatesUI(page,sender,store)
 fixture.records.institutional=[];fixture.records.attempts=[];fixture.records.accesses=[];fixture.records.publications=[];fixture.records.notices=[];fixture.records.events=[]
 fixture.records.courses=input.courses.filter(c=>c.instructor_id===sender).map(c=>({id:c.id,course_code:c.course_code,course_title:owner.workspace.data.syllabi.find(s=>s.id===c.syllabus_id)!.courseTitle,active:true,instructor_id:sender}))
 await page.route('**/api/ai?action=syllabus-sources',route=>route.fulfill({json:{sources:[]}}))
 return {...fixture,owner,draft,plan}
}
