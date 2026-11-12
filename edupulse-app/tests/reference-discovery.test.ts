import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {executeSources,retainedSourceEvidence} from '../server/sources/service.js'
import {closeLocalDb} from '../server/database.js'
import type {Identity} from '../server/contracts.js'
test('book discovery persists reusable catalog identity, excludes it from teaching evidence and permits a readable replacement',async()=>{
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
 }finally{await closeLocalDb()}
})
