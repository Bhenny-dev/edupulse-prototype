import test from 'node:test'
import assert from 'node:assert/strict'
import {suspendSyllabus,resumeSyllabus,deleteSuspendedSyllabus,validateSyllabusRemoval} from '../src/utils/syllabusLifecycle'
test('suspension precedes deletion, preserves unrelated content and resume never republishes',()=>{
 const original={syllabi:[{id:'a',status:'active',approvedFile:{sha256:'retained'}},{id:'b',status:'drafted'}],content:{one:{syllabusId:'a',status:'published'},two:{syllabusId:'b',status:'published'}}}
 assert.throws(()=>deleteSuspendedSyllabus(original,'a'),/Suspend/)
 const suspended=suspendSyllabus(original,'a');assert.equal(suspended.syllabi[0].status,'archived');assert.equal(suspended.content.one.status,'checked');assert.equal(suspended.content.two.status,'published');assert.equal(original.syllabi[0].status,'active')
 assert.throws(()=>validateSyllabusRemoval(original,{...suspended,syllabi:[original.syllabi[1]]}),/saved update/)
 const resumed:Record<string,any>=resumeSyllabus(suspended,'a');assert.equal(resumed.syllabi[0].status,'active');assert.equal(resumed.content.one.status,'checked')
 const removed=deleteSuspendedSyllabus(suspended,'a');validateSyllabusRemoval(suspended,removed);assert.deepEqual(Object.keys(removed.content),['two']);assert.equal(removed.syllabi[0].id,'b')
})
