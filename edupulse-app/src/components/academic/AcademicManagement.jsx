import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MonitorOverview from './MonitorOverview'
import { Panel, Empty, KPIs, Table, CsvButton, CourseFilter, ClassLists, useAcademicTabs } from './AcademicUI'
import { deliverySummary, filterAcademic } from './academicData'
import AcademicRecords from './AcademicRecords'
import CourseAssignments from './CourseAssignments'
import ReadinessCharts from './ReadinessCharts'

export default function AcademicManagement({ data, view, role }) {
  const [params,setParams]=useSearchParams()
  useEffect(()=>{if(view==='monitor'&&params.get('tab')==='review'){const next=new URLSearchParams(params);next.set('tab','overview');setParams(next,{replace:true})}},[view,params,setParams])
  const [courseId, setCourseId] = useState(''), [search, setSearch] = useState('')
  const intake = {loads:(data.institutional || []).filter(item=>item.kind==='loads').map(item=>item.data)}
  const items = view === 'monitor' ? [['overview', 'Syllabus & Delivery'], ['students', 'Student Oversight'], ['alerts', 'Alerts']] : view === 'courses' ? [['monitoring', 'Course Monitoring'], ['instructors', 'Instructors']] : [['import', 'File Import'], ['sections', 'Blocks / Sections'], ['courses', 'Courses']]
  const { key, nav } = useAcademicTabs({ items, label: view === 'monitor' ? 'Monitor views' : view === 'courses' ? 'Course loading views' : 'Records views' })
  const scoped = filterAcademic(data, courseId)
  const courses = scoped.courses.filter(item => `${item.course_code} ${item.course_title}`.toLowerCase().includes(search.toLowerCase()))
  const ids = new Set(courses.map(item => item.id))
  const filtered = { ...scoped, courses, publications: scoped.publications.filter(item => ids.has(item.course_id)), enrollments: scoped.enrollments.filter(item => ids.has(item.course_id)) }
  const summaries = deliverySummary(filtered)
  const headers = ['Course', 'Title', 'Syllabus', 'Blocks', 'Students', 'Materials', 'Assessments', 'Published weeks']
  const rows = summaries.map(item => [item.course_code, item.course_title, item.syllabus_status?.replaceAll('_',' ') || (item.active ? 'Active' : 'Not active'), item.blocks.join(', '), item.students, item.materials, item.assessments, item.weeks])
  const instructorIds = [...new Set(filtered.courses.map(item => item.instructor_id).filter(Boolean))]
  return <>{nav}<div className="academic-filters"><CourseFilter data={data} details={view==='monitor'} value={courseId} onChange={setCourseId} /><label className="academic-filter">Search courses<input className="form-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Course code or title" /></label></div>
    <KPIs items={[["Authorized courses", filtered.courses.length], ['Active syllabi', filtered.courses.filter(item => item.active).length], ['Blocks', new Set(filtered.enrollments.map(item => item.block_section).filter(Boolean)).size], [view==='monitor'?'Released items':'Published items', filtered.publications.filter(item => item.active&&(view!=='monitor'||!item.release_at||new Date(item.release_at).getTime()<=Date.now())).length]]} />
    {view === 'records' ? <AcademicRecords data={filtered} tab={key} /> : <>
      {view==='courses' && key==='instructors' && <CourseAssignments data={data}/>}
      {key==='overview'&&view==='monitor'&&<MonitorOverview data={filtered}/>}
      {key==='monitoring'&&<ReadinessCharts data={filtered}/>}
      {key === 'monitoring' && <Panel title={key === 'syllabi' ? 'Syllabus status overview' : 'Course readiness monitoring'} actions={<CsvButton headers={headers} rows={rows} name="course-readiness" />}><Table headers={headers} rows={rows} /><p className="text-sm text-muted mt-16">Syllabus status, planned outline weeks and delivery counts come from the saved instructor workspace. Approval remains an offline institutional process.</p>{summaries.map(item => <details className="academic-details" key={item.id}><summary>{item.course_code} — View course details</summary><p>{item.course_title} · {item.active ? 'Active syllabus' : 'Syllabus not active'}</p><Table headers={['Publication', 'Week', 'Type', 'Status']} rows={scoped.publications.filter(pub => pub.course_id === item.id).map(pub => [pub.title, pub.week, pub.type, pub.active ? 'Published' : 'Retained'])} /><ClassLists data={{ ...scoped, enrollments: scoped.enrollments.filter(entry => entry.course_id === item.id) }} /></details>)}</Panel>}
      {key === 'students' && <><Panel title="Blocks and enrollment"><Table headers={['Block', 'Distinct students', 'Courses']} rows={[...new Set(filtered.enrollments.map(item => item.block_section).filter(Boolean))].map(block => [block, new Set(filtered.enrollments.filter(item => item.block_section === block).map(item => item.student_email)).size, new Set(filtered.enrollments.filter(item => item.block_section === block).map(item => item.course_id)).size])} /></Panel><ClassLists data={filtered} /><Panel title="Student oversight scope"><p>{role === 'associate_dean' ? 'Program Coordinator oversight includes course rosters and delivery. Assessment scores and student material access are restricted.' : 'Open College Performance to review authorized raw assessment scores and material access.'}</p></Panel></>}
      {key === 'alerts' && <Panel title="Readiness and delivery alerts"><Table headers={['Course', 'Review item']} rows={summaries.flatMap(item => [...(!item.active ? [[item.course_code, 'No active syllabus in the shared records']] : []), ...(!item.students ? [[item.course_code, 'No confirmed roster entries']] : []), ...(!item.materials && !item.assessments ? [[item.course_code, 'No published courseware']] : [])])} empty="No readiness gaps in the available records." /><p className="text-sm text-muted mt-16">These notices reflect current records. No deadlines, missing syllabus weeks or student risk are inferred.</p></Panel>}
      {key === 'instructors' && <Panel title="Instructor delivery"><p className="text-sm text-muted mb-16">Instructor names come from your confirmed course-load imports. Without a matching import, the account identifier is shown. Recorded qualifications are listed in the confirmed course-load exports above.</p>{instructorIds.length ? instructorIds.map(id => { const imported = intake?.loads?.find(item => item.InstructorID === id); const courses = summaries.filter(item => item.instructor_id === id); return <details className="academic-details" key={id}><summary>{imported?.InstructorName || id} · {courses.length} course(s)</summary><Table headers={['Course', 'Students', 'Materials', 'Assessments']} rows={courses.map(item => [item.course_code, item.students, item.materials, item.assessments])} /></details> }) : <Empty>No instructor identifiers available.</Empty>}</Panel>}
    </>}
  </>
}
