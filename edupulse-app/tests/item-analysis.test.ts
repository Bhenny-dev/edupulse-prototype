import test from 'node:test'
import assert from 'node:assert/strict'
import {itemAnalysis} from '../src/components/academic/monitoringModel.js'
import type {AcademicData,Attempt,Publication} from '../src/components/academic/academicData.js'

const quiz:Publication={id:'q',course_id:'c',active:true,type:'assessment',week:2,title:'Functions quiz',source_version:'v2',content:{questions:[{text:'What does a function return?',topic:'Returns'},{text:'Name a parameter.',topic:'Parameters'},{text:'  '}]}}
const attempt=(student:string,scores:number[],extra:Partial<Attempt>={}):Attempt=>({publication_id:'q',source_version:'v2',student_email:student,score:scores.reduce((a,b)=>a+b,0),max_score:3,submitted_at:'2026-11-20T01:00:00Z',question_scores:scores,...extra})
const data=(attempts:Attempt[]):AcademicData=>({courses:[],enrollments:[],publications:[quiz],attempts,accesses:[]} as unknown as AcademicData)

test('item analysis counts each student once, on the current version, marked and student-recorded only',()=>{
 const rows=itemAnalysis(data([
  attempt('a@x',[1,0,1],{submitted_at:'2026-11-20T01:00:00Z'}),
  attempt('a@x',[1,1,1],{submitted_at:'2026-11-21T01:00:00Z'}),
  attempt('b@x',[0,0,1]),
  attempt('c@x',[1,1,0],{source_version:'v1'}),
  attempt('d@x',[1,1,1],{grading_status:'pending_review'}),
  attempt('e@x',[1,1,1],{is_test:true}),
 ]),quiz)
 assert.deepEqual(rows.map(r=>[r.answered,r.correct,r.percent]),[[2,1,50],[2,1,50],[2,2,100]],'latest attempt per student; older versions, unmarked and demonstration attempts left out')
 assert.deepEqual(rows.map(r=>r.topic),['Returns','Parameters',''])
 assert.equal(rows[2].text,'Question 3','a blank question keeps a readable label')
})

test('item analysis reports no percent when nothing is marked and never reads keys',()=>{
 const rows=itemAnalysis(data([]),quiz)
 assert.deepEqual(rows.map(r=>r.percent),[null,null,null])
 assert.equal(JSON.stringify(rows).includes('correctIndex'),false)
})
