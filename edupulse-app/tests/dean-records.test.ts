import test from 'node:test'
import assert from 'node:assert/strict'
import {deanRecords,yearLabel,approvedSyllabus,notRoutedSyllabus} from '../src/components/academic/deanRecordModel'
import {accountManagementModel} from '../src/pages/dashboardModels'
import {deanRecordData} from './dean-records-data'
import {readWorkspaceViews,saveWorkspaceViews,workspaceViewKey} from '../src/utils/workspaceViewState'

test('Dean records deduplicate course memberships and students without inventing year levels or progress',()=>{
 const data=deanRecordData(),model=deanRecords(data)
 assert.equal(model.students.length,4);assert.equal(model.memberships,5);assert.equal(model.blocks.length,3)
 assert.equal(model.courses.length,3);assert.equal(model.loadedCodes.size,3)
 assert.deepEqual(model.blocks.map(yearLabel),['Year 1','Year 2','Year level not recorded'])
 assert.equal(model.blocks[0].students.length,2);assert.equal(model.blocks[0].courseIds.size,2)
 assert.equal(model.released.length,2);assert.equal(model.attempts.length,1)
 assert.equal(model.activity(new Set(['c1'])).testSubmissions,1)
 assert.equal(data.courses.filter(approvedSyllabus).length,2);assert.equal(data.courses.filter(notRoutedSyllabus).length,2)
 assert.deepEqual([model.courses.length,model.loadedCodes.size],Object.values(accountManagementModel(data).kpis).slice(0,2))
})
test('withdrawn enrollment and stale course IDs cannot reappear through imported roster labels',()=>{
 const data=deanRecordData();data.institutional!.push({kind:'rosters',record_key:'gone',data:{Email:'removed@example.invalid',Name:'Removed learner',YearLevel:'4',Block:'BSIT-4A'}})
 data.enrollments.push({...data.enrollments[0],course_id:'not-authorized',student_email:'outsider@example.invalid'})
 const model=deanRecords(data)
 assert.equal(model.students.some(s=>s.email==='removed@example.invalid'||s.email==='outsider@example.invalid'),false)
 assert.equal(model.blocks.some(b=>b.name==='BSIT-4A'),false)
 data.institutional!.push({kind:'rosters',record_key:'conflict',data:{Email:'riley@example.invalid',YearLevel:'2',Block:'BSIT-1A'}})
 assert.equal(deanRecords(data).blocks.find(b=>b.name==='BSIT-1A')?.mixed,true)
})
test('Dean modal reload hints store only bounded references and remain scoped to the actual role/account',()=>{
 const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>{values.set(key,value)}}
 const key=workspaceViewKey('admin-a:dean-subject','dean')
 saveWorkspaceViews(key,new Map<string,unknown>([['dean-detail:students','block:bsit-1a'],['dean-detail:records','course:c1'],['dean-detail:instructors','instructor:teacher-a'],['dean-detail:student','wrong'],['dean-students-private',{email:'private@example.invalid'}]]),storage)
 assert.equal(readWorkspaceViews(key,storage).size,3)
 assert.equal(readWorkspaceViews(workspaceViewKey('admin-b:dean-subject','dean'),storage).size,0)
 assert.equal(readWorkspaceViews(workspaceViewKey('admin-a:dean-subject','associate_dean'),storage).size,0)
 assert.doesNotMatch(values.get(key)!,/private@example.invalid/)
})
