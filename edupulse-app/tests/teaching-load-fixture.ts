import type {Page} from '@playwright/test'
import {makeScannedPdf} from './fixtures'
import {deanManagementUI} from './dean-management-fixture'

const teacher='22222222-2222-4222-8222-222222222222'
/** A real PDF table with fictional identities; optionally an image-only scan. */
export async function teachingLoadPdf(scan=false,page?:Page){
 const width=1000,height=650,xs=[30,55,155,385,535,580,620,660,705,770,835,895,970],ys=[520,480,440,400]
 const texts:[string,number,number][]=[['CONFIRMATION OF TEACHING LOAD',280,615],['First Semester, AY 2026-2027',310,590],['Instructor: ALEX SAMPLE',30,565],['Highest Degree Earned: Masters',30,545],...['SUBJECT','DESCRIPTIVE TITLE','TIME','DAY','UNIT','LEC','LAB','HOURS','ROOM','STUDENT','COURSE'].map((s,i)=>[s,xs[i+1]+3,500] as [string,number,number]),['1',35,460],...['IT 102 A','Programming foundations','7:30 - 10:00','TTH','3','2','1','5','A310','35','BSIT'].map((s,i)=>[s,xs[i+1]+3,460] as [string,number,number]),['TOTAL UNITS:',385,420],['3',583,420],['TOTAL HOURS:',625,420],['5',708,420],['Conforme:',30,375]]
 if(scan){
  if(!page)throw new Error('The scan fixture needs a browser canvas.')
  const encoded=await page.evaluate(({width,height,xs,ys,texts})=>{
   const canvas=document.createElement('canvas');canvas.width=width*3;canvas.height=height*3
   const ctx=canvas.getContext('2d')!;ctx.scale(3,3);ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.strokeStyle='black';ctx.lineWidth=.8
   for(const x of xs){ctx.beginPath();ctx.moveTo(x,height-ys[0]);ctx.lineTo(x,height-ys.at(-1)!);ctx.stroke()}
   for(const y of ys){ctx.beginPath();ctx.moveTo(xs[0],height-y);ctx.lineTo(xs.at(-1)!,height-y);ctx.stroke()}
   ctx.fillStyle='black';ctx.font='10px Arial';for(const [s,x,y]of texts)ctx.fillText(s,x,height-y)
   return canvas.toDataURL('image/jpeg').split(',')[1]
  },{width,height,xs,ys,texts})
  return makeScannedPdf([{jpeg:new Uint8Array(Buffer.from(encoded,'base64'))}],{width,height})
 }
 const escape=(s:string)=>s.replace(/[\\()]/g,m=>'\\'+m)
 const stream=['0.6 w',...xs.map(x=>`${x} 400 m ${x} 520 l S`),...ys.map(y=>`30 ${y} m 970 ${y} l S`),...texts.map(([s,x,y])=>`BT /F1 10 Tf ${x} ${y} Td (${escape(s)}) Tj ET`)].join('\n')
 const objects=['','<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
 let pdf='%PDF-1.4\n';const offsets:number[]=[]
 for(let i=1;i<objects.length;i++){offsets[i]=Buffer.byteLength(pdf);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
 const start=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
 return new Uint8Array(Buffer.from(pdf))
}
/** The same form as a screenshot: drawn at screen size with crisp 1 px rules, as a PNG (fictional identities). */
export async function teachingLoadPicture(page:Page){
 const width=1000,height=650,xs=[30,55,155,385,535,580,620,660,705,770,835,895,970],ys=[520,480,440,400]
 const texts:[string,number,number][]=[['CONFIRMATION OF TEACHING LOAD',280,615],['First Semester, AY 2026-2027',310,590],['Instructor: ALEX SAMPLE',30,565],['Highest Degree Earned: Masters',30,545],...['SUBJECT','DESCRIPTIVE TITLE','TIME','DAY','UNIT','LEC','LAB','HOURS','ROOM','STUDENT','COURSE'].map((s,i)=>[s,xs[i+1]+3,500] as [string,number,number]),['1',35,460],...['IT 102 A','Programming foundations','7:30 - 10:00','TTH','3','2','1','5','A310','35','BSIT'].map((s,i)=>[s,xs[i+1]+3,460] as [string,number,number]),['TOTAL UNITS:',385,420],['3',583,420],['TOTAL HOURS:',625,420],['5',708,420],['Conforme:',30,375]]
 const encoded=await page.evaluate(({width,height,xs,ys,texts})=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.strokeStyle='black';ctx.lineWidth=1
  for(const x of xs){ctx.beginPath();ctx.moveTo(x+.5,height-ys[0]);ctx.lineTo(x+.5,height-ys.at(-1)!);ctx.stroke()}
  for(const y of ys){ctx.beginPath();ctx.moveTo(xs[0],height-y+.5);ctx.lineTo(xs.at(-1)!,height-y+.5);ctx.stroke()}
  ctx.fillStyle='black';ctx.font='11px Arial';for(const [s,x,y]of texts)ctx.fillText(s,x,height-y)
  return canvas.toDataURL('image/png').split(',')[1]
 },{width,height,xs,ys,texts})
 return Buffer.from(encoded,'base64')
}
export async function teachingLoadUI(page:Page,role='dean'){
 const fixture=await deanManagementUI(page,role)
 fixture.records.institutional=fixture.records.institutional!.filter(r=>r.kind!=='loads')
 fixture.records.directory.instructors.push({id:teacher,name:'Alex Sample',email:'alex@example.invalid',status:'active',has_masters:true,degree:'Masters'})
 const commands:any[]=[],inference:string[]=[]
 await page.route('**/api/ai?*',async route=>{
  const request=route.request(),action=new URL(request.url()).searchParams.get('action')
  if(['chat','chat-context','operator','courseware','web-search','system-chat'].includes(action||'')){inference.push(action!);return route.fulfill({status:500,json:{error:{message:'No model call is permitted for load extraction.'}}})}
  if(action==='extract'){
   // The real sandbox rejects an image-only PDF until its text has been read by OCR.
   if(decodeURIComponent(request.headers()['x-file-name']||'')==='scanned-load.pdf')return route.fulfill({status:422,json:{error:{code:'NO_READABLE_TEXT',message:'No usable text was extracted. This PDF needs OCR.'}}})
   return route.fulfill({json:{kind:'pdf',text:'CONFIRMATION OF TEACHING LOAD',quality:{metrics:{pages:1},warnings:[]},meta:{},stages:[]}})
  }
  if(action==='academic'&&request.method()==='POST'&&request.postDataJSON()?.command?.action==='load.import_document'){
   const command=request.postDataJSON().command;commands.push(command)
   for(const e of command.entries)fixture.records.institutional!.push({kind:'loads',record_key:'course:'+e.course_code+':'+e.instructor_id,data:{CourseCode:e.course_code,Block:'',LoadType:'course',Semester:e.semester,AcademicYear:e.academic_year,InstructorID:e.instructor_id,InstructorName:'Alex Sample',ScheduleTime:e.time,ScheduleDays:e.days,Room:e.room,Units:String(e.units),LectureUnits:String(e.lecture),LabUnits:String(e.lab),DeclaredHours:String(e.hours),ComputedHours:String(e.computed_hours),StudentCount:String(e.students),Program:e.program,SourceFile:command.filename,SourcePage:String(e.page)}})
   return route.fulfill({json:{imported:command.entries.length,created:command.entries.length,updated:0,unchanged:0}})
  }
  return route.fallback()
 })
 return {...fixture,commands,inference}
}
