import { studentClassPath } from '../src/utils/studentClassPath.js'
import { randomUUID } from 'node:crypto'
import { ApiError, type ChatInput, type Identity } from './contracts.js'
import { publicKnowledge } from './knowledge.js'
import { authorizedAccountContext, accountQuestion, profileQuery } from './domains/accountContext.js'
import { readAcademic } from './domains/academic.js'
import { readWorkspace } from './workspace.js'
import { keywordSearch } from './rag/keyword.js'
import { searchWeb } from './external/web.js'
import { keywordMatch, words, informationalQuestion } from '../src/lib/rag/lookup.js'
import { conversationSubject, selfAccountQuestion } from '../src/lib/rag/conversation.js'
import { planRequest, allowsPublicResearch, casualConversation } from '../src/lib/rag/plan.js'
import { checkAppropriateUse } from '../src/lib/rag/policy.js'
import { explicitWebRequest, webTopic } from '../src/lib/systemChatPolicy.js'
import { quickReply } from '../src/agents/quickReplies.js'
import { extractiveAnswer, runAgents, type AgentAnswer } from '../src/lib/rag/agents.js'
import { verifyAnswer } from '../src/lib/rag/verify.js'
import { agentReport } from '../src/lib/rag/registry.js'
import type { Evidence, AgentStep } from '../src/lib/rag/types.js'
import { coursePassages, evidence, materialPassages, syllabusPassages } from './systemIndex.js'

export function simpleLookup(input: ChatInput) {
  if(['auto','answer'].includes(input.task)&&selfAccountQuestion(input.message))return true
  const plan=planRequest(input)
  return ['auto','answer'].includes(input.task) && (['answer','general'].includes(plan.task)||informationalQuestion(input.message)) && !casualConversation(input.message) && !plan.revision && !/\b(?:analy[sz]e|evaluate|reason|brainstorm|explain in detail|step.by.step)\b/i.test(input.message)
}

const roleWork:Record<Identity['role'],string>={
  admin:'You manage accounts, review system health and audit records, and open authorized academic support views.',
  dean:'You review syllabus delivery, course loads and authorized performance records, and request corrections for the offline review process.',
  associate_dean:'You manage confirmed course loads and blocks, monitor syllabus delivery and student oversight. Individual student scores are outside this role.',
  instructor:'You upload approved syllabi, generate and review courseware, publish materials, manage course rosters and monitor enrolled students’ work.',
  student:'You open released materials in your enrolled courses, answer available assessments and view your own progress and results.',
  guest:'Sign in to access your assigned academic workspace.',
}
const roleName=(role:Identity['role'])=>role==='admin'?'System Admin':role==='associate_dean'?'Program Coordinator':role.charAt(0).toUpperCase()+role.slice(1)
export async function selfAccountAnswer(input:ChatInput,owner:Identity,subject:Identity,signal:AbortSignal){
  const signedIn=owner.role!=='guest'&&!owner.local
  const viewed=subject.supportActor?subject:owner
  const details=signedIn?[`Name: ${viewed.name||'Not recorded'}.`,viewed.email?`Username: ${viewed.email}.`:'Username is not available in this verified session.',`Role: ${roleName(viewed.role)}.`,roleWork[viewed.role]]:[]
  const text=!signedIn?'I can help with EduPulse, but you are not signed in to a verified account. Sign in so I can identify your username and role.':subject.supportActor?`You are signed in as ${owner.name||roleName(owner.role)}${owner.email?` (${owner.email})`:''}, and you are viewing this account:\n\n${details.join('\n')}\n\nThis is an Admin support view. Learner changes use the separate Admin actor and remain distinct from independent student work.`:`Yes. ${details.join('\n')}`
  const result=await lookupAnswer(input,signedIn?[evidence('verified-session','Current verified account',text)]:[],signal,'system',undefined,signedIn?undefined:text)
  result.answer=text;result.verification=null;result.agentReport=agentReport(result.trace,{mode:result.mode,verification:null,sources:result.sources.length});return result
}
/**
 * Deterministic quoted answers, with real provenance and no generation/reranking model.
 * `requested` marks an Internet search the person asked for: the answer is the findings
 * themselves, without a "not found in the system" preamble for a search that never ran.
 */
export async function lookupAnswer(input: ChatInput, sources: Evidence[], signal: AbortSignal, scope:'system'|'web', correction?:string, warning?:string, requested=false):Promise<AgentAnswer> {
  const core=profileQuery(input.message) && sources[0]?.origin==='account' ? `${sources[0].text} [1]` : extractiveAnswer(input.message,sources).replace(/^Source excerpts \(no model-generated answer\):\s*/,'')
  const verification=sources.length?await verifyAnswer(core,sources,signal):null
  const prefix=correction?`Did you mean ${correction}?\n\n`:''
  const label=scope==='web'&&!requested&&sources.length?'These are Internet suggestions, not EduPulse records:\n\n':''
  const empty=warning||(scope==='web'?'The Internet search returned no results.':'No matching accessible system content was found. Try a course code, student number, a shorter name or a different keyword.')
  const answer=prefix+label+(sources.length?core:empty)
  const action=requested?'search the public web':scope==='system'?'search authorized system content':'system search, then public suggestions'
  const detail=scope==='web'?'Keyless public search; only the search topic was sent, never records, files or account details.':'Keyword and typo matching; no generation model or embedding model invoked.'
  const trace:AgentStep[]=[{agent:'Guardian',node:'guardian',action:'check appropriate use',detail:'Applied the current role restrictions before retrieval.',ms:0,status:'done'},{agent:'Researcher',node:scope==='web'&&requested?'web-search':'system-search',action,detail,ms:0,status:sources.length?'done':'fallback',metrics:{passages:sources.length}}]
  return {requestId:randomUUID(),answer,mode:sources.length?'retrieval':'insufficient-evidence',task:'answer',plan:planRequest(input),sources:sources.map((e,i)=>({...e,citation:i+1,score:e.rrf})),verification,comparison:null,references:[],trace,agents:['Guardian','Researcher'],warning:sources.length?warning||null:null,provider:'system-search',model:null,grounding:sources.length?'references':'general',policy:{allowed:true,rule:null,note:'Role restrictions were checked before System Search.'},agentReport:agentReport(trace,{mode:sources.length?'retrieval':'insufficient-evidence',verification,sources:sources.length}),lookup:{scope,...(requested?{requested:true}:{}),...(correction?{correction}:{})}}
}
const PRONOUN_TOPIC=/^(?:him|her|them|it|this|that|those|these)(?:\s+(?:one|person|people|topic))?$/i
/** An Internet search the person asked for goes straight to public search: no system search first. */
async function requestedWebSearch(input:ChatInput,signal:AbortSignal):Promise<AgentAnswer|null> {
  const topic=webTopic(input.message)
  if(!topic||PRONOUN_TOPIC.test(topic))return lookupAnswer(input,[],signal,'web',undefined,'What should I search the Internet for? Name the person or topic, for example “Search the Internet for Jose Rizal”.',true)
  // Account, class and student details never leave EduPulse; those questions use System Search.
  if(accountQuestion(topic)||/\b(?:my|our|mine)\b|@|\b\d{4}-\d-\d{4}\b/i.test(topic))return null
  const web=await searchWeb(topic,signal)
  const result=await lookupAnswer({...input,message:topic},web.evidence.slice(0,4),signal,'web',undefined,web.evidence.length?web.warning:`No Internet results were found for “${topic}”.${web.warning?` ${web.warning}`:''}`,true)
  result.plan=planRequest(input)
  return result
}

/** No public identity is inferred from a registered name or an unverified history hint. */
export async function socialProfileAnswer(input:ChatInput,sources:Evidence[],signal:AbortSignal) {
  const names=[...new Set(sources.flatMap(source=>[...source.text.matchAll(/(?:Registered student|Recorded instructor|Recorded faculty):\s*([^;\n]{3,100})/gi)].map(match=>match[1]!.trim())))]
  const result=await lookupAnswer(input,sources,signal,'system')
  result.answer=names.length===1?`You mean ${names[0]}. [1]\n\nThe accessible EduPulse profile does not provide a verified Facebook link. A matching public name alone does not confirm that it is the same person.\n\n[Search Facebook for ${names[0]}](https://www.facebook.com/search/top?q=${encodeURIComponent(names[0]!)})`:'Which person do you mean? Please give the full name or student number; I will check the accessible system record first.'
  result.verification=null
  result.agentReport=agentReport(result.trace,{mode:result.mode,verification:null,sources:sources.length})
  return result
}

/** Read-only System Search agent. Existing RLS helpers are the sole source of private data. */
export async function systemLookup(input:ChatInput,owner:Identity,subject:Identity,signal:AbortSignal,options:{force?:boolean;allowWeb?:boolean}={}):Promise<AgentAnswer|null> {
  if (!options.force && !simpleLookup(input)) return null
  if (subject.role === 'guest' && (input.attachments.length || input.documentIds.length)) throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to search private files. Public product guidance remains available.')
  if (!checkAppropriateUse(input.message,input.viewRole==='student'||input.viewRole==='guest'?input.viewRole:subject.role).allowed) return runAgents(input,subject,signal,{provider:'system-search',search:async()=>({evidence:[]})})
  if(selfAccountQuestion(input.message))return selfAccountAnswer(input,owner,subject,signal)
  const friendly = options.force && !input.attachments.length && !input.documentIds.length ? quickReply(input.message) : null
  if (friendly) return lookupAnswer(input, [], signal, 'system', undefined, friendly)
  if (options.allowWeb && explicitWebRequest(input.message) && !input.attachments.length && !input.documentIds.length && allowsPublicResearch(input.message)) {
    const web=await requestedWebSearch(input,signal)
    if (web) return web
  }
  const plan=planRequest(input), conversation=conversationSubject(input), candidates:Evidence[]=[], warnings:string[]=[]
  const scoped=plan.sourceOnly && !/\bsystem\s+(?:sources?|records?|content)\b/i.test(input.message), selectedFiles=Boolean(input.documentIds.length||input.attachments.length&&scoped)
  if(!selectedFiles&&conversation.personFollowUp&&!conversation.person) return lookupAnswer(input,[],signal,'system',undefined,conversation.ambiguous?'Which of the people in the previous answer do you mean? Please give the full name or student number.':'Who do you mean? Please give a name so I can check the accessible EduPulse records first.')
  const contextualPerson=conversation.person&&(conversation.followUp||conversation.social)
  const lookupInput=contextualPerson?{...input,message:`Who is ${conversation.person}?`}:input
  const live=selectedFiles?{evidence:[]}:await authorizedAccountContext(subject,lookupInput.message,signal)
  signal.throwIfAborted()
  for (const source of live.evidence) source.destination ??= { path: /course|syllab|material|week/i.test(input.message) ? '/courseware' : subject.role === 'instructor' ? '/student-monitoring' : subject.role === 'dean' ? '/students' : '/dashboard', label: 'Open related records' }
  if (live.warning) return lookupAnswer(input,[],signal,'system',undefined,live.warning)
  if(!selectedFiles&&contextualPerson) {
    if(!live.evidence.length)return lookupAnswer(input,[],signal,'system',undefined,'I could not find that person in the currently accessible EduPulse records. Please give their full name or student number; the earlier conversation is not current access evidence.')
    if(conversation.social)return socialProfileAnswer(input,live.evidence,signal)
    const result=await lookupAnswer(lookupInput,live.evidence,signal,'system',live.correction)
    result.plan=plan
    return result
  }
  if (live.evidence.length && (profileQuery(input.message)||! /\b(?:says?|about|covers?|topics?|outcomes?|requirements?|polic\w*|grading|references?|lessons?|concepts?|weeks?|activit\w*)\b/i.test(input.message))) return lookupAnswer(input,live.evidence,signal,'system',live.correction)
  candidates.push(...live.evidence)
  if (!input.documentIds.length) for (const [i,file] of input.attachments.entries()) candidates.push(evidence(`attachment-${i}`,file.title,file.text,'attachment'))
  if (!scoped) candidates.push(...publicKnowledge.map(row=>evidence(row.id,row.title,row.text,'public-guide')))
  const records=!selectedFiles && subject.role!=='guest' && !profileQuery(input.message)
  const question=conversation.followUp?plan.queries[0]||input.message:input.message
  type Found={passages:Evidence[];warning?:string}
  // The three stores are independent, so they are read together; results keep this fixed order.
  const academic=async():Promise<Found>=>{
    if(!records)return {passages:[]}
    try {
      const rows=await readAcademic(subject), passages:Evidence[]=[]
      for (const row of rows.courses) {
        const path = subject.role === 'student'
          ? studentClassPath(String(row.id),{studentTab:'materials'})
          : `/courseware?course=${encodeURIComponent(String(row.syllabus_id || row.id))}`
        passages.push(...coursePassages(`course:${row.id}`,String(row.course_code)+' '+row.course_title,`${row.course_code}: ${row.course_title}. Instructor: ${row.instructor_name||'not recorded'}.`,row.outline,{path,label:'Open course'}))
      }
      for (const row of rows.publications) if (row.type === 'material' && row.active) {
        const course = rows.courses.find((candidate: {id:string;syllabus_id?:string}) => candidate.id === row.course_id)
        const path = subject.role === 'student'
          ? studentClassPath(String(row.course_id),{studentTab:'materials',publication:String(row.id),week:row.week})
          : `/courseware?course=${encodeURIComponent(String(course?.syllabus_id || row.course_id))}&publication=${encodeURIComponent(String(row.id))}&week=${row.week}`
        passages.push(...materialPassages(`release:${row.id}`,String(row.title),row.content,{path,label:'Open teaching material'}))
      }
      return {passages}
    } catch { return {passages:[],warning:'Academic content could not be searched completely.'} }
  }
  const saved=async():Promise<Found>=>{
    if(!records||!['admin','instructor','dean','associate_dean'].includes(subject.role))return {passages:[]}
    try {
      const workspace=await readWorkspace(subject), passages:Evidence[]=[]
      for (const row of workspace.data?.syllabi||[]) passages.push(...syllabusPassages(`syllabus:${row.id}`,`${row.courseCode} ${row.courseTitle} syllabus (${row.status})`,row, { path: `/courseware?view=syllabus&course=${encodeURIComponent(row.id)}&tab=mine&read=${encodeURIComponent(row.id)}`, label: 'Open syllabus' }))
      for (const [id,row] of Object.entries(workspace.data?.content||{})) if (row.type==='material') passages.push(...materialPassages(`authored:${id}`,row.content.title,row.content, { path: `/courseware?course=${encodeURIComponent(row.syllabusId)}&item=${encodeURIComponent(id)}&week=${row.week}`, label: 'Open teaching draft' }))
      return {passages}
    } catch { return {passages:[],warning:'Saved workspace content could not be searched completely.'} }
  }
  const indexed=async():Promise<Found>=>{
    try { return {passages:await keywordSearch(owner,question,input.documentIds,signal)} }
    catch { signal.throwIfAborted();return {passages:[],warning:'The indexed knowledge library could not be searched completely.'} }
  }
  for (const part of await Promise.all([academic(),saved(),indexed()])) { candidates.push(...part.passages); if (part.warning) warnings.push(part.warning) }
  const ranked=candidates.map(source=>({source,score:keywordMatch(question,`${source.title}\n${source.text}`)})).filter(hit=>hit.score>=0.68).sort((a,b)=>b.score-a.score||(['account','attachment','private'].includes(b.source.origin)?1:0)-(['account','attachment','private'].includes(a.source.origin)?1:0))
  // A course and its syllabus can index the same week; each text is quoted once.
  const seen=new Set<string>(),found=ranked.filter(hit=>{const key=hit.source.text.replace(/\s+/g,' ').trim().toLowerCase();return !seen.has(key)&&Boolean(seen.add(key))}).slice(0,4).map(hit=>({...hit.source,query:input.message}))
  if (found.length) {
    const exact=words(input.message).every(q=>words(found[0]!.title+' '+found[0]!.text).includes(q)||q.length<4)
    return lookupAnswer(input,found,signal,'system',!exact&&ranked[0]!.score<1?found[0]!.title:undefined,warnings.join(' '))
  }
  const privateQuestion=accountQuestion(input.message)||/@|\b\d{4}-\d-\d{4}\b/.test(input.message)
  if (!scoped && !privateQuestion && allowsPublicResearch(input.message) && (!options.force || options.allowWeb && explicitWebRequest(input.message))) {
    // Preserve the existing provider's broader/current web research on explicit requests.
    if (!options.force && /\b(?:latest|recent|today|news|breaking|up.to.date)\b|\b(?:search|browse)\s+(?:the\s+)?(?:broader?\s+)?(?:web|internet)\b|\boutside Wikipedia\b/i.test(input.message)) return null
    const web=await searchWeb(plan.topic,signal)
    if (web.evidence.length) return lookupAnswer(input,web.evidence.slice(0,4),signal,'web',undefined,[...warnings,web.warning].filter(Boolean).join(' '))
    if(web.warning) warnings.push(web.warning)
  }
  const missing=await lookupAnswer(input,[],signal,'system',undefined,warnings.length?`${warnings.join(' ')} No match is claimed; retry when connected or refine the keywords.`:undefined)
  if(!options.force&&!scoped&&!privateQuestion&&!profileQuery(input.message)) missing.lookup={...missing.lookup!,canGenerate:true}
  return missing
}
