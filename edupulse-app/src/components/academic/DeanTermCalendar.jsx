import { Spinner } from '../ui/LoadingFeedback'
import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { DeanDialog } from './DeanCommon'
import { termCalendar, calendarDate as longDate } from '../../utils/blockCalendar'

/** When classes start in a semester and how many teaching weeks it has. Blocks without saved delivery dates
 * open each week's courseware at their first class meeting, counted from this date. */
export default function DeanTermCalendar({ records, semester, academicYear, writable, action }) {
  const calendar = termCalendar(records, semester, academicYear)
  const [open, setOpen] = useState(false), [first, setFirst] = useState(''), [weeks, setWeeks] = useState('18'), [error, setError] = useState('')
  const start = () => { setFirst(calendar?.classesStart || ''); setWeeks(String(calendar?.weeks || 18)); setError(''); action.setError(''); setOpen(true) }
  const save = async event => {
    event.preventDefault()
    const count = Number(weeks)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) return setError('Choose the first day of classes.')
    if (!Number.isInteger(count) || count < 1 || count > 30) return setError('A semester has 1 to 30 teaching weeks.')
    setError('')
    const result = await action.run('Saving classes start', { action: 'term.calendar', semester, academic_year: academicYear, classes_start: first, weeks: count },
      saved => ({ text: `Classes start ${longDate(saved.classes_start)} in ${semester} ${academicYear} (${saved.weeks} teaching weeks). Blocks without saved delivery dates open each week at their first class meeting.` }))
    if (result) setOpen(false)
  }
  const label = calendar ? `Classes start ${longDate(calendar.classesStart)}` : 'Set classes start'
  return <>
    {writable ? <button className="btn btn-secondary btn-sm" disabled={Boolean(action.busy)} onClick={start} aria-label={`${label} for ${semester} ${academicYear}`}><CalendarDays size={15} aria-hidden="true" /> {label}</button>
      : calendar && <span className="dean-tag">{label}</span>}
    {open && <DeanDialog title="Classes start" subtitle={`${semester} ${academicYear}`} icon={CalendarDays} size="narrow" onClose={() => setOpen(false)}
      footer={<><button className="btn btn-secondary" onClick={() => setOpen(false)} disabled={Boolean(action.busy)}>Cancel</button><button aria-busy={Boolean(action.busy)} className="btn btn-primary" type="submit" form="dean-term-calendar" disabled={Boolean(action.busy)}>{Boolean(action.busy) && <Spinner />}{action.busy ? `${action.busy}…` : 'Save'}</button></>}>
      <form id="dean-term-calendar" className="dean-form" onSubmit={save} noValidate>
        {(error || action.error) && <p role="alert" className="connected-pulse-warning">{error || action.error}</p>}
        <label className="dean-field">First day of classes<input className="form-input" type="date" value={first} onChange={event => setFirst(event.target.value)} required /></label>
        <label className="dean-field">Teaching weeks<input className="form-input" type="number" min="1" max="30" value={weeks} onChange={event => setWeeks(event.target.value)} required /></label>
        <p className="text-sm text-muted">Week 1 starts on this date. Each block that has no saved delivery dates opens a week's teaching materials and assessments at its first class meeting of that week (Philippine time), using the days and time on its course load. Instructors can still save their own dates for a block.</p>
      </form>
    </DeanDialog>}
  </>
}
