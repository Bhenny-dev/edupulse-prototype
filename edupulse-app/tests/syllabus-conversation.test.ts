import test from 'node:test'
import assert from 'node:assert/strict'
import { isSyllabusOutlineRequest, lastSyllabusContext, pulseFollowupPrompts, syllabusFollowupRequest } from '../src/agents/syllabusConversation.js'

const editor = { kind:'syllabus', data:{ courseCode:'LANG 101', courseOutline:[
  {week:1,ilos:'Greet people.',contents:['Greetings'],activities:'Pair exercise',assessments:'Short response'},
  {week:2,ilos:'',contents:[],activities:'',assessments:''},
  {week:3,ilos:'',contents:[],activities:'',assessments:''},
  {week:9,ilos:'',contents:[],activities:'',assessments:'Midterm Examination'},
]}}
const initial = [{from:'user',text:'Generate Week 1 for my language syllabus'},{from:'pulse',text:'Updated LANG 101 syllabus outline in the open form.',syllabusContext:{courseCode:'LANG 101',weeks:[1]}}]

test('short follow-ups inherit exact course and last completed week',()=>{
  assert.equal(lastSyllabusContext(initial)?.courseCode,'LANG 101')
  assert.match(syllabusFollowupRequest('can you provide week 2 then',initial,editor) || '',/Complete Week 2/)
  assert.match(syllabusFollowupRequest('generate all weeks',initial,editor) || '',/remaining missing weeks/)
  assert.match(syllabusFollowupRequest('please do the next week',initial,editor) || '',/Week 2/)
  assert.equal(syllabusFollowupRequest('why is Week 2 about greetings?',initial,editor),null)
  assert.equal(syllabusFollowupRequest('week 2',[...initial],{...editor,data:{...editor.data,courseCode:'OTHER'}}),null)
})

test('existing draft requests are recognized without interpreting unrelated prompts as edits',()=>{
  assert.equal(isSyllabusOutlineRequest('generate all weeks',initial),true)
  assert.equal(isSyllabusOutlineRequest('can you provide Week 2 then',initial),true)
  assert.equal(isSyllabusOutlineRequest('generate all weeks',[]),false)
  assert.equal(isSyllabusOutlineRequest('search Korean references',initial),false)
})

test('follow-up suggestions remain scoped to the selected syllabus',()=>{
  const prompts=pulseFollowupPrompts(initial,editor)
  assert.equal(prompts[0].label,'Generate Week 2')
  assert.ok(prompts.some(p=>p.label==='Complete remaining weeks'))
  assert.ok(prompts.some(p=>p.label==='Review what changed'))
  const elsewhere=pulseFollowupPrompts(initial,null)
  assert.equal(elsewhere[0].label,'Continue syllabus editing')
  assert.equal(pulseFollowupPrompts([{from:'user',text:'Hello'}],editor).length,0)
})
