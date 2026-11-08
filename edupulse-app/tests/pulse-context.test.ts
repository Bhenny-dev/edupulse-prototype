import test from 'node:test'
import assert from 'node:assert/strict'
import { planRequest } from '../src/lib/rag/plan.js'
import { runChat } from '../server/graph.js'
import { chatInput, type Identity } from '../server/contracts.js'
import { accountFacts, accountQuestion, profileQuery } from '../server/domains/accountContext.js'
import { academicRows } from '../server/domains/academic.js'
import type { AgentDeps, Evidence } from '../src/lib/rag/types.js'
import { handleRequest } from '../server/http.js'
import { contextualDeps } from '../src/lib/rag/context.js'

const guest: Identity = { id: 'public-guest', role: 'guest', local: false }
test('intent separates casual chat, public facts, private records, selected documents and researched drafting', () => {
  for (const message of ['Hello','Kumusta','I feel nervous presenting to my class']) assert.equal(planRequest({message}).needsWeb,false)
  for (const message of ['Who is Jose Rizal?','Ano ang photosynthesis?','What is the latest computing curriculum?']) assert.equal(planRequest({message}).needsWeb,true,message)
  for (const message of ['Who am I?','Show my students statistics','Search the web for 2024-1-0224@gmail.com']) assert.equal(planRequest({message}).needsWeb,false,message)
  assert.equal(planRequest({message:'What does my attached PDF say?'}).sourceOnly,true)
  assert.equal(planRequest({message:'Summarize only this document and search the web'}).needsWeb,false)
  const draft=planRequest({message:'Complete the syllabus for my course and search the internet',context:'Selected course: Philippine Popular Culture'})
  assert.equal(profileQuery('Sino si Alex Sample?'),'Alex Sample')
  assert.equal(profileQuery('Who is 2024-1-0224?'),'2024-1-0224')
  assert.equal(planRequest({message:'Who is my instructor?'}).needsWeb,false)
  assert.equal(accountQuestion('Sino ang instructor ko?'),true)
  assert.equal(accountQuestion('May courseware na ba ang mga estudyante ko?'),true)
  assert.equal(planRequest({message:'Sino ang instructor ko?'}).needsWeb,false)
  assert.equal(draft.needsWeb,true);assert.equal(draft.topic,'Philippine Popular Culture')
})

test('public factual chat actually calls web research while mixed-language conversation skips retrieval', async () => {
  let searched=0,web=0,written=''
  const source: Evidence = {id:'public-source',documentId:null,title:'Photosynthesis',text:'Photosynthesis converts light energy into chemical energy in plants.',url:'https://en.wikipedia.org/wiki/Photosynthesis',page:null,section:null,flagged:false,origin:'web',method:'web-search',similarity:null,relevance:1,rrf:1,query:'photosynthesis'}
  const deps: AgentDeps={provider:'synthetic-model',search:async()=>{searched++;return {evidence:[]}},webSearch:async()=>{web++;return {evidence:[source]}},generate:async(system,prompt)=>{written=system+' '+prompt;return 'Photosynthesis converts light energy into chemical energy in plants. [1]'}}
  const answer=await runChat(chatInput.parse({message:'What is photosynthesis?'}),guest,AbortSignal.timeout(5000),deps)
  assert.equal(web,1);assert.equal(searched,1);assert.equal(answer.sources[0]?.url,source.url)
  deps.generate=async(system,prompt)=>{written=system+' '+prompt;return 'Kumusta! Maaari tayong mag-usap sa Tagalog, English, o mixed.'}
  const casual=await runChat(chatInput.parse({message:'Kumusta'}),guest,AbortSignal.timeout(5000),deps)
  assert.equal(web,1);assert.equal(searched,1);assert.match(casual.answer,/Kumusta/);assert.match(written,/Tagalog and English/)
})

test('live account summaries distinguish access from completion and include only the authorized snapshot', () => {
  const text=accountFacts({courses:[{id:'c',course_code:'IT 102',course_title:'Programming',active:true}],enrollments:[{course_id:'c',student_email:'synthetic@example.invalid',student_ref:'SYN-1',display_name:'Synthetic learner',block_section:'SYN-1A'}],publications:[],attempts:[],accesses:[{publication_id:'p'}]}, {id:'teacher',role:'instructor',local:true}, 'List my students')
  assert.match(text,/1 accessible courses and 0 accessible released items/)
  assert.match(text,/Synthetic learner/);assert.match(text,/does not prove a material was completed/)
  const learner=accountFacts({courses:[],enrollments:[],publications:[],attempts:[],accesses:[]},guest,'List students')
  assert.doesNotMatch(learner,/Synthetic learner/)
})

test('academic read paginates beyond 1000 and fails rather than presenting partial statistics', async () => {
  const records=Array.from({length:1205},(_,id)=>({id}))
  let calls=0,fail=false
  const query={select(){return this},order(){return this},async range(from:number,to:number){calls++;return from===500&&fail?{data:null,error:{message:'offline'}}:{data:records.slice(from,to+1),error:null}}}
  const client={from(){return query}} as unknown as Parameters<typeof academicRows>[0]
  assert.equal((await academicRows(client,'attempts')).length,1205);assert.equal(calls,3)
  fail=true;await assert.rejects(academicRows(client,'attempts'),/could not be loaded completely/)
})


test('a registered-name question reads authorized profiles before public research and never sends the profile to web search', async t => {
  const savedFetch=globalThis.fetch, savedUrl=process.env.SUPABASE_URL, savedKey=process.env.SUPABASE_PUBLISHABLE_KEY
  process.env.SUPABASE_URL='https://synthetic.invalid'; process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic'
  t.after(()=>{globalThis.fetch=savedFetch;if(savedUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=savedUrl;if(savedKey===undefined)delete process.env.SUPABASE_PUBLISHABLE_KEY;else process.env.SUPABASE_PUBLISHABLE_KEY=savedKey})
  let lookedUp=0, web=0, prompt=''
  globalThis.fetch=async url=>{
    assert.match(String(url),/^https:\/\/synthetic\.invalid\/rest\/v1\/edupulse_students\?/)
    assert.match(decodeURIComponent(String(url)).replaceAll('+',' '),/Alex Sample/);lookedUp++
    return Response.json([{full_name:'Alex Sample',student_number:'SYN-001',year_level:1,department:'College of IT',program:'BSIT'}],{headers:{'content-range':'0-0/1'}})
  }
  const answer=await runChat(chatInput.parse({message:'Sino si Alex Sample?'}),{id:'11111111-1111-4111-8111-111111111111',role:'instructor',local:false,token:'synthetic-only'},AbortSignal.timeout(5000),{
    provider:'synthetic-model',search:async()=>({evidence:[]}),webSearch:async()=>{web++;return {evidence:[]}},generate:async(_system,input)=>{prompt=input;return 'Alex Sample is a registered student in BSIT. [1]'},
  })
  assert.equal(lookedUp,1);assert.equal(web,0);assert.equal(answer.sources[0]?.origin,'account');assert.match(prompt,/SYN-001/);assert.match(prompt,/year 1/)
})

test('on-device context bridge returns verified role and account evidence without credentials; shared dependencies keep it out of public search', async t => {
  const oldFetch=globalThis.fetch, names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','AI_LOCAL_MODE','AI_VECTOR_STORE'] as const
  const old=Object.fromEntries(names.map(name=>[name,process.env[name]]))
  process.env.SUPABASE_URL='https://synthetic.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic';process.env.AI_VECTOR_STORE='supabase';delete process.env.AI_LOCAL_MODE
  t.after(()=>{globalThis.fetch=oldFetch;for(const name of names){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name]}})
  globalThis.fetch=async url=>{
    const path=new URL(String(url)).pathname
    if(path==='/auth/v1/user')return Response.json({id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.invalid',app_metadata:{role:'instructor',provider:'email'},user_metadata:{full_name:'Synthetic instructor'}})
    assert.match(path,/^\/rest\/v1\/edupulse_/)
    return Response.json(path.endsWith('courses')?[{id:'course',course_code:'SYN 101',course_title:'Synthetic course',instructor_name:'Synthetic instructor',active:true}]:[])
  }
  const response=await handleRequest(new Request('http://localhost/api/ai?action=chat-context',{method:'POST',headers:{authorization:'Bearer synthetic-only','Content-Type':'application/json'},body:JSON.stringify({message:'Which courses are in my account?',viewRole:'instructor'})}))
  assert.equal(response.status,200)
  const prepared=await response.json();assert.equal(prepared.identity.role,'instructor');assert.equal(prepared.evidence[0].origin,'account');assert.equal(prepared.evidence[0].relevance,null);assert.match(prepared.evidence[0].text,/SYN 101/);assert.equal('token' in prepared.identity,false)
  let web=0
  const deps=contextualDeps(prepared,{provider:'synthetic-device',search:async()=>({evidence:[]}),webSearch:async()=>{web++;return {evidence:[]}}})
  const found=await deps.search('my account',{focus:'my account'},AbortSignal.timeout(5000));assert.equal(found.evidence[0].origin,'account')
  await deps.webSearch!('my account',AbortSignal.timeout(5000));assert.equal(web,0)
  const rejected=await handleRequest(new Request('http://localhost/api/ai?action=chat-memory',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));assert.equal(rejected.status,401)
})
