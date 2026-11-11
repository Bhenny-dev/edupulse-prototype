import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, ClipboardCheck, CheckCircle, Users, Layers, GraduationCap, Activity, X } from 'lucide-react'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import SummaryCard from '../ui/SummaryCard'
import ModalLayer from '../ui/ModalLayer'
import { Panel, Empty, Table, CsvButton, useAcademicTabs } from './AcademicUI'
import { deanRecords, approvedSyllabus, notRoutedSyllabus, syllabusState, yearLabel } from './deanRecordModel'
import { SYLLABUS_STATUS_META } from '../../data/syllabusStatus'

const colors=[['sky',BookOpen],['purple',ClipboardCheck],['green',CheckCircle],['amber',Activity]]
function Cards({items}){return <div className="kpi-grid mb-24">{items.map((item,index)=>{const [tone,Icon]=colors[index%colors.length];return <SummaryCard key={item.label} icon={item.icon||Icon} color={`var(--${tone}-500)`} bg={`var(--${tone}-100)`} {...item}/>})}</div>}
const recorded = (count, tests) => <>{count}{tests>0&&<span className="text-sm text-muted"> · {tests} test</span>}</>
const levels = student => [...student.years].sort((a,b)=>a-b).join(', ')||'Not recorded'

export default function DeanRecords({data,view}) {
  const model=deanRecords(data),[params,setParams]=useSearchParams(),[search,setSearch]=useState('')
  const [detail,setDetail]=useWorkspaceViewState(`dean-detail:${view}`,null)
  const [studentSearch,setStudentSearch]=useState('')
  const courseRows=model.courses.filter(course=>`${course.code} ${course.title}`.toLowerCase().includes(search.toLowerCase()))
  const studentsRows=students=>students.map(student=>{
    const activity=model.activity(student.courseIds,student.email)
    return [student.reference||'—',student.name,student.email,levels(student),[...new Set([...student.courseIds].map(id=>data.courses.find(c=>c.id===id)?.course_code).filter(Boolean))].join(', '),recorded(activity.submissions,activity.testSubmissions),recorded(activity.opens,activity.testOpens)]
  })
  const csvRows=students=>students.map(student=>[student.reference,student.name,student.email,levels(student),[...new Set([...student.courseIds].map(id=>data.courses.find(c=>c.id===id)?.course_code).filter(Boolean))].join('; ')])
  const csvHeaders=['Student ID','Name','Email','Year level','Courses']
  const block=typeof detail==='string'&&detail.startsWith('block:')?model.blocks.find(b=>b.id===detail.slice(6)):null
  const instructor=typeof detail==='string'&&detail.startsWith('instructor:')?model.faculty.find(p=>p.id===detail.slice(11)):null
  const selectedCourse=typeof detail==='string'&&detail.startsWith('course:')?data.courses.find(c=>c.id===detail.slice(7)):null
  const summaryDetail=['students','blocks','years','faculty'].includes(detail)?detail:null
  const available=block||instructor||selectedCourse||summaryDetail
  const open=reference=>{setStudentSearch('');setDetail(reference)}
  const close=()=>setDetail(null)
  const instructorIds=new Set(data.courses.filter(c=>c.instructor_id).map(c=>c.instructor_id))
  const {key:tab,nav}=useAcademicTabs({items:[['courses','Course records'],['loads','Course loads'],['rosters','Student class lists'],['syllabi','Syllabi']],label:'Course record views'})
  const status=params.get('status'),filteredSyllabi=data.courses.filter(c=>status==='approved'?approvedSyllabus(c):status==='not-routed'?notRoutedSyllabus(c):status==='active'?c.active:true)
  const yearGroups=[...new Set(model.blocks.map(b=>yearLabel(b)))]
  const filterStudents=rows=>rows.filter(s=>`${s.name} ${s.reference} ${s.email}`.toLowerCase().includes(studentSearch.toLowerCase()))
  return <>
    {view==='records'&&<>
      {nav}
      <Cards items={[
        {label:'Released Courses',value:model.courses.length,to:'/records?tab=courses'},
        {label:'Courses Loaded',value:model.loadedCodes.size,to:'/records?tab=loads'},
        {label:'Approved Syllabi',value:data.courses.filter(approvedSyllabus).length,to:'/records?tab=syllabi&status=approved'},
        {label:'Recorded submissions',value:model.attempts.length,to:'/performance?tab=scores'}]}/>
      <nav className="academic-actions mb-24" aria-label="Course oversight"><Link className="btn btn-secondary btn-sm" to="/monitor?tab=overview">Syllabus & Delivery</Link></nav>
      {tab==='courses'&&<Panel title="Course records" actions={<CsvButton headers={['Course','Title','Syllabi','Released items']} rows={model.courses.map(c=>[c.code,c.title,c.ids.length,model.activity(new Set(c.ids)).publications])} name="course-records"/>}>
        <label className="academic-filter mb-24">Search courses<input className="form-input" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Course code or title"/></label>
        <Table headers={['Course','Title','Instructors','Registered students','Released items','Submissions','Material opens']} rows={courseRows.map(c=>{const ids=new Set(c.ids),activity=model.activity(ids);return [c.code,c.title,[...new Set(data.courses.filter(x=>ids.has(x.id)).map(x=>x.instructor_name||model.faculty.find(p=>p.id===x.instructor_id)?.name||'Not assigned'))].join(', '),new Set(data.enrollments.filter(e=>ids.has(e.course_id)).map(e=>e.student_email.toLowerCase())).size,activity.publications,recorded(activity.submissions,activity.testSubmissions),recorded(activity.opens,activity.testOpens)]})}/>
      </Panel>}
      {tab==='loads'&&<Panel title="Course loads"><Table headers={['Course','Instructor','Blocks / Sections','Registered students','Released items','Submissions']} rows={data.courses.filter(c=>c.instructor_id).map(c=>{const activity=model.activity(new Set([c.id]));return [c.course_code,c.instructor_name||model.faculty.find(p=>p.id===c.instructor_id)?.name||c.instructor_id,[...new Set(data.enrollments.filter(e=>e.course_id===c.id).map(e=>e.block_section).filter(Boolean))].join(', ')||'—',new Set(data.enrollments.filter(e=>e.course_id===c.id).map(e=>e.student_email.toLowerCase())).size,activity.publications,recorded(activity.submissions,activity.testSubmissions)]})}/>
        {(data.institutional||[]).some(r=>r.kind==='loads')&&<details className="academic-details"><summary>Confirmed course-load records</summary><Table headers={['Course','Instructor','Block','Semester']} rows={(data.institutional||[]).filter(r=>r.kind==='loads').map(r=>[r.data.CourseCode,r.data.InstructorName||r.data.InstructorID,r.data.Block,r.data.Semester])}/></details>}
      </Panel>}
      {tab==='rosters'&&<Panel title="Student class lists" actions={<CsvButton headers={['Course','Instructor','Block','Student ID','Name','Email']} rows={data.enrollments.map(e=>[data.courses.find(c=>c.id===e.course_id)?.course_code,data.courses.find(c=>c.id===e.course_id)?.instructor_name||model.faculty.find(p=>p.id===data.courses.find(c=>c.id===e.course_id)?.instructor_id)?.name||'Not assigned',e.block_section,e.student_ref,e.display_name,e.student_email])} name="student-class-lists"/>}><Table headers={['Course','Instructor','Block','Student ID','Name','Email']} rows={data.enrollments.map(e=>[data.courses.find(c=>c.id===e.course_id)?.course_code,data.courses.find(c=>c.id===e.course_id)?.instructor_name||model.faculty.find(p=>p.id===data.courses.find(c=>c.id===e.course_id)?.instructor_id)?.name||'Not assigned',e.block_section,e.student_ref,e.display_name,e.student_email])}/><Link className="btn btn-secondary btn-sm mt-16" to="/students">View blocks by year level</Link></Panel>}
      {tab==='syllabi'&&<Panel title="Syllabi"><label className="academic-filter mb-24">Syllabus status<select className="form-select" value={status||''} onChange={e=>{const next=new URLSearchParams(params);if(e.target.value)next.set('status',e.target.value);else next.delete('status');setParams(next)}}><option value="">All recorded statuses</option><option value="approved">Approved syllabi</option><option value="not-routed">Not yet routed for approval</option><option value="active">Active syllabi</option></select></label><Table headers={['Course','Instructor','Recorded status','Outline weeks','Action']} rows={filteredSyllabi.map(c=>[`${c.course_code} — ${c.course_title}`,c.instructor_name||model.faculty.find(p=>p.id===c.instructor_id)?.name||'Not assigned',SYLLABUS_STATUS_META[syllabusState(c)]?.label||syllabusState(c),c.outline?.length||0,<button key={c.id} className="btn btn-secondary btn-sm" onClick={()=>open(`course:${c.id}`)}>View outline</button>])}/></Panel>}
    </>}
    {view==='instructors'&&<>
      <Cards items={[{label:'Instructors',value:model.faculty.length,onClick:()=>open('faculty')},{label:'Teaching instructors',value:instructorIds.size,to:'/instructors?filter=teaching'},{label:'Courses Loaded',value:model.loadedCodes.size,to:'/records?tab=loads'},{label:'Released items',value:model.released.length,to:'/monitor?tab=overview'}]}/>
      <label className="academic-filter mb-24">Search instructors<input className="form-input" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Instructor name"/></label>
      <div className="academic-card-grid">{model.faculty.filter(person=>(params.get('filter')!=='teaching'||instructorIds.has(person.id))&&person.name.toLowerCase().includes(search.toLowerCase())).map(person=>{const courses=data.courses.filter(c=>c.instructor_id===person.id),activity=model.activity(new Set(courses.map(c=>c.id)));return <button className="card dean-record-card" key={person.id} onClick={()=>open(`instructor:${person.id}`)} aria-label={`View instructor ${person.name}`}><span className="dean-card-icon"><GraduationCap aria-hidden="true" size={22}/></span><strong>{person.name}</strong><span>{courses.length} syllabi · {activity.publications} released items</span><span>{activity.submissions} submissions{activity.testSubmissions>0?` · ${activity.testSubmissions} test`:''}</span></button>})}</div>
      {!model.faculty.length&&<Empty>No instructor records available.</Empty>}
    </>}
    {view==='students'&&<>
      <Cards items={[{label:'Registered students',value:model.students.length,icon:Users,onClick:()=>open('students')},{label:'Blocks / Sections',value:model.blocks.length,icon:Layers,onClick:()=>open('blocks')},{label:'Recorded year levels',value:new Set(model.students.flatMap(s=>[...s.years])).size,icon:GraduationCap,onClick:()=>open('years')},{label:'Course enrollments',value:model.memberships,to:'/records?tab=rosters'}]}/>
      {yearGroups.map(label=><section className="dean-year-group" key={label} aria-label={label}><h2>{label}</h2><div className="academic-card-grid">{model.blocks.filter(b=>yearLabel(b)===label).map(b=><button className="card dean-record-card" key={b.id} onClick={()=>open(`block:${b.id}`)} aria-label={`View block ${b.name}`}><span className="dean-card-icon"><Users size={22} aria-hidden="true"/></span><strong>{b.name}</strong><span>{b.students.length} registered student{b.students.length===1?'':'s'}</span><span>{b.courseIds.size} course offering{b.courseIds.size===1?'':'s'}</span></button>)}</div></section>)}
      {!model.blocks.length&&<Empty>No registered blocks or sections yet.</Empty>}
    </>}
    {detail&&<ModalLayer onDismiss={close} onClick={close}><section className="modal-content dean-record-dialog" role="dialog" aria-modal="true" aria-label={block?`Block ${block.name}`:instructor?`Instructor ${instructor.name}`:selectedCourse?`Outline ${selectedCourse.course_code}`:summaryDetail==='students'?'Registered students':summaryDetail==='blocks'?'Blocks / Sections':summaryDetail==='years'?'Year levels':summaryDetail==='faculty'?'Instructors':'Record unavailable'} onClick={e=>e.stopPropagation()}>
      <div className="modal-header"><div><h2>{block?block.name:instructor?instructor.name:selectedCourse?`${selectedCourse.course_code} — ${selectedCourse.course_title}`:summaryDetail==='students'?'Registered students':summaryDetail==='blocks'?'Blocks / Sections':summaryDetail==='years'?'Year levels':summaryDetail==='faculty'?'Instructors':'Record unavailable'}</h2>{block&&<p className="text-sm text-muted mt-8">{yearLabel(block)} · {block.students.length} registered student{block.students.length===1?'':'s'} · {block.courseIds.size} course offering{block.courseIds.size===1?'':'s'}</p>}</div><button className="modal-close" onClick={close} aria-label="Close record details"><X size={20}/></button></div>
      <div className="dean-dialog-body">
        {(block||summaryDetail==='students')&&<><div className="academic-filters"><label className="academic-filter">Search students<input className="form-input" type="search" value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} placeholder="Name, student ID or email"/></label><CsvButton headers={csvHeaders} rows={csvRows(block?block.students:model.students)} name={block?`block-${block.name}`:'registered-students'}/></div><Table headers={[...csvHeaders,'Recorded submissions','Material opens']} rows={studentsRows(filterStudents(block?block.students:model.students))}/></>}
        {summaryDetail==='blocks'&&<Table headers={['Block','Year level','Registered students','Action']} rows={model.blocks.map(b=>[b.name,yearLabel(b),b.students.length,<button key={b.id} className="btn btn-secondary btn-sm" onClick={()=>open(`block:${b.id}`)}>View students</button>])}/>}
        {summaryDetail==='years'&&<Table headers={['Year level','Blocks','Registered students']} rows={yearGroups.map(label=>{const blocks=model.blocks.filter(b=>yearLabel(b)===label);return [label,blocks.length,new Set(blocks.flatMap(b=>b.students.map(s=>s.email))).size]})}/>}
        {summaryDetail==='faculty'&&<Table headers={['Instructor','Syllabi','Action']} rows={model.faculty.map(person=>[person.name,data.courses.filter(c=>c.instructor_id===person.id).length,<button key={person.id} className="btn btn-secondary btn-sm" onClick={()=>open(`instructor:${person.id}`)}>View instructor</button>])}/>}
        {instructor&&<Table headers={['Course','Syllabus status','Released items','Recorded submissions','Material opens']} rows={data.courses.filter(c=>c.instructor_id===instructor.id).map(c=>{const a=model.activity(new Set([c.id]));return [c.course_code,SYLLABUS_STATUS_META[syllabusState(c)]?.label||syllabusState(c),a.publications,recorded(a.submissions,a.testSubmissions),recorded(a.opens,a.testOpens)]})}/>}
        {selectedCourse&&<Table headers={['Week','Intended learning outcomes','Contents']} rows={(selectedCourse.outline||[]).map(row=>[row.week,row.ilos,row.contents.join('; ')])}/>}
        {!available&&<Empty>This record is no longer in your authorized view. Close this dialog and choose a current record.</Empty>}
      </div><div className="modal-footer"><button className="btn btn-secondary" onClick={close}>Close</button></div>
    </section></ModalLayer>}
  </>
}
