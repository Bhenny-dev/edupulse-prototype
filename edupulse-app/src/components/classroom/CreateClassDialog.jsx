import { useId, useState } from 'react'
import { X } from 'lucide-react'
import ModalLayer from '../ui/ModalLayer'
import { useAcademicRecords } from '../../context/AcademicContext'
import { sameTerm } from '../../utils/classroom'
import './classroom.css'

const BLOCK = /^[A-Za-z0-9][A-Za-z0-9 .()/_-]*$/
const firstFree = (course, codes) => course?.blocks.find(block => !codes.some(code => code.course_code === course.code && code.block === block && sameTerm(code, course))) || 'new'

/**
 * A class is one block section of a course the Dean assigned. Creating it issues the class code students enter;
 * a block the course load does not list yet is added, as Add block section already allows the instructor.
 */
export default function CreateClassDialog({ courses, codes = [], counts = () => new Map(), initialCourse, initialBlock, onClose, onCreated }) {
  const records = useAcademicRecords(), heading = useId()
  const [courseId, setCourseId] = useState(initialCourse || courses[0]?.id || '')
  const course = courses.find(item => item.id === courseId)
  const [choice, setChoice] = useState(() => initialBlock || firstFree(courses.find(item => item.id === (initialCourse || courses[0]?.id)), codes))
  const [custom, setCustom] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const coded = block => codes.find(code => code.course_code === course?.code && code.block === block && sameTerm(code, course))
  const block = choice === 'new' ? custom.trim().toUpperCase() : choice
  const duplicate = choice === 'new' && course?.blocks.some(name => name.toUpperCase() === block)
  const valid = Boolean(course && block && block.length <= 40 && BLOCK.test(block) && !duplicate && !coded(block))
  const students = course ? counts(course) : new Map()
  const pickCourse = id => { setCourseId(id); setChoice(firstFree(courses.find(item => item.id === id), codes)); setCustom(''); setError('') }
  const create = async () => {
    if (!valid || busy) return
    setBusy(true); setError('')
    try { onCreated(course, await records.command({ operation: 'class-code', action: 'create', assignment: course.assignmentKey, block })) }
    catch (failure) { setError(failure.message); setBusy(false) }
  }
  return <ModalLayer onDismiss={() => { if (!busy) onClose() }}>
    <section className="modal-content class-dialog" role="dialog" aria-modal="true" aria-labelledby={heading}>
      <div className="modal-header"><h2 id={heading}>Create class</h2><button type="button" className="modal-close" aria-label="Close create class" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
      <p className="text-sm text-muted mb-16">A class is one block section of a course the Dean assigned to you. Students join it with its class code and are added to that block's class list.</p>
      {!courses.length ? <p role="status">No course of a current semester is assigned to you yet. Courses appear after the Dean loads them.</p> : <>
        <label className="form-label">Course<select className="form-input" value={courseId} disabled={busy} onChange={event => pickCourse(event.target.value)}>{courses.map(item => <option key={item.id} value={item.id}>{item.code} · {item.title} ({[item.semester, item.academicYear && `AY ${item.academicYear}`].filter(Boolean).join(', ')})</option>)}</select></label>
        <fieldset className="mt-16" disabled={busy}>
          <legend>Block section</legend>
          {course?.blocks.map(name => { const existing = coded(name); return <label key={name} className={`class-dialog-option${existing ? ' is-disabled' : ''}`}>
            <input type="radio" name="class-block" value={name} checked={choice === name} disabled={Boolean(existing)} onChange={() => { setChoice(name); setError('') }} />
            <span><strong>Block {name}</strong><span className="text-sm text-muted"> · {students.get(name)?.size || 0} students{existing ? ` · Already has code ${existing.code}` : ''}</span></span>
          </label> })}
          <label className="class-dialog-option"><input type="radio" name="class-block" value="new" checked={choice === 'new'} onChange={() => { setChoice('new'); setError('') }} /><span><strong>Add a block section</strong><span className="text-sm text-muted"> · A section your course load does not list yet</span></span></label>
          {choice === 'new' && <label className="form-label">New block section<input className="form-input" value={custom} maxLength={40} autoFocus placeholder="For example, C or BSIT-2C" onChange={event => { setCustom(event.target.value); setError('') }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create() } }} /></label>}
        </fieldset>
        {duplicate && <p role="alert">Block {block} is already in this course. Choose it above.</p>}
        {block && !BLOCK.test(block) && <p role="alert">Use letters or numbers for the block section.</p>}
        {valid && <p className="text-sm text-muted mt-16" role="status">Creates the class code for {course.code} block {block}. A registered student who enters it is added to block {block}'s class list; nobody is removed from another class.</p>}
      </>}
      {error && <p role="alert" className="mt-16">{error}</p>}
      <div className="modal-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={!valid || busy} onClick={() => void create()}>{busy ? 'Creating class...' : 'Create'}</button></div>
    </section>
  </ModalLayer>
}
