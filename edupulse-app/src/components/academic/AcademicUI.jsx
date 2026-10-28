import { useSearchParams } from 'react-router-dom'
import { exportCSV } from '../../utils/exportUtils'

export function Panel({ title, children, actions }) {
  return <section className="card mb-24"><div className="card-header"><h2>{title}</h2>{actions}</div><div className="card-body">{children}</div></section>
}
export function Empty({ children = 'No records match this view.' }) { return <p className="academic-empty">{children}</p> }
export function KPIs({ items }) {
  return <div className="kpi-grid mb-24">{items.map(([label, value]) => <div className="kpi-card" key={label}><div><div className="kpi-value">{value ?? '—'}</div><div className="kpi-label">{label}</div></div></div>)}</div>
}
export function useAcademicTabs({ items, label = 'Page views', fallback }) {
  const [params, setParams] = useSearchParams()
  const key = items.some(([id]) => id === params.get('tab')) ? params.get('tab') : fallback || items[0][0]
  const nav = <nav className="tabs academic-tabs mb-24" aria-label={label}>{items.map(([id, title]) => <button key={id} className={`tab ${key === id ? 'active' : ''}`} aria-pressed={key === id} onClick={() => { const next = new URLSearchParams(params); next.set('tab', id); setParams(next) }}>{title}</button>)}</nav>
  return { key, nav }
}
export function Table({ headers, rows, empty, label }) {
  return rows.length ? <div className="academic-table-wrap" tabIndex={0} role="region" aria-label={label || headers.join(', ')}><table className="data-table"><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((cells, index) => <tr key={index}>{cells.map((cell, column) => <td key={column} data-label={headers[column]}>{cell ?? '—'}</td>)}</tr>)}</tbody></table></div> : <Empty>{empty}</Empty>
}
export function CsvButton({ headers, rows, name = 'academic-records' }) {
  return <button className="btn btn-secondary btn-sm" disabled={!rows.length} onClick={() => exportCSV(rows.map(row => Object.fromEntries(headers.map((header, index) => [header, typeof row[index] === 'string' && /^[=+@\-\t\r]/.test(row[index]) ? `'${row[index]}` : row[index]]))), `${name}.csv`)}>Download CSV</button>
}
export function CourseFilter({ data, value, onChange }) {
  return <label className="academic-filter">Course<select className="form-select" value={value} onChange={event => onChange(event.target.value)}><option value="">All authorized courses</option>{data.courses.map(course => <option key={course.id} value={course.id}>{course.course_code} — {course.course_title}</option>)}</select></label>
}
export function CourseTable({ data }) {
  return <Table headers={['Course', 'Title', 'Syllabus', 'Source revision']} rows={data.courses.map(course => [course.course_code, course.course_title, course.active ? 'Active' : 'Not active', course.source_revision])} />
}
export function ClassLists({ data }) {
  const headers = ['Course', 'Block', 'Student ID', 'Name']
  const rows = data.enrollments.map(item => [data.courses.find(course => course.id === item.course_id)?.course_code, item.block_section, item.student_ref, item.display_name])
  return <Panel title="Confirmed class lists" actions={<CsvButton headers={headers} rows={rows} name="confirmed-class-lists" />}><Table headers={headers} rows={rows} /></Panel>
}
