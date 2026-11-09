import test from 'node:test'
import assert from 'node:assert/strict'
import {completeInBrowser} from '../src/lib/browserCompletion.js'

const response=(content:string,finish_reason='stop')=>({choices:[{message:{content},finish_reason}]}) as any
test('on-device structured requests provide the schema string required by the installed grammar compiler',async()=>{
 let resets=0
 const engine={chat:{completions:{create:async(request:any)=>{
  if(request.response_format){
   if(typeof request.response_format.schema!=='string')throw 'GrammarMatcherInitError: Cannot pass non-string to std::string'
   assert.equal(JSON.parse(request.response_format.schema).type,'object')
   return response('{"material":{"title":"Network roles"}}')
  }
  return response('Hello')
 }}},interruptGenerate(){},async resetChat(){resets++}}
 assert.match(await completeInBrowser(engine,'Return the requested object','Network roles',new AbortController().signal,true),/material/)
 assert.equal(await completeInBrowser(engine,'Have a conversation','Hello',new AbortController().signal),'Hello')
 assert.equal(resets,2)
})
test('serialized worker errors remain useful Error objects at the graph boundary and reset the chat',async()=>{
 let resets=0
 const engine={chat:{completions:{create:async()=>{throw 'GrammarMatcherInitError: failed to initialize'}}},interruptGenerate(){},async resetChat(){resets++}}
 await assert.rejects(completeInBrowser(engine,'s','p',new AbortController().signal,true),e=>e instanceof Error&&/GrammarMatcherInitError/.test(e.message))
 assert.equal(resets,1)
})
test('on-device output limits and cancellation cannot return partial content as success',async()=>{
 let resets=0,interrupts=0
 const controller=new AbortController()
 const engine={chat:{completions:{create:async()=>response('{"partial":','length')}},interruptGenerate(){interrupts++},async resetChat(){resets++}}
 await assert.rejects(completeInBrowser(engine,'s','p',controller.signal,true),/Nothing was applied/)
 engine.chat.completions.create=async()=>{controller.abort();return response('{"complete":true}')}
 await assert.rejects(completeInBrowser(engine,'s','p',controller.signal,true),{name:'AbortError'})
 assert.equal(resets,2);assert.equal(interrupts,1)
})
