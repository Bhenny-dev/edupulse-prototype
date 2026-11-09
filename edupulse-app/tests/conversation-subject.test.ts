import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conversationSubject } from '../src/lib/rag/conversation.js'
import { planRequest } from '../src/lib/rag/plan.js'

const history=[{role:'user',content:'do you know alexandra?'},{role:'assistant',content:'Did you mean ALEXANDRA SAMPLE?\nRegistered student: ALEXANDRA SAMPLE; student number SYN-001; year 4.'}]
test('person follow-ups keep a bounded English or Filipino subject without generic FB research',()=>{
  for(const message of ['do you know him on fb?','on fb?','sa facebook?','kilala mo ba siya sa fb?','anong year niya?','What program is she in?']) {
    const result=conversationSubject({message,history})
    assert.equal(result.person,'ALEXANDRA SAMPLE');assert.equal(result.personFollowUp,true)
    const plan=planRequest({message,history});assert.match(plan.queries[0]!,/ALEXANDRA SAMPLE/);assert.equal(plan.needsWeb,false)
  }
  const multi=[...history,{role:'user',content:'on fb?'},{role:'assistant',content:'A matching public name does not establish the same person.'}]
  assert.equal(conversationSubject({message:'What year is she?',history:multi}).person,'ALEXANDRA SAMPLE')
})
test('a new topic, missing antecedent, ambiguity and expired history do not guess a person',()=>{
  for(const message of ['What is photosynthesis?','Who is Another Person?','New topic: what is Facebook?','Iba naman, ano ang Facebook?']) {
    const plan=planRequest({message,history});assert.doesNotMatch(plan.queries[0]!,/ALEXANDRA/)
    assert.equal(conversationSubject({message,history}).followUp,false)
  }
  assert.equal(conversationSubject({message:'Who is Another Person?',history}).person,'Another Person')
  assert.equal(conversationSubject({message:'Do you know him on fb?'}).person,'')
  const multiple=[{role:'assistant',content:'Registered student: ALEX SAMPLE; year 1.\nRegistered student: ALEX OTHER; year 2.'}]
  assert.equal(conversationSubject({message:'What year is he?',history:multiple}).ambiguous,true)
  const shift=[...history,{role:'user',content:'What is photosynthesis?'},{role:'assistant',content:'Plants use light.'}]
  assert.equal(conversationSubject({message:'What year is he?',history:shift}).person,'')
  assert.equal(conversationSubject({message:'What year is he?',history:[...history,...Array.from({length:12},()=>({role:'assistant',content:'Other content'}))]}).person,'')
})
