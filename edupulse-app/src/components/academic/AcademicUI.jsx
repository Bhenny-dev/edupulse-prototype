import { useSearchParams } from 'react-router-dom'
import { exportCSV } from '../../utils/exportUtils'
import { useAuth } from '../../context/AuthContext'
import { BookOpen, CheckCircle, Users, Activity, FileText, ClipboardCheck, Layers, RotateCcw, TrendingUp, Target } from 'lucide-react'
import SummaryCard from '../ui/SummaryCard'

export function Panel({ title, children, actions }) {
  return <section className="card mb-24"><div className="card-header"><h2>{title}</h2>{actions}</div><div className="card-body">{children}</div></section>
}
export function Empty({ children = 'No records match this view.' }) { return <p className="academic-empty">{children}</p> }
const studentSummaryIcons = {
  'Enrolled courses': BookOpen, 'Delivered materials': FileText,
  'Delivered assessments': ClipboardCheck, 'Materials opened': CheckCircle,
  'Instructor assessments taken': ClipboardCheck, 'Practice sets': Layers,
  'Practice attempts': RotateCcw, 'Practice average': TrendingUp,
  'My current attempts': ClipboardCheck, 'Average raw score': TrendingUp,
  'Published assessments': ClipboardCheck, 'Recorded material opens': CheckCircle,
  'Topics mastered': Target, 'Topics needing review': BookOpen, 'Mastery cutoff': Target,
}
export function KPIs({ items }) {
  const {user}=useAuth()
  if(user?.role==='dean'||user?.role==='student'){
    const destinations={'Authorized courses':'/records','Active syllabi':'/records?tab=syllabi&status=active','Blocks':'/students','Published items':'/monitor?tab=overview','Released items':'/monitor?tab=overview','Current-version attempts':'/performance?tab=scores','Average raw score':'/performance?tab=scores','Published assessments':'/performance?tab=bytopic','Recorded material opens':'/performance?tab=materials','Topic averages at mastery cutoff':'/performance?tab=bytopic','Topics needing review':'/performance?tab=bytopic','Mastery cutoff':'/performance?tab=bytopic'}
    const icons=[BookOpen,CheckCircle,Users,Activity],tones=['sky','purple','green','amber']
    return <div className="kpi-grid mb-24">{items.map(([label,value],i)=><SummaryCard key={label} icon={user.role==='student'?(studentSummaryIcons[label]||BookOpen):icons[i%4]} label={label} value={value} color={`var(--${tones[i%4]}-500)`} bg={`var(--${tones[i%4]}-100)`} to={user.role==='dean'?(destinations[label]||'/records'):undefined}/>)}</div>
  }
  return <div className="kpi-grid mb-24">{items.map(([label, value]) => <div className="kpi-card" key={label}><div><div className="kpi-value">{value ?? '—'}</div><div className="kpi-label">{label}</div></div></div>)}</div>
}
export function useAcademicTabs({ items, label = 'Page views', fallback, parameter = 'tab' }) {
  const [params, setParams] = useSearchParams()
  const key = items.some(([id]) => id === params.get(parameter)) ? params.get(parameter) : fallback || items[0][0]
  const nav = <nav className="tabs academic-tabs mb-24" aria-label={label}>{items.map(([id, title]) => <button key={id} className={`tab ${key === id ? 'active' : ''}`} aria-pressed={key === id} onClick={() => { const next = new URLSearchParams(params); next.set(parameter, id); setParams(next) }}>{title}</button>)}</nav>
  return { key, nav }
}
export function Table({ headers, rows, empty, label }) {
  return rows.length ? <div className="academic-table-wrap" tabIndex={0} role="region" aria-label={label || headers.join(', ')}><table className="data-table"><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((cells, index) => <tr key={index}>{cells.map((cell, column) => <td key={column} data-label={headers[column]}>{cell ?? '—'}</td>)}</tr>)}</tbody></table></div> : <Empty>{empty}</Empty>
}
export function CsvButton({ headers, rows, name = 'academic-records' }) {
  return <button className="btn btn-secondary btn-sm" disabled={!rows.length} onClick={() => exportCSV(rows.map(row => Object.fromEntries(headers.map((header, index) => [header, typeof row[index] === 'string' && /^[=+@\-\t\r]/.test(row[index]) ? `'${row[index]}` : row[index]]))), `${name}.csv`)}>Download CSV</button>
}
export function CourseFilter({ data, value, onChange, details=false }) {
  return <label className="academic-filter">Course<select className="form-select" value={value} onChange={event => onChange(event.target.value)}><option value="">All authorized courses</option>{data.courses.map(course => <option key={course.id} value={course.id}>{course.course_code} — {course.course_title}{details?` - ${course.instructor_name||data.faculty?.find(person=>person.id===course.instructor_id)?.name||'No instructor recorded'} - ${[...new Set(data.enrollments.filter(item=>item.course_id===course.id).map(item=>item.block_section).filter(Boolean))].join(', ')||'No confirmed block'}`:''}</option>)}</select></label>
}
export function CourseTable({ data }) {
  return <Table headers={['Course', 'Title', 'Syllabus', 'Source revision']} rows={data.courses.map(course => [course.course_code, course.course_title, course.active ? 'Active' : 'Not active', course.source_revision])} />
}
export function ClassLists({ data }) {
  const headers = ['Course', 'Block', 'Student ID', 'Name']
  const rows = data.enrollments.map(item => [data.courses.find(course => course.id === item.course_id)?.course_code, item.block_section, item.student_ref, item.display_name])
  return <Panel title="Confirmed class lists" actions={<CsvButton headers={headers} rows={rows} name="confirmed-class-lists" />}><Table headers={headers} rows={rows} /></Panel>
}
