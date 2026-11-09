import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { accountSupportUI } from './account-support-fixture'
import { lookupAnswer, socialProfileAnswer } from '../server/systemLookup'
import { conversationSubject } from '../src/lib/rag/conversation'
import { chatInput } from '../server/contracts'
import type { Evidence } from '../src/lib/rag/types'

export const publicImage='https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Photosynthesis_en.svg/500px-Photosynthesis_en.svg.png'
/** Synthetic records/transport, real deterministic answer builder and attributed Wikimedia fixture. */
export async function systemSearchUI(page:Page) {
  const base=await accountSupportUI(page,'instructor')
  const calls:string[]=[]
  let broken=false
  await page.route('https://thumb.wikimedia.org/**',async route=>broken?route.fulfill({status:404,body:'Unavailable'}):route.fulfill({contentType:'image/png',body:await readFile(new URL('./fixtures/system-search/photosynthesis.png',import.meta.url))}))
  await page.route('**/api/ai?*',async route=>{
    const action=new URL(route.request().url()).searchParams.get('action')||''
    if(action==='health')return route.fulfill({json:{ready:false,provider:'none',model:null,connection:null,database:{ready:true,kind:'synthetic'},identity:{mode:'account',role:'instructor'},message:'System Search available; no generation provider connected'}})
    if(action!=='chat'&&action!=='chat-context')return route.fallback()
    calls.push(action)
    const input=chatInput.parse(route.request().postDataJSON()),web=/photosynthesis/i.test(input.message),help=/publsih|How do I create/i.test(input.message)
    const source:Evidence={id:web?'public-plant':help?'guide-publish':'student-profile',documentId:null,title:web?'Photosynthesis':help?'Courseware review and publishing':'Live authorized student profile',text:web?'Photosynthesis converts light energy into chemical energy in plants.':help?'Mark an item checked before publishing it. Students see published items only.':'Registered student: ALEXANDRA BENLOR DAYSA SAMPLE; student number SYN-001; year 4; department College of IT; program BSIT.',page:null,section:null,flagged:false,origin:web?'web':help?'public-guide':'account',method:web?'web-search':'provided',similarity:null,relevance:null,rrf:1,query:input.message,...(web?{url:'https://en.wikipedia.org/wiki/Photosynthesis',image:{url:publicImage,creditsUrl:'https://en.wikipedia.org/wiki/File:Photosynthesis_en.svg'}}:{})}
    const subject=conversationSubject(input)
    if(subject.social&&subject.person!=='ALEXANDRA BENLOR DAYSA SAMPLE')throw new Error('The actual conversation resolver did not retain the sample person')
    const answer=subject.social?await socialProfileAnswer(input,[source],AbortSignal.timeout(5000)):await lookupAnswer(input,[source],AbortSignal.timeout(5000),web?'web':'system',web?undefined:help?'Courseware review and publishing':'ALEXANDRA BENLOR DAYSA SAMPLE')
    return route.fulfill({json:action==='chat'?answer:{input,evidence:[source],warnings:[],privateContext:!web,answer,identity:{id:'synthetic-staff',role:'instructor',local:false}}})
  })
  return {...base,searchCalls:calls,breakImages(){broken=true}}
}
