import {useRef,useState} from 'react'
import {Paperclip} from 'lucide-react'
import {useWorkspace} from '../../context/WorkspaceContext'
import {importSyllabusReference,indexSyllabusReference,aiRequest} from '../../lib/aiClient'
import {addSyllabusReference} from '../../lib/rag/syllabusReferences'
import {jsonValue} from '../../utils/jsonValue'
export default function TeachingFileAttachment({syllabus,week,onSaved,disabled}) {
 const input=useRef(null),{commit}=useWorkspace(),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const attach=async file=>{
  if(!file||busy)return
  setBusy(true);setError('')
  try{
   if(!file.size||file.size>2000000||!(/\.(pdf|docx|html?|txt|md)$/i).test(file.name))throw new Error('Choose a readable PDF, DOCX, HTML, TXT or Markdown file up to 2 MB.')
   const bytes=new Uint8Array(await file.arrayBuffer());let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte)
   const result=await importSyllabusReference({operation:'import-file',name:file.name,base64:btoa(raw)})
   if(!result.snapshot)throw new Error('The file could not be retained as readable teaching content.')
   const source=await aiRequest('syllabus-sources','POST',{operation:'review',id:result.snapshot.id})
   await indexSyllabusReference(source.id,syllabus.courseCode)
   const text=source.text.slice(0,18000),sections=[]
   for(let offset=0;offset<text.length;offset+=6000)sections.push({heading:`${file.name} · part ${sections.length+1}`,body:text.slice(offset,offset+6000)})
   const id=crypto.randomUUID(),content={title:file.name,subtitle:source.text.length>18000?'Instructor attachment · reading excerpt; open retained copy for the complete searchable text':'Instructor teaching attachment',viewMode:'document',sections,ai:{manualAttachment:true,sources:[{id:source.id,title:source.reference.title,text:text.slice(0,1200),retained:{id:source.id,sha256:source.sha256,readAt:source.created_at,reference:source.reference,truncated:source.truncated}}]}}
   const receipt=await commit(data=>{
    const current=data.syllabi.find(value=>value.id===syllabus.id)
    if(!current||jsonValue(current.courseOutline)!==jsonValue(syllabus.courseOutline))throw new Error('The outline changed during attachment. The retained file is safe; reopen the current week before adding it.')
    return {...data,syllabi:data.syllabi.map(value=>value.id===syllabus.id?addSyllabusReference(value,result.reference):value),content:{...data.content,[id]:{syllabusId:syllabus.id,week,type:'material',status:'draft',content,title:file.name,attachedAt:new Date().toISOString()}}}
   })
   onSaved?.(receipt)
  }catch(failure){setError(failure.message)}finally{setBusy(false)}
 }
 return <div><button className="btn btn-secondary btn-sm" disabled={disabled||busy} onClick={()=>input.current?.click()}><Paperclip size={14}/>{busy?'Reading teaching file…':'Attach teaching file'}</button><input ref={input} hidden type="file" accept=".pdf,.docx,.html,.htm,.txt,.md" aria-label={`Teaching file for week ${week}`} onChange={event=>{const file=event.target.files?.[0];event.target.value='';void attach(file)}}/>{error&&<p role="alert">{error}</p>}</div>
}
