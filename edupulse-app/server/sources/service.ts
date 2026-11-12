import {parseCitation} from '../../src/utils/referenceParsing.js'
import {bibliographicLabel} from '../../src/lib/rag/syllabusReferences.js'
import {discoverReference} from './discovery.js'
import {createHash,randomUUID} from 'node:crypto'
import {ApiError,type Identity} from '../contracts.js'
import {sandboxedExtract} from '../ingest/sandbox.js'
import type {Extracted} from '../ingest/sandbox.js'
import {ingest,listDocuments,deleteDocument} from '../database.js'
import {chunkDocument,cleanText,evaluateQuality} from '../ingest/prepare.js'
import {lexicalRelevance} from '../../src/lib/rag/rank.js'
import type {Evidence} from '../../src/lib/rag/types.js'
import {sourceCommand,SOURCE_BYTES,SOURCE_TEXT,type SourceReference,type SourceSnapshot,type SourceStatus} from './contracts.js'
import {latestSnapshotForUrl,listSnapshots,readSnapshot,removeSnapshot,saveSnapshot,sourceKey} from './store.js'
import {catalogSourceUrl,downloadSource,sourceUrl} from './fetch.js'

export async function sourceManifest(identity:Identity,refs:SourceReference[]):Promise<SourceStatus[]>{
 const rows=await listSnapshots(identity,refs.map(sourceKey))
 return refs.map(reference=>{const key=sourceKey(reference),snapshot=rows.find(row=>row.reference_key===key),metadataOnly=snapshot&&catalogSnapshot(snapshot);return {reference,key,status:snapshot?'retained':reference.url?'unread':'attachment-needed',...(snapshot?{snapshot,...(metadataOnly?{metadataOnly:true,message:snapshot.warnings.join(' ')||'This saved catalog or search listing is metadata only. Its text is excluded from teaching evidence.'}:{})}:{message:reference.url?'This link has not been read.':'Citation metadata only. Attach a readable copy to use this book as evidence.'})}})
}
const catalogSnapshot=(snapshot:Pick<SourceSnapshot,'mime'|'url'|'name'>)=>snapshot.name==='catalog-metadata.txt'||snapshot.mime.includes('html')&&catalogSourceUrl(snapshot.url)
async function retain(identity:Identity,reference:SourceReference,bytes:Uint8Array,name:string,url:string,signal:AbortSignal,parsed?:Extracted){
 if(bytes.length>SOURCE_BYTES||!bytes.length)throw new ApiError(413,'SOURCE_TOO_LARGE','Attach a non-empty PDF, DOCX, HTML or text copy up to 2 MB.')
 if(!/\.(?:pdf|docx|html?|txt|md)$/i.test(name))throw new ApiError(400,'SOURCE_FORMAT','Use a readable PDF, DOCX, HTML or text source.')
 const extracted=parsed||(await sandboxedExtract(bytes,name,signal)).extracted
 signal.throwIfAborted()
 const clean=cleanText(extracted.text).text,quality=evaluateQuality(clean)
 if(clean.length<80||quality.grade==='unusable')throw new ApiError(422,'SOURCE_UNREADABLE','No usable source text was found. A scanned or protected book needs a readable text-layer copy or OCR before it can support citations.')
 const truncated=clean.length>SOURCE_TEXT,text=clean.slice(0,SOURCE_TEXT)
 const parsedCitation=parseCitation(reference.title),detected=extractedReference(extracted,name,url)
 const citation:SourceReference={...reference,title:parsedCitation.title===reference.url?detected.title:parsedCitation.title||reference.title,authors:reference.authors||parsedCitation.authors||detected.authors,year:reference.year||parsedCitation.year||detected.year,publisher:reference.publisher||parsedCitation.publisher||detected.publisher}
 // Retain original bytes; the extraction limit is explicit and never called full-book coverage.
 const snapshot:SourceSnapshot={id:randomUUID(),reference_key:sourceKey(reference),reference:citation,url,sha256:createHash('sha256').update(bytes).digest('hex'),name:name.replace(/[\\/]/g,'_'),mime:extracted.mime,size:bytes.length,text,base64:Buffer.from(bytes).toString('base64'),pages:extracted.pageTexts.length,truncated,created_at:new Date().toISOString(),warnings:[...quality.warnings.slice(0,4),...(truncated?['Only the first 150,000 extracted characters are searchable. The original copy is retained.']:[])]}
 signal.throwIfAborted();return saveSnapshot(identity,snapshot)
}
const fileExtension=(mime:string)=>mime==='application/pdf'?'pdf':mime.includes('wordprocessingml')?'docx':mime.includes('html')?'html':'txt'
function decodeUpload(base64:string){const bytes=Buffer.from(base64,'base64');if(bytes.toString('base64')!==base64)throw new ApiError(400,'SOURCE_FORMAT','The uploaded file encoding is invalid.');return bytes}
export function extractedReference(extracted:Extracted,name:string,url=''):SourceReference {
 const field=(key:string,max=500)=>typeof extracted.meta[key]==='string'?(extracted.meta[key] as string).trim().slice(0,max):''
 return {kind:url?'link':'book',title:field('title')||name.replace(/\.[^.]+$/,'').slice(0,500),authors:field('author',1000),year:field('year',40),publisher:field('publisher'),url,...(field('doi')?{doi:field('doi',300)}:{}),...(field('isbn')?{isbn:field('isbn',80)}:{})}
}
const metadataGaps=(reference:SourceReference)=>['authors','year','publisher'].filter(key=>!reference[key as keyof SourceReference])
export async function executeSources(identity:Identity,body:unknown,signal:AbortSignal,download=downloadSource,discover=discoverReference){
 if(!['instructor','admin'].includes(identity.role))throw new ApiError(403,'FORBIDDEN','Only instructors and the system admin can manage retained teaching sources.')
 const command=sourceCommand.parse(body)
 if(command.operation==='index'){
  const snapshot=await readSnapshot(identity,command.id)
  if(catalogSnapshot(snapshot))throw new ApiError(422,'SOURCE_METADATA_ONLY','Catalog and search listings cannot be indexed as teaching content. Attach a readable source instead.')
  const report=await ingest(identity,{title:snapshot.reference.title.slice(0,160),text:snapshot.text,sourceType:snapshot.mime==='application/pdf'?'pdf':snapshot.mime.includes('wordprocessingml')?'docx':snapshot.mime.includes('html')?'html':'text',fileName:snapshot.name,course:command.course,source:{id:snapshot.id,sha256:snapshot.sha256,readAt:snapshot.created_at,reference:snapshot.reference,truncated:snapshot.truncated,url:snapshot.url}},signal)
  return {indexed:true,documentId:report.id,duplicate:report.duplicate,chunks:report.chunks,embeddingModel:report.embeddingModel}
 }
 if(command.operation==='import-file'||command.operation==='import-link'){
  const url=command.operation==='import-link'?sourceUrl(command.url).href:''
  const existing=url?await latestSnapshotForUrl(identity,url):null
  if(existing){const metadataOnly=catalogSnapshot(existing);return {reference:existing.reference,snapshot:metadataOnly?null:(await sourceManifest(identity,[existing.reference]))[0]!.snapshot,missing:metadataGaps(existing.reference),reused:true,...(metadataOnly?{message:'Catalog or search metadata only. Attach readable teaching contents before using this source as evidence.'}:{})}}
  const response=command.operation==='import-link'?await download(url,signal,{allowCatalog:true}):null
  const bytes=response?response.bytes:decodeUpload((command as Extract<typeof command,{operation:'import-file'}>).base64)
  const name=command.operation==='import-file'?command.name:`source.${fileExtension(response!.mime)}`
  if(!bytes.length||bytes.length>SOURCE_BYTES)throw new ApiError(413,'SOURCE_TOO_LARGE','Attach a non-empty readable source up to 2 MB.')
  const {extracted}=await sandboxedExtract(bytes,name,signal),reference=extractedReference(extracted,command.operation==='import-file'?name:new URL(response!.url).hostname,url)
  const snapshot=response?.metadataOnly?null:await retain(identity,reference,bytes,name,response?.url||'',signal,extracted)
  return {reference,snapshot,missing:metadataGaps(reference),titleOrigin:extracted.meta.title?extracted.meta.titleOrigin||'document metadata':url?'source URL':'file name',...(response?.metadataOnly?{message:'Catalog or search metadata only. Attach readable teaching contents before using this source as evidence.'}:{})}
 }
 if(command.operation==='locate'){
  const matches=[]
  for(const id of [...new Set(command.ids)]){
   const snapshot=await readSnapshot(identity,id)
   if(catalogSnapshot(snapshot))continue
   for(const chunk of await chunkDocument(snapshot.reference.title,snapshot.text)){
    const exactIndex=chunk.text.toLowerCase().indexOf(command.text.toLowerCase()),exact=exactIndex>=0
    const score=exact?1:lexicalRelevance(command.text,chunk.text)
    const sentences=[...chunk.text.matchAll(/[^.!?\n]+(?:[.!?]+|$)/g)].map(match=>({start:match.index,end:match.index!+match[0].length,score:lexicalRelevance(command.text,match[0])})).sort((a,b)=>b.score-a.score)
    const highlight=exact?{start:exactIndex,end:exactIndex+command.text.length}:{start:sentences[0]?.start||0,end:sentences[0]?.end||chunk.text.length}
    if(score>=0.12)matches.push({id:snapshot.id,title:snapshot.reference.title,text:chunk.text,page:chunk.page,section:chunk.section,score,exact,highlight,sha256:snapshot.sha256,readAt:snapshot.created_at,truncated:snapshot.truncated})
   }
  }
  return {matches:matches.sort((a,b)=>b.score-a.score).slice(0,3),message:'Passages are retrieved from your retained copies. Similarity indicates a possible basis, not proof that every generated claim is supported.'}
 }
 if(command.operation==='open'){const snapshot=await readSnapshot(identity,command.id,true);return {name:snapshot.name,mime:snapshot.mime,base64:snapshot.base64,sha256:snapshot.sha256}}
 if(command.operation==='review'){const {base64:_base64,...snapshot}=await readSnapshot(identity,command.id);return snapshot}
 if(command.operation==='remove'){
  await readSnapshot(identity,command.id)
  for(const doc of await listDocuments(identity))if((doc.quality.source as {id?:string}|undefined)?.id===command.id)await deleteDocument(identity,doc.id)
  return removeSnapshot(identity,command.id)
 }
 if(command.operation==='evidence')return retainedSourceEvidence(identity,command.references,command.focus)
 if(command.operation==='list')return {sources:await sourceManifest(identity,command.references)}
 if(command.operation==='attach'){
  const bytes=decodeUpload(command.base64)
  await retain(identity,command.reference,bytes,command.name,'',signal)
  return {sources:await sourceManifest(identity,[command.reference])}
 }
 const sources=await sourceManifest(identity,command.references)
 for(const source of sources){
  signal.throwIfAborted()
  if(source.snapshot&&!command.refresh)continue
  try{
   if(!source.reference.url){
    const found=await discover(source.reference,signal)
    if(!found.candidate){source.status='unavailable';source.message=found.warning;continue}
    const candidate=found.candidate
    const reference:SourceReference={kind:source.reference.kind,title:candidate.title,authors:candidate.authors.join(', '),year:'',publisher:'',url:candidate.url}
    const text=['# Catalog record - metadata only',`## ${candidate.title}`,`**Authors:** ${candidate.authors.join(', ')||'Not supplied'}`,`**Catalog year:** ${candidate.year||'Not supplied'}${candidate.source==='Open Library'?' (first publication; edition not verified)':''}`,`**Catalog venue/publisher:** ${candidate.venue||'Not supplied'}`,`**Identifier:** ${candidate.identifier}`,`**Catalog:** [${candidate.source}](${candidate.url})`,'## Review note',found.warning,'## Original syllabus citation',bibliographicLabel(source.reference)].join('\n\n')
    const bytes=Buffer.from(text),snapshot:SourceSnapshot={id:randomUUID(),reference_key:source.key,reference,url:candidate.url,sha256:createHash('sha256').update(bytes).digest('hex'),name:'catalog-metadata.txt',mime:'text/plain',size:bytes.length,text,base64:bytes.toString('base64'),pages:0,truncated:false,created_at:new Date().toISOString(),warnings:[found.warning]}
    Object.assign(source,{status:'retained',metadataOnly:true,snapshot:await saveSnapshot(identity,snapshot),message:found.warning})
    continue
   }
   const response=await download(source.reference.url,signal,{allowCatalog:true})
   const snapshot=await retain(identity,source.reference,response.bytes,`source.${fileExtension(response.mime)}`,response.url,signal)
   Object.assign(source,{status:'retained',snapshot,...(response.metadataOnly?{metadataOnly:true,message:'Catalog/search listing retained as metadata only; it is excluded from teaching evidence.'}:{metadataOnly:false,message:undefined})})
  }catch(failure){signal.throwIfAborted();source.message=failure instanceof ApiError?failure.message:'The source could not be read. Its link or metadata alone was not used as teaching evidence.';source.status=source.snapshot?'retained':'unavailable'}
 }
 return {sources}
}

/** Deterministic passage selection from immutable private snapshots; no embeddings or paid model. */
export async function retainedSourceEvidence(identity:Identity,refs:SourceReference[],focus:string){
 const manifest=await sourceManifest(identity,refs),evidence:Evidence[]=[]
 for(const source of manifest){
  if(!source.snapshot||source.metadataOnly)continue
  const snapshot=await readSnapshot(identity,source.snapshot.id)
  const chunks=(await chunkDocument(snapshot.reference.title,snapshot.text)).map(chunk=>({chunk,score:lexicalRelevance(focus,chunk.text)})).filter(row=>row.score>=0.12).sort((a,b)=>b.score-a.score).slice(0,3)
  for(const {chunk,score} of chunks)evidence.push({id:`retained:${snapshot.id}:${chunk.index}`,documentId:snapshot.id,title:snapshot.reference.title,text:chunk.text,page:chunk.page,section:chunk.section,flagged:chunk.flagged,origin:'private',method:'provided',url:snapshot.url||undefined,similarity:null,rrf:score,relevance:null,query:focus,retained:{id:snapshot.id,sha256:snapshot.sha256,readAt:snapshot.created_at,reference:snapshot.reference,truncated:snapshot.truncated}})
 }
 return {evidence:evidence.sort((a,b)=>b.rrf-a.rrf).slice(0,12),warning:manifest.some(source=>!source.snapshot||source.metadataOnly)?'Some syllabus references have no retained teaching text or are catalog/search listings. Those entries are listed separately and were not used as evidence.':undefined}
}
