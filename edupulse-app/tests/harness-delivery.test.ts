import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join,dirname,basename,resolve } from 'node:path'
import { handleRequest } from '../server/http.js'
import { closeLocalDb } from '../server/database.js'
import { runCourseware } from '../server/graph.js'
import { registerEditor, applyEditorProposal, type EditorSnapshot } from '../src/agents/editorTools.js'
import { validateDraft } from '../src/agents/draftValidation.js'
import { buildCourseInput } from '../src/utils/courseInput.js'
import { coursewarePlan } from '../src/lib/rag/coursewarePlan.js'
import { assembleCourseware } from '../src/lib/rag/courseware.js'
import { checkpointItem,checkpointResults,coursewareFingerprint,checkpointId } from '../src/utils/coursewareCheckpoint.js'
import { loopLesson,loopDiscussion,outlineCoursewareSyllabus } from './outline-courseware-data.js'

test('provider response crosses the real API, editor adapter and revision save, then survives reload', async t => {
  const originalFetch = globalThis.fetch
  const names = ['AI_LOCAL_MODE', 'AI_PROVIDER', 'AI_DATA_DIR', 'AI_VECTOR_STORE', 'VERCEL'] as const
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]))
  delete process.env.VERCEL
  process.env.AI_LOCAL_MODE = 'true'; process.env.AI_PROVIDER = 'ollama'; process.env.AI_VECTOR_STORE = 'local'
  process.env.AI_DATA_DIR = join(await mkdtemp(join(tmpdir(), 'edupulse-harness-')), 'db')
  t.after(async () => { globalThis.fetch = originalFetch; await closeLocalDb(); for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name] } })
  let calls = 0
  globalThis.fetch = async (_url, init) => {
    calls++
    const request = JSON.parse(String(init?.body))
    assert.equal(request.stream, true)
    return Response.json({ done: true, done_reason: 'stop', message: { content: JSON.stringify({ operation: 'replace', path: '/programOutcomes', value: ['Evaluate competing research designs using explicit criteria.'] }) } })
  }
  const api = async (action: string, method = 'GET', body?: unknown) => {
    const response = await handleRequest(new Request(`http://localhost/api/ai?action=${action}`, { method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) }))
    const result = await response.json(); assert(response.ok, JSON.stringify(result)); return result
  }
  const editor: EditorSnapshot = { instance: 'harness-editor', kind: 'syllabus', label: 'Research Methods', data: { courseCode: 'IT 104', courseTitle: 'Research Methods', programOutcomes: [''], coursePolicy: ['Preserve this supplied policy.'] } }
  const before = await api('workspace')
  const result = await api('operator', 'POST', { operation: 'revise', viewRole: 'instructor', message: 'Draft program outcomes without web research.', editor, section: 'programOutcomes' })
  assert.equal(calls, 1)
  assert.equal((await api('workspace')).revision, before.revision, 'Generation alone must not save')
  const remove = registerEditor(editor.instance, { read: () => editor, apply: () => assert.fail('A save must use the persistence adapter'), save: async data => {
    const saved = await api('workspace', 'PUT', { revision: before.revision, data: { syllabi: [{ ...data, id: 'generated-test', status: 'drafted' }], registrations: [], content: {} } })
    return { ...saved, persisted: true }
  } })
  try {
    const receipt = await applyEditorProposal(editor, result.patch, 'instructor', true)
    assert.equal(receipt.persisted, true)
    const loaded = await api('workspace')
    assert.equal(loaded.revision, before.revision + 1)
    assert.deepEqual(loaded.data.syllabi[0].programOutcomes, result.patch.programOutcomes)
    assert.deepEqual(loaded.data.syllabi[0].coursePolicy, editor.data.coursePolicy)
    assert.equal(loaded.data.syllabi[0].status, 'drafted')
    await assert.rejects(applyEditorProposal(editor, result.patch, 'student', true))
  } finally { remove() }
})

test('model envelopes cannot execute nested paths, identity changes or removal operations', () => {
  const input = { editor: { instance: 'test', kind: 'syllabus' as const, label: 'Test', data: {} }, message: 'Revise outcomes', section: 'programOutcomes', context: '' }
  for (const raw of [{ op: 'remove', path: '/programOutcomes', value: [] }, { op: 'replace', path: '/__proto__', value: {} }, { op: 'replace', path: '/courseOutline/0/week', value: 99 }, { patch: { courseCode: 'forged' } }]) assert.ok('error' in validateDraft(raw, input, ''))
})

test('direct courseware service retains the same authoring roles as the HTTP endpoint', async () => {
  for (const role of ['dean', 'associate_dean', 'student', 'guest'] as const) await assert.rejects(runCourseware({ courseCode: 'TEST', courseTitle: 'Test', week: 1, topics: ['Variables'], outcomes: 'Explain variables', referenceText: '' }, { id: 'role-test', role, local: false }, AbortSignal.timeout(1000), async () => assert.fail('Denied roles must not reach the model')), { code: 'FORBIDDEN' })
})

test('outline steps persist acknowledged private parts through the actual API and recover the complete variable bundle',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'edupulse-outline-delivery-')),fetchBefore=globalThis.fetch
  const names=['AI_LOCAL_MODE','AI_PROVIDER','AI_DATA_DIR','AI_VECTOR_STORE','VERCEL'] as const,old=Object.fromEntries(names.map(name=>[name,process.env[name]]))
  delete process.env.VERCEL;process.env.AI_LOCAL_MODE='true';process.env.AI_PROVIDER='ollama';process.env.AI_VECTOR_STORE='local';process.env.AI_DATA_DIR=join(directory,'db')
  t.after(async()=>{globalThis.fetch=fetchBefore;await closeLocalDb();for(const name of names){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name]}assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('edupulse-outline-delivery-'));await rm(directory,{recursive:true,force:true})})
  let failActivity=true;const requested:string[]=[]
  globalThis.fetch=async(url,init)=>{
    assert.match(String(url),/\/api\/chat$/)
    const body=JSON.parse(String(init?.body)),prompt=JSON.parse(body.messages.at(-1).content)
    assert.equal(body.options.num_predict,2400);requested.push(prompt.generationStep)
    return Response.json({done:true,done_reason:'stop',message:{content:prompt.generationStep==='activity'&&failActivity?'invalid JSON':JSON.stringify(prompt.generationStep==='activity'?{activity:loopDiscussion}:{material:loopLesson})}})
  }
  const api=async(action:string,body?:unknown)=>{const response=await handleRequest(new Request(`http://localhost/api/ai?action=${action}`,body?{method:action==='workspace'?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined));return {response,result:await response.json()}}
  const input=buildCourseInput(outlineCoursewareSyllabus,5,'Only from the syllabus.'),before=(await api('workspace')).result,parts=[]
  const outdated=await api('courseware',input);assert.equal(outdated.response.status,409);assert.equal(outdated.result.error.code,'CLIENT_UPDATE_REQUIRED');assert.equal(requested.length,0,'an old client must fail before any model call')
  const oldPlan=await api('courseware',{...input,stepKey:'lesson-1',planVersion:undefined});assert.equal(oldPlan.response.status,409);assert.equal(requested.length,0,'old multi-topic clients cannot mislabel new single-topic results')
  const types=['material','activity'] as const,fingerprint=await coursewareFingerprint(input,[...types]),id=checkpointId(outlineCoursewareSyllabus.id,5)
  let revision=before.revision
  for(const part of coursewarePlan(input).filter(part=>part.type==='material')){
    const {response,result}=await api('courseware',{...input,stepKey:part.key});assert.equal(response.status,200);assert.equal(result.content.assessment,undefined);parts.push(result)
    const item=await checkpointItem(input,outlineCoursewareSyllabus.id,{version:1,fingerprint,types:[...types],results:[...parts],total:6,expected:{}})
    const saved=await api('workspace',{revision,data:{syllabi:[outlineCoursewareSyllabus],registrations:[],content:{[id]:item}}});assert.equal(saved.response.status,200);revision=saved.result.revision
  }
  const failed=await api('courseware',{...input,stepKey:'activity'});assert.equal(failed.response.status,502)
  const interrupted=(await api('workspace')).result
  assert.equal(interrupted.revision,before.revision+5,'Each validated part was acknowledged before the next call')
  assert.equal((await checkpointResults(input,interrupted.data.content[id].generationCheckpoint,fingerprint)).length,5,'Fresh reads recover every completed topic')
  assert.equal((await checkpointResults(input,interrupted.data.content[id].generationCheckpoint,'different outline')).length,0)
  const forbidden=await api('workspace',{revision,data:{...interrupted.data,content:{[id]:{...interrupted.data.content[id],status:'checked'}}}});assert.equal(forbidden.response.status,400)
  failActivity=false;const activity=await api('courseware',{...input,stepKey:'activity'});assert.equal(activity.response.status,200);parts.push(activity.result)
  const completed=assembleCourseware(input,parts);assert.equal(completed.content.assessment,undefined)
  const content=Object.fromEntries(Object.entries(completed.content).map(([type,value])=>[type,{syllabusId:outlineCoursewareSyllabus.id,week:5,type,status:'draft',content:value}]))
  const saved=await api('workspace',{revision,data:{syllabi:[outlineCoursewareSyllabus],registrations:[],content}});assert.equal(saved.response.status,200)
  const loaded=(await api('workspace')).result;assert.equal(loaded.revision,before.revision+6);assert.deepEqual(Object.keys(loaded.data.content).sort(),['activity','material'])
  assert.ok(loaded.data.content.material.content.sections.length>5);assert.equal(requested.filter(key=>key.startsWith('lesson-')).length,5)
})
