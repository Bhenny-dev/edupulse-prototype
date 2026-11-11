import test from 'node:test'
import assert from 'node:assert/strict'
import {prebuiltAppConfig} from '@mlc-ai/web-llm'
import {browserPresets} from '../src/lib/browserModelCatalog.js'
import {completeInBrowser} from '../src/lib/browserCompletion.js'
import {browserModelLoadError} from '../src/lib/browserAI.js'
import {readWorkspaceViews,saveWorkspaceViews,workspaceViewKey} from '../src/utils/workspaceViewState.js'

test('every offered model has the installed runtime record, matching memory, precision and public source',()=>{
 assert.equal(new Set(browserPresets.map(p=>p.id)).size,browserPresets.length)
 assert.ok(browserPresets.length>2)
 for(const preset of browserPresets){
  const model=prebuiltAppConfig.model_list.find(m=>m.model_id===preset.id)
  assert.ok(model,preset.id);assert.equal(model.model,preset.source);assert.equal(model.vram_required_MB,preset.vramMB)
  assert.equal(preset.halfPrecision,!preset.id.includes('f32'))
  assert.ok(preset.weightBytes>0&&preset.weightBytes<2e9)
  assert.ok(preset.modelCard.startsWith('https://huggingface.co/'))
 }
 assert.ok(browserPresets.some(p=>!p.halfPrecision&&p.vramMB<600),'a small FP32 fallback is offered')
})

test('Qwen reasoning can be disabled without adding thinking headers to other models',async()=>{
 const requests:any[]=[]
 const engine={chat:{completions:{create:async(request:any)=>{requests.push(request);return {choices:[{message:{content:'A brief reply'},finish_reason:'stop'}]} as any}}},interruptGenerate(){},async resetChat(){}}
 await completeInBrowser(engine,'s','p',new AbortController().signal,false,true)
 await completeInBrowser(engine,'s','p',new AbortController().signal,false,false)
 assert.deepEqual(requests[0].extra_body,{enable_thinking:false});assert.equal(requests[1].extra_body,undefined)
})

test('model choices are bounded references isolated by workspace view scope',()=>{
 const entries=new Map<string,string>(),storage={getItem:(k:string)=>entries.get(k)||null,setItem:(k:string,v:string)=>{entries.set(k,v)}}
 const key=workspaceViewKey('teacher','instructor')
 saveWorkspaceViews(key,new Map([['ai-local-model',browserPresets[3].id]]),storage)
 assert.equal(readWorkspaceViews(key,storage).get('ai-local-model'),browserPresets[3].id)
 assert.equal(readWorkspaceViews(workspaceViewKey('another','instructor'),storage).size,0)
})

test('worker load failures keep useful text while graphics errors avoid internal stacks',()=>{
 assert.match(browserModelLoadError('OperationError: requestDevice failed dxil.dll\nprivate stack'),/graphics runtime/)
 assert.doesNotMatch(browserModelLoadError('DynamicLib.Open: dxil.dll\nprivate stack'),/dxil|private stack/)
 assert.match(browserModelLoadError(new Error('out of memory')),/smaller model/)
 assert.equal(browserModelLoadError('Download failed\ninternal details'),'Download failed')
})
