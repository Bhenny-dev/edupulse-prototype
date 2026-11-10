import type { Page } from '@playwright/test'
import { baselineUI,baselineWorkspace } from './baseline-fixture'
import { outlineCoursewareSyllabus,loopMaterialFor,loopDiscussion } from './outline-courseware-data'
import { courseInput } from '../server/contracts'
import { draftCoursewareStep } from '../src/lib/rag/courseware'

export async function outlineCoursewareUI(page:Page) {
  const fixture=await baselineUI(page),syllabus=structuredClone(outlineCoursewareSyllabus)
  const id=`gen-mat-${syllabus.id}-w5`,quizId=`gen-assess-${syllabus.id}-w5`
  fixture.setWorkspace({...structuredClone(baselineWorkspace),syllabi:[syllabus],content:{
    [id]:{syllabusId:syllabus.id,week:5,type:'material',status:'draft',content:{title:'Previous short overview',sections:[{heading:'Overview',body:'An older short summary for regeneration.'}],ai:{requestId:'old-fixture'}}},
    [quizId]:{syllabusId:syllabus.id,week:5,type:'assessment',status:'draft',content:{title:'Previous automatic readiness quiz',questions:[],ai:{requestId:'old-fixture'}}},
  }})
  const requests:{key:string;topics:string[]}[]=[],prompts:{topics:string[];generationStep:string}[]=[]
  let failure='',held='',release=()=>{}
  let gate=Promise.resolve()
  await page.route('**/api/ai?action=health',route=>route.fulfill({json:{ready:true,provider:'Controlled instructional fixture',model:'Original sample teaching text',database:{ready:true,kind:'synthetic'},identity:{mode:'account',role:'instructor'}}}))
  await page.route('**/api/ai?action=courseware',async route=>{
    const input=courseInput.parse(route.request().postDataJSON());requests.push({key:input.stepKey||'',topics:input.topics})
    if(input.stepKey===held)await gate
    if(input.stepKey===failure)return route.fulfill({status:502,json:{error:{code:'INVALID_GENERATION',message:'This part did not pass the draft checks. Saved parts and existing courseware are preserved. Resume to retry this part.'}}})
    const result=await draftCoursewareStep(input,AbortSignal.timeout(10000),{provider:'Controlled instructional fixture',model:'Original sample teaching text',search:async()=>({evidence:[]}),generate:async(_system,prompt)=>{
      const part=JSON.parse(prompt);prompts.push(part)
      return JSON.stringify(part.generationStep==='activity'?{activity:loopDiscussion}:{material:loopMaterialFor(part.topics)})
    }})
    return route.fulfill({json:result})
  })
  return {...fixture,requests,prompts,syllabus,id,quizId,failStep:(key:string)=>{failure=key},holdStep:(key:string)=>{held=key;gate=new Promise<void>(resolve=>{release=resolve})},releaseStep:()=>{held='';release()}}
}
