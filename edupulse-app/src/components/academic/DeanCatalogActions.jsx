import { Spinner } from '../ui/LoadingFeedback'
import { useId, useState } from 'react'
import { BookOpen, Pencil, Pause, Play, Trash2 } from 'lucide-react'
import CoursewareActions from '../courseware/CoursewareActions'
import { DeanDialog, ConfirmDialog } from './DeanCommon'

export function CourseCardActions({ course, open, onOpenChange, disabled, onAction, extraActions=[], canEdit=true, label }) {
  if(!canEdit&&!extraActions.length)return null
  return <CoursewareActions label={label||`Course actions for ${course.code}`}  open={open} onOpenChange={onOpenChange} disabled={disabled} actions={[...extraActions, ...(canEdit&&course.recordKey&&course.updatedAt?[
    { label: 'Edit course', icon: Pencil, onSelect: () => onAction(`edit:${course.code}`) },
    course.status === 'suspended'
      ? { label: 'Reactivate course', icon: Play, onSelect: () => onAction(`reactivate:${course.code}`) }
      : { label: 'Suspend course', icon: Pause, onSelect: () => onAction(`suspend:${course.code}`) },
    ...(course.status === 'suspended' ? [{ label: 'Remove course', icon: Trash2, onSelect: () => onAction(`remove:${course.code}`) }] : []),
  ]:[])]} />
}

export function CourseCatalogForm({ course, action, academicYear, semester, onClose }) {
  const codeId=useId()
  const [code, setCode] = useState(course?.code || ''), [title, setTitle] = useState(course?.title || '')
  const [units, setUnits] = useState(course?.units ?? '')
  const [version] = useState(course?.updatedAt), [problem, setProblem] = useState('')
  const label = course ? 'Edit Course' : 'Add Course'
  const submit = async event => {
    event.preventDefault(); setProblem('')
    const normalized = code.trim().toUpperCase()
    if (!/^[A-Z0-9][A-Z0-9 .&()/_-]{0,39}$/.test(normalized)) return setProblem('Enter a valid course code, up to 40 characters.')
    if (!title.trim() || units === '' || !Number.isFinite(Number(units)) || Number(units) < 0 || Number(units) > 30 || Number(units) * 2 % 1) return setProblem('Enter the course code, title and units.')
    const values = { title: title.trim(), units: Number(units) }
    const scope={academic_year:academicYear,semester}
    const payload = course ? { action: 'course.update', ...scope, code: course.recordKey, expected_updated_at: version, course: values } : { action: 'course.create', ...scope, course: { code: normalized, ...values } }
    if (await action.run(course ? 'Saving course' : 'Adding course', payload, () => ({ text: `${normalized} ${course ? 'updated' : 'added to the course list'}.` }))) onClose()
  }
  return <DeanDialog title={label} subtitle={`${semester} · AY ${academicYear}`} icon={BookOpen} size="form" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button aria-busy={Boolean(action.busy)} className="btn btn-primary" type="submit" form="dean-catalog-form" disabled={Boolean(action.busy)}>{Boolean(action.busy) && <Spinner />}{course ? 'Save course' : 'Add Course'}</button></>}>
    <form id="dean-catalog-form" className="dean-form" onSubmit={submit}>
      {(problem || action.error) && <p role="alert" className="connected-pulse-warning">{problem || action.error}</p>}
      <div className="dean-field"><label htmlFor={codeId}>Course code</label><input id={codeId} aria-describedby={course?`${codeId}-hint`:undefined} className="form-input" value={code} onChange={event => setCode(event.target.value)} maxLength={40} required readOnly={Boolean(course)} />{course && <small id={`${codeId}-hint`} className="text-muted">The code keeps loaded classes and syllabus records linked. You can rename the course title.</small>}</div>
      <label className="dean-field"><span>Course title</span><input className="form-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={300} required /></label>
      <label className="dean-field"><span>Units</span><input className="form-input" type="number" min="0" max="30" step="0.5" value={units} onChange={event => setUnits(event.target.value)} required /></label>
    </form>
  </DeanDialog>
}

export function CourseStatusDialog({ course, kind, action, academicYear, semester, onClose }) {
  const [version] = useState(course.updatedAt)
  const status = { suspend: 'suspended', reactivate: 'active', remove: 'removed' }[kind]
  const label = { suspend: 'Suspend course', reactivate: 'Reactivate course', remove: 'Remove course' }[kind]
  const confirm = async () => {
    if (await action.run(label, { action: 'course.status', academic_year:academicYear,semester, code: course.recordKey, expected_updated_at: version, status }, () => ({ text: `${course.code} ${kind === 'reactivate' ? 'reactivated' : status}.` }))) onClose()
  }
  return <ConfirmDialog title={label} confirmLabel={label} danger={kind === 'remove'} busy={action.busy} onClose={onClose} onConfirm={confirm}>
    <p>{label} <strong>{course.code} — {course.title}</strong>?</p>
    <p className="text-sm text-muted">{kind === 'suspend' ? 'New course loading will be paused. Existing loads, syllabus files, delivered materials and student records stay available.' : kind === 'reactivate' ? 'This course will be available for new instructor loads again.' : 'The suspended course will leave the course list. Its code, existing loads, files and student history are retained.'}</p>
    {action.error && <p role="alert" className="connected-pulse-warning mt-16">{action.error}</p>}
  </ConfirmDialog>
}
