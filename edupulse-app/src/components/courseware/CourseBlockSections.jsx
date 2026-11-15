import { useState } from 'react'
import { CalendarDays, Clock, Users, X, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { scheduleDates, weeklyDeliveryDates, validateDeliveryDates } from '../../utils/blockDelivery'
import SummaryCard from '../ui/SummaryCard'
import ModalLayer from '../ui/ModalLayer'

export default function CourseBlockSections({ course, syllabus, data }) {
  const { user } = useAuth()
  const [block, setBlock] = useWorkspaceViewState(`course:${course.id}:schedule-block`, null)
  const [notice, setNotice] = useState('')
  const weeks = [...new Set((syllabus?.courseOutline || []).map(row => row.week))].sort((a,b)=>a-b)
  const schedules = (data.deliverySchedules || []).filter(row => row.instructor_id === user.id && row.syllabus_id === syllabus?.id && course.blocks.includes(row.block_section))
  const students = name => new Set(data.enrollments.filter(row => !row.suspended && row.block_section === name && data.courses.some(item => item.id === row.course_id && item.syllabus_id === syllabus?.id)).map(row => row.student_email.toLowerCase())).size
  return <>
    <div className="kpi-grid mb-24"><SummaryCard icon={Users} label="Block sections" value={course.blocks.length} /><SummaryCard icon={CalendarDays} color="var(--purple-500)" label="Outline weeks" value={weeks.length} /><SummaryCard icon={CalendarDays} color="var(--green-500)" label="Scheduled weeks" value={schedules.reduce((sum,row)=>sum+row.windows.length,0)} /><SummaryCard icon={Clock} color="var(--amber-500)" label="Weeks with a closing time" value={schedules.reduce((sum,row)=>sum+row.windows.filter(window=>window.closes_at).length,0)} /></div>
    <p className="text-sm text-muted mb-24">Set when each block can open its weekly teaching materials and assessments. Dates and times use Philippine time (Asia/Manila). Class start is required; closing is optional.</p>
    {notice && <p role="status" className="mb-16">{notice}</p>}
    {!weeks.length && <p>Add the extracted course outline in Weeks and topics before scheduling its weeks.</p>}
    <div className="instructor-course-grid">{course.blocks.map(name => {const saved=schedules.find(row=>row.block_section===name);return <button className="instructor-course-card" key={name} disabled={!weeks.length} onClick={()=>setBlock(name)} aria-label={`Schedule ${name}`}><Users size={24} aria-hidden="true" /><div><strong>{name}</strong><p>{students(name)} enrolled students</p><small>{saved?`${saved.windows.length} weeks scheduled`:'No delivery schedule yet'}</small></div><ArrowRight size={16} aria-hidden="true" /></button>})}</div>
    {block && <ModalLayer className="overlay-backdrop academic-publication-overlay" onDismiss={()=>setBlock(null)}><section className="modal-content academic-publication-dialog block-schedule-dialog" role="dialog" aria-modal="true" aria-label={`Delivery schedule for ${block}`}><div className="modal-header"><div><h2>{block} delivery schedule</h2><p className="text-sm text-muted">{course.code} — {course.title} · Philippine time</p></div><button className="modal-close" aria-label="Close block schedule" onClick={()=>setBlock(null)}><X size={20} /></button></div>{course.blocks.includes(block)&&syllabus&&weeks.length ? <BlockScheduleEditor key={`${course.id}:${syllabus.id}:${block}`} syllabus={syllabus} block={block} weeks={weeks} schedule={schedules.find(row=>row.block_section===block)} onSaved={()=>{setBlock(null);setNotice(`${block} weekly delivery schedule saved.`)}} /> : <p>This block or extracted outline is no longer available in your current course.</p>}</section></ModalLayer>}
  </>
}

function BlockScheduleEditor({ syllabus, block, weeks, schedule, onSaved }) {
  const workspace = useWorkspace(), academic = useAcademicRecords()
  const [rows, setRows] = useState(()=>scheduleDates(weeks,schedule)), [revision] = useState(schedule?.revision || 0)
  const [firstDate, setFirstDate] = useState(rows[0]?.date || ''), [start, setStart] = useState(rows[0]?.start || ''), [end, setEnd] = useState(rows[0]?.end || '')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const blocked=busy||workspace.loading||workspace.saving||workspace.dirty||workspace.mode!=='cloud'
  const fill = () => {try{setRows(weeklyDeliveryDates(weeks,firstDate,start,end));setError('')}catch(failure){setError(failure.message)}}
  const update = (week,key,value) => setRows(previous=>previous.map(row=>row.week===week?{...row,[key]:value}:row))
  const save = async event => {
    event.preventDefault();if(blocked)return
    setError('')
    try {validateDeliveryDates(rows);setBusy(true);await academic.command({operation:'delivery-schedule',syllabus:syllabus.id,block,revision,windows:rows});onSaved()}
    catch(failure){setError(failure.message)}finally{setBusy(false)}
  }
  return <div className="block-schedule-body">
    <section className="block-schedule-pattern" aria-label="Weekly class pattern"><h3>Weekly class pattern</h3><p className="text-sm text-muted">Fill the dates weekly, then adjust individual weeks for holidays or class changes. A blank closing time keeps that week available after class.</p><div className="academic-filters"><label className="academic-filter">Week {weeks[0]} class date<input className="form-input" type="date" value={firstDate} onChange={event=>setFirstDate(event.target.value)} /></label><label className="academic-filter">Class start<input className="form-input" type="time" value={start} onChange={event=>setStart(event.target.value)} /></label><label className="academic-filter">Class close (optional)<input className="form-input" type="time" value={end} onChange={event=>setEnd(event.target.value)} /></label></div><button className="btn btn-secondary mt-16" type="button" disabled={blocked||!firstDate||!start} onClick={fill}>Fill weekly dates</button></section>
    {error&&<p role="alert" className="connected-pulse-warning mb-16">{error}</p>}
    <form onSubmit={save}><div className="academic-table-wrap"><table className="data-table block-schedule-table"><thead><tr><th scope="col">Week</th><th scope="col">Class date</th><th scope="col">Opens at · required</th><th scope="col">Closes at · optional</th></tr></thead><tbody>{rows.map(row=><tr key={row.week}><th scope="row">Week {row.week}</th><td><input className="form-input" type="date" aria-label={`Week ${row.week} class date`} value={row.date} required onChange={event=>update(row.week,'date',event.target.value)} /></td><td><input className="form-input" type="time" aria-label={`Week ${row.week} opening time`} value={row.start} required onChange={event=>update(row.week,'start',event.target.value)} /></td><td><input className="form-input" type="time" aria-label={`Week ${row.week} closing time (optional)`} value={row.end} onChange={event=>update(row.week,'end',event.target.value)} /></td></tr>)}</tbody></table></div><p className="text-sm text-muted mt-16">Saved dates control this block’s scheduled publications. Keep content checked before delivering it from Weeks and topics. Existing assessment scores and reading records are retained.</p>{workspace.mode!=='cloud'&&<p>Sign in to save a class delivery schedule.</p>}<button className="btn btn-primary mt-16" type="submit" disabled={blocked}>{busy?'Saving schedule…':'Save delivery schedule'}</button></form>
  </div>
}
