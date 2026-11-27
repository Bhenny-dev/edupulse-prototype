import test from 'node:test'
import assert from 'node:assert/strict'
import {finishedQuizSource,finishedQuizPrompt,repeatsOfficial} from '../server/domains/practice.js'

const hex=(n:number)=>String(n).repeat(32).slice(0,32)
const reading={id:hex(1),source_version:hex(2),course_id:'c1',week:3,type:'material',active:true,title:'Loops',content:{title:'Loops',sections:[{heading:'Loops',body:'A loop repeats while its condition holds.'}]}}
const other={id:hex(3),source_version:hex(4),course_id:'c1',week:3,type:'material',active:true,title:'Arrays',content:{title:'Arrays',sections:[{heading:'Arrays',body:'An array stores values by index.'}]}}
const closed={...other,id:hex(5),content:null}
const quiz={id:hex(6),source_version:hex(7),course_id:'c1',week:3,type:'assessment',active:true,title:'Week 3 quiz',
 content:{coverage:{materialIds:[reading.id,closed.id]},questions:[
  {text:'Which loop runs at least once before its test?',options:['for','while','do-while','none'],correctIndex:2,topic:'Loop control'},
  {text:'What stops a while loop that counts to ten?',options:['break only','its condition','a return','nothing'],correctIndex:1,topic:'Loop control'},
  {text:'How many passes does a loop from 0 below 3 make?',options:['2','3','4','unbounded'],correctIndex:1,topic:'Counting'}]}}
const publications=[reading,other,closed,quiz]
const attempts=[{publication_id:quiz.id,score:2,max_score:3}]

test('practice from a finished quiz reads only the covered, still readable teaching and never the official items or keys',()=>{
 assert.equal(finishedQuizSource(publications,[],quiz.id,quiz.source_version),null,'an unsubmitted quiz is not finished')
 assert.equal(finishedQuizSource(publications,attempts,reading.id,reading.source_version),null,'a reading is not a quiz')
 assert.equal(finishedQuizSource(publications,attempts,quiz.id,hex(9)),null,'a revised quiz version is refused')
 const source=finishedQuizSource(publications,attempts,quiz.id,quiz.source_version)!
 assert.deepEqual(source.materials.map(m=>m.id),[reading.id],'uncovered material and closed teaching are left out')
 assert.deepEqual(source.topics,['Loop control','Counting'])
 const prompt=JSON.stringify(finishedQuizPrompt(source))
 for(const q of quiz.content.questions){
  assert.equal(prompt.includes(q.text),false,'no official question text reaches the prompt')
  for(const option of q.options.filter(o=>o.length>3))assert.equal(prompt.includes(`"${option}"`),false,'no official option reaches the prompt')
 }
 assert.equal(/correctIndex/.test(finishedQuizPrompt(source).user),false,'no answer key reaches the supplied data')
 assert.match(prompt,/A loop repeats while its condition holds/)
})

test('an unlinked quiz falls back to its week, and a generated quiz that repeats an official item is rejected',()=>{
 const unlinked={...quiz,content:{questions:quiz.content.questions}}
 assert.deepEqual(finishedQuizSource([reading,other,unlinked],attempts,quiz.id,quiz.source_version)!.materials.map(m=>m.id),[reading.id,other.id])
 const fresh={questions:[{text:'Trace a loop that starts at five and stops below seven.'},{text:'Why does a missing update cause repetition?'},{text:'Pick the loop for an unknown count of inputs.'}]}
 assert.equal(repeatsOfficial(quiz,fresh),false)
 assert.equal(repeatsOfficial(quiz,{questions:[...fresh.questions.slice(0,2),{text:'which loop runs at least once before its test'}]}),true)
 assert.equal(repeatsOfficial(quiz,{questions:[{text:'Q1. What stops a while loop that counts to ten? Explain.'}]}),true)
})
