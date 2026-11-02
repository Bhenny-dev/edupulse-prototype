import { readFile,writeFile,appendFile,mkdir } from 'node:fs/promises'
import { resolve,dirname } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { planStudents } from './lib/student-import.mjs'

const arg=name=>process.argv[process.argv.indexOf(name)+1]
if(!process.argv.includes('--input'))throw new Error('Provide --input with the official student list. Default is a dry run.')
const fallbacks=process.argv.includes('--name-fallbacks')?JSON.parse(await readFile(arg('--name-fallbacks'),'utf8')):{}
const {students,rejected}=planStudents(await readFile(arg('--input'),'utf8'),fallbacks)
const counts=key=>Object.fromEntries([...new Set(students.map(row=>row[key]))].sort().map(value=>[value,students.filter(row=>row[key]===value).length]))
const summary={total:students.length,rejected,usernameFormat:'studentnumber@gmail.com',years:counts('year_level'),departments:counts('department'),programs:counts('program')}
if(!process.argv.includes('--apply')) {console.log(JSON.stringify({...summary,dryRun:true},null,2));process.exit(0)}
if(!process.argv.includes('--credentials'))throw new Error('Provide a private --credentials CSV path outside tracked source.')
const url=process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const secret=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url || !secret)throw new Error('The application project URL and server-only Supabase secret are required.')
if(new URL(url).hostname!=='xyziepdkdvvuhgkymooo.supabase.co')throw new Error('This official list is authorized only for the EduPulse project.')
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
const existing=[]
for(let page=1;;page++) {
  const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000})
  if(error)throw new Error('Could not check existing accounts; no account passwords were changed.')
  existing.push(...data.users)
  if(data.users.length<1000)break
}
const byEmail=new Map(existing.map(user=>[user.email?.toLowerCase(),user]))
const byId=new Map(existing.map(user=>[user.id,user])),profiles=[]
for(let offset=0;;offset+=1000) {
  const {data,error}=await admin.from('edupulse_students').select('student_number,user_id').order('student_number').range(offset,offset+999)
  if(error)throw new Error('Could not check official profile ownership; no accounts were changed.')
  profiles.push(...data);if(data.length<1000)break
}
const existingUser=student=>{
  const profile=profiles.find(profile=>profile.student_number===student.student_number)
  return profile?byId.get(profile.user_id):existing.find(user=>user.app_metadata?.official_student_number===student.student_number)
}
for(const student of students) {
  const user=existingUser(student),collision=byEmail.get(student.email)
  if((user && user.app_metadata?.role!=='student') || (collision && collision.id!==user?.id))throw new Error(`Account conflict for student number ${student.student_number}. Unrelated accounts are never overwritten.`)
}
const credentials=resolve(arg('--credentials'))
if(!credentials.endsWith('.csv') || credentials.includes(`${resolve('src')}`))throw new Error('Use a private CSV path outside application source.')
await mkdir(dirname(credentials),{recursive:true})
const csv=value=>`"${String(value ?? '').replaceAll('"','""')}"`
await writeFile(credentials,['Student number','Name','Username','Initial password','Year level','Department','Program'].map(csv).join(',')+'\r\n',{mode:0o600,flag:'wx'})
let created=0,reused=0,renamed=0,completed=0
for(const student of students) {
  const {password,...profile}=student
  let user=existingUser(student)
  const retained=Boolean(user)
  if(!user) {
    const {data,error}=await admin.auth.admin.createUser({email:student.email,password,email_confirm:true,app_metadata:{role:'student',official_student_number:student.student_number},user_metadata:profile})
    if(error || !data.user)throw new Error(`Account creation stopped at student number ${student.student_number} (${error?.code || 'unknown'}). Completed records are retained in the private receipt.`)
    user=data.user;created++
  } else {
    const {error}=await admin.auth.admin.updateUserById(user.id,{email:student.email,email_confirm:true,app_metadata:{...user.app_metadata,official_student_number:student.student_number},user_metadata:{...user.user_metadata,...profile}})
    if(error)throw new Error(`Account update stopped at student number ${student.student_number} (${error.code}). No password was reset.`)
    if(user.email!==student.email)renamed++
    reused++
  }
  const {error}=await admin.from('edupulse_students').upsert({...profile,user_id:user.id,active:true},{onConflict:'student_number'})
  if(error)throw new Error(`Profile save stopped at student number ${student.student_number} (${error.code}). The created account remains available for a safe rerun.`)
  await appendFile(credentials,[student.student_number,student.full_name,student.email,retained?'Existing password retained':password,student.year_level,student.department,student.program].map(csv).join(',')+'\r\n')
  completed++
  if(completed%100===0)console.log(JSON.stringify({completed,total:students.length,created,reused}))
}
console.log(JSON.stringify({...summary,created,reused,renamed,completed,credentialsFile:credentials},null,2))
