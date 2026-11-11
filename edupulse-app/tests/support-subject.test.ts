import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { handleRequest } from '../server/http.js'
import { resolveSupportSubject } from '../server/domains/support.js'

const actorId='11111111-1111-4111-8111-111111111111'
const subjectId='22222222-1111-4111-8111-111111111111'
const otherSubject='33333333-1111-4111-8111-111111111111'
const subject={id:subjectId,role:'student',name:'Synthetic Student',email:'student@example.invalid',department:'College of IT',yearLevel:1,program:'BSIT'}

/** Synthetic transport only. The SQL assertions in support-delivery exercise the real authorization and no-write contract. */
function transport(t:TestContext) {
  const names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','AI_LOCAL_MODE','VERCEL'] as const
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]))
  t.after(()=>{for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name]}})
  Object.assign(process.env,{SUPABASE_URL:'https://support-subject.example.invalid',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_only',AI_LOCAL_MODE:'false'})
  delete process.env.VERCEL
  const state={role:'admin',email:'riverabenlor461@gmail.com',providers:['google'],rpcCode:'',authDenied:false}
  const calls:{path:string;body?:unknown}[]=[]
  t.mock.method(globalThis,'fetch',async(value:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(String(value))
    assert.equal(url.origin,'https://support-subject.example.invalid','the test never contacts hosted resources')
    const headers=new Headers(init?.headers)
    assert.equal(headers.get('authorization'),'Bearer synthetic-owner-token','the verified actor token is preserved; the selected subject supplies no credentials')
    if(url.pathname==='/auth/v1/user'){
      calls.push({path:url.pathname})
      if(state.authDenied)return Response.json({code:'bad_jwt',message:'Synthetic expired session'},{status:401})
      return Response.json({id:actorId,email:state.email,app_metadata:{role:state.role,providers:state.providers},user_metadata:{full_name:'Synthetic Owner',role:'admin'}})
    }
    assert.equal(url.pathname,'/rest/v1/rpc/edupulse_support_action','no business, audit, provider, or conversation writes are requested')
    assert.equal(init?.method,'POST','PostgREST RPC transport uses POST even for the read-only subject operation')
    const body=JSON.parse(String(init?.body));calls.push({path:url.pathname,body})
    assert.deepEqual(body,{subject:subjectId,operation:'subject',input:{}})
    if(state.rpcCode)return Response.json({code:state.rpcCode,message:'Synthetic private database detail'},{status:state.rpcCode==='42501'?403:503})
    return Response.json(subject)
  })
  const get=(id=subjectId,headers:Record<string,string>={})=>handleRequest(new Request(`http://localhost/api/ai?action=support&subject=${encodeURIComponent(id)}&operation=enter&role=admin`,{headers:{authorization:'Bearer synthetic-owner-token','X-EduPulse-Subject':otherSubject,...headers}}))
  return {state,calls,get}
}

test('GET support subject is repeatable, read-only and reauthenticates the actor on every request',async t=>{
  const {state,calls,get}=transport(t)
  for(let attempt=0;attempt<2;attempt++){
    const response=await get()
    assert.equal(response.status,200)
    assert.equal(response.headers.get('Cache-Control'),'no-store')
    assert.deepEqual(await response.json(),subject)
  }
  assert.deepEqual(calls.map(call=>call.path),['/auth/v1/user','/rest/v1/rpc/edupulse_support_action','/auth/v1/user','/rest/v1/rpc/edupulse_support_action'])
  state.role='student'
  const denied=await get()
  assert.equal(denied.status,403)
  assert.equal((await denied.json()).error.code,'SUPPORT_FORBIDDEN')
  assert.equal(calls.length,5,'a changed actor role is denied before another subject RPC')
})

test('GET support subject rejects malformed IDs and unverified or non-admin actors before database access',async t=>{
  const {state,calls,get}=transport(t)
  for(const id of ['', 'not-a-uuid', `${subjectId}/workspace`, '11111111-1111-1111-1111-111111111111'])assert.equal((await get(id)).status,403)
  for(const role of ['student','instructor','dean','associate_dean']){
    state.role=role
    assert.equal((await get()).status,403)
  }
  state.role='admin';state.email='another-admin@example.invalid'
  assert.equal((await get()).status,403)
  state.email='riverabenlor461@gmail.com';state.providers=['email']
  assert.equal((await get()).status,403)
  state.providers=['google'];state.authDenied=true
  assert.equal((await get()).status,401)
  assert(calls.every(call=>call.path==='/auth/v1/user'),'denials never invoke a support RPC')
  const beforeAnonymous=calls.length
  assert.equal((await handleRequest(new Request(`http://localhost/api/ai?action=support&subject=${subjectId}&role=admin`,{headers:{'X-EduPulse-Subject':subjectId}}))).status,403)
  process.env.AI_LOCAL_MODE='true'
  assert.equal((await handleRequest(new Request(`http://localhost/api/ai?action=support&subject=${subjectId}`))).status,403)
  await assert.rejects(resolveSupportSubject({id:actorId,role:'admin',local:true},subjectId),{status:403,code:'SUPPORT_FORBIDDEN'})
  assert.equal(calls.length,beforeAnonymous,'guest and local identities cannot reach the hosted directory')
})

test('GET support subject does not reuse a prior result after database authorization or availability fails',async t=>{
  const {state,calls,get}=transport(t)
  assert.equal((await get()).status,200)
  for(const [code,status] of [['42501',403],['XX000',503]] as const){
    state.rpcCode=code
    const response=await get(),result=await response.json()
    assert.equal(response.status,status)
    assert.equal(result.error.code,'SUPPORT_UNAVAILABLE')
    assert.equal(result.id,undefined)
    assert.doesNotMatch(JSON.stringify(result),/Synthetic private database detail/)
  }
  assert.equal(calls.filter(call=>call.path==='/auth/v1/user').length,3)
  assert.equal(calls.filter(call=>call.path.endsWith('edupulse_support_action')).length,3)
})
