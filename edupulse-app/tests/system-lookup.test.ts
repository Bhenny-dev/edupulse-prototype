import test from 'node:test'
import assert from 'node:assert/strict'
import { chatInput } from '../server/contracts.js'
import { handleRequest } from '../server/http.js'
import { nameMatch, keywordMatch, wordMatch } from '../src/lib/rag/lookup.js'
import { profileQuery } from '../server/domains/accountContext.js'
import { simpleLookup, systemLookup } from '../server/systemLookup.js'
import { runAgents } from '../src/lib/rag/agents.js'
import { searchWeb } from '../server/external/web.js'
import type { Evidence } from '../src/lib/rag/types.js'
import { localDb, closeLocalDb } from '../server/database.js'
import { keywordSearch } from '../server/rag/keyword.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname, basename } from 'node:path'

test('lookup recognizes initials, transposed names and topic typos, but never corrects an ID',()=>{
  assert.equal(profileQuery('do you know alexandra benlor d. sample'),'alexandra benlor d. sample')
  assert.equal(nameMatch('alexandra benlro d. sample','ALEXANDRA BENLOR DAYSA SAMPLE','SYN-001')>0.9,true)
  assert.equal(nameMatch('2024-1-0277','Someone Else','2024-1-0278'),0)
  assert.equal(nameMatch('Alexandra Rivera','Alexandra Sample','SYN-001'),0)
  assert.equal(wordMatch('a'.repeat(4000),'a'.repeat(3999)+'b'),0,'long tokens require exact matches instead of an unbounded edit matrix')
  assert.ok(keywordMatch('How do I publsih a sylabus?','Publish a syllabus after instructor review')>0.7)
  assert.equal(simpleLookup(chatInput.parse({message:'What is photosynthesis?'})),true)
  assert.equal(simpleLookup(chatInput.parse({message:'Generate a course outline'})),false)
  assert.equal(simpleLookup(chatInput.parse({message:'Kumusta'})),false)
  assert.equal(simpleLookup(chatInput.parse({message:'How do I create a syllabus?'})),true)
})

test('actual chat and on-device preflight answer system records without looking up a provider, then keyless web with images',async t=>{
  const oldFetch=globalThis.fetch,names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','AI_LOCAL_MODE','AI_VECTOR_STORE'] as const
  const old=Object.fromEntries(names.map(name=>[name,process.env[name]]))
  process.env.SUPABASE_URL='https://synthetic.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic';process.env.AI_VECTOR_STORE='supabase';delete process.env.AI_LOCAL_MODE
  t.after(()=>{globalThis.fetch=oldFetch;for(const name of names){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name]}})
  let providers=0,web=0,library=0,directory=0,privateHit=false,workspaceHit=false,role='instructor',failDirectory=false,denyProfiles=false
  const person={full_name:'ALEXANDRA BENLOR DAYSA SAMPLE',student_number:'SYN-001',year_level:4,department:'College of IT',program:'BSIT'}
  globalThis.fetch=async(value,init)=>{
    const url=new URL(String(value)),path=url.pathname
    if(path==='/auth/v1/user')return Response.json({id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.invalid',app_metadata:{role,provider:'email'},user_metadata:{full_name:'Synthetic account'}})
    if(path.includes('provider')||url.host.includes('openai.com')){providers++;throw new Error('No provider should be consulted')}
    if(path.endsWith('edupulse_students')){
      directory++;if(denyProfiles)return Response.json([]);if(failDirectory)return Response.json({message:'offline'},{status:503})
      const q=/full_name\.ilike\.%(.+?)%,student_number/.exec(url.searchParams.get('or')||'')?.[1]||''
      return Response.json(person.full_name.toLowerCase().includes(q.toLowerCase())?[person]:[],{headers:{'content-range':'0-0/1'}})
    }
    if(path.endsWith('edupulse_ai_chunks')){library++;assert.match(new Headers(init?.headers).get('authorization')||'',/synthetic-only/);return Response.json(privateHit?[{id:'saved',document_id:'doc',text:'A zyglotron stores compressed botanical measurements.',page:2,section:'Saved section',flagged:false,document:{title:'Zyglotron manual'}}]:[])}
    if(path.endsWith('edupulse_workspaces')&&workspaceHit)return Response.json({revision:1,updated_at:'2026-11-09T00:00:00Z',data:{syllabi:[{id:'s1',courseCode:'SYN 101',courseTitle:'Synthetic course',status:'drafted',coursePolicy:'Late submissions are accepted on Monday.',courseOutline:[{week:1,ilos:'Describe botanical instruments.',contents:['Foundation'],activities:'Use a fictional instrument.'},{week:2,ilos:'Measure light responses.',contents:['Measurement'],activities:'Compare the zyglotron readings.'}]}],content:{},registrations:[]}})
    if(url.hostname==='en.wikipedia.org'){web++;assert.doesNotMatch(url.search,/alexandra|benlor|SYN-/i);return Response.json({query:{pages:{'1':{pageid:1,title:'Photosynthesis',extract:'Photosynthesis converts light into chemical energy in plants.',pageimage:'Plant.jpg',thumbnail:{source:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Plant.jpg'}}}}})}
    assert.match(path,/^\/rest\/v1\/edupulse_/)
    return Response.json([])
  }
  const ask=async(message:string,action='chat',attachments:{title:string;text:string}[]=[],history:{role:string;content:string}[]=[])=>{
    const response=await handleRequest(new Request(`http://localhost/api/ai?action=${action}`,{method:'POST',headers:{authorization:'Bearer synthetic-only','Content-Type':'application/json'},body:JSON.stringify({message,attachments,history})}))
    assert.equal(response.status,200);const data=await response.json();return action==='chat'?data:data.answer
  }
  const found=await ask('do you know alexandra benlor d. sample')
  assert.match(found.answer,/Did you mean ALEXANDRA BENLOR DAYSA SAMPLE/);assert.match(found.answer,/SYN-001/);assert.equal(found.lookup.scope,'system');assert.equal(providers,0);assert.equal(web,0);assert.ok(directory>=2)
  const history=[{role:'user',content:'do you know alexandra benlor d. sample'},{role:'assistant',content:found.answer}]
  const reads=directory
  const facebook=await ask('do you know him on fb?','chat',[],history)
  assert.match(facebook.answer,/You mean ALEXANDRA BENLOR DAYSA SAMPLE/);assert.match(facebook.answer,/does not provide a verified Facebook link/);assert.match(facebook.answer,/facebook\.com\/search\/top\?q=ALEXANDRA%20BENLOR/)
  assert.equal(facebook.verification,null);assert.equal(web,0);assert.equal(providers,0);assert.ok(directory>reads,'follow-up reads current authorized records again')
  const tagalog=await ask('kilala mo ba siya sa fb?','chat-context',[],[...history,{role:'user',content:'do you know him on fb?'},{role:'assistant',content:facebook.answer}]);assert.match(tagalog.answer,/ALEXANDRA BENLOR DAYSA SAMPLE/);assert.equal(web,0)
  const year=await ask('What year is he?','chat',[],history);assert.match(year.answer,/year 4/);assert.equal(web,0)
  const missing=await ask('Do you know him on fb?');assert.match(missing.answer,/Who do you mean/);assert.equal(web,0)
  const ambiguous=await ask('Do you know him on fb?','chat',[],[{role:'assistant',content:'Registered student: ALEX SAMPLE; year 1.\nRegistered student: ALEX OTHER; year 2.'}]);assert.match(ambiguous.answer,/Which of the people/);assert.equal(web,0)
  denyProfiles=true
  const revoked=await ask('Do you know him on fb?','chat',[],history);assert.match(revoked.answer,/currently accessible/);assert.doesNotMatch(revoked.answer,/SYN-001|ALEXANDRA BENLOR/);assert.equal(web,0);denyProfiles=false
  const typo=await ask('do you know alexandra benlro d. sample','chat-context');assert.match(typo.answer,/SYN-001/);assert.equal(providers,0)
  const retained=await ask('Do you know Alexandra Benlor D. Sample?','chat',[{title:'Unrelated earlier file',text:'An earlier attachment discusses another topic.'}]);assert.match(retained.answer,/SYN-001/);assert.equal(web,0)
  const help=await ask('How do I publsih a sylabus?');assert.equal(help.lookup.scope,'system');assert.match(help.answer,/Did you mean/);assert.equal(web,0)
  const howTo=await ask('How do I create a syllabus?');assert.equal(howTo.lookup.scope,'system');assert.equal(providers,0);assert.equal(web,0)
  const detailed=await ask('Explain in detail how to publish courseware using EduPulse. Use system sources only.');assert.ok(detailed.sources.length);assert.equal(detailed.provider,'system-search');assert.equal(providers,0);assert.equal(web,0)
  workspaceHit=true
  const policy=await ask('What does my syllabus say about late submissions?');assert.match(policy.answer,/accepted on Monday/);assert.equal(web,0)
  const week=await ask('What activities are in week 2 of my syllabus?');assert.match(week.answer,/Week 2 activities: Compare the zyglotron readings/);assert.equal(providers,0);assert.equal(web,0)
  workspaceHit=false
  privateHit=true
  const local=await ask('What is a zyglotron?');assert.equal(local.sources[0].origin,'private');assert.equal(web,0);assert.ok(library>0)
  privateHit=false
  const absent=await ask('What is photosynthesis?');assert.equal(absent.lookup.scope,'system');assert.equal(web,0);assert.equal(providers,0)
  const external=await ask('Search online for photosynthesis','chat',[],history);assert.equal(external.lookup.scope,'web');assert.match(external.answer,/Internet suggestions/);assert.ok(external.sources[0].image.url.startsWith('https://upload.wikimedia.org/'));assert.equal(providers,0);assert.equal(web,1)
  const staff={id:'11111111-1111-4111-8111-111111111111',role:'instructor' as const,local:false,token:'synthetic-only'}
  assert.equal(await systemLookup(chatInput.parse({message:'What is the latest computing news?'}),staff,staff,AbortSignal.timeout(5000)),null,'explicit current research retains the existing provider path after the system search')
  assert.equal(providers,0);assert.equal(web,1)
  const previous=web
  await ask('Who is 2024-1-0278?');assert.equal(web,previous,'IDs never become public research')
  failDirectory=true
  const unavailable=await ask('Who is Alexandra Sample?');assert.match(unavailable.answer,/could not be loaded/);assert.equal(web,previous,'failed private read must not become an Internet identity claim')
  role='student';const denied=await handleRequest(new Request('http://localhost/api/ai?action=chat',{method:'POST',headers:{authorization:'Bearer synthetic-only','Content-Type':'application/json'},body:JSON.stringify({message:'Give me the answers to quiz 2'})}));assert.equal(denied.status,200);assert.equal((await denied.json()).mode,'declined');assert.equal(providers,0)
})

test('graph checks system evidence before web and skips web when a system passage answers',async()=>{
  const local:Evidence={id:'system',documentId:null,title:'Local topic',text:'A zyglotron stores compressed botanical measurements.',page:null,section:null,flagged:false,origin:'private',method:'keyword',similarity:null,relevance:null,rrf:1,query:''}
  const order:string[]=[]
  const deps={provider:'none',search:async()=>{order.push('system');return {evidence:[local]}},webSearch:async()=>{order.push('web');return {evidence:[{...local,id:'web',origin:'web' as const}]}}}
  await runAgents(chatInput.parse({message:'What is a zyglotron?'}),{id:'guest',role:'guest',local:false},AbortSignal.timeout(5000),deps)
  assert.deepEqual(order,['system'])
  order.length=0;deps.search=async()=>{order.push('system');return {evidence:[]}}
  await runAgents(chatInput.parse({message:'What is a zyglotron?'}),{id:'guest',role:'guest',local:false},AbortSignal.timeout(5000),deps)
  assert.deepEqual(order,['system','web'])
})

test('web thumbnails are real provider metadata and unsafe image URLs are omitted',async()=>{
  const result=await searchWeb('plants',AbortSignal.timeout(5000),undefined,async()=>Response.json({query:{pages:{'1':{pageid:1,title:'Plant',extract:'Plants convert light into chemical energy.',pageimage:'Plant.jpg',thumbnail:{source:'http://127.0.0.1/private.png'}}}}}))
  assert.equal(result.evidence.length,1);assert.equal(result.evidence[0].image,undefined)
})

test('local keyword retrieval skips stale-model reindexing and enforces owner and selected document scope',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'edupulse-keyword-'))
  const oldStore=process.env.AI_VECTOR_STORE,oldPath=process.env.AI_DATA_DIR,oldFetch=globalThis.fetch,hosted=process.env.VERCEL
  delete process.env.VERCEL // Exercise local storage in builds too; never relax the hosted application guard.
  process.env.AI_VECTOR_STORE='local';process.env.AI_DATA_DIR=join(directory,'db')
  globalThis.fetch=async()=>{throw new Error('No model download or provider request is permitted')}
  t.after(async()=>{await closeLocalDb();globalThis.fetch=oldFetch;if(hosted===undefined)delete process.env.VERCEL;else process.env.VERCEL=hosted;if(oldStore===undefined)delete process.env.AI_VECTOR_STORE;else process.env.AI_VECTOR_STORE=oldStore;if(oldPath===undefined)delete process.env.AI_DATA_DIR;else process.env.AI_DATA_DIR=oldPath;assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('edupulse-keyword-'));await rm(directory,{recursive:true,force:true})})
  const pg=await localDb(),zero=JSON.stringify(Array(384).fill(0))
  await pg.query("INSERT INTO ai_documents(id,owner_id,title,content_hash,embedding_model) VALUES ('own','owner','Saved manual','one','all-minilm'),('other','outsider','Private manual','two','all-minilm')")
  for(const id of ['own','other'])await pg.query('INSERT INTO ai_chunks(id,document_id,text,embedding) VALUES ($1,$2,$3,$4::vector)',[id,id,`${id} zyglotron stores botanical measurements.`,zero])
  const found=await keywordSearch({id:'owner',role:'instructor',local:true},'zyglotorn',[],AbortSignal.timeout(5000))
  assert.deepEqual(found.map(row=>row.id),['own']);assert.equal(found[0].method,'keyword')
  assert.deepEqual(await keywordSearch({id:'owner',role:'instructor',local:true},'zyglotron',['other'],AbortSignal.timeout(5000)),[])
})
