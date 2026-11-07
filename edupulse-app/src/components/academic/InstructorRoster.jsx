import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAcademicRecords } from '../../context/AcademicContext'
import { useToast } from '../../context/ToastContext'
import { courseMemberships, changeCourseMembership, registerCourseStudents } from '../../utils/courseRoster'
import StudentDirectoryPicker from '../syllabus/StudentDirectoryPicker'
import BlockSectionUploader from '../syllabus/BlockSectionUploader'
import ModalLayer from '../ui/ModalLayer'
import { Spinner } from '../ui/LoadingFeedback'
import CoursewareActions from '../courseware/CoursewareActions'
import { ChevronDown } from 'lucide-react'

export default function InstructorRoster() {
  const { user } = useAuth(), workspace = useWorkspace(), { data } = useAcademicRecords(), { addToast } = useToast()
  const [course, setCourse] = useState(''), [block, setBlock] = useState(''), [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null), [destination, setDestination] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const members = useMemo(() => courseMemberships(workspace, data, user.id), [workspace, data, user.id])
  const codes = [...new Set([...workspace.syllabi.map(item => item.courseCode), ...members.map(item => item.courseCode)])].sort()
  const blocks = [...new Set(members.filter(item => !course || item.courseCode === course).map(item => item.blockSection))].sort()
  const visible = members.filter(item => (!course || item.courseCode === course) && (!block || item.blockSection === block) && `${item.student.Name} ${item.student.StudentID} ${item.student.Email}`.toLowerCase().includes(query.toLowerCase()))
  const lastPage = Math.max(0, Math.ceil(visible.length / 25) - 1), currentPage = Math.min(page, lastPage), offset = currentPage * 25
  const blocked = busy || workspace.loading || workspace.saving || workspace.conflict || Boolean(workspace.error)
  const register = async registration => {
    if (blocked) throw new Error('Wait for the workspace to load or save, and resolve any connection conflict before registering students.')
    await workspace.commit(current => registerCourseStudents(current, registration, user.id))
    addToast(user.authenticated ? 'Course roster saved' : 'Preview roster updated', 'success')
  }
  const confirm = async () => {
    if (blocked) return
    setBusy(true); setError('')
    try {
      await workspace.commit(current => changeCourseMembership(current, selected.member, user.id, selected.action === 'remove' ? null : destination))
      addToast(user.authenticated ? selected.action === 'remove' ? 'Student removed from this course' : 'Block assignment saved' : 'Preview roster updated', 'success')
      setSelected(null)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <section aria-label="Course students" className="instructor-roster academic-portal" data-pulse-zone="my-courses" data-pulse-target="Course students">
    <p className="text-sm text-muted mb-16">Manage students in your course blocks. Access requires a registered account, an active approved syllabus and released materials. Removing a membership preserves the student account and recorded attempts.</p>
    {workspace.error && <p role="alert">{workspace.error}</p>}
    <StudentDirectoryPicker onRegister={register} />
    <details className="card mb-24"><summary className="card-header"><span>Import an EduSuite class list</span><ChevronDown size={18} aria-hidden="true" /></summary><div className="card-body"><BlockSectionUploader onRegister={register} onCancel={() => {}} /></div></details>
    <div className="academic-filters">
      <label className="academic-filter">Course<select className="form-select" value={course} onChange={event => { setCourse(event.target.value); setBlock(''); setPage(0) }}><option value="">All my courses</option>{codes.map(code => <option key={code}>{code}</option>)}</select></label>
      <label className="academic-filter">Block section<select className="form-select" value={block} onChange={event => { setBlock(event.target.value); setPage(0) }}><option value="">All my blocks</option>{blocks.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="academic-filter">Find enrolled student<input className="form-input" value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} placeholder="Name, student number or email" /></label>
    </div>
    <p className="text-sm text-muted mb-16" role="status">{visible.length} course memberships · showing {visible.length ? offset + 1 : 0}–{Math.min(offset + 25, visible.length)}</p>
    <div className="academic-table-wrap" role="region" tabIndex={0} aria-label="Enrolled students table"><table className="data-table"><thead><tr><th>Student</th><th>Student number</th><th>Course</th><th>Block section</th><th>Actions</th></tr></thead><tbody>
      {!visible.length && <tr><td colSpan={5}>No students match this course and block. Choose students or import a confirmed class list.</td></tr>}
      {visible.slice(offset, offset + 25).map(member => <tr key={`${member.courseCode}:${member.student.Email || member.student.StudentID || member.student.Name}`}><td><strong>{member.student.Name}</strong><div className="text-sm text-muted">{member.student.Email || 'Account email missing'}</div></td><td>{member.student.StudentID || '—'}</td><td>{member.courseCode}</td><td>{member.blockSection}</td><td><CoursewareActions label={`Actions for ${member.student.Name} in ${member.courseCode}`} actions={[
        { label: 'Change block', disabled: blocked, onSelect: () => { setSelected({ member, action: 'move' }); setDestination(member.blockSection); setError('') } },
        { label: 'Remove from course', disabled: blocked, onSelect: () => { setSelected({ member, action: 'remove' }); setError('') } },
      ]} /></td></tr>)}
    </tbody></table></div>
    {visible.length > 25 && <div className="academic-actions mt-16"><button className="btn btn-secondary btn-sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous enrollments</button><span>Page {currentPage + 1} of {lastPage + 1}</span><button className="btn btn-secondary btn-sm" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next enrollments</button></div>}
    {selected && <ModalLayer onDismiss={() => !busy && setSelected(null)} onClick={() => !busy && setSelected(null)}><div className="modal-content" role="dialog" aria-modal="true" aria-label={selected.action === 'remove' ? 'Remove student from course' : 'Change student block'} onClick={event => event.stopPropagation()}>
      <div className="modal-header"><h2>{selected.action === 'remove' ? 'Remove student from course' : 'Change student block'}</h2><button type="button" className="modal-close" disabled={busy} onClick={() => setSelected(null)} aria-label="Close roster change">×</button></div>
      <p className="mb-16">{selected.member.student.Name} · {selected.member.courseCode} · {selected.member.blockSection}</p>
      {selected.action === 'remove' ? <p className="mb-16">This removes access to this course’s released materials and assessments after the change is saved. The student account and existing attempts are retained.</p> : <label className="form-group">New block section<input className="form-input" value={destination} maxLength={80} onChange={event => setDestination(event.target.value)} /></label>}
      {error && <p role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setSelected(null)}>Cancel</button><button type="button" className="btn btn-primary" disabled={blocked || (selected.action === 'move' && !destination.trim())} onClick={() => void confirm()}>{busy && <Spinner />}{selected.action === 'remove' ? 'Confirm removal' : 'Save block assignment'}</button></div>
    </div></ModalLayer>}
  </section>
}
