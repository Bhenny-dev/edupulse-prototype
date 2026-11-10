import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import {makePdf} from './fixtures.js'
import {collectSyllabusReferences} from '../src/lib/rag/syllabusReferences.js'
import {buildCourseInput} from '../src/utils/courseInput.js'
import {downloadSource,isPublicAddress,sourceUrl} from '../server/sources/fetch.js'
import {executeSources,retainedSourceEvidence,sourceManifest} from '../server/sources/service.js'
import {readSnapshot} from '../server/sources/store.js'
import {closeLocalDb} from '../server/database.js'
import {handleRequest} from '../server/http.js'
import {draftCoursewareStep,assembleCourseware} from '../src/lib/rag/courseware.js'
import {coursewarePlan} from '../src/lib/rag/coursewarePlan.js'
import type {CourseInput,Identity} from '../server/contracts.js'

const reference={kind:'link' as const,title:'Original network teaching reference',url:'https://sources.example.org/networks.pdf',authors:'Synthetic teaching author',year:'2026',publisher:'Source test publisher'}
const book={...reference,kind:'book' as const,title:'Unlinked networking book',url:''}
const lesson='Network components include hosts, switches, routers and the links between them. Hosts create and receive application data. A switch connects devices within a local network and forwards frames using its learned addresses. A router connects different networks and makes forwarding decisions from its routing information. A network cable provides a physical path for signals between connected interfaces. Wireless links use radio signals instead of a cable. These components have different roles even when a small home device combines several functions. A classroom network can connect student computers to one switch and connect that switch to a router. Local traffic can remain within the classroom network while traffic for another network passes through the router. Draw each device and label each connection before selecting equipment. Identify the sender, the receiver and the path followed by data. Compare a direct connection with a network that contains an intermediate switch. Explain which component changes when another local host is added and which component connects a second network. Check that a proposed topology represents the actual connections rather than treating every device as interchangeable. Use an explicit example and describe the assumptions, the expected path and a way to check the result. Keep physical connections distinct from application services when explaining a network diagram.'
function pdf(text=lesson){return Buffer.from(makePdf([['Original network teaching reference',...text.match(/.{1,88}(?:\s|$)/g)||[text]]]))}

test('course generation includes Section 7 books, links and exact weekly resources without duplicating URLs',()=>{
 const syllabus={courseCode:'IT 202',courseTitle:'Networking',books:[book],onlineReferences:[reference],references:{books:[book],onlineReferences:[reference]},courseOutline:[{week:1,ilos:'Identify network components.',contents:['Network components'],resources:[{name:'Same source',url:reference.url},{name:'Additional reading',url:'https://sources.example.org/extra'}]},{week:2,resources:[{name:'Later reference',url:'https://sources.example.org/later'}]}]}
 const refs=collectSyllabusReferences(syllabus,1);assert.equal(refs.length,3);assert.equal(refs[0]!.authors,book.authors);assert.equal(collectSyllabusReferences(syllabus).length,4)
 assert.deepEqual(buildCourseInput(syllabus,1).syllabusReferences,refs)
})

test('source fetching rejects private DNS, encoded IPs, mixed answers, redirect attacks and pins the public socket address',async()=>{
 for(const address of ['127.0.0.1','0.0.0.0','10.1.2.3','100.64.0.1','192.168.1.1','169.254.169.254','198.18.1.1','203.0.113.1','224.0.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::'])assert.equal(isPublicAddress(address),false,address)
 assert.equal(isPublicAddress('1.1.1.1'),true);assert.equal(isPublicAddress('2606:4700:4700::1111'),true)
 for(const url of ['file:///etc/passwd','https://user:secret@example.org','https://127.1','http://2130706433','https://example.org:8443/source','https://[::1]/'])assert.throws(()=>sourceUrl(url))
 let requests=0,resolutions=0
 const resolve=async()=>{resolutions++;return [{address:'1.1.1.1',family:4}]}
 const request=async(_url:URL,address:{address:string})=>{requests++;assert.equal(address.address,'1.1.1.1');return {status:200,headers:{type:'text/plain'},bytes:Buffer.from(lesson)}}
 assert.equal((await downloadSource(reference.url,new AbortController().signal,{resolve,request})).bytes.length,Buffer.byteLength(lesson));assert.equal(resolutions,1);assert.equal(requests,1)
 await assert.rejects(downloadSource(reference.url,new AbortController().signal,{resolve:async()=>[{address:'1.1.1.1',family:4},{address:'10.1.1.1',family:4}],request}),{code:'SOURCE_URL'})
 await assert.rejects(downloadSource(reference.url,new AbortController().signal,{resolve,request:async()=>({status:302,headers:{location:'http://127.0.0.1/secret'},bytes:new Uint8Array()})}),{code:'SOURCE_URL'})
 await assert.rejects(downloadSource(reference.url,new AbortController().signal,{resolve,request:async()=>({status:200,headers:{type:'text/plain'},bytes:Buffer.alloc(2_000_001)})}),{code:'SOURCE_TOO_LARGE'})
 await assert.rejects(downloadSource('https://openlibrary.org/works/OL1W',new AbortController().signal,{resolve,request:async()=>({status:200,headers:{type:'text/html'},bytes:Buffer.from('<title>Book catalog</title><p>Title and author metadata only.</p>')})}),{code:'SOURCE_METADATA_ONLY'})
 await assert.rejects(downloadSource(reference.url,new AbortController().signal,{resolve,request:async()=>({status:200,headers:{type:'text/html'},bytes:Buffer.from('<title>Sign in</title><input type="password">')})}),{code:'SOURCE_ACCESS_REQUIRED'})
})

test('real PDF snapshots persist privately, reuse cached text, preserve refreshed versions and feed checked passage citations into generation',async()=>{
 const hosted=process.env.VERCEL;delete process.env.VERCEL;process.env.AI_VECTOR_STORE='local';process.env.AI_DATA_DIR=join(await mkdtemp(join(tmpdir(),'edupulse-retained-')),'db')
 const identity:Identity={id:'source-owner',role:'instructor',local:true},other:Identity={...identity,id:'other-owner'},signal=new AbortController().signal
 let bytes=pdf(),fetches=0;const download=async()=>{fetches++;return {bytes,mime:'application/pdf',url:reference.url}}
 try{
  assert.equal((await sourceManifest(identity,[book]))[0]!.status,'attachment-needed')
  assert.deepEqual((await retainedSourceEvidence(identity,[book],'network components')).evidence,[])
  const first=await executeSources(identity,{operation:'read',references:[reference]},signal,download) as {sources:any[]};assert.equal(first.sources[0].status,'retained',JSON.stringify(first.sources[0]));const snapshot=first.sources[0].snapshot
  assert.equal(snapshot.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(snapshot.pages,1)
  assert.equal('base64' in snapshot,false);assert.equal('text' in snapshot,false)
  await executeSources(identity,{operation:'read',references:[reference]},signal,download);assert.equal(fetches,1)
  const read=await readSnapshot(identity,snapshot.id,true);assert.equal(read.base64,bytes.toString('base64'));assert.match(read.text,/Network components/)
  await assert.rejects(readSnapshot(other,snapshot.id,true),{code:'SOURCE_NOT_FOUND'})
  bytes=pdf(lesson+' A changed edition adds a second classroom network.')
  const refreshed=await executeSources(identity,{operation:'read',references:[reference],refresh:true},signal,download) as {sources:any[]}
  assert.notEqual(refreshed.sources[0].snapshot.id,snapshot.id);assert.equal(refreshed.sources[0].snapshot.versions,2)
  assert.equal((await readSnapshot(identity,snapshot.id)).sha256,snapshot.sha256)
  assert.equal((await sourceManifest(identity,[{...reference,year:'2027'}]))[0]!.status,'unread','a changed edition cannot silently use an earlier citation association')
  const input:CourseInput={courseCode:'IT 202',courseTitle:'Networking',week:1,topics:['Network components'],outcomes:'Identify network components.',referenceText:'',syllabusReferences:[reference,book],plan:{activities:'',assessments:'',teachingMaterials:[],resources:[]},research:'sources'}
  let sawPassage=false
  const result=await draftCoursewareStep({...input,stepKey:'lesson-1'},signal,{provider:'controlled-source-test',search:async()=>({evidence:[]}),sourceEvidence:(refs,focus)=>retainedSourceEvidence(identity,refs,focus),generate:async(_system,prompt)=>{const payload=JSON.parse(prompt);sawPassage=payload.retrievedReferences.some((ref:any)=>ref.page===1&&ref.text.includes('Network components'));return JSON.stringify({material:{title:'Network components lesson',sections:[{heading:'Network components and their roles',body:lesson},{heading:'Apply the roles to a classroom network',body:lesson}]}})}})
  assert(sawPassage);assert(result.verification.supported>0);assert.equal(result.verification.invalidCitations.length,0)
  assert.match(result.content.material!.sections[0]!.body,/\[1\]/)
  const refs=result.content.material!.sections.find(section=>section.heading==='References')!.body
  assert.match(refs,/retained .*SHA-256/);assert.match(refs,/Listed in the syllabus; readable text was not used/);assert.match(refs,/Unlinked networking book/)
  const multi={...input,topics:['Network components','Network cables','Network switches','Network routers']},parts=coursewarePlan(multi)
  const groups=parts.map((part,index)=>({...result,step:part,sources:result.sources.map(source=>({...source,id:source.id+'-part-'+index}))}))
  const assembled=assembleCourseware(multi,[...groups].reverse());assert.match(assembled.content.material!.sections[2]!.body,new RegExp('\\['+(result.sources.length+1)+'\\]'));assert.equal(assembled.sources[result.sources.length]!.citation,result.sources.length+1)
  await executeSources(identity,{operation:'attach',reference:book,name:'licensed-book.pdf',base64:bytes.toString('base64')},signal)
  assert.equal((await sourceManifest(identity,[book]))[0]!.status,'retained')
  process.env.AI_LOCAL_MODE='true'
  const command=(body:unknown)=>new Request('http://localhost/api/ai?action=syllabus-sources',{method:'POST',body:JSON.stringify(body)})
  const attached=await handleRequest(command({operation:'attach',reference:book,name:'book.pdf',base64:bytes.toString('base64')}));assert.equal(attached.status,200)
  const id=(await attached.json()).sources[0].snapshot.id
  const reviewed=await handleRequest(command({operation:'review',id}));assert.equal(reviewed.status,200);assert.equal('base64' in await reviewed.json(),false)
  const opened=await handleRequest(command({operation:'open',id}));assert.equal(opened.status,200);assert.equal((await opened.json()).base64,bytes.toString('base64'))
  delete process.env.AI_LOCAL_MODE;assert.equal((await handleRequest(command({operation:'list',references:[reference]}))).status,403)
 }finally{delete process.env.AI_LOCAL_MODE;await closeLocalDb();if(hosted!==undefined)process.env.VERCEL=hosted}
})

test('hosted source archives enforce staff ownership, immutable versions and student/anonymous denial with RLS',async()=>{
 const db=new PGlite()
 try{
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$; GRANT USAGE ON SCHEMA auth TO authenticated; INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`)
  await db.exec(await readFile('supabase/migrations/20261109100000_retained_syllabus_sources.sql','utf8'))
  // Supabase projects can have broader default table grants than a new local database.
  await db.exec('GRANT ALL ON public.edupulse_source_archives TO authenticated,anon')
  await db.exec(await readFile('supabase/migrations/20261109101500_source_archive_grants.sql','utf8'))
  await db.exec(`SET ROLE authenticated;SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';SET request.jwt.claims='{"app_metadata":{"role":"instructor"}}';`)
  const id='33333333-3333-4333-8333-333333333333'
  await db.query(`INSERT INTO public.edupulse_source_archives(id,owner_id,reference_key,reference,url,sha256,name,mime,size,text,base64,pages,truncated) VALUES($1,auth.uid(),$2,$3::jsonb,'',$2,'source.txt','text/plain',100,$4,'eA==',0,false)`,[id,'a'.repeat(64),JSON.stringify(book),lesson])
  await assert.rejects(db.exec(`UPDATE public.edupulse_source_archives SET name='changed.txt'`))
  await assert.rejects(db.exec('TRUNCATE public.edupulse_source_archives'),/permission denied/)
  await db.exec(`SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`);assert.equal((await db.query('SELECT id FROM public.edupulse_source_archives')).rows.length,0);assert.equal((await db.query('DELETE FROM public.edupulse_source_archives RETURNING id')).rows.length,0)
  await db.exec(`SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';SET request.jwt.claims='{"app_metadata":{"role":"student"}}';`);assert.equal((await db.query('SELECT id FROM public.edupulse_source_archives')).rows.length,0)
  await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT id FROM public.edupulse_source_archives'))
 }finally{await db.close()}
})
