import { useId, useState } from 'react'
import { BookOpen, Pencil, Pause, Play, Trash2 } from 'lucide-react'
import CoursewareActions from '../courseware/CoursewareActions'
import { DeanDialog, ConfirmDialog } from './DeanCommon'

export function CourseCardActions({ course, open, onOpenChange, disabled, onAction }) {
  return <CoursewareActions label={`Course actions for ${course.code}`} open={open} onOpenChange={onOpenChange} disabled={disabled || !course.recordKey || !course.updatedAt} actions={[
    { label: 'Edit course', icon: Pencil, onSelect: () => onAction(`edit:${course.code}`) },
    course.status === 'suspended'
      ? { label: 'Reactivate course', icon: Play, onSelect: () => onAction(`reactivate:${course.code}`) }
      : { label: 'Suspend course', icon: Pause, onSelect: () => onAction(`suspend:${course.code}`) },
    ...(course.status === 'suspended' ? [{ label: 'Remove course', icon: Trash2, onSelect: () => onAction(`remove:${course.code}`) }] : []),
  ]} />
}

const term = value => /^[12]$/.test(value || '') ? `${value}${value === '1' ? 'st' : 'nd'} Semester` : value || '1st Semester'
export function CourseCatalogForm({ course, action, onClose }) {
  const codeId=useId()
  const [code, setCode] = useState(course?.code || ''), [title, setTitle] = useState(course?.title || '')
  const [units, setUnits] = useState(course?.units ?? ''), [year, setYear] = useState(String(course?.year || '')), [semester, setSemester] = useState(term(course?.semester))
  const [version] = useState(course?.updatedAt), [problem, setProblem] = useState('')
  const label = course ? 'Edit Course' : 'Add Course'
  const submit = async event => {
    event.preventDefault(); setProblem('')
    const normalized = code.trim().toUpperCase()
    if (!/^[A-Z0-9][A-Z0-9 .&()/_-]{0,39}$/.test(normalized)) return setProblem('Enter a valid course code, up to 40 characters.')
    if (!title.trim() || units === '' || !Number.isFinite(Number(units)) || Number(units) < 0 || Number(units) > 30 || Number(units) * 2 % 1 || !/^[1-4]$/.test(year) || !semester.trim()) return setProblem('Enter the course title, units, year level and semester.')
    const values = { title: title.trim(), units: Number(units), year: Number(year), semester: semester.trim() }
    const payload = course ? { action: 'course.update', code: course.recordKey, expected_updated_at: version, course: values } : { action: 'course.create', course: { code: normalized, ...values } }
    if (await action.run(course ? 'Saving course' : 'Adding course', payload, () => ({ text: `${normalized} ${course ? 'updated' : 'added to the course list'}.` }))) onClose()
  }
  return <DeanDialog title={label} icon={BookOpen} size="form" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" type="submit" form="dean-catalog-form" disabled={Boolean(action.busy)}>{course ? 'Save course' : 'Add Course'}</button></>}>
    <form id="dean-catalog-form" className="dean-form" onSubmit={submit}>
      {(problem || action.error) && <p role="alert" className="connected-pulse-warning">{problem || action.error}</p>}
      <div className="dean-field"><label htmlFor={codeId}>Course code</label><input id={codeId} aria-describedby={course?`${codeId}-hint`:undefined} className="form-input" value={code} onChange={event => setCode(event.target.value)} maxLength={40} required readOnly={Boolean(course)} />{course && <small id={`${codeId}-hint`} className="text-muted">The code keeps loaded classes and syllabus records linked. You can rename the course title.</small>}</div>
      <label className="dean-field"><span>Course title</span><input className="form-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={300} required /></label>
      <label className="dean-field"><span>Units</span><input className="form-input" type="number" min="0" max="30" step="0.5" value={units} onChange={event => setUnits(event.target.value)} required /></label>
      <label className="dean-field"><span>Year level</span><select className="form-select" value={year} onChange={event => setYear(event.target.value)} required><option value="">Select year level</option>{[1, 2, 3, 4].map(value => <option key={value} value={value}>Year {value}</option>)}</select></label>
      <label className="dean-field"><span>Default semester</span><input className="form-input" value={semester} onChange={event => setSemester(event.target.value)} maxLength={60} placeholder="1st Semester" required /></label>
    </form>
  </DeanDialog>
}

export function CourseStatusDialog({ course, kind, action, onClose }) {
  const [version] = useState(course.updatedAt)
  const status = { suspend: 'suspended', reactivate: 'active', remove: 'removed' }[kind]
  const label = { suspend: 'Suspend course', reactivate: 'Reactivate course', remove: 'Remove course' }[kind]
  const confirm = async () => {
    if (await action.run(label, { action: 'course.status', code: course.recordKey, expected_updated_at: version, status }, () => ({ text: `${course.code} ${kind === 'reactivate' ? 'reactivated' : status}.` }))) onClose()
  }
  return <ConfirmDialog title={label} confirmLabel={label} danger={kind === 'remove'} busy={action.busy} onClose={onClose} onConfirm={confirm}>
    <p>{label} <strong>{course.code} — {course.title}</strong>?</p>
    <p className="text-sm text-muted">{kind === 'suspend' ? 'New course loading will be paused. Existing loads, syllabus files, delivered materials and student records stay available.' : kind === 'reactivate' ? 'This course will be available for new instructor loads again.' : 'The suspended course will leave the course list. Its code, existing loads, files and student history are retained.'}</p>
    {action.error && <p role="alert" className="connected-pulse-warning mt-16">{action.error}</p>}
  </ConfirmDialog>
}
