import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { DeanDialog } from './DeanCommon'
import { Table } from './AcademicUI'
import { courseAssignments, slotText } from './deanRecordModel'
import { readGrid } from './eduSuiteImport'
import { readClassListReport, rankClassListBlocks, bestClassListBlock, studentNumberKey, isEnrolled } from '../../utils/classListReport'

const BLOCK_LIMIT = 35
const lower = value => String(value || '').trim().toLowerCase()
const choiceKey = candidate => `${candidate.assignment}|${candidate.block}`
const TAGS = { add: 'dean-tag-new', listed: 'dean-tag-unchanged', missing: 'dean-tag-reassign', skipped: '' }
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

/** Every block section of the term's course loads. Legacy class rows have no course load to add students to. */
function classListCandidates(data) {
  return courseAssignments(data).filter(load => !load.legacy).flatMap(load => load.sections.map(section => ({
    assignment: load.key, code: load.code, instructorId: load.instructorId, instructorName: load.instructorName, semester: load.semester,
    academicYear: load.academicYear, block: section.block, slots: section.slots, students: section.students, recorded: section.recorded })))
}

/** A block known only from the teaching-load rows is saved with the schedule printed there. */
const printedSchedule = candidate => {
  const slot = candidate.recorded ? null : candidate.slots.find(s => s.days || s.time || s.room)
  return slot ? Object.fromEntries(Object.entries({ days: slot.days, time: slot.time, room: slot.room }).filter(([, value]) => value)) : {}
}

/** What happens to each student on a class list for the chosen block: students with an EduPulse account who are
 * not on the block yet are added; the rest are shown with the reason they are not. */
function classListPlan(report, candidate, directoryStudents = []) {
  const accounts = new Map(directoryStudents.filter(s => s.status !== 'suspended' && s.student_number).map(s => [studentNumberKey(s.student_number), s]))
  const emails = new Set((candidate?.students || []).map(s => lower(s.email))), numbers = new Set((candidate?.students || []).map(s => studentNumberKey(s.id)).filter(Boolean))
  const rows = report.students.map(student => {
    if (!isEnrolled(student)) return { student, state: 'skipped', note: `Not enrolled (${student.status})` }
    const account = student.studentNumber ? accounts.get(studentNumberKey(student.studentNumber)) : null
    if (!account) return { student, state: 'missing', note: student.studentNumber ? 'No EduPulse account yet' : 'No student number' }
    if (emails.has(lower(account.email)) || numbers.has(studentNumberKey(account.student_number))) return { student, account, state: 'listed', note: 'Already on this block' }
    return { student, account, state: 'add', note: 'Will be added' }
  })
  const adding = rows.filter(row => row.state === 'add'), total = (candidate?.students.length || 0) + adding.length
  return { rows, adding, total, full: total > BLOCK_LIMIT, count: state => rows.filter(row => row.state === state).length }
}

/** The registrar's class lists, each placed on the block section of its course load. The registrar numbers
 * sections and the teaching load letters them, so the block is proposed from the instructor, meeting days,
 * start time and room, and the Dean can change it before anything is saved. */
export default function DeanClassListImport({ files, data, students, action, term, onClose }) {
  const [read, setRead] = useState(null), [choices, setChoices] = useState({}), [saved, setSaved] = useState({})
  const candidates = useMemo(() => classListCandidates(data), [data])
  useEffect(() => {
    let live = true
    Promise.all(files.map(async file => {
      try {
        const report = readClassListReport(await readGrid(file))
        return report ? { file, report } : { file, error: 'This is not a registrar class list. Upload the "Class List for …" export that has a Student Name column.' }
      } catch (failure) { return { file, error: failure.message || 'The file could not be read.' } }
    })).then(list => { if (live) setRead(list) })
    return () => { live = false }
  }, [files])
  const entries = (read || []).map((entry, index) => {
    if (!entry.report) return { ...entry, index }
    const matches = rankClassListBlocks(entry.report, candidates), best = bestClassListBlock(matches)
    const selected = choices[index] ?? (best ? choiceKey(best.candidate) : '')
    const candidate = candidates.find(c => choiceKey(c) === selected) || null
    return { ...entry, index, matches, selected, candidate, plan: classListPlan(entry.report, candidate, students) }
  })
  const ready = entries.filter(entry => entry.candidate && !saved[entry.index] && entry.plan.adding.length && !entry.plan.full)
  const adding = ready.reduce((sum, entry) => sum + entry.plan.adding.length, 0)
  const termText = report => [report.semester, report.academicYear].filter(Boolean).join(' ')
  const confirm = async () => {
    const done = []
    for (const entry of ready) {
      const result = await action.run(`Adding ${entry.report.label}`, { action: 'block.add', assignment: entry.candidate.assignment, expected_instructor: entry.candidate.instructorId,
        block: entry.candidate.block, ...printedSchedule(entry.candidate), students: entry.plan.adding.map(row => ({ StudentID: row.account.student_number })) })
      if (!result) return
      done.push(`${entry.candidate.code} ${result.block} (${plural(entry.plan.adding.length, 'student')})`)
      setSaved(old => ({ ...old, [entry.index]: true }))
    }
    const waiting = entries.reduce((sum, entry) => sum + (entry.candidate ? entry.plan.count('missing') : 0), 0)
    action.setNotice({ text: `Class lists added: ${done.join(', ')}.${waiting ? ` ${plural(waiting, 'listed student')} ${waiting === 1 ? 'has' : 'have'} no EduPulse account yet; upload the same list again after their accounts are created.` : ''}` })
    onClose()
  }
  return <DeanDialog title="Class lists" subtitle={`${plural(files.length, 'file')} · each list goes to its block section in ${[term.semester, term.academicYear].filter(Boolean).join(' ')}`} icon={Users} onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" onClick={confirm} disabled={!adding || Boolean(action.busy)}>{action.busy ? `${action.busy}…` : adding ? `Add ${plural(adding, 'student')}` : 'Nothing to add'}</button></>}>
    {action.error && <p role="alert" className="connected-pulse-warning">{action.error}</p>}
    {!read && <p role="status">Reading {plural(files.length, 'class list')}…</p>}
    {entries.map(entry => <fieldset key={entry.index} className="dean-class-list">
      <legend>{entry.file.name}</legend>
      {entry.error ? <p role="alert" className="connected-pulse-warning">{entry.error}</p> : <>
        <p className="text-sm"><strong>{entry.report.label}</strong> · {entry.report.title || 'Untitled subject'} · Faculty: {entry.report.faculty || 'not printed'} · {entry.report.schedule.map(m => `${m.day.slice(0, 3)} ${m.start}${m.room ? ` ${m.room}` : ''}`).join(', ') || 'No schedule printed'} · {termText(entry.report) || 'Term not printed'}</p>
        {entry.report.warnings.map(warning => <p key={warning} role="status" className="connected-pulse-warning">{warning}</p>)}
        {entry.matches.length ? <label className="dean-field">Add to block section<select className="form-input" value={entry.selected} disabled={Boolean(saved[entry.index])} onChange={event => setChoices(old => ({ ...old, [entry.index]: event.target.value }))}>
          <option value="">Do not add this list</option>
          {entry.matches.map(match => <option key={choiceKey(match.candidate)} value={choiceKey(match.candidate)}>{`${match.candidate.code} ${match.candidate.block} · ${match.candidate.instructorName} · ${slotText(match.candidate)}${match.reasons.length ? ` · ${match.reasons.join(', ')}` : ''}`}</option>)}
        </select></label>
          : <p className="text-sm text-muted">No course load for {entry.report.courseCode} in {termText(entry.report) || 'this term'} was found{termText(entry.report) && termText(entry.report) !== [term.semester, term.academicYear].join(' ') ? `; this page shows ${[term.semester, term.academicYear].join(' ')}, so switch the term first` : '. Upload the teaching load first'}.</p>}
        {entry.candidate && <p className="text-sm text-muted">{saved[entry.index] ? 'Added.' : [`${plural(entry.plan.adding.length, 'student')} will be added`, entry.plan.count('missing') && `${entry.plan.count('missing')} without an EduPulse account yet`, entry.plan.count('listed') && `${entry.plan.count('listed')} already on the block`, entry.plan.count('skipped') && `${entry.plan.count('skipped')} not enrolled`].filter(Boolean).join(' · ')}{entry.plan.full ? ` · ${entry.candidate.code} ${entry.candidate.block} would have ${entry.plan.total} students; a block holds ${BLOCK_LIMIT}.` : ''}</p>}
        <details><summary>Students on this list ({entry.report.students.length})</summary>
          <Table label={`Students on ${entry.report.label}`} headers={['Student', 'Student number', 'In EduPulse']} rows={(entry.plan?.rows || []).map(row => [row.student.name, row.student.studentNumber || '-', <span key="state" className={`dean-tag ${entry.candidate ? TAGS[row.state] : ''}`}>{entry.candidate || row.state === 'skipped' || row.state === 'missing' ? row.note : 'Choose a block'}</span>])} />
        </details>
      </>}
    </fieldset>)}
    <p className="text-sm text-muted">Students are added to the block's class list as the instructor's own, and see the course once it is saved. Students without an EduPulse account are added when the same list is uploaded again after their accounts exist.</p>
  </DeanDialog>
}
