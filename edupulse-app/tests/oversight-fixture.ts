import type {Page} from '@playwright/test'
import {restorationUI} from './role-restoration-fixture'
export async function oversightUI(page:Page,role='dean') {
 const fixture=await restorationUI(page,role),data=fixture.records,first=data.courses[0],material=data.publications[0]
 first.outline=[1,2].map(week=>({week,contents:['Networks'],ilos:'Explain networking concepts.'}))
 const second={...structuredClone(first),id:'c'.repeat(32),instructor_id:'second-sample-instructor',instructor_name:'Second sample instructor',active:false,syllabus_status:'drafted',outline:[1,2,3].map(week=>({week,contents:['Networks'],ilos:'Explain networking concepts.'}))}
 data.courses.push(second)
 data.enrollments=[data.enrollments[0],{...data.enrollments[1],course_id:second.id}]
 data.publications=[material,{...structuredClone(material),id:'future-sample',week:2,title:'Scheduled example',release_at:'2999-01-01T00:00:00Z'},{...structuredClone(material),id:'outside-outline',week:9,title:'Unplanned-week example'},{...structuredClone(material),id:'retained-sample',active:false,week:2,title:'Retained example'}]
 data.attempts=[];data.accesses=[]
 return fixture
}
