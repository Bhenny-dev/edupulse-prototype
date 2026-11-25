import { populationId, populationTerm, populationVersion } from './population-content.js'
export const availableAccount=(a:any)=>a&&![true,'true'].includes(a.app_metadata?.suspended)&&(!a.banned_until||Date.parse(a.banned_until)<Date.now())
export const currentLoad=(r:any)=>r.kind==='loads'&&r.data.AcademicYear===populationTerm.academic_year&&/^(1|first)/i.test(r.data.Semester||'')&&!/inactive|suspended|withdrawn|deleted/i.test(r.data.Status||'')
const cit=(s:any)=>/Information Technology/i.test(s.department||'')
const department=(s:any,p:string)=>p==='CTELA'?/Teacher Education/i.test(s.department||''):p==='CABM'?/Accountancy and Business/i.test(s.department||''):p==='BSIT'?cit(s):false
/** Original management loads determine department scope; no unrelated fallback. */
export function populationPlan(snapshot:any) {
 const accounts=new Map<string,any>(snapshot.accounts.map((a:any)=>[a.id,a]))
 const owners=snapshot.accounts.filter((a:any)=>a.app_metadata.role==='instructor'&&availableAccount(a)).sort((a:any,b:any)=>a.id.localeCompare(b.id))
 const loads=snapshot.edupulse_institutional_records.filter(currentLoad),catalog=snapshot.edupulse_institutional_records.filter((r:any)=>r.kind==='courses')
 const programs=new Set<string>(loads.flatMap((l:any)=>(l.data.SourceRows||[]).map((r:any)=>r.program)).filter(Boolean))
 const explicit=new Set<string>(snapshot.edupulse_enrollments.filter((e:any)=>snapshot.edupulse_courses.some((c:any)=>c.id===e.course_id&&c.academic_year===populationTerm.academic_year&&/^(1|first)/i.test(c.semester||''))).map((e:any)=>e.student_email))
 for(const w of snapshot.edupulse_workspaces)for(const r of w.data.registrations||[])if(r.status==='active'&&r.academicYear===populationTerm.academic_year&&/^(1|first)/i.test(r.semester||''))for(const s of r.students||[])if(s.Email)explicit.add(s.Email.toLowerCase())
 const students=snapshot.edupulse_students.filter((s:any)=>s.active&&accounts.get(s.user_id)?.app_metadata.role==='student'&&availableAccount(accounts.get(s.user_id))&&(cit(s)||explicit.has(s.email)||[...programs].some(p=>department(s,p)))).sort((a:any,b:any)=>(a.department+a.program+a.year_level+a.student_number).localeCompare(b.department+b.program+b.year_level+b.student_number))
 if(!owners.length||!students.length)throw Error('Active registered instructors and related students are required.')
 if(new Set(students.map((s:any)=>s.email)).size!==students.length||new Set(students.map((s:any)=>s.student_number)).size!==students.length)throw Error('Duplicate registered student identity.')
 const plans:any[]=[],membership=new Map<string,Set<string>>()
 for(const owner of owners){
  const codes=new Set<string>(loads.filter((l:any)=>l.data.InstructorID===owner.id&&l.data.LoadType==='course').map((l:any)=>l.data.CourseCode))
  for(const code of codes){
   const parent=loads.find((l:any)=>l.data.InstructorID===owner.id&&l.data.LoadType==='course'&&l.data.CourseCode===code),entry=catalog.find((r:any)=>r.data.CourseCode===code)?.data
   if(!entry&&!parent)throw Error('Missing recorded course identity: '+code)
   const year=Number(entry?.YearLevel)||Number(String(code).match(/(?:IT|WMAD)\s*([1-4])\d\d/)?.[1])||(/WMADE [34]|CP 2/.test(code)?4:/WMADE 1/.test(code)?3:0)
   const sourcePrograms=[...new Set<string>((parent?.data.SourceRows||[]).map((r:any)=>r.program).filter(Boolean))]
   const bound=parent?.data.TeachingSyllabusID||loads.find((l:any)=>l.data.InstructorID===owner.id&&l.data.CourseCode===code&&l.data.TeachingSyllabusID)?.data.TeachingSyllabusID
   const plan={owner:owner.id,code,title:parent?.data.CourseTitle||entry.CourseTitle,year,parent:parent?.record_key,teachingSyllabusId:bound,programs:sourcePrograms.length?sourcePrograms:['BSIT'],blocks:[] as any[]}
   for(const load of loads.filter((l:any)=>l.data.InstructorID===owner.id&&l.data.CourseCode===code&&l.data.Block&&l.data.LoadType!=='course')){
    const rows=snapshot.edupulse_enrollments.filter((e:any)=>e.instructor_id===owner.id&&e.block_section===load.data.Block&&snapshot.edupulse_courses.some((c:any)=>c.id===e.course_id&&c.course_code===code&&c.academic_year===populationTerm.academic_year))
    const prior=snapshot.edupulse_workspaces.find((w:any)=>w.owner_id===owner.id)?.data.registrations?.filter((r:any)=>r.courseCode===code&&r.blockSection===load.data.Block&&r.status==='active')||[]
    const emails=new Set<string>([...rows.map((r:any)=>r.student_email),...prior.flatMap((r:any)=>(r.students||[]).map((s:any)=>s.Email?.toLowerCase()))].filter(Boolean))
    const assigned=membership.get(code)||new Set<string>();for(const mail of emails)assigned.add(mail);membership.set(code,assigned)
    plan.blocks.push({block:load.data.Block,existing:emails.size,students:[],schedule:!(load.data.ScheduleDays&&load.data.ScheduleTime)})
   }
   plans.push(plan)
  }
 }
 let unplacedMemberships=0
 for(const code of [...new Set(plans.map(p=>p.code))]){
  const group=plans.filter(p=>p.code===code),assigned=membership.get(code)||new Set<string>(),related=[...new Set<string>(group.flatMap(p=>p.programs))]
  const candidates=students.filter((s:any)=>related.some(p=>department(s,p))&&(!related.every(p=>p==='BSIT')||!group[0].year||s.year_level===group[0].year))
  const remaining=candidates.filter((s:any)=>!assigned.has(s.email));let cursor=0
  const take=(n:number)=>{const rows=[];while(rows.length<n&&cursor<remaining.length){const s=remaining[cursor++];if(assigned.has(s.email))continue;assigned.add(s.email);rows.push({StudentID:s.student_number,Email:s.email})}return rows}
  for(const p of group)for(const b of p.blocks)b.students=take(Math.max(0,35-b.existing))
  unplacedMemberships+=remaining.length-cursor
 }
 for(const owner of owners)if(plans.filter(p=>p.owner===owner.id).reduce((n,p)=>n+p.blocks.length,0)>190)throw Error('Registration capacity exceeded.')
 return {version:populationVersion,allocationPolicy:'loaded-sections-only',term:populationTerm,owners:owners.map((o:any)=>o.id),studentCount:students.length,courses:plans,summary:{instructors:owners.length,students:students.length,citStudents:students.filter(cit).length,relatedDepartments:[...programs].filter(p=>p!=='BSIT'),courses:plans.length,classes:plans.reduce((n,p)=>n+p.blocks.length,0),addedMemberships:plans.reduce((n,p)=>n+p.blocks.reduce((s:number,b:any)=>s+b.students.length,0),0),unplacedMemberships},id:populationId(populationVersion)}
}
