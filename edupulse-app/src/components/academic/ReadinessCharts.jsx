import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer } from 'recharts'
import { Panel,Empty,Table } from './AcademicUI'
import { deliverySummary } from './academicData'

export default function ReadinessCharts({data}) {
 const summaries=deliverySummary(data)
 const stations=['drafted','checked','downloaded_for_approval','approved_uploaded','active','archived'].map(status=>({name:status.replaceAll('_',' '),value:data.courses.filter(c=>(c.syllabus_status || (c.active?'active':'drafted'))===status).length}))
 return <div className="academic-grid"><Panel title="Syllabus stations">{data.courses.length?<div role="img" aria-label="Saved syllabus lifecycle stations"><ResponsiveContainer width="100%" height={260}><BarChart data={stations}><CartesianGrid stroke="var(--gray-200)"/><XAxis dataKey="name" tick={{fill:'var(--gray-600)',fontSize:10}}/><YAxis allowDecimals={false}/><Tooltip contentStyle={{background:'var(--white)',color:'var(--gray-800)'}}/><Bar dataKey="value" name="Syllabi" fill="var(--sky-500)" isAnimationActive={false}/></BarChart></ResponsiveContainer></div>:<Empty>No saved syllabus stations yet.</Empty>}</Panel><Panel title="Delivery progress against the outline"><Table headers={['Course','Published teaching weeks','Planned teaching weeks','Coverage']} rows={summaries.map(item=>[item.course_code,item.weeks,item.plannedWeeks,item.plannedWeeks?`${item.coverage}%`:'No outline recorded'])}/><p className="text-sm text-muted mt-16">Coverage counts approved teaching weeks with at least one published item. Draft and checked items remain separate; coverage does not imply that every planned activity was delivered.</p></Panel></div>
}
