import {createHash,randomUUID} from 'node:crypto'
import {ApiError,type Identity} from '../contracts.js'
import {sandboxedExtract} from '../ingest/sandbox.js'
import {chunkDocument,cleanText,evaluateQuality} from '../ingest/prepare.js'
import {lexicalRelevance} from '../../src/lib/rag/rank.js'
import type {Evidence} from '../../src/lib/rag/types.js'
import {sourceCommand,SOURCE_BYTES,SOURCE_TEXT,type SourceReference,type SourceSnapshot,type SourceStatus} from './contracts.js'
import {listSnapshots,readSnapshot,removeSnapshot,saveSnapshot,sourceKey} from './store.js'
import {downloadSource} from './fetch.js'

export async function sourceManifest(identity:Identity,refs:SourceReference[]):Promise<SourceStatus[]>{
 const rows=await listSnapshots(identity,refs.map(sourceKey))
 return refs.map(reference=>{const key=sourceKey(reference),snapshot=rows.find(row=>row.reference_key===key);return {reference,key,status:snapshot?'retained':reference.url?'unread':'attachment-needed',...(snapshot?{snapshot}:{message:reference.url?'This link has not been read.':'Citation metadata only. Attach a readable copy to use this book as evidence.'})}})
}
async function retain(identity:Identity,reference:SourceReference,bytes:Uint8Array,name:string,url:string,signal:AbortSignal){
 if(bytes.length>SOURCE_BYTES||!bytes.length)throw new ApiError(413,'SOURCE_TOO_LARGE','Attach a non-empty PDF, DOCX, HTML or text copy up to 2 MB.')
 if(!/\.(?:pdf|docx|html?|txt|md)$/i.test(name))throw new ApiError(400,'SOURCE_FORMAT','Use a readable PDF, DOCX, HTML or text source.')
 const {extracted}=await sandboxedExtract(bytes,name,signal)
 signal.throwIfAborted()
 const clean=cleanText(extracted.text).text,quality=evaluateQuality(clean)
 if(clean.length<80||quality.grade==='unusable')throw new ApiError(422,'SOURCE_UNREADABLE','No usable source text was found. A scanned or protected book needs a readable text-layer copy or OCR before it can support citations.')
 const truncated=clean.length>SOURCE_TEXT,text=clean.slice(0,SOURCE_TEXT)
 // Retain original bytes; the extraction limit is explicit and never called full-book coverage.
 const snapshot:SourceSnapshot={id:randomUUID(),reference_key:sourceKey(reference),reference,url,sha256:createHash('sha256').update(bytes).digest('hex'),name:name.replace(/[\\/]/g,'_'),mime:extracted.mime,size:bytes.length,text,base64:Buffer.from(bytes).toString('base64'),pages:extracted.pageTexts.length,truncated,created_at:new Date().toISOString(),warnings:[...quality.warnings.slice(0,4),...(truncated?['Only the first 150,000 extracted characters are searchable. The original copy is retained.']:[])]}
 signal.throwIfAborted();return saveSnapshot(identity,snapshot)
}
const fileExtension=(mime:string)=>mime==='application/pdf'?'pdf':mime.includes('wordprocessingml')?'docx':mime.includes('html')?'html':'txt'
export async function executeSources(identity:Identity,body:unknown,signal:AbortSignal,download=downloadSource){
 if(!['instructor','admin'].includes(identity.role))throw new ApiError(403,'FORBIDDEN','Only instructors and the system admin can manage retained teaching sources.')
 const command=sourceCommand.parse(body)
 if(command.operation==='open'){const snapshot=await readSnapshot(identity,command.id,true);return {name:snapshot.name,mime:snapshot.mime,base64:snapshot.base64,sha256:snapshot.sha256}}
 if(command.operation==='review'){const {base64:_base64,...snapshot}=await readSnapshot(identity,command.id);return snapshot}
 if(command.operation==='remove')return removeSnapshot(identity,command.id)
 if(command.operation==='evidence')return retainedSourceEvidence(identity,command.references,command.focus)
 if(command.operation==='list')return {sources:await sourceManifest(identity,command.references)}
 if(command.operation==='attach'){
  const bytes=Buffer.from(command.base64,'base64');if(bytes.toString('base64')!==command.base64)throw new ApiError(400,'SOURCE_FORMAT','The uploaded file encoding is invalid.')
  await retain(identity,command.reference,bytes,command.name,'',signal)
  return {sources:await sourceManifest(identity,[command.reference])}
 }
 const sources=await sourceManifest(identity,command.references)
 for(const source of sources){
  signal.throwIfAborted()
  if(source.snapshot&&!command.refresh||!source.reference.url)continue
  try{
   const response=await download(source.reference.url,signal)
   const snapshot=await retain(identity,source.reference,response.bytes,`source.${fileExtension(response.mime)}`,response.url,signal)
   Object.assign(source,{status:'retained',snapshot,message:undefined})
  }catch(failure){signal.throwIfAborted();source.message=failure instanceof ApiError?failure.message:'The source could not be read. Its link or metadata alone was not used as teaching evidence.';source.status=source.snapshot?'retained':'unavailable'}
 }
 return {sources}
}

/** Deterministic passage selection from immutable private snapshots; no embeddings or paid model. */
export async function retainedSourceEvidence(identity:Identity,refs:SourceReference[],focus:string){
 const manifest=await sourceManifest(identity,refs),evidence:Evidence[]=[]
 for(const source of manifest){
  if(!source.snapshot)continue
  const snapshot=await readSnapshot(identity,source.snapshot.id)
  const chunks=(await chunkDocument(snapshot.reference.title,snapshot.text)).map(chunk=>({chunk,score:lexicalRelevance(focus,chunk.text)})).filter(row=>row.score>=0.12).sort((a,b)=>b.score-a.score).slice(0,3)
  for(const {chunk,score} of chunks)evidence.push({id:`retained:${snapshot.id}:${chunk.index}`,documentId:snapshot.id,title:snapshot.reference.title,text:chunk.text,page:chunk.page,section:chunk.section,flagged:chunk.flagged,origin:'private',method:'provided',url:snapshot.url||undefined,similarity:null,rrf:score,relevance:null,query:focus,retained:{id:snapshot.id,sha256:snapshot.sha256,readAt:snapshot.created_at,reference:snapshot.reference,truncated:snapshot.truncated}})
 }
 return {evidence:evidence.sort((a,b)=>b.rrf-a.rrf).slice(0,12),warning:manifest.some(source=>!source.snapshot)?'Some syllabus references have no retained readable text. Those entries are listed separately and were not used as evidence.':undefined}
}
