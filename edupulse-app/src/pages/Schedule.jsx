import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, ChevronLeft, ChevronRight, List, CalendarDays } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useAcademicRecords } from '../context/AcademicContext'
import useAcademicTerm from '../components/academic/useAcademicTerm'
import LoadTermFilter from '../components/academic/LoadTermFilter'
import { LoadingStatus } from '../components/ui/LoadingFeedback'
import { loadTerm, recordsForLoadTerm } from '../utils/loadTerms'
import { instructorCourses } from '../utils/instructorCourses'
import { classTone } from '../utils/classroom'
import { studentClassPath } from '../utils/studentClassPath'
import { clockLabel, hourSpan, layoutDay, meetingsOf, timeRange, weekOf } from '../utils/classSchedule'
import '../components/classroom/classroom.css'
import '../components/schedule/schedule.css'

const HOUR = 66
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const dayName = date => date.toLocaleDateString(undefined, { weekday: 'long' })
const dayShort = date => date.toLocaleDateString(undefined, { weekday: 'short' })
const dateLabel = date => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** The classes the signed-in instructor teaches or student is in, for the selected semester. */
function useScheduleClasses(term) {
  const { user } = useAuth(), workspace = useWorkspace(), records = useAcademicRecords(), data = records.data
  return useMemo(() => {
    if (user?.role === 'instructor') {
      const termData = recordsForLoadTerm(data, term)
      return instructorCourses(termData, user.id, workspace.syllabi).flatMap(course => (course.blocks.length ? course.blocks : ['']).map(block => ({ key: `${course.id}|${block}`, code: course.code, title: course.title, block, instructor: user.name, courseId: course.id, slots: course.slots?.[block] || [] })))
    }
    const assigned = (data.assignedCourses || []).filter(row => !row.suspended && (term === 'unspecified' || loadTerm(row.academic_year || '', row.semester || '') === term))
    const idOf = (code, block) => assigned.find(row => row.course_code === code && row.block_section === block)?.id
    const rows = (data.classSchedule || []).filter(row => term === 'unspecified' || loadTerm(row.academic_year, row.semester) === term)
    const scheduled = rows.map(row => ({ key: row.load_key, code: row.course_code, title: row.course_title, block: row.block, instructor: row.instructor_name || '', courseId: idOf(row.course_code, row.block), slots: row.slots || [] }))
    const known = new Set(rows.map(row => `${row.course_code}|${row.block}`))
    return [...scheduled, ...assigned.filter(row => !known.has(`${row.course_code}|${row.block_section}`)).map(row => ({ key: `${row.id}|${row.block_section}`, code: row.course_code, title: row.course_title, block: row.block_section, instructor: row.instructor_name || '', courseId: row.id, slots: [] }))]
  }, [user, workspace.syllabi, data, term])
}

/** The next meeting from now: today after the current time, else the first one on the coming days. */
function nextMeeting(meetings, now) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (let offset = 0; offset < 8; offset++) {
    const day = (now.getDay() + offset) % 7, found = meetings.filter(item => item.day === day && (offset > 0 || item.end > minutes)).sort((a, b) => a.start - b.start)[0]
    if (found) { const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset); return { meeting: found, date, today: offset === 0 } }
  }
  return null
}

export default function Schedule() {
  const { user } = useAuth(), records = useAcademicRecords(), navigate = useNavigate()
  const { term } = useAcademicTerm()
  const classes = useScheduleClasses(term), { meetings, unscheduled } = useMemo(() => meetingsOf(classes), [classes])
  const [now] = useState(() => new Date()), [anchor, setAnchor] = useState(() => new Date())
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 700 ? 'agenda' : 'week'))
  const week = weekOf(anchor), hasSunday = meetings.some(item => item.day === 0)
  const days = week.filter(date => date.getDay() !== 0 || hasSunday), span = hourSpan(meetings)
  const hours = Array.from({ length: (span.to - span.from) / 60 + 1 }, (_, index) => span.from + index * 60)
  const next = useMemo(() => nextMeeting(meetings, now), [meetings, now])
  const student = user?.role === 'student'
  const open = meeting => { if (!meeting.courseId) return; navigate(student ? studentClassPath(meeting.courseId, { term, studentTab: 'announcements' }) : `/dashboard?${new URLSearchParams({ course: meeting.courseId, ...(meeting.block ? { block: meeting.block } : {}), term })}`) }
  const shift = weeks => setAnchor(previous => new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + weeks * 7))
  const label = meeting => `${meeting.code}${meeting.block ? ` block ${meeting.block}` : ''}, ${dayName(week.find(date => date.getDay() === meeting.day) || now)} ${timeRange(meeting)}${meeting.room ? `, room ${meeting.room}` : ''}`
  const range = `${dateLabel(days[0])} - ${dateLabel(days[days.length - 1])}, ${days[days.length - 1].getFullYear()}`

  const card = (meeting, style) => <button type="button" key={meeting.key} className="schedule-meeting" data-tone={classTone(meeting.code)} style={style} aria-label={label(meeting)} disabled={!meeting.courseId} onClick={() => open(meeting)}>
    <strong className="schedule-meeting-head"><span>{meeting.code}</span>{meeting.block && <span className="schedule-meeting-block">{meeting.block}</span>}</strong>
    <span className="schedule-meeting-body"><span>{timeRange(meeting)}</span>{meeting.room && <span>{meeting.room}</span>}</span>
  </button>

  return <div className="container schedule-page" data-pulse-zone="general" data-pulse-target="Schedule">
    <div className="page-header"><div><h1>Schedule</h1><p className="text-muted">{student ? 'Your weekly class meetings for the classes you are enrolled in.' : 'Your weekly class meetings for the classes you teach.'}</p></div>
      <div className="schedule-header-tools"><LoadTermFilter data={records.data} /></div></div>
    {records.error && <p role="alert">{records.error}</p>}
    {records.data.scheduleError && <p role="status" className="connected-pulse-warning mb-16">{records.data.scheduleError}</p>}
    {!records.loaded ? <LoadingStatus label="Loading your schedule..." /> : !classes.length ? <section className="class-empty" aria-label="No classes"><span className="class-empty-mark" aria-hidden="true"><CalendarDays size={36} /></span><h2>No classes in this semester</h2><p>{student ? 'Classes you join or are enrolled in appear here with their meeting days and times.' : 'Courses the Dean assigns to you appear here with their meeting days and times.'}</p></section> : <>
      <div className="schedule-bar">
        <div className="schedule-nav" role="group" aria-label="Choose the week">
          <button type="button" className="btn btn-secondary btn-sm" aria-label="Previous week" onClick={() => shift(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAnchor(new Date())}>Today</button>
          <button type="button" className="btn btn-secondary btn-sm" aria-label="Next week" onClick={() => shift(1)}><ChevronRight size={16} aria-hidden="true" /></button>
          <h2 className="schedule-range" aria-live="polite">{range}</h2>
        </div>
        <div className="tabs schedule-views" role="group" aria-label="Schedule view"><button type="button" className={`tab ${view === 'week' ? 'active' : ''}`} aria-pressed={view === 'week'} onClick={() => setView('week')}><CalendarDays size={14} aria-hidden="true" /> Week</button><button type="button" className={`tab ${view === 'agenda' ? 'active' : ''}`} aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}><List size={14} aria-hidden="true" /> Agenda</button></div>
      </div>
      {next ? <p className="schedule-next" role="status"><CalendarClock size={16} aria-hidden="true" /><span>Next class: <strong>{next.meeting.code}{next.meeting.block ? ` block ${next.meeting.block}` : ''}</strong>, {next.today ? 'today' : `${dayName(next.date)} ${dateLabel(next.date)}`}, {timeRange(next.meeting)}{next.meeting.room ? `, room ${next.meeting.room}` : ''}</span></p>
        : <p className="schedule-next text-muted" role="status">{meetings.length ? 'No more class meetings are recorded.' : 'No class meeting times are recorded yet.'}</p>}

      {view === 'week' && meetings.length > 0 && <div className="schedule-grid" role="group" aria-label={`Class meetings, week of ${dateLabel(days[0])}`} style={{ '--days': days.length, '--hour': `${HOUR}px`, '--hours': hours.length - 1 }}>
        <div className="schedule-corner" aria-hidden="true" />
        {days.map(date => <div key={date.toISOString()} className="schedule-dayhead" data-today={sameDay(date, now) || undefined}><span>{dayShort(date)}</span><strong>{date.getDate()}</strong></div>)}
        <div className="schedule-hours" aria-hidden="true">{hours.slice(0, -1).map(hour => <span key={hour} style={{ top: `${(hour - span.from) / 60 * HOUR}px` }}>{clockLabel(hour)}</span>)}</div>
        {days.map(date => <div key={`day-${date.toISOString()}`} className="schedule-day" role="list" aria-label={`${dayName(date)} ${dateLabel(date)}`} data-today={sameDay(date, now) || undefined}>
          {layoutDay(meetings.filter(item => item.day === date.getDay())).map(meeting => card(meeting, { top: `${(meeting.start - span.from) / 60 * HOUR}px`, height: `${Math.max(HOUR - 2, (meeting.end - meeting.start) / 60 * HOUR - 2)}px`, left: `calc(${meeting.lane / meeting.lanes * 100}% + 2px)`, width: `calc(${100 / meeting.lanes}% - 4px)` }))}
        </div>)}
      </div>}
      {view === 'agenda' && meetings.length > 0 && <div className="schedule-agenda">{days.map(date => { const list = meetings.filter(item => item.day === date.getDay()); return <section key={date.toISOString()} className="schedule-agenda-day" aria-label={`${dayName(date)} ${dateLabel(date)}`} data-today={sameDay(date, now) || undefined}>
        <h3>{dayName(date)} <span className="text-muted">{dateLabel(date)}</span></h3>
        {list.length ? list.map(meeting => <button type="button" key={meeting.key} className="class-work-row schedule-row" aria-label={label(meeting)} disabled={!meeting.courseId} onClick={() => open(meeting)}><strong>{meeting.code}{meeting.block ? ` · ${meeting.block}` : ''}</strong><span>{meeting.title}</span><time>{timeRange(meeting)}{meeting.room ? ` · ${meeting.room}` : ''}</time></button>) : <p className="text-sm text-muted">No classes.</p>}
      </section> })}</div>}

      {unscheduled.length > 0 && <section className="card schedule-unscheduled" aria-label="Classes without a meeting time"><div className="card-header"><h2>No meeting time recorded</h2></div><div className="card-body">
        <p className="text-sm text-muted mb-8">{student ? 'These classes have no day and time on the course load yet. Ask your instructor or the Dean.' : 'These classes have no day and time on their course load yet. The Dean records them when loading the course.'}</p>
        {unscheduled.map(item => <button type="button" key={item.key} className="class-work-row" disabled={!item.courseId} onClick={() => open(item)}><strong>{item.code}{item.block ? ` · ${item.block}` : ''}</strong><span>{item.title}</span></button>)}
      </div></section>}
    </>}
  </div>
}
