import {BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer} from 'recharts'
import {Panel,Empty,Table,CsvButton,ClassLists} from './AcademicUI'
import {deliverySummary} from './academicData'
import ReadinessCharts from './ReadinessCharts'

function CourseTick({x,y,payload}) {
 const [code,name,blocks]=String(payload.value).split(' - '),detail=blocks||name||''
 return <text x={x-8} y={y} textAnchor="end" fill="var(--gray-600)" fontSize={11}><title>{payload.value}</title><tspan x={x-8} dy={-4}>{code}</tspan><tspan x={x-8} dy={14}>{detail.length>18?detail.slice(0,15)+'...':detail}</tspan></text>
}
export default function MonitorOverview({data}) {
 const summaries=deliverySummary(data)
 const instructor=course=>course.instructor_name||data.faculty?.find(person=>person.id===course.instructor_id)?.name||'No instructor recorded'
 const headers=['Course','Title','Instructor','Syllabus','Blocks','Students','Released materials','Released assessments','Released teaching weeks','Planned teaching weeks','Coverage']
 const rows=summaries.map(course=>[course.course_code,course.course_title,instructor(course),course.syllabus_status?.replaceAll('_',' ')||(course.active?'Active':'Not active'),course.blocks.join(', '),course.students,course.materials,course.assessments,course.coveredWeeks,course.plannedWeeks,course.coverage===null?'No outline recorded':`${course.coverage}%`])
 const publications=data.publications.filter(item=>item.active&&(!item.release_at||new Date(item.release_at).getTime()<=Date.now()))
 return <>
  <ReadinessCharts data={data}><Panel title="Released courseware by course">{summaries.length?<div role="img" aria-label="Released materials and assessments by course"><ResponsiveContainer width="100%" height={Math.max(260,summaries.length*52)}><BarChart layout="vertical" data={summaries.map(course=>({...course,label:`${course.course_code} - ${instructor(course)}${course.blocks.length?' - '+course.blocks.join(', '):''}`}))}><CartesianGrid stroke="var(--gray-200)" strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false} tick={{fill:'var(--gray-600)'}}/><YAxis type="category" dataKey="label" width={112} interval={0} tick={<CourseTick/>}/><Tooltip contentStyle={{background:'var(--white)',borderColor:'var(--gray-200)',color:'var(--gray-800)'}}/><Bar name="Materials / activities" dataKey="materials" fill="var(--sky-500)" isAnimationActive={false}/><Bar name="Assessments" dataKey="assessments" fill="var(--purple-500)" isAnimationActive={false}/></BarChart></ResponsiveContainer></div>:<Empty/>}</Panel></ReadinessCharts>
  <Panel title="Syllabus and delivery overview" actions={<CsvButton headers={headers} rows={rows} name="syllabus-and-delivery"/>}><Table label="Syllabus and delivery by course" headers={headers} rows={rows}/><p className="text-sm text-muted mt-16">Coverage counts planned teaching weeks with at least one released item. Examination or unplanned weeks, future releases and drafts do not raise it. Coverage does not establish completion of every planned activity. Approval remains offline.</p>
   {summaries.map(course=><details className="academic-details" key={course.id}><summary>{course.course_code} - {course.course_title} - {instructor(course)} - View course details</summary><p>{course.blocks.join(', ')||'No confirmed block'} - {course.active?'Active syllabus':'Syllabus not active'}</p><Table headers={['Publication','Week','Type','Status']} rows={data.publications.filter(item=>item.course_id===course.id).map(item=>[item.title,item.week,item.type,!item.active?'Retained':item.release_at&&new Date(item.release_at).getTime()>Date.now()?'Scheduled':'Released'])}/><ClassLists data={{...data,enrollments:data.enrollments.filter(item=>item.course_id===course.id)}}/></details>)}
  </Panel>
  <details className="academic-details"><summary>Released courseware titles ({publications.length})</summary><Table headers={['Course','Instructor','Title','Week','Type']} rows={publications.map(item=>{const course=data.courses.find(course=>course.id===item.course_id);return [course?.course_code,course?instructor(course):'No instructor recorded',item.title,item.week,item.type]})}/></details>
 </>
}
