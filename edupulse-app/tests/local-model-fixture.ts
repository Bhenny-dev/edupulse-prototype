import type {Page} from '@playwright/test'
import {academicUI} from './academic-ui-fixture'
import {browserPresets} from '../src/lib/browserModelCatalog'

/** Synthetic GPU capability and small cache records; no real weights or inference in this UI fixture. */
export async function localModelUI(page:Page,halfPrecision=true){
 await academicUI(page,async()=>({json:{mode:'cloud',courses:[],publications:[],enrollments:[],attempts:[],accesses:[],notices:[],events:[]}}))
 await page.route('**/api/ai?*',route=>{
  const action=new URL(route.request().url()).searchParams.get('action')
  if(action==='health')return route.fulfill({json:{provider:'retrieval',ready:false,identity:{role:'instructor'},database:{ready:true},message:'Synthetic transport'}})
  if(action==='providers')return route.fulfill({json:{connection:null,connections:[],models:[]}})
  if(action==='conversations')return route.fulfill({json:{threads:[],memories:[]}})
  return route.fallback()
 })
 await page.addInitScript(({halfPrecision})=>{
  Object.defineProperty(navigator,'gpu',{configurable:true,value:{requestAdapter:async()=>({features:{has:()=>halfPrecision}})}})
  localStorage.setItem('edupulse-inference','browser')
 },{halfPrecision})
 await page.goto('/#/privacy')
 await page.evaluate(async models=>{
   const cache=await caches.open('webllm/model')
   for(const [index,model] of models.entries()){
    const root=model.source+'/resolve/main/'
    await cache.put(root+'tensor-cache.json',Response.json({records:[{dataPath:'synthetic-shard.bin',nbytes:1}]}))
    if(index===0)await cache.put(root+'synthetic-shard.bin',new Response(new Uint8Array([0])))
   }
 },[browserPresets[4],browserPresets[9]])
 return {cachedModel:browserPresets[4],partialModel:browserPresets[9]}
}
