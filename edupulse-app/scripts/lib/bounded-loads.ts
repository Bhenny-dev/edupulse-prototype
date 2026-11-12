import type {PopulationInput} from './population-plan.js'
export const boundedLoadVersion='instructor-5-10-course-blocks-2026-11-13'
/** Select actual assignments, not a display slice. Keep existing course/block identities. */
export function boundedLoads(input:PopulationInput){
 const loads=input.institutional.filter(r=>r.kind==='loads')
 const owners=input.owners.filter(o=>o.role==='instructor'&&loads.some(l=>l.data.InstructorID===o.id)).sort((a,b)=>a.name.localeCompare(b.name))
 if(owners.length!==7||loads.some(l=>!['cit-curriculum-loading-2026-11-12',boundedLoadVersion].includes(l.data.AllocationSource)))throw Error('Expected seven generated instructor allocations; preserve unrelated loads')
 const rows=loads.map(l=>{const owner=owners.find(o=>o.id===l.data.InstructorID)!,s=owner.workspace.data.syllabi.find((s:any)=>s.courseCode===l.data.CourseCode&&s.status!=='archived');if(!s)throw Error('Load has no owned syllabus');return {...l,data:{...l.data,AllocationSource:boundedLoadVersion} as Record<string,string>,active:s.status==='active',primary:Boolean(s.teachingSetRole),key:[l.data.CourseCode,l.data.Block,l.data.Semester].join('|')}}).sort((a,b)=>a.key.localeCompare(b.key))
 const kept:typeof rows=[],counts=new Map<string,number>(),coverage=new Map<string,number>(),activeBlocks=new Set<string>()
 const add=(r:typeof rows[number])=>{if(kept.some(k=>k.key===r.key)||(counts.get(r.data.InstructorID)||0)>=10)return false;kept.push(r);counts.set(r.data.InstructorID,(counts.get(r.data.InstructorID)||0)+1);coverage.set(r.data.Block,(coverage.get(r.data.Block)||0)+1);if(r.active)activeBlocks.add(r.data.Block);return true}
 const groups=[...new Set(rows.map(r=>r.data.InstructorID+':'+r.data.CourseCode))].map(key=>rows.filter(r=>r.data.InstructorID+':'+r.data.CourseCode===key)).sort((a,b)=>Number(b[0].active)-Number(a[0].active)||Number(b[0].primary)-Number(a[0].primary)||a[0].key.localeCompare(b[0].key))
 const choose=(group:typeof rows)=>[...group].sort((a,b)=>Number(activeBlocks.has(a.data.Block)&&a.active)-Number(activeBlocks.has(b.data.Block)&&b.active)||(coverage.get(a.data.Block)||0)-(coverage.get(b.data.Block)||0)||a.key.localeCompare(b.key))[0]
 // First cover each approved offering, then every block that already has released courses.
 for(const g of groups.filter(g=>g[0].active))add(choose(g))
 for(const block of [...new Set(rows.filter(r=>r.active).map(r=>r.data.Block))].sort())if(!activeBlocks.has(block)){
  const candidates=rows.filter(r=>r.active&&r.data.Block===block&&(counts.get(r.data.InstructorID)||0)<10).sort((a,b)=>(counts.get(a.data.InstructorID)||0)-(counts.get(b.data.InstructorID)||0)||a.key.localeCompare(b.key))
  if(!candidates.length||!add(candidates[0]))throw Error('Cannot preserve released-course coverage within the workload limit')
 }
 for(const g of groups.filter(g=>!g[0].active))add(choose(g))
 const instructors=owners.map(o=>({id:o.id,name:o.name,courseBlocks:kept.filter(l=>l.data.InstructorID===o.id).length,courses:new Set(kept.filter(l=>l.data.InstructorID===o.id).map(l=>l.data.CourseCode)).size}))
 if(instructors.some(o=>o.courseBlocks<5||o.courseBlocks>10))throw Error('Every instructor must have 5–10 actual course/block assignments')
 const allBlocks=new Set(input.institutional.filter(r=>r.kind==='rosters'&&!['inactive','withdrawn'].includes(r.data.Status)).map(r=>r.data.Block))
 if([...allBlocks].some(b=>!kept.some(l=>l.data.Block===b)))throw Error('A recorded student block would be left without a class')
 return {loads:kept.map(({data})=>data),keys:kept.map(r=>r.key).sort(),summary:{before:loads.length,after:kept.length,blocks:allBlocks.size,activeBlocks:activeBlocks.size,instructors,unassignedCourseGroups:groups.filter(g=>!kept.some(r=>r.data.InstructorID===g[0].data.InstructorID&&r.data.CourseCode===g[0].data.CourseCode)).length}}
}
