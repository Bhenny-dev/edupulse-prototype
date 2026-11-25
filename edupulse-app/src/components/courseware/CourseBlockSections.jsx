import { useState } from 'react'
import { CalendarDays, Clock, Users, X, ArrowRight, Pencil, Eye, EyeOff } from 'lucide-react'
import { slotTimes, slotDays } from '../../utils/blockSections'
import { termCalendar, weeklyContactHours, classScheduleDates, termHours, calendarDate, meetingTime } from '../../utils/blockCalendar'

const slotLine = slots => slots.map(slot => [slot.days, slot.time, slot.room && `Room ${slot.room}`].filter(Boolean).join(' · ')).join('; ')
import { useAuth } from '../../context/AuthContext'
import { useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { scheduleDates, weeklyDeliveryDates, validateDeliveryDates } from '../../utils/blockDelivery'
import SummaryCard from '../ui/SummaryCard'
import ModalLayer from '../ui/ModalLayer'
import CoursewareActions from './CoursewareActions'
import CourseClassList from './CourseClassList'

export default function CourseBlockSections({ course, syllabus, data, readOnly=false }) {
  const { user } = useAuth()
  const workspace=useWorkspace()
  const [block, setBlock] = useWorkspaceViewState(`course:${course.id}:schedule-block`, null)
  const [menu,setMenu]=useWorkspaceViewState(`course:${course.id}:block-menu`,null)
  const [notice, setNotice] = useState('')
  const [classList,setClassList]=useWorkspaceViewState(`course:${course.id}:class-list`,null)
  // The class schedule from the course load presets each block's delivery schedule; the instructor may hide it.
  const [hiddenSlots,setHiddenSlots]=useWorkspaceViewState(`course:${course.id}:hidden-class-schedule`,[])
  const slotsOf=name=>Array.isArray(hiddenSlots)&&hiddenSlots.includes(name)?[]:course.slots?.[name]||[]
  const weeks = [...new Set((syllabus?.courseOutline || []).map(row => row.week))].sort((a,b)=>a-b)
  const schedules = (data.deliverySchedules || []).filter(row => row.instructor_id === user.id && row.syllabus_id === syllabus?.id && course.blocks.includes(row.block_section))
  // Blocks without saved dates follow their class schedule from the Dean's classes-start date (as the database does).
  const calendar = termCalendar(data.institutional, course.semester, course.academicYear)
  const loadSlots = name => course.slots?.[name] || []
  const classDates = (name, from = weeks) => calendar && !schedules.some(row => row.block_section === name) ? classScheduleDates(loadSlots(name), calendar, from) : []
  // The first class-schedule opening, also before the outline exists: week 1 opens at the block's first meeting.
  const firstOpening = name => classDates(name, weeks.length ? weeks : [1])[0]
  const hours = name => termHours(loadSlots(name), calendar, syllabus?.courseInfo?.noOfHours)
  const planned = termHours([], null, syllabus?.courseInfo?.noOfHours).planned
  const students = name => new Set([...(workspace.registrations||[]).filter(r=>r.assignmentKey===course.assignmentKey&&r.blockSection===name&&r.status==='active').flatMap(r=>r.students||[]).map(s=>s.Email?.toLowerCase()),...data.enrollments.filter(row => !row.suspended && row.block_section === name && data.courses.some(item => item.id === row.course_id && item.syllabus_id === syllabus?.id)).map(row => row.student_email.toLowerCase())]).size
  return <>
    <div className="kpi-grid mb-24"><SummaryCard icon={Users} label="Block sections" value={course.blocks.length} /><SummaryCard icon={CalendarDays} color="var(--purple-500)" label="Outline weeks" value={weeks.length} /><SummaryCard icon={CalendarDays} color="var(--green-500)" label="Scheduled weeks" value={schedules.reduce((sum,row)=>sum+row.windows.length,0)+course.blocks.reduce((sum,name)=>sum+classDates(name).length,0)} /><SummaryCard icon={Clock} color="var(--amber-500)" label="Weeks with a closing time" value={schedules.reduce((sum,row)=>sum+row.windows.filter(window=>window.closes_at).length,0)} /></div>
    <p className="text-sm text-muted mb-24">{readOnly?'View the recorded schedule. This semester is completed.':'Set when each block can open its weekly teaching materials and assessments.'} Dates and times use Philippine time (Asia/Manila). Class start is required; closing is optional.</p>
    <p className="text-sm mb-16" role="note">{calendar ? `Classes start ${calendarDate(calendar.classesStart)} · ${calendar.weeks} teaching weeks. A block without saved dates opens each week's courseware at its first class meeting.` : 'The Dean has not recorded when classes start this semester. Save each block’s dates, or ask the Dean to set the first day of classes so every block follows its class schedule.'}{planned ? ` The syllabus plans ${planned} hours.` : ''}</p>
    {course.blocks.filter(name => hours(name).short).map(name => { const h = hours(name); return <p key={name} role="status" className="connected-pulse-warning mb-16">{`${name} meets ${h.weekly} hours a week for ${h.weeks} weeks (${h.scheduled} hours), less than the syllabus’s ${h.planned} hours. Check the weekly plan with the Dean before delivery.`}</p> })}
    {notice && <p role="status" className="mb-16">{notice}</p>}
    {!weeks.length && <p>Add the extracted course outline in Weeks and topics before scheduling its weeks.</p>}
    <div className="instructor-course-grid">{course.blocks.map(name => {const saved=schedules.find(row=>row.block_section===name);return <article className="instructor-block-card" key={name}><button className="instructor-course-card" disabled={!weeks.length} onClick={()=>setBlock(name)} aria-label={`Schedule ${name}`}><Users size={24} aria-hidden="true" /><div><strong>{name}</strong><p>{students(name)} enrolled students</p><small>{saved?`${saved.windows.length} weeks scheduled`:firstOpening(name)?`Follows the class schedule: week ${firstOpening(name).week} opens ${meetingTime(firstOpening(name).date,firstOpening(name).start)}`:'No delivery schedule yet'}</small>{slotsOf(name).length>0&&<small className="block-class-schedule">Class schedule: {slotLine(slotsOf(name))}{weeklyContactHours(slotsOf(name))?` · ${weeklyContactHours(slotsOf(name))} hours a week`:''}</small>}</div><ArrowRight size={16} aria-hidden="true" /></button>{!readOnly&&<CoursewareActions open={menu===name} onOpenChange={value=>setMenu((typeof value==='function'?value(menu===name):value)?name:null)} label={`Block actions for ${name}`} actions={[{label:'Manage class list',icon:Pencil,onSelect:()=>setClassList(name)},...((course.slots?.[name]||[]).length?[slotsOf(name).length?{label:'Hide class schedule',icon:EyeOff,onSelect:()=>setHiddenSlots(old=>[...new Set([...(Array.isArray(old)?old:[]),name])])}:{label:'Show class schedule',icon:Eye,onSelect:()=>setHiddenSlots(old=>(Array.isArray(old)?old:[]).filter(item=>item!==name))}]:[])]}/>}</article>})}</div>
    {!readOnly&&classList&&course.blocks.includes(classList)&&<CourseClassList course={course} block={classList} onClose={()=>setClassList(null)} onSaved={message=>{setClassList(null);setNotice(message)}}/>}
    {block && <ModalLayer className="overlay-backdrop academic-publication-overlay" onDismiss={()=>setBlock(null)}><section className="modal-content academic-publication-dialog block-schedule-dialog" role="dialog" aria-modal="true" aria-label={`Delivery schedule for ${block}`}><div className="modal-header"><div><h2>{block} delivery schedule</h2><p className="text-sm text-muted">{course.code} — {course.title} · Philippine time</p></div><button className="modal-close" aria-label="Close block schedule" onClick={()=>setBlock(null)}><X size={20} /></button></div>{course.blocks.includes(block)&&syllabus&&weeks.length ? <BlockScheduleEditor key={`${course.id}:${syllabus.id}:${block}`} syllabus={syllabus} readOnly={readOnly} block={block} preset={slotsOf(block)} weeks={weeks} schedule={schedules.find(row=>row.block_section===block)} classDates={classDates(block)} onSaved={()=>{setBlock(null);setNotice(`${block} weekly delivery schedule saved.`)}} /> : <p>This block or extracted outline is no longer available in your current course.</p>}</section></ModalLayer>}
  </>
}

function BlockScheduleEditor({ syllabus, block, weeks, schedule, onSaved, readOnly=false, preset=[], classDates=[] }) {
  const workspace = useWorkspace(), academic = useAcademicRecords()
  const [rows, setRows] = useState(()=>schedule||!classDates.length?scheduleDates(weeks,schedule):weeks.map(week=>classDates.find(row=>row.week===week)||{week,date:'',start:'',end:''})), [revision] = useState(schedule?.revision || 0)
  const times = slotTimes(preset[0]?.time), meetingDays = [...new Set(preset.flatMap(slot => slotDays(slot.days)))]
  const [firstDate, setFirstDate] = useState(rows[0]?.date || ''), [start, setStart] = useState(rows[0]?.start || times.start), [end, setEnd] = useState(rows[0]?.end || times.end)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const blocked=readOnly||busy||workspace.loading||workspace.saving||workspace.dirty||workspace.mode!=='cloud'
  const fill = () => {try{setRows(weeklyDeliveryDates(weeks,firstDate,start,end));setError('')}catch(failure){setError(failure.message)}}
  const update = (week,key,value) => setRows(previous=>previous.map(row=>row.week===week?{...row,[key]:value}:row))
  const save = async event => {
    event.preventDefault();if(blocked)return
    setError('')
    try {validateDeliveryDates(rows);setBusy(true);await academic.command({operation:'delivery-schedule',syllabus:syllabus.id,block,revision,windows:rows});onSaved()}
    catch(failure){setError(failure.message)}finally{setBusy(false)}
  }
  return <div className="block-schedule-body">
    {!readOnly&&<section className="block-schedule-pattern" aria-label="Weekly class pattern"><h3>Weekly class pattern</h3>{!schedule&&classDates.length>0&&<p className="block-schedule-preset" role="note">These dates follow the class schedule from the Dean’s classes-start date, and students already see them. Save only to change them.</p>}{!schedule&&!classDates.length&&preset.length>0&&<p className="block-schedule-preset" role="note">Preset from your course load: {slotLine(preset)}. {meetingDays.length?`Choose the first ${meetingDays.join(' or ')} class date of the semester, then fill the weekly dates. `:''}Change any time or week before saving.</p>}<p className="text-sm text-muted">Fill the dates weekly, then adjust individual weeks for holidays or class changes. A blank closing time keeps that week available after class.</p><div className="academic-filters"><label className="academic-filter">Week {weeks[0]} class date<input className="form-input" type="date" value={firstDate} onChange={event=>setFirstDate(event.target.value)} /></label><label className="academic-filter">Class start<input className="form-input" type="time" value={start} onChange={event=>setStart(event.target.value)} /></label><label className="academic-filter">Class close (optional)<input className="form-input" type="time" value={end} onChange={event=>setEnd(event.target.value)} /></label></div><button className="btn btn-secondary mt-16" type="button" disabled={blocked||!firstDate||!start} onClick={fill}>Fill weekly dates</button></section>}
    {error&&<p role="alert" className="connected-pulse-warning mb-16">{error}</p>}
    <form onSubmit={save}><div className="academic-table-wrap"><table className="data-table block-schedule-table"><thead><tr><th scope="col">Week</th><th scope="col">Class date</th><th scope="col">Opens at · required</th><th scope="col">Closes at · optional</th></tr></thead><tbody>{rows.map(row=><tr key={row.week}><th scope="row">Week {row.week}</th><td><input className="form-input" type="date" aria-label={`Week ${row.week} class date`} readOnly={readOnly} value={row.date} required onChange={event=>update(row.week,'date',event.target.value)} /></td><td><input className="form-input" type="time" aria-label={`Week ${row.week} opening time`} readOnly={readOnly} value={row.start} required onChange={event=>update(row.week,'start',event.target.value)} /></td><td><input className="form-input" type="time" aria-label={`Week ${row.week} closing time (optional)`} readOnly={readOnly} value={row.end} onChange={event=>update(row.week,'end',event.target.value)} /></td></tr>)}</tbody></table></div><p className="text-sm text-muted mt-16">Saved dates control this block’s scheduled publications. Keep content checked before delivering it from Weeks and topics. Existing assessment scores and reading records are retained.</p>{workspace.mode!=='cloud'&&<p>Sign in to save a class delivery schedule.</p>}{!readOnly&&<button className="btn btn-primary mt-16" type="submit" disabled={blocked}>{busy?'Saving schedule…':'Save delivery schedule'}</button>}</form>
  </div>
}
