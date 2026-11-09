import { wordMatch, words } from '../../lib/rag/lookup.js'
import { PUBLIC_FACTS } from './publicKnowledge.js'
import { AGENTS, FAQ, PHASES, PRINCIPLES, PROBLEM, ROLES } from '../landing/content.js'

const stop=new Set('a an and are as at ba be by can could did do does for from has have he her him how i in is it its kilala know ko like list me mo my names ng ni of on or please sa say show si siya tell than that the their them there these they this to us was we what when where which who why will with would you your about also all ang mga sino ano paano explain describe kindly information info hello hi hey'.split(' '))
const terms=text=>[...new Set(words(text).filter(word=>!stop.has(word)&&word.length>1))].slice(0,24)
const all=[
  ...PUBLIC_FACTS,
  { id:'about',head:'What is EduPulse',owner:'writer',body:'EduPulse is an AI-assisted syllabus, courseware and performance system developed for the College of Information Technology at King’s College of the Philippines. The approved course outline guides teaching materials; instructors review and release them and follow saved student results.',source:'About EduPulse' },
  ...FAQ.map((item,i)=>({id:`faq-${i}`,head:item.question,body:item.answer,source:'EduPulse FAQ',owner:/accuracy/i.test(item.question)?'verifier':'writer'})),
  ...ROLES.filter(role=>!['student','instructor'].includes(role.key)).map(role=>({id:`role-${role.key}`,head:`${role.label} role`,body:`${role.label}: ${role.title}. ${role.tasks.map(([,text])=>text).join('. ')}.${role.boundary?' '+role.boundary:''}`,source:'Roles',owner:'planner'})),
  ...PHASES.map(phase=>({id:`phase-${phase.phase}`,head:`${phase.title} phase`,body:`${phase.title} (${phase.who.join(', ')}): ${phase.what} ${phase.human}`,source:'How it works',owner:'planner'})),
  ...PRINCIPLES.map((rule,i)=>({id:`principle-${i}`,head:rule.title,body:rule.body,source:'Pulse’s rules',owner:'guardian'})),
  ...PROBLEM.map((row,i)=>({id:`impact-${i}`,head:`${row.area} impact`,body:`${row.area}: ${row.today} With EduPulse: ${row.next}`,source:'Impact',owner:'comparator'})),
  ...AGENTS.map(agent=>({id:`agent-${agent.key}`,head:`${agent.name} agent`,body:`${agent.name}: ${agent.role}`,source:'The agents',owner:agent.key,agent:agent.key})),
].map(p=>({...p,titleTerms:terms(p.head+' '+(p.aliases||'')),headTerms:terms(p.head),bodyTerms:terms(p.body)}))
const direct={student:'students',students:'students',estudyante:'students',instructor:'instructor-role',instructors:'instructors',teachers:'instructors',faculty:'instructors',dean:'dean',features:'features',functions:'features',edupulse:'about'}
const idf=term=>1+Math.log(1+all.length/(1+all.filter(p=>p.titleTerms.includes(term)||p.bodyTerms.includes(term)).length))

/** Finite local retrieval: coverage matters more than one incidental word in a long FAQ. */
export function rankPublicInfo(message) {
  const query=terms(message)
  if(!query.length)return []
  const target=query.length===1?Object.entries(direct).map(([word,id])=>({id,score:wordMatch(query[0],word)})).filter(hit=>hit.score>=.8).sort((a,b)=>b.score-a.score)[0]?.id:null
  return all.map(p=>{
    let weight=0,total=0,hits=0,titleHits=0;const corrections=[]
    for(const term of query) {
      const choices=[...p.titleTerms,...p.bodyTerms].map(word=>({word,similarity:wordMatch(term,word),title:p.titleTerms.includes(word)})).sort((a,b)=>b.similarity-a.similarity||Number(b.title)-Number(a.title))
      const best=choices[0],w=idf(term);total+=w
      if(best?.similarity>=.75){hits++;if(best.title)titleHits++;weight+=w*best.similarity*(best.title?1:.65);if(best.similarity<1)corrections.push({from:term,to:best.word})}
    }
    return {...p,score:total?weight/total:0,coverage:hits/query.length,titleHits,specificity:query.reduce((n,q)=>n+Math.max(0,...p.headTerms.map(t=>wordMatch(q,t))),0)/Math.max(1,p.headTerms.length),corrections}
  }).filter(p=>p.coverage>=.6&&p.score>=.55&&p.titleHits>0).sort((a,b)=>{
    return Number(b.id===target)-Number(a.id===target)||b.score-a.score||b.titleHits-a.titleHits||b.specificity-a.specificity
  }).slice(0,3)
}

export function publicContext(message,history=[]) {
  // Self-contained questions start a new topic; only explicit references or corrections carry one.
  const named=message.match(/^(?:do you know|who is|sino si|kilala mo (?:ba )?si)\s+(.+)/i)
  if(named&&!/^(?:he|him|she|her|siya|sya)\b/i.test(named[1]))return null
  const follow=/\b(?:he|him|his|she|her|they|them|their|siya|niya|sya|nya|it|its|that|those|ito|iyan)\b|^(?:and |also |what about |how about |paano naman |sa |on )/i.test(message)
  if(!follow||/^(?:new topic|instead|different topic|iba naman)\b/i.test(message))return null
  for(const line of history.slice(-8).reverse()) {
    if(line.agent&&line.topic)return all.find(p=>p.id===line.topic)||null
    if(!line.agent&&!/\b(?:he|him|she|her|siya|niya|it|that)\b/i.test(line.text))break
  }
  return null
}
