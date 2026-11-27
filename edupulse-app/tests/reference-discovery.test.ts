import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {executeSources,retainedSourceEvidence} from '../server/sources/service.js'
import {closeLocalDb,localDb} from '../server/database.js'
import type {Identity} from '../server/contracts.js'
test('book discovery persists reusable catalog identity, excludes it from teaching evidence and permits a readable replacement',async()=>{
 const keys=['VERCEL','AI_VECTOR_STORE','AI_DATA_DIR'] as const,previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
 delete process.env.VERCEL
 process.env.AI_VECTOR_STORE='local';process.env.AI_DATA_DIR=join(await mkdtemp(join(tmpdir(),'edupulse-citation-')),'db')
 const actor:Identity={id:'citation-owner',local:true,role:'instructor'},signal=new AbortController().signal
 const reference={kind:'book' as const,title:'Anderson, David R. (1019). Quantitative approaches to decision making',url:'',authors:'',year:'',publisher:''}
 const candidate={title:'Quantitative approaches to decision making',authors:['David R. Anderson'],year:2019,venue:'Cengage',url:'https://openlibrary.org/works/OL123W',source:'Open Library' as const,identifier:'OL123W',relevance:null,summary:''}
 let searches=0
 const discover=async()=>{searches++;return {candidate,warning:'The original year 1019 differs from the catalog year 2019. Verify the edition.'}}
 const download=async()=>{throw Error('A catalog match cannot download full book text')}
 try{
  const first=await executeSources(actor,{operation:'read',references:[reference]},signal,download,discover) as any
  const row=first.sources[0];assert.equal(row.metadataOnly,true);assert(row.snapshot.id)
  const list=await executeSources(actor,{operation:'list',references:[reference]},signal) as any
  assert.equal(list.sources[0].snapshot.id,row.snapshot.id);assert.equal(list.sources[0].metadataOnly,true)
  await executeSources(actor,{operation:'read',references:[reference]},signal,download,discover);assert.equal(searches,1)
  assert.deepEqual((await retainedSourceEvidence(actor,[reference],'quantitative approaches')).evidence,[])
  await assert.rejects(executeSources(actor,{operation:'index',id:row.snapshot.id},signal),{code:'SOURCE_METADATA_ONLY'})
  const review=await executeSources(actor,{operation:'review',id:row.snapshot.id},signal) as any
  assert.match(review.text,/# Catalog record/);assert.match(review.text,/Original syllabus citation/)
  const chapter='Quantitative approaches to decision making require clearly defined variables, stated constraints and an objective. Compare feasible alternatives and justify the selected model using assumptions and observed evidence. '.repeat(4)
  await executeSources(actor,{operation:'attach',reference,name:'licensed-chapter.txt',base64:Buffer.from(chapter).toString('base64')},signal)
  const retained=await executeSources(actor,{operation:'list',references:[reference]},signal) as any
  assert.notEqual(retained.sources[0].metadataOnly,true)
  assert((await retainedSourceEvidence(actor,[reference],'quantitative approaches decision')).evidence.length)
  await assert.rejects(executeSources({...actor,id:'another-owner'},{operation:'review',id:row.snapshot.id},signal))
 }finally{await closeLocalDb();for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
})

test('serverless storage guard still rejects a local source database',async()=>{
 const hosted=process.env.VERCEL
 process.env.VERCEL='1'
 try{await assert.rejects(localDb(),{code:'LOCAL_STORE_DISABLED'})}
 finally{if(hosted===undefined)delete process.env.VERCEL;else process.env.VERCEL=hosted}
})

test('an unreadable cited link offers other pages and retains a chosen page under the same reference for review (T9.4)',async()=>{
 const keys=['VERCEL','AI_VECTOR_STORE','AI_DATA_DIR'] as const,previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
 delete process.env.VERCEL
 process.env.AI_VECTOR_STORE='local';process.env.AI_DATA_DIR=join(await mkdtemp(join(tmpdir(),'edupulse-candidates-')),'db')
 const actor:Identity={id:'candidate-owner',local:true,role:'instructor'},signal=new AbortController().signal
 const reference={kind:'link' as const,title:'Switching and routing basics',url:'https://gone.example.org/switching',authors:'R. Example',year:'',publisher:''}
 const page='Switching and routing basics. A switch forwards frames between devices on one local network using MAC addresses. A router forwards packets between networks using IP addresses and a routing table. '.repeat(4)
 const evidence=(url:string,title:string)=>({id:url,documentId:null,title,text:'Switching and routing basics overview for networking courses.',url,page:null,section:null,flagged:false,origin:'web' as const,method:'web-search' as const,similarity:null,rrf:0,relevance:null,query:''})
 const queries:string[]=[]
 const search=async(query:string)=>{queries.push(query);return {evidence:[evidence(reference.url,'Original'),evidence('https://en.wikipedia.org/wiki/Network_switch','Network switch - Wikipedia'),evidence('https://notes.example.edu/switching','Switching notes'),evidence('https://notes.example.edu/switching','Switching notes (again)'),evidence('https://course.example.net/routing','Routing basics')]}}
 const downloads:string[]=[]
 const download=async(url:string)=>{downloads.push(url);if(url===reference.url)throw Error('unreachable');if(url.includes('catalog'))return {bytes:Buffer.from('listing'),mime:'text/html',url,metadataOnly:true};return {bytes:Buffer.from(`<html><body><h1>Switching</h1><p>${page}</p></body></html>`),mime:'text/html',url}}
 try{
  const read=await executeSources(actor,{operation:'read',references:[reference]},signal,download as any) as any
  assert.equal(read.sources[0].status,'unavailable','the cited link cannot be read')
  const found=await executeSources(actor,{operation:'candidates',reference},signal,download as any,undefined,search as any) as any
  assert.deepEqual(found.candidates.map((c:any)=>c.url),['https://notes.example.edu/switching','https://course.example.net/routing'],'no Wikipedia, no duplicate, never the unreadable link again')
  assert.match(queries[0],/Switching and routing basics/);assert.match(queries[0],/R\. Example/)
  await assert.rejects(executeSources(actor,{operation:'attach-link',reference,url:'https://catalog.example.org/search?q=switching'},signal,download as any),{code:'SOURCE_METADATA_ONLY'})
  const attached=await executeSources(actor,{operation:'attach-link',reference,url:found.candidates[0].url},signal,download as any) as any
  const row=attached.sources[0];assert.equal(row.status,'retained');assert.notEqual(row.metadataOnly,true);assert.equal(row.reference.url,reference.url,'the syllabus citation is unchanged')
  const review=await executeSources(actor,{operation:'review',id:row.snapshot.id},signal) as any
  assert.match(review.text,/router forwards packets/)
  assert((await retainedSourceEvidence(actor,[reference],'switch router packets')).evidence.length,'the attached page becomes the reference\'s teaching evidence')
  assert.equal(downloads.filter(url=>url===reference.url).length,1)
 }finally{await closeLocalDb();for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
})
