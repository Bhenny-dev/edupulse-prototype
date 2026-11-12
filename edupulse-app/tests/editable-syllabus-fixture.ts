import type {Page} from '@playwright/test'
import {instructorUpdatesUI,sender,sharedStore} from './instructor-updates-fixture'
import {operatorInput,planValidatedTool,type PlannerExecution} from '../src/agents/toolPlanner'
import {outlineDraftProgress} from '../src/agents/draftProgress'
import {aggregateSections,type OutlineWeek} from '../src/utils/outlineSections'

export async function editableSyllabusUI(page:Page){
 const store=sharedStore(),calls:any[]=[],checkpoints=new Map<string,PlannerExecution>()
 const rows:OutlineWeek[]=[1,2,3,4].map(week=>aggregateSections({week},[{id:`stored-${week}`,ilos:'',contents:[''],activities:'',assessments:'',assessmentTypes:[]}]))
 rows.push({week:9,ilos:'',contents:[],activities:'',assessments:'Midterm Examination'})
 store.workspaces[sender]={syllabi:[{id:'editable-methods',instructorId:sender,courseCode:'IT 104',courseTitle:'Research Methods',status:'drafted',version:1,courseInfo:{courseCode:'IT 104',courseTitle:'Research Methods',periodOffered:'1st Semester',academicYear:'2026-2027',creditUnits:3,noOfHours:54,prerequisites:[]},programOutcomes:['Formulate a feasible research question.'],coursePolicy:['Preserve the instructor policy.'],courseRequirements:['Research portfolio'],gradingSystem:'Pending approved institutional formula.',books:[],onlineReferences:[],courseOutline:rows}],content:{},registrations:[]}
 await instructorUpdatesUI(page,sender,store)
 let holdWeek:number|undefined,release=()=>{},gate=Promise.resolve(),invalid=false
 await page.route('**/api/ai?action=operator',async route=>{
  const input=operatorInput.parse(route.request().postDataJSON());calls.push(input)
  if(input.operation!=='revise')throw Error('A syllabus edit must not become an unrelated plan or search')
  const execution=input.staged?(input.continuation?checkpoints.get(input.continuation):{initialize:true}):undefined
  const result=await planValidatedTool(input,{id:sender,local:true,role:'instructor'},AbortSignal.timeout(30000),async(_system,prompt)=>{
   const payload=JSON.parse(prompt),targets=payload.targets
   if(holdWeek&&targets?.some((target:any)=>target.week===holdWeek))await gate
   if(invalid){invalid=false;return JSON.stringify({status:'active'})}
   return JSON.stringify({edits:targets.map((target:any)=>({target:target.target,changes:Object.fromEntries(target.fields.map((field:string)=>[field,{ilos:`Evaluate the Week ${target.week} research question using feasibility criteria.`,contents:[`Week ${target.week} research questions`,`Week ${target.week} feasibility and scope`],activities:`Compare two Week ${target.week} questions and justify the stronger scope.`,assessments:`Write and justify a feasible Week ${target.week} question.`,assessmentTypes:['Essay']}[field]]))}))})
  },24000,async()=>({evidence:[]} ),execution)
  if('pending' in result&&result.pending){const token=`fixture-${calls.length}`;checkpoints.set(token,{initialize:false,...result.pending});const progress=input.editor&&result.pending.draft?outlineDraftProgress(result.pending.draft.patch,input.editor):null;return route.fulfill({json:{pending:true,continuation:token,generated:result.generated,...(progress?{progress}:{})}})}
  return route.fulfill({json:result})
 })
 return {store,calls,hold:(week:number)=>{holdWeek=week;gate=new Promise<void>(resolve=>{release=resolve})},release:()=>release(),invalidate:()=>{invalid=true}}
}
