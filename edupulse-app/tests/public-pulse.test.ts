import {test} from 'node:test'
import assert from 'node:assert/strict'
import {registerHooks} from 'node:module'

// Landing content includes image imports. Only their URL modules need a Node loader.
const assets=registerHooks({load(url,context,next){return /\.(?:webp|png|jpg|svg)$/.test(url)?{format:'module',source:`export default ${JSON.stringify(url)}`,shortCircuit:true}:next(url,context)}})
const {respond}=await import('../src/components/public/pulseTalk.js')
const {rankPublicInfo}=await import('../src/components/public/publicSearch.js')
assets.deregister()

test('public keywords and transposed spelling rank the intended topic above incidental FAQ words',()=>{
 for(const [message,id] of [['student','students'],['stduents','students'],['instructors','instructors'],['instrcutors','instructors'],['show me feautres','features'],['How do I uplod a sylabus?','syllabus-intake'],['how to print pdf','pdf'],['what is edupulse?','about'],['who is ginard','dean'],['Who is Rogelio Guisdan?','staff-guisdan']] as const) {
  const ranked=rankPublicInfo(message);assert.equal(ranked[0]?.id,id,message);assert.ok(ranked.every((p,i)=>i===0||ranked[i-1]!.score>=p.score-.01))
 }
 assert.match(respond('stduents').text,/Did you mean students/);assert.doesNotMatch(respond('student').text,/^No\./)
 assert.equal(respond('please explain the features').topic,'features')
 assert.equal(respond('do you know how to upload a syllabus?').topic,'syllabus-intake')
 assert.equal(respond('hello do you know bhenny?').topic,'bhenny')
 assert.equal(rankPublicInfo('capital of France').length,0);assert.equal(rankPublicInfo('xyzzzzzzzzzz').length,0)
})
test('the public sample conversation acknowledges a person without turning a statement into an assessment refusal',()=>{
 const one=respond('do you know bhenny?');assert.equal(one.topic,'bhenny');assert.match(one.text,/student researchers/)
 const history=[{agent:null,text:'do you know bhenny?'},one]
 const two=respond('he is a student',{history});assert.equal(two.topic,'bhenny');assert.match(two.text,/Bhenny Benlor/);assert.doesNotMatch(two.text,/^No\.|assessment answers/)
 const three=respond('kilala mo ba siya sa fb?',{history:[...history,{agent:null,text:'he is a student'},two]});assert.match(three.text,/You mean Bhenny/);assert.match(three.text,/no verified social/)
 assert.equal(respond('what are the features?',{history}).topic,'features');assert.equal(respond('who is ginard?',{history}).topic,'dean')
 assert.equal(respond('who is Steve and what can he do?',{history}).topic,'staff-sudaypan')
 assert.match(respond('do you know unknownxyz and does he teach?',{history}).text,/could not find that person/)
 const missing=respond('he is a student',{history:[{agent:null,text:'do you know unknownxyz?'},respond('do you know unknownxyz?')]});assert.match(missing.text,/describing the person/);assert.doesNotMatch(missing.text,/^No\./)
})
test('public answers use only bundled facts, do not disclose private records and keep selected-agent and casual behavior',()=>{
 const before=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('Public replies must not use a network service')}
 try {
  assert.match(respond('do you know bheeny?').text,/Bhenny Benlor/)
  assert.match(respond('do you know bheeny?').text,/Did you mean Bhenny Benlor D\. Rivera/)
  assert.match(respond('instructors').text,/Marielle Angela Fianza-Buya/)
  assert.match(respond('Who is Myriell?').text,/Associate Dean/)
  assert.match(respond('Who is unknownxyz?').text,/could not find that person/)
  for(const message of ['student profiles email password','students grades','2024-1-0277@gmail.com'])assert.doesNotMatch(respond(message).text,/2024-1-0277|@edupulse\.com|@123/)
  assert.equal(respond('Give me quiz answers').mood,'decline')
  assert.equal(respond('hello').mood,'happy');assert.equal(respond('thanks').mood,'grateful')
  assert.match(respond('what is your name?').text,/Guardian/);assert.equal(respond('what is your name?').topic,undefined)
  assert.equal(respond('instructors',{to:'librarian'}).agent,'librarian')
 }finally{globalThis.fetch=before}
})
