import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { workspaceData, WORKSPACE_BYTES } from '../../server/workspace.js'
import { weekSections } from '../../src/utils/outlineSections.js'
import { populationVersion, populationTerm, populationId, learningOutline, syllabusPdf, teachingItems } from './population-content.js'

/** Build new, retained teaching records while preserving all pre-existing content. */
export async function planTeaching(owner:any, workspace:any, courses:any[], dir:string, now=new Date().toISOString()) {
 const data=structuredClone(workspace?.data||{syllabi:[],content:{},registrations:[]})
 const created:string[]=[], prepared:any[]=[], files:string[]=[]
 await mkdir(join(dir,'syllabi'),{recursive:true})
 for(const course of courses){
  const retained=course.teachingSyllabusId?data.syllabi.find((s:any)=>s.id===course.teachingSyllabusId):null
  let syllabus=data.syllabi.find((s:any)=>(!retained||s.id===retained.id)&&s.courseCode===course.code&&s.status==='active'&&!s.suspended&&s.approvedFile&&s.courseInfo?.academicYear===populationTerm.academic_year&&/^(1|first)/i.test(s.courseInfo?.periodOffered||''))
  if(!syllabus){
   syllabus={id:populationId(owner.id,course.code,'syllabus'),courseCode:course.code,courseTitle:course.title,status:'active',sample:false,instructorId:owner.id,instructorName:owner.user_metadata.full_name,version:1,courseInfo:{courseCode:course.code,courseTitle:course.title,academicYear:populationTerm.academic_year,periodOffered:populationTerm.semester,units:'3'},courseDescription:`${course.title} develops foundational concepts, practical applications and evidence-based explanations through guided readings, applied activities and instructor-reviewed assessments.`,courseOutline:learningOutline(course.code,course.title),onlineReferences:[],books:[],provenance:{populationVersion,approvalBasis:'Owner-directed interactive population; authored original without institutional signatures'},history:[{action:'Course teaching basis prepared under the owner population instruction',date:now}]}
   if(retained){syllabus={...syllabus,...retained,id:retained.id,status:'active',courseOutline:retained.courseOutline?.length?retained.courseOutline:syllabus.courseOutline,provenance:{populationVersion,approvalBasis:'Owner-directed interactive population; original outline and identity retained'}}}
   const bytes=await syllabusPdf(syllabus),name=`${course.code.replace(/[^a-z0-9-]/gi,'-')}-course-syllabus.pdf`
   const path=join(dir,'syllabi',`${syllabus.id}.pdf`);await writeFile(path,bytes,{mode:0o600});files.push(path)
   syllabus.approvedFile={name,size:bytes.length,base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex'),uploadedAt:now,approvalAttested:true}
   const existing=data.syllabi.findIndex((s:any)=>s.id===syllabus.id)
   if(existing>=0)data.syllabi[existing]=syllabus;else data.syllabi.push(syllabus)
  }
  const planningId=populationId(owner.id,course.code,'planning')
  if(!prepared.length&&!data.syllabi.some((s:any)=>s.id===planningId)){
   const {approvedFile:_file,history:_history,...draft}=structuredClone(syllabus)
   data.syllabi.push({...draft,id:planningId,status:'drafted',version:1,courseDescription:`Planning notes and additional activities for ${course.title}.`,provenance:{populationVersion,method:'owner-authorized-planning-copy'}})
  }
  for(const row of syllabus.courseOutline){
   for(const section of weekSections(row)){
    const proposals=teachingItems(syllabus,row,section,now)
    for(const [id,item]of Object.entries(proposals)){
     if(!data.content[id]){data.content[id]=item;created.push(id)}
     else if(data.content[id].provenance?.populationVersion===populationVersion)created.push(id)
    }
   }
  }
  prepared.push({code:course.code,syllabus:syllabus.id,weeks:syllabus.courseOutline.map((r:any)=>r.week),blocks:course.blocks.map((b:any)=>b.block)})
 }
 // A resumed run may have prepared a new copy before discovering an explicit
 // management binding. Retire only that batch-authored, unbound copy.
 for(const s of data.syllabi){
  if(s.provenance?.populationVersion!==populationVersion||s.status!=='active'||!prepared.some(c=>c.code===s.courseCode&&c.syllabus!==s.id))continue
  s.status='archived';s.suspended=true
  for(const item of Object.values(data.content)as any[])if(item.syllabusId===s.id&&item.provenance?.populationVersion===populationVersion)item.status='hidden'
 }
 workspaceData.parse(data)
 const serialized=JSON.stringify(data)
 if(Buffer.byteLength(serialized)>WORKSPACE_BYTES-25000)throw Error(`Population teaching exceeds the safe workspace size (${Buffer.byteLength(serialized)} bytes); reduce newly authored content before saving.`)
 const published=structuredClone(data)
 for(const id of created)if(published.content[id].week<=5)published.content[id].status='published'
 workspaceData.parse(published)
 return {expectedRevision:Number(workspace?.revision||0),checked:data,published,created,prepared,files,bytes:Buffer.byteLength(serialized),populationVersion}
}
