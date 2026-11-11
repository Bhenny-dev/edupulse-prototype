import type {AcademicData} from '../src/components/academic/academicData'
export function deanRecordData():AcademicData{
 const course=(id:string,code:string,status:string,person:string,block:string,year?:number)=>({id,course_code:code,course_title:code==='IT 102'?'Programming foundations':'Network foundations',instructor_id:person,instructor_name:person==='teacher-a'?'Alex Sample Instructor':'Morgan Sample Instructor',active:status==='active',syllabus_status:status,outline:[{week:1,ilos:'Explain the introductory topic',contents:['Course orientation']}],block_info:[{block,yearLevel:year}]})
 const courses=[course('c1','IT 102','active','teacher-a','BSIT-1A',1),course('c2','IT 202','checked','teacher-b','BSIT-2A',2),course('c3','IT 102','approved_uploaded','teacher-b','BSIT-1A',1),course('c4','IT 301','drafted','teacher-a','UNASSIGNED')]
 const student=(id:string,name:string,email:string,block:string,course:string)=>({course_id:course,student_ref:id,display_name:name,student_email:email,block_section:block})
 return {courses,enrollments:[student('SYN-001','Riley Example','riley@example.invalid','BSIT-1A','c1'),student('SYN-001','Riley Example','riley@example.invalid','BSIT-1A','c3'),student('SYN-002','Casey Example','casey@example.invalid','BSIT-1A','c1'),student('SYN-003','Taylor Example','taylor@example.invalid','BSIT-2A','c2'),student('SYN-004','Unspecified Year Sample','year@example.invalid','UNASSIGNED','c4')],publications:[
  {id:'p1',course_id:'c1',title:'Programming lesson',active:true,type:'material',week:1,source_version:'v2'},
  {id:'p2',course_id:'c1',title:'Reviewed exercise',active:true,type:'assessment',week:1,source_version:'v2'},
  {id:'future',course_id:'c2',title:'Scheduled lesson',active:true,type:'material',week:1,source_version:'v1',release_at:'2999-01-01T00:00:00Z'},
  {id:'retained',course_id:'c1',title:'Retained lesson',active:false,type:'material',week:1,source_version:'v1'}],attempts:[
  {id:'a1',publication_id:'p2',source_version:'v1',student_email:'riley@example.invalid',score:3,max_score:4,submitted_at:'2026-10-01T00:00:00Z'},
  {id:'a2',publication_id:'p2',source_version:'v2',student_email:'riley@example.invalid',score:2,max_score:4,is_test:true,submitted_at:'2026-10-02T00:00:00Z'},
  {id:'a3',publication_id:'p2',source_version:'v2',student_email:'riley@example.invalid',score:4,max_score:4,is_test:true,submitted_at:'2026-10-03T00:00:00Z'}],accesses:[{publication_id:'p1',student_email:'riley@example.invalid',first_opened_at:'2026-10-03T00:00:00Z',is_test:true}],faculty:[{id:'teacher-a',name:'Alex Sample Instructor',email:'teacher-a@example.invalid'},{id:'teacher-b',name:'Morgan Sample Instructor',email:'teacher-b@example.invalid'}],events:[],notices:[],institutional:[]}
}
