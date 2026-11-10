import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Document,Packer,Paragraph} from 'docx'
import {citationMetadata} from '../server/ingest/formats.mjs'
import {sandboxedExtract} from '../server/ingest/sandbox.js'
import {executeSources} from '../server/sources/service.js'
import {readSnapshot} from '../server/sources/store.js'
import {closeLocalDb,listDocuments,searchPrivate} from '../server/database.js'
import {keywordSearch} from '../server/rag/keyword.js'
import {embedTexts} from '../server/ml/onnx.js'
import {indexedSourceMetadata} from '../server/sources/contracts.js'
import {addSyllabusReference,removeSyllabusReference,collectSyllabusReferences} from '../src/lib/rag/syllabusReferences.js'
import {syllabusBlocks} from '../src/utils/syllabusFiles.js'
import {syllabusPatch} from '../src/agents/editorTools.js'
import type {Identity} from '../server/contracts.js'

const body='A network switch forwards frames within a local network. A router forwards packets between networks. The practice topology connects two classroom switches to one router. Label the sender, destination and next hop before tracing a packet. Compare the paths when the destination is on the same network and when it is on another network. Explain the forwarding decision using the destination address and the routing table. This sample teaching text is original test content, not an institutional policy or a published textbook.'
const html=`<html><head><title>Site title</title><meta name="citation_title" content="A Classroom Network"><meta name="citation_author" content="Sample Author"><meta name="citation_author" content="Second Author"><meta name="citation_publication_date" content="2025/03/20"><meta name="citation_publisher" content="Sample Teaching Press"><meta name="citation_doi" content="10.1234/example"></head><body><h1>Network forwarding</h1><p>${body}</p></body></html>`

test('source metadata uses explicit citation fields, JSON-LD and document properties without invented publication years',async()=>{
 const meta=citationMetadata(html,true);assert.equal(meta.title,'A Classroom Network');assert.equal(meta.author,'Sample Author, Second Author');assert.equal(meta.year,'2025');assert.equal(meta.doi,'10.1234/example')
 const json=citationMetadata('<script type="application/ld+json">{"@graph":[{"@type":"Organization","name":"Site"},{"@type":"Book","name":"Sample Book","author":[{"name":"A Writer"}],"datePublished":"2024-01-01","publisher":{"name":"A Press"},"isbn":"9780000000000"}]}</script>',true)
 assert.equal(json.title,'Sample Book');assert.equal(json.author,'A Writer');assert.equal(json.publisher,'A Press');assert.equal(json.isbn,'9780000000000')
 assert.equal(citationMetadata('<title>Sample Guide</title><p>Copyright 2026. Modified in 2025.</p>',true).year,'')
 assert.equal(citationMetadata('---\ntitle: Sample Guide\nauthor: A Writer\nyear: 2023\n---\n# A section\n'+body).year,'2023')
 const bytes=await Packer.toBuffer(new Document({title:'An Uploaded Reference',creator:'A Researcher',sections:[{children:[new Paragraph(body)]}]}))
 const extracted=(await sandboxedExtract(bytes,'guide.docx',AbortSignal.timeout(30000))).extracted
 assert.equal(extracted.meta.title,'An Uploaded Reference');assert.equal(extracted.meta.author,'A Researcher');assert.equal(extracted.meta.year,undefined,'Word creation time is not a publication year')
})

test('reference intake persists exact source bytes, indexes reusable private passages, cites provenance and removes only its own indexed version',async()=>{
 const hosted=process.env.VERCEL;delete process.env.VERCEL;process.env.AI_VECTOR_STORE='local';process.env.AI_DATA_DIR=join(await mkdtemp(join(tmpdir(),'edupulse-reference-intake-')),'db')
 const owner:Identity={id:'reference-owner',role:'instructor',local:true},other:Identity={...owner,id:'other-reference-owner'},signal=AbortSignal.timeout(60000)
 let downloads=0
 const download=async()=>{downloads++;return {bytes:Buffer.from(html),mime:'text/html',url:'https://sources.example.org/guide'}}
 try{
  const imported=await executeSources(owner,{operation:'import-link',url:'https://sources.example.org/guide'},signal,download) as any
  assert.equal(imported.reference.title,'A Classroom Network');assert.deepEqual(imported.missing,[]);assert.equal(imported.snapshot.mime,'text/html')
  const snapshot=await readSnapshot(owner,imported.snapshot.id,true);assert.equal(snapshot.base64,Buffer.from(html).toString('base64'));assert.match(snapshot.text,/Network forwarding/);assert.doesNotMatch(snapshot.text,/citation_author/)
  await executeSources(owner,{operation:'import-link',url:'https://sources.example.org/guide'},signal,download);assert.equal(downloads,1,'reuse retained bytes without downloading again')
  const abort=new AbortController();abort.abort();await assert.rejects(executeSources(owner,{operation:'index',id:snapshot.id,course:'IT 202'},abort.signal));assert.equal((await listDocuments(owner)).length,0);assert.equal((await readSnapshot(owner,snapshot.id)).id,snapshot.id)
  const indexed=await executeSources(owner,{operation:'index',id:snapshot.id,course:'IT 202'},signal) as any;assert.equal(indexed.indexed,true);assert(indexed.chunks>0)
  const repeated=await executeSources(owner,{operation:'index',id:snapshot.id,course:'IT 202'},signal) as any;assert.equal(repeated.duplicate,true);assert.equal(repeated.documentId,indexed.documentId)
  const hits=await keywordSearch(owner,'network switch forwarding',[],signal);assert(hits.length);assert.equal(hits[0]!.retained!.id,snapshot.id);assert.equal(hits[0]!.retained!.sha256,snapshot.sha256);assert.equal(hits[0]!.url,imported.reference.url)
  assert.deepEqual(await keywordSearch(other,'network switch forwarding',[],signal),[])
  const [embedding]=await embedTexts(['network switch forwarding'],signal),vectors=await searchPrivate(owner,embedding!,['network','switch'],8,undefined,signal)
  assert(vectors.some(hit=>hit.document_id===indexed.documentId));assert.equal(indexedSourceMetadata(vectors[0]!.quality).retained?.id,snapshot.id)
  await assert.rejects(executeSources(other,{operation:'index',id:snapshot.id},signal),{code:'SOURCE_NOT_FOUND'})
  await assert.rejects(executeSources({...owner,role:'student'},{operation:'import-link',url:imported.reference.url},signal),{code:'FORBIDDEN'})
  const catalog=await executeSources(owner,{operation:'import-link',url:'https://openlibrary.org/works/example'},signal,async()=>({bytes:Buffer.from(html),mime:'text/html',url:'https://openlibrary.org/works/example',metadataOnly:true})) as any
  assert.equal(catalog.snapshot,null);assert.match(catalog.message,/metadata only/);assert.equal((await listDocuments(owner)).length,1)
  await executeSources(owner,{operation:'remove',id:snapshot.id},signal);assert.equal((await listDocuments(owner)).length,0);assert.deepEqual(await keywordSearch(owner,'network switch',[],signal),[])
  const file=await executeSources(owner,{operation:'import-file',name:'practice.md',base64:Buffer.from('# Network practice\n\n'+body).toString('base64')},signal) as any
  assert.equal(file.reference.title,'Network practice');assert.deepEqual(file.missing,['authors','year','publisher']);assert.equal(file.titleOrigin,'document heading')
 }finally{await closeLocalDb();if(hosted!==undefined)process.env.VERCEL=hosted}
})

test('citation associations retain legacy entries, deduplicate reimports and carry identifiers into form validation and export',()=>{
 const first={kind:'link' as const,title:'A Classroom Network',url:'https://sources.example.org/guide',authors:'Sample Author',year:'2025',publisher:'Sample Teaching Press',doi:'10.1234/example'}
 const before={courseCode:'IT 202',courseOutline:[],books:[{title:'Existing Book',authors:'Prior Author',year:'2020',publisher:'Prior Press'}],references:{onlineReferences:[{title:'Old title',url:first.url}]}}
 const added=addSyllabusReference(before,first),again=addSyllabusReference(added,first)
 assert.equal(collectSyllabusReferences(again).length,2);assert.equal(again.books[0].title,'Existing Book');assert.equal(again.references.onlineReferences.length,0)
 assert(syllabusPatch.safeParse({books:again.books,onlineReferences:again.onlineReferences}).success)
 assert(syllabusBlocks(again).some(row=>row.text.includes('Sample Author. (2025). A Classroom Network. Sample Teaching Press. DOI: 10.1234/example')))
 const removed=removeSyllabusReference(again,first);assert.equal(removed.books.length,1);assert.equal(collectSyllabusReferences(removed).length,1)
})
