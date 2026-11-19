import MeetingDaysPicker,{validMeetingDays} from './MeetingDaysPicker'
import { useState } from 'react'
import { Layers } from 'lucide-react'
import { DeanDialog } from './DeanCommon'
import { isIrregular } from './deanRecordModel'

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
const lower = value => String(value || '').trim().toLowerCase()

/** Adds a block section to a loaded course, or students to one of its blocks. Students come from a home block
 * and from irregular students; a block may also be saved without a class list for the instructor to add later. */
export default function DeanBlockSectionDialog({ load, block = '', students, action, onClose }) {
  const sections = load.sections || [], taken = new Set(sections.map(s => s.block.toUpperCase()))
  const [name, setName] = useState(block || LETTERS.find(letter => !taken.has(letter)) || '')
  const [days, setDays] = useState(''), [time, setTime] = useState(''), [room, setRoom] = useState('')
  const [home, setHome] = useState(''), [picked, setPicked] = useState([]), [error, setError] = useState('')
  const active = students.filter(s => s.status !== 'suspended' && (s.student_number || s.email))
  const homeBlocks = [...new Set(active.filter(s => !isIrregular(s) && s.block).map(s => s.block))].sort()
  const irregular = active.filter(isIrregular).sort((a, b) => String(a.name).localeCompare(String(b.name)))
  const existing = sections.find(s => s.block.toUpperCase() === name.trim().toUpperCase())
  const already = new Set((existing?.students || []).map(s => lower(s.email)))
  const fromHome = active.filter(s => home && !isIrregular(s) && s.block === home)
  const chosen = [...new Map([...fromHome, ...irregular.filter(s => picked.includes(s.id))].filter(s => !already.has(lower(s.email))).map(s => [s.id, s])).values()]
  const total = already.size + chosen.length, label = `${load.code} ${name.trim().toUpperCase()}`.trim()
  const submit = async event => {
    event.preventDefault()
    if (!/^[A-Za-z0-9][A-Za-z0-9 .()/_-]{0,39}$/.test(name.trim())) return setError('Enter the block section, such as A.')
    if (!existing && days && !validMeetingDays(days)) return setError('Choose one or two days, Monday to Saturday.')
    if (total > 35) return setError(`A block section holds up to 35 students; ${label} would have ${total}.`)
    if (existing && !chosen.length) return setError('Choose a home block or irregular students to add to this block.')
    setError('')
    const result = await action.run(existing ? 'Adding students' : 'Adding block section', { action: 'block.add', assignment: load.key, expected_instructor: load.instructorId, block: name.trim(),
      ...(existing ? {} : { days: days.trim() || undefined, time: time.trim() || undefined, room: room.trim() || undefined }),
      students: chosen.map(s => s.student_number ? { StudentID: s.student_number } : { Email: lower(s.email) }) },
    result => ({ text: result.students ? `${load.code} ${result.block}: ${result.students} student${result.students === 1 ? '' : 's'} on the class list of ${load.instructorName}.` : `${load.code} ${result.block} was added to ${load.instructorName}'s load without a class list. The instructor or the Dean can add students later.` }))
    if (result) onClose()
  }
  return <DeanDialog title={existing ? `Add students to ${label}` : 'Add block section'} subtitle={`${load.code} · ${load.instructorName} · ${[load.semester, load.academicYear].filter(Boolean).join(' · ')}`} icon={Layers} size="narrow" onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" type="submit" form="dean-block-form" disabled={Boolean(action.busy)}>{action.busy ? `${action.busy}…` : existing ? `Add ${chosen.length} student${chosen.length === 1 ? '' : 's'}` : chosen.length ? `Add block with ${chosen.length} student${chosen.length === 1 ? '' : 's'}` : 'Add block without a class list'}</button></>}>
    <form id="dean-block-form" className="dean-form" onSubmit={submit} noValidate>
      {(error || action.error) && <p role="alert" className="connected-pulse-warning">{error || action.error}</p>}
      <label className="dean-field">Block section<input className="form-input" value={name} maxLength={40} disabled={Boolean(block)} onChange={event => setName(event.target.value)} /></label>
      {existing ? <p className="text-sm text-muted">{label} has {already.size} student{already.size === 1 ? '' : 's'} on its class list. Students already listed are not added twice.</p>
        : <div className="dean-form-row"><MeetingDaysPicker value={days} onChange={setDays}/><label className="dean-field">Time<input className="form-input" value={time} placeholder="7:30 - 10:00" maxLength={150} onChange={event => setTime(event.target.value)} /></label><label className="dean-field">Room<input className="form-input" value={room} maxLength={150} onChange={event => setRoom(event.target.value)} /></label></div>}
      <label className="dean-field">Students from a home block<select className="form-input" value={home} onChange={event => setHome(event.target.value)}><option value="">No home block</option>{homeBlocks.map(value => <option key={value} value={value}>{value} · {active.filter(s => !isIrregular(s) && s.block === value).length} students</option>)}</select></label>
      <fieldset className="dean-block-picker dean-block-irregular"><legend>Irregular students joining this course</legend>
        {irregular.length ? irregular.map(s => <label key={s.id} className="dean-check"><input type="checkbox" checked={picked.includes(s.id)} disabled={already.has(lower(s.email))} onChange={event => setPicked(old => event.target.checked ? [...old, s.id] : old.filter(id => id !== s.id))} /> {s.name}{s.student_number ? ` · ${s.student_number}` : ''}{already.has(lower(s.email)) ? ' · already listed' : ''}</label>) : <p className="text-sm text-muted">No irregular students are registered.</p>}
      </fieldset>
      <p className="text-sm text-muted">{chosen.length ? `${chosen.length} student${chosen.length === 1 ? '' : 's'} will join ${label} (${total} of 35).` : 'Without students, the block is saved now and the instructor or the Dean adds its class list later.'} Students see the course once their class list is saved.</p>
    </form>
  </DeanDialog>
}
