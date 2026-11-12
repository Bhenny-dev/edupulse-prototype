import type { Page } from '@playwright/test'
import { academicUI } from './academic-ui-fixture'
export const DIRECTORY_PROGRAM='Bachelor of Science in Information Technology with Specialization in Web and Mobile Application Development'
export const DIRECTORY_DEPARTMENT='College of Information Technology'
export async function directoryFixture(page: Page) {
 await academicUI(page,async()=>({json:{courses:[],publications:[],enrollments:[],attempts:[],accesses:[],institutional:[]}}))
 const rows=Array.from({length:52},(_,i)=>({student_number:`SAMPLE-${String(i+1).padStart(3,'0')}`,email:`student${i+1}@example.invalid`,full_name:i===0?'Riley Demo':i===1?'Taylor Sample':`Synthetic Student ${i+1}`,year_level:i%2+1,department:DIRECTORY_DEPARTMENT,program:DIRECTORY_PROGRAM}))
 let workspace={revision:0,data:{syllabi:[],content:{},registrations:[] as Record<string,unknown>[]},mode:'cloud'}
 let failed=false
 await page.route('**/api/ai?*',async route=>{
  const url=new URL(route.request().url()),action=url.searchParams.get('action')
  if(action==='students') {
   const q=(url.searchParams.get('q') || '').toLowerCase()
   const filtered=rows.filter(row=>(!q || `${row.full_name} ${row.student_number}`.toLowerCase().includes(q)) && (!url.searchParams.get('year') || String(row.year_level)===url.searchParams.get('year')) && (!url.searchParams.get('department') || row.department===url.searchParams.get('department')) && (!url.searchParams.get('program') || row.program===url.searchParams.get('program')))
   const offset=Number(url.searchParams.get('offset') || 0)
   return route.fulfill({json:{students:filtered.slice(offset,offset+50),total:filtered.length,offset,pageSize:50}})
  }
  if(action==='academic'){
   if(route.request().method()!=='GET')return route.fulfill({json:{synced:true}})
   const registrations=workspace.data.registrations as any[],course={id:'a'.repeat(32),course_code:'IT 102',course_title:'Computer Programming 1',instructor_id:'fe67b9d2-719b-4b10-91cd-76031ab115fe',active:true}
   return route.fulfill({json:{courses:registrations.length?[course]:[],publications:[],enrollments:registrations.flatMap(r=>(r.students||[]).map((st:any)=>({course_id:course.id,student_email:st.Email,display_name:st.Name,student_ref:st.StudentID,block_section:r.blockSection,year_level:Number(st.YearLevel)}))),attempts:[],accesses:[],institutional:[]}})
  }
  if(action==='workspace') {
   if(route.request().method()==='PUT') {
    if(failed)return route.fulfill({status:503,json:{error:{code:'WORKSPACE_UNAVAILABLE',message:'Synthetic save failure: retry when connected.'}}})
    const input=route.request().postDataJSON();workspace={revision:workspace.revision+1,data:input.data,mode:'cloud'}
   }
   return route.fulfill({json:workspace})
  }
  return route.fallback()
 })
 return {failSaves:(value:boolean)=>{failed=value},workspace:()=>workspace}
}
