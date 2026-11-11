import test from 'node:test'
import assert from 'node:assert/strict'
import {readWorkspaceViews,saveWorkspaceViews,workspaceViewKey} from '../src/utils/workspaceViewState.js'

const memory=()=>{const rows=new Map<string,string>();return {rows,getItem:(key:string)=>rows.get(key)||null,setItem:(key:string,value:string)=>{rows.set(key,value)}}}
test('reload view references are isolated by owner, support subject and role and preserve Set values',()=>{
 const tab=memory(),owner=workspaceViewKey('support-admin-student-a','student')
 const state=new Map<string,unknown>([['course-location','s1'],['course:s1:expanded',new Set([1,2,18])],['course:s1:selected',new Set(['material-1'])],['course:s1:reader','material-1'],['course:s1:mode','document'],['course:s1:delivery',null],['slide:material-1',2],['syllabus-sources-open:s1',true]])
 saveWorkspaceViews(owner,state,tab)
 const loaded=readWorkspaceViews(owner,tab)
 assert.equal(loaded.get('course-location'),'s1');assert.deepEqual(loaded.get('course:s1:expanded'),new Set([1,2,18]));assert.deepEqual(loaded.get('course:s1:selected'),new Set(['material-1']));assert.equal(loaded.get('slide:material-1'),2)
 for(const scope of [workspaceViewKey('support-admin-student-b','student'),workspaceViewKey('support-other-student-a','student'),workspaceViewKey('support-admin-student-a','instructor')])assert.equal(readWorkspaceViews(scope,tab).size,0)
})
test('view persistence excludes response caches, content, credentials, commands and malformed values',()=>{
 const tab=memory(),key=workspaceViewKey('owner','instructor')
 saveWorkspaceViews(key,new Map<string,unknown>([['syllabus-sources:s1',{rows:[{text:'Private source text'}]}],['course:s1:expanded','not a set'],['course:s1:selected',new Set([1])],['course:s1:reader',{command:'publish'}],['credential','secret'],['pending-command',()=>{}],['course:s1:mode','execute'],['slide:material-1',Infinity],['academic-reader:courseware','publication-1']]),tab)
 assert.deepEqual([...readWorkspaceViews(key,tab)],[['academic-reader:courseware','publication-1']])
 assert.equal(tab.rows.get(key)!.includes('Private source text'),false);assert.equal(tab.rows.get(key)!.includes('secret'),false)
 for(const value of ['not-json','null',JSON.stringify({version:1,entries:[['course:s1:expanded',{set:['wrong']}],['course:s1:reader',false],['__proto__','unsafe']]})]){tab.rows.set(key,value);assert.equal(readWorkspaceViews(key,tab).size,0)}
 const denied={getItem:()=>{throw new Error('Denied')},setItem:()=>{throw new Error('Denied')}}
 assert.equal(readWorkspaceViews(key,denied).size,0);assert.doesNotThrow(()=>saveWorkspaceViews(key,new Map([['course-location','s1']]),denied))
})
test('layout reload state stores one allowed open surface without search queries or private payloads',()=>{
 const tab=memory(),key=workspaceViewKey('support-admin-student-a','student')
 for(const overlay of [null,'search','account','notifications','roles','language','mobile']){
  saveWorkspaceViews(key,new Map<string,unknown>([['layout-overlay',overlay],['layout-search-query','private query'],['layout-account',{email:'private@example.com'}],['layout-notifications',[{message:'private notice'}]]]),tab)
  assert.deepEqual([...readWorkspaceViews(key,tab)],[['layout-overlay',overlay]])
  assert.equal(tab.rows.get(key)!.includes('private'),false)
 }
 assert.equal(readWorkspaceViews(workspaceViewKey('support-admin-student-b','student'),tab).size,0)
 assert.equal(readWorkspaceViews(workspaceViewKey('support-admin-student-a','instructor'),tab).size,0)
 for(const invalid of ['settings',true,1,['search'],{overlay:'search'}]){
  saveWorkspaceViews(key,new Map([['layout-overlay',invalid]]),tab)
  assert.equal(readWorkspaceViews(key,tab).has('layout-overlay'),false)
 }
 saveWorkspaceViews(key,new Map([['layout-overlay','account']]),tab)
 saveWorkspaceViews(key,new Map([['layout-overlay',null]]),tab)
 assert.equal(readWorkspaceViews(key,tab).get('layout-overlay'),null)
})
test('large view histories stay bounded without changing the live map',()=>{
 const tab=memory(),key=workspaceViewKey('owner','instructor'),state=new Map<string,unknown>(Array.from({length:250},(_,i)=>[`course:syllabus-${i}:reader`,'x'.repeat(200)]))
 state.set('course-location','most-recent')
 saveWorkspaceViews(key,state,tab)
 assert.equal(state.size,251);assert.equal(readWorkspaceViews(key,tab).size,200);assert.equal(readWorkspaceViews(key,tab).get('course-location'),'most-recent')
 assert.ok(new TextEncoder().encode(tab.rows.get(key)).length<=65_536)
 const unicode=new Map<string,unknown>(Array.from({length:200},(_,i)=>[`course:unicode-${i}:reader`,'\u8bfe'.repeat(200)]));unicode.set('course-location','latest')
 saveWorkspaceViews(key,unicode,tab)
 assert.ok(new TextEncoder().encode(tab.rows.get(key)).length<=65_536);assert.ok(readWorkspaceViews(key,tab).size<200);assert.equal(readWorkspaceViews(key,tab).get('course-location'),'latest')
 tab.rows.set(key,'x'.repeat(65_537));assert.equal(readWorkspaceViews(key,tab).size,0)
})

test('source popover reload stores only bounded coordinates and a content signature',()=>{
 const tab=memory(),key=workspaceViewKey('instructor','instructor'),reference={section:2,start:10,end:50,signature:'123456'}
 saveWorkspaceViews(key,new Map<string,unknown>([['source-inspector:item',reference],['source-inspector:item:retained','source-id'],['source-inspector:unsafe',{...reference,text:'Private generated and source text'}],['source-inspector:oversize',{...reference,end:5000}]]),tab)
 assert.deepEqual(readWorkspaceViews(key,tab).get('source-inspector:item'),reference)
 assert.equal(readWorkspaceViews(key,tab).has('source-inspector:unsafe'),false);assert.equal(readWorkspaceViews(key,tab).has('source-inspector:oversize'),false)
 assert.equal(tab.rows.get(key)!.includes('Private generated'),false)
})
