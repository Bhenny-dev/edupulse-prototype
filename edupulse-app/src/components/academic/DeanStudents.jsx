import { useMemo, useState } from 'react'
import { Users, Layers, Shuffle, UserX, UserPlus, FileUp, UserRound } from 'lucide-react'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { Empty, Table, CsvButton, useAcademicTabs } from './AcademicUI'
import { deanRecords, deanDirectory, studentCourseProgress, isIrregular, yearLabel, loadRows } from './deanRecordModel'
import GlassIcon from '../ui/GlassIcon'
import { DeanCards, DeanDialog, DeanFeedback, ConfirmDialog, StatusBadge, Pager, UploadButton } from './DeanCommon'
import { useDeanAction } from './deanActions'
import DeanAccountDialog from './DeanAccountDialog'
import { knownBlocks } from './DeanCourses'
import { readGrid, planStudentList, chunk } from './eduSuiteImport'

const PAGE = 25
const placementLabel = student => isIrregular(student) ? 'Irregular' : student.block || 'Not placed'
const percentText = value => value === null || value === undefined ? '—' : `${value}%`

export default function DeanStudents({ data }) {
  const model = useMemo(() => deanRecords(data), [data])
  const directory = useMemo(() => deanDirectory(data, model), [data, model])
  const blocks = useMemo(() => knownBlocks(data, model), [data, model])
  const { key: tab, nav } = useAcademicTabs({ items: [['list', 'Student list'], ['blocks', 'Blocks / Sections']], label: 'Student views' })
  const [detail, setDetail] = useWorkspaceViewState('dean-detail:students', null)
  const [search, setSearch] = useState(''), [year, setYear] = useState(''), [show, setShow] = useState('all'), [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null), [confirm, setConfirm] = useState(null), [review, setReview] = useState(null)
  const action = useDeanAction()
  const students = directory.students
  const filtered = students.filter(s => (!year || String(s.year_level) === year) && (show === 'all' || (show === 'irregular' ? isIrregular(s) : show === 'suspended' ? s.status === 'suspended' : show === 'unplaced' ? !s.block : show === s.block))
    && `${s.name} ${s.student_number} ${s.email}`.toLowerCase().includes(search.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE)), current = Math.min(page, pages), visible = filtered.slice((current - 1) * PAGE, current * PAGE)
  const irregular = students.filter(isIrregular), byId = id => students.find(s => s.id === id)
  const selected = typeof detail === 'string' && detail.startsWith('student:') ? byId(detail.slice(8)) : null
  const block = typeof detail === 'string' && detail.startsWith('block:') ? (detail.slice(6) === 'irregular' ? { id: 'irregular', name: 'Irregular students', irregular: true } : model.blocks.find(b => b.id === detail.slice(6))) : null
  const blockStudents = block ? block.irregular ? irregular : students.filter(s => s.block && s.block.toLowerCase() === block.id) : []
  const activity = s => model.activity(new Set(data.enrollments.filter(e => e.student_email.toLowerCase() === s.email.toLowerCase()).map(e => e.course_id)), s.email.toLowerCase())
  const rosterCounts = useMemo(() => Object.fromEntries(blocks.map(name => [name, students.filter(s => s.block === name).length])), [blocks, students])
  const upload = async file => {
    action.setError(''); action.setNotice(null)
    try { setReview({ filename: file.name, plan: planStudentList(await readGrid(file), { courses: model.courses, blocks, students, loads: loadRows(data), rosterCounts }) }) }
    catch (failure) { action.setError(failure.message || 'The file could not be read.') }
  }
  const setFilter = setter => value => { setter(value); setPage(1) }
  const manage = student => directory.managed && <span className="dean-row-actions">
    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(student)}>Edit</button>
    {student.status === 'suspended' ? <><button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ student, next: 'active' })}>Reactivate</button><button className="btn btn-ghost btn-sm dean-danger-text" onClick={() => setConfirm({ student, next: 'removed' })}>Remove</button></>
      : <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ student, next: 'suspended' })}>Suspend</button>}
  </span>
  return <>
    {nav}
    <DeanCards items={[
      { label: 'Registered students', value: students.filter(s => s.status === 'active').length, icon: Users, tone: 'sky', to: '/students?tab=list' },
      { label: 'Blocks / Sections', value: model.blocks.length, icon: Layers, tone: 'purple', to: '/students?tab=blocks' },
      { label: 'Irregular students', value: irregular.length, icon: Shuffle, tone: 'amber', onClick: () => setDetail('block:irregular') },
      { label: 'Suspended', value: students.filter(s => s.status === 'suspended').length, icon: UserX, tone: 'red', onClick: () => { setShow('suspended'); setPage(1) } }]} />
    <DeanFeedback action={action} />
    {!directory.managed && <p className="text-sm text-muted mb-16">{data.directoryError || 'Preview sample. Account changes need a signed-in Dean account.'}</p>}
    <div className="dean-toolbar">
      <label className="academic-filter">Search students<input className="form-input" type="search" value={search} onChange={event => setFilter(setSearch)(event.target.value)} placeholder="Name, student number or email" /></label>
      <label className="academic-filter">Year level<select className="form-select" value={year} onChange={event => setFilter(setYear)(event.target.value)}><option value="">All years</option>{[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}</select></label>
      <label className="academic-filter">Show<select className="form-select" value={show} onChange={event => setFilter(setShow)(event.target.value)}><option value="all">All students</option><option value="irregular">Irregular students</option><option value="unplaced">Not placed</option><option value="suspended">Suspended</option>{blocks.map(b => <option key={b} value={b}>{b}</option>)}</select></label>
      <div className="academic-actions">{directory.managed && <><UploadButton label={<><FileUp size={15} aria-hidden="true" /> Upload student list</>} onFile={upload} disabled={Boolean(action.busy)} /><button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><UserPlus size={15} aria-hidden="true" /> Add student</button></>}</div>
    </div>
    {tab === 'list' && <>
      <Table label="Student list" headers={['Student number', 'Name', 'Year', 'Block', 'Assessments taken', 'Materials opened', 'Status', 'Actions']} rows={visible.map(s => { const a = activity(s); return [s.student_number || '—',
        <button key="name" className="dean-link" onClick={() => setDetail(`student:${s.id}`)} aria-label={`View student ${s.name}`}>{s.name}</button>, s.year_level ? `Year ${s.year_level}` : '—',
        isIrregular(s) ? <span key="p" className="dean-tag dean-tag-reassign">Irregular</span> : s.block || '—', a.submissions, a.opens, <StatusBadge key="s" status={s.status} />, manage(s) || '—'] })} empty={students.length ? 'No student matches this view.' : 'No student accounts yet. Upload the EduSuite student list or add a student.'} />
      <Pager page={current} pages={pages} onPage={setPage} total={filtered.length} label="students" />
    </>}
    {tab === 'blocks' && <>
      {[...new Set(model.blocks.map(yearLabel))].map(label => <section className="dean-year-group" key={label} aria-label={label}><h2>{label}</h2><div className="academic-card-grid">{model.blocks.filter(b => yearLabel(b) === label).map(b => <button className="card dean-record-card" key={b.id} onClick={() => setDetail(`block:${b.id}`)} aria-label={`View block ${b.name}`}><GlassIcon icon={Users} color="var(--sky-500)" /><strong>{b.name}</strong><span>{b.students.length} registered student{b.students.length === 1 ? '' : 's'}</span><span>{b.courseIds.size} course offering{b.courseIds.size === 1 ? '' : 's'}</span></button>)}</div></section>)}
      <section className="dean-year-group" aria-label="Irregular students"><h2>Irregular students</h2><div className="academic-card-grid"><button className="card dean-record-card" onClick={() => setDetail('block:irregular')} aria-label="View irregular students"><GlassIcon icon={Shuffle} color="var(--amber-500)" /><strong>Irregular students</strong><span>{irregular.length} student{irregular.length === 1 ? '' : 's'} outside a block</span><span>Enrolled in the classes they attend</span></button></div></section>
      {!model.blocks.length && <Empty>No registered blocks or sections yet.</Empty>}
    </>}
    {block && <DeanDialog title={block.name} subtitle={block.irregular ? 'Students who attend classes by subject instead of one block' : `${yearLabel(block)} · ${blockStudents.length} registered student${blockStudents.length === 1 ? '' : 's'} · ${block.courseIds.size} course offering${block.courseIds.size === 1 ? '' : 's'}`} icon={block.irregular ? Shuffle : Users} tone={block.irregular ? 'amber' : 'sky'} label={block.irregular ? 'Irregular students' : `Block ${block.name}`} onClose={() => setDetail(null)}>
      <div className="academic-filters"><CsvButton headers={['Student number', 'Name', 'Email', 'Year level', 'Classes']} rows={blockStudents.map(s => [s.student_number, s.name, s.email, s.year_level, classesOf(directory, s).map(c => `${c.CourseCode} ${c.Block}`).join('; ')])} name={block.irregular ? 'irregular-students' : `block-${block.name}`} /></div>
      <Table headers={['Student number', 'Name', 'Year', ...(block.irregular ? ['Classes'] : []), 'Assessments taken', 'Materials opened', 'Status']} rows={blockStudents.map(s => { const a = activity(s); return [s.student_number, <button key="n" className="dean-link" onClick={() => setDetail(`student:${s.id}`)}>{s.name}</button>, s.year_level || '—', ...(block.irregular ? [classesOf(directory, s).map(c => `${c.CourseCode} · ${c.Block}`).join(', ') || 'No classes yet'] : []), a.submissions, a.opens, <StatusBadge key="s" status={s.status} />] })} empty={block.irregular ? 'No irregular students are recorded.' : 'No registered students in this block.'} />
    </DeanDialog>}
    {typeof detail === 'string' && (detail.startsWith('block:') && !block || detail.startsWith('student:') && !selected) && <DeanDialog title="Record unavailable" size="narrow" onClose={() => setDetail(null)}><Empty>This record is no longer in your authorized view. Close this dialog and choose a current record.</Empty></DeanDialog>}
    {selected && <StudentDialog student={selected} data={data} model={model} directory={directory} actions={manage(selected)} onClose={() => setDetail(null)} />}
    {editing && <DeanAccountDialog role="student" account={editing === 'new' ? null : editing} blocks={blocks} action={action} onClose={() => setEditing(null)} />}
    {confirm && <ConfirmDialog title={confirm.next === 'suspended' ? 'Suspend student' : confirm.next === 'active' ? 'Reactivate student' : 'Remove student'} confirmLabel={confirm.next === 'suspended' ? 'Suspend' : confirm.next === 'active' ? 'Reactivate' : 'Remove account'} danger={confirm.next !== 'active'} busy={action.busy}
      onClose={() => setConfirm(null)} onConfirm={async () => {
        const name = confirm.student.name
        if (await action.run(confirm.next === 'suspended' ? 'Suspending' : confirm.next === 'active' ? 'Reactivating' : 'Removing', { action: 'account.status', id: confirm.student.id, status: confirm.next }, () => ({ text: confirm.next === 'suspended' ? `${name} is suspended and signed out.` : confirm.next === 'active' ? `${name} can sign in again.` : `${name} was removed from the student list and class lists.` }))) { setConfirm(null); if (confirm.next === 'removed') setDetail(null) }
      }}>
      {confirm.next === 'suspended' && <p><strong>{confirm.student.name}</strong> is signed out and cannot open materials or take assessments until reactivated. Class memberships and scores stay recorded.</p>}
      {confirm.next === 'active' && <p><strong>{confirm.student.name}</strong> can sign in again with their existing password.</p>}
      {confirm.next === 'removed' && <><p>Remove <strong>{confirm.student.name}</strong> ({confirm.student.student_number})? Their sign-in access is revoked and they leave every block and class list.</p><p className="text-sm text-muted">Submitted assessment attempts stay in the records. Uploading the student again restores the account.</p></>}
    </ConfirmDialog>}
    {review && <StudentReview review={review} action={action} onClose={() => setReview(null)} />}
  </>
}

const classesOf = (directory, student) => directory.irregular.filter(row => row.StudentID === student.student_number)

function StudentDialog({ student, data, model, directory, actions, onClose }) {
  const rows = studentCourseProgress(data, model, student.email), classes = classesOf(directory, student)
  const total = key => rows.reduce((sum, row) => sum + row[key], 0)
  const scored = rows.filter(row => row.average !== null), average = scored.length ? Math.round(scored.reduce((sum, row) => sum + row.average, 0) / scored.length) : null
  return <DeanDialog title={student.name} subtitle={`${student.student_number || 'No student number'} · ${student.year_level ? `Year ${student.year_level}` : 'Year not recorded'} · ${placementLabel(student)}`} icon={UserRound} tone="green" label={`Student ${student.name}`} onClose={onClose}
    footer={<>{actions}<button className="btn btn-secondary" onClick={onClose}>Close</button></>}>
    <dl className="dean-facts">
      <div><dt>Sign-in email</dt><dd>{student.email}</dd></div>
      <div><dt>Program</dt><dd>{student.program || 'Not recorded'}</dd></div>
      <div><dt>Status</dt><dd><StatusBadge status={student.status} /></dd></div>
      <div><dt>Last sign-in</dt><dd>{student.last_sign_in_at ? new Date(student.last_sign_in_at).toLocaleDateString() : 'Never'}</dd></div>
    </dl>
    <div className="dean-mini-stats">
      <span><strong>{rows.length}</strong> course{rows.length === 1 ? '' : 's'}</span>
      <span><strong>{total('opened')}</strong> of {total('materials')} materials opened</span>
      <span><strong>{total('taken')}</strong> of {total('assessments')} assessments taken</span>
      <span><strong>{percentText(average)}</strong> average raw score</span>
    </div>
    <h3 className="dean-subhead">Assessments and learning materials by course</h3>
    <Table headers={['Course', 'Block', 'Instructor', 'Materials opened', 'Assessments taken', 'Average raw score']} rows={rows.map(row => [`${row.code} — ${row.title}`, row.block || '—', row.instructor || '—', `${row.opened} / ${row.materials}`, `${row.taken} / ${row.assessments}${row.pending ? ` (${row.pending} awaiting review)` : ''}`, percentText(row.average)])} empty="Not in any class list yet." />
    {isIrregular(student) && <><h3 className="dean-subhead">Irregular classes</h3><Table headers={['Course', 'Class block', 'In class list']} rows={classes.map(c => [c.CourseCode, c.Block, rows.some(r => r.code === c.CourseCode && r.block === c.Block) ? 'Yes' : 'Waiting for the instructor’s course'])} empty="No classes recorded. Upload the EduSuite list with the subjects this student attends." /></>}
    <p className="text-xs text-muted mt-16">Raw scores from EduPulse assessments, not official grades.</p>
  </DeanDialog>
}

function StudentReview({ review, action, onClose }) {
  const { plan } = review
  const [view, setView] = useState('summary')
  const over = plan.blocks.filter(b => b.count + Math.max(0, b.existing - plan.students.filter(s => s.placement === 'block' && s.block === b.block && s.account !== 'new').length) > 35)
  const count = test => plan.students.filter(test).length
  const apply = async () => {
    const totals = { created: 0, updated: 0, linked: 0, restored: 0, regular: 0, irregular: 0 }, skipped = []
    const parts = chunk(plan.students, 100)
    for (const [index, part] of parts.entries()) {
      const result = await action.run(`Saving students (${index + 1}/${parts.length})`, { action: 'students.import', filename: review.filename, students: part.map(s => ({ student_number: s.student_number, surname: s.surname, first_name: s.first_name, middle_name: s.middle_name, email: s.email, year_level: s.year_level, program: s.program, password: s.password, placement: s.placement, ...(s.block ? { block: s.block } : {}), courses: s.courses.map(c => ({ course_code: c.course_code, ...(c.course_title ? { course_title: c.course_title } : {}), block: c.block })) })) })
      if (!result) return
      Object.keys(totals).forEach(key => { totals[key] += result[key] || 0 }); skipped.push(...(result.skipped || []))
    }
    action.setNotice({ text: `${review.filename}: ${totals.created} accounts created, ${totals.updated + totals.linked + totals.restored} updated, ${totals.regular} placed in blocks, ${totals.irregular} irregular.${skipped.length ? ` Skipped: ${skipped.slice(0, 5).map(s => `${s.student_number} (${s.reason})`).join('; ')}${skipped.length > 5 ? '…' : ''}` : ''} New students sign in with their student number address and their surname followed by @123.` })
    onClose()
  }
  const tabs = [['summary', 'Summary'], ['irregular', `Irregular (${count(s => s.placement === 'irregular')})`], ['all', `All students (${plan.students.length})`], ...(plan.rejected.length ? [['rejected', `Rejected rows (${plan.rejected.length})`]] : [])]
  return <DeanDialog title="Review student list upload" subtitle={`${review.filename} · header found on row ${plan.header}`} icon={FileUp} tone="green" onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" onClick={apply} disabled={!plan.students.length || over.length > 0 || Boolean(action.busy)}>{action.busy ? `${action.busy}…` : `Save ${plan.students.length} student${plan.students.length === 1 ? '' : 's'}`}</button></>}>
    {action.error && <p role="alert" className="connected-pulse-warning">{action.error}</p>}
    <div className="dean-review-counts">
      <span className="dean-tag dean-tag-new">New accounts: {count(s => s.account === 'new')}</span><span className="dean-tag dean-tag-unchanged">Existing: {count(s => s.account !== 'new')}</span>
      <span className="dean-tag">In blocks: {count(s => s.placement === 'block')}</span><span className="dean-tag dean-tag-reassign">Irregular: {count(s => s.placement === 'irregular')}</span>
      <span className="dean-tag">Not placed: {count(s => s.placement === 'none')}</span>{plan.rejected.length > 0 && <span className="dean-tag dean-tag-problem">Rejected rows: {plan.rejected.length}</span>}
    </div>
    {over.length > 0 && <p className="dean-warning" role="alert">{over.map(b => b.block).join(', ')} would exceed 35 active students. Split the block in EduSuite or correct the file, then upload again.</p>}
    <nav className="tabs academic-tabs mb-16" aria-label="Upload review views">{tabs.map(([id, title]) => <button key={id} className={`tab ${view === id ? 'active' : ''}`} aria-pressed={view === id} onClick={() => setView(id)}>{title}</button>)}</nav>
    {view === 'summary' && <Table headers={['Block', 'Students in this file', 'Already recorded in the block']} rows={plan.blocks.map(b => [b.block, b.count, b.existing])} empty="No student in this file has a single block section." />}
    {view === 'irregular' && <Table headers={['Student', 'Year', 'Why irregular', 'Classes (instructor)']} rows={plan.students.filter(s => s.placement === 'irregular').map(s => [`${s.name} (${s.student_number})`, s.year_level, s.reasons.join('; '), s.courses.map(c => `${c.course_code} · ${c.block}${c.instructor ? ` (${c.instructor})` : ' (not loaded yet)'}`).join(', ') || '—'])} empty="No irregular students were detected." />}
    {view === 'all' && <Table headers={['Student number', 'Name', 'Year', 'Placement', 'Account']} rows={plan.students.map(s => [s.student_number, s.name, s.year_level, s.placement === 'irregular' ? 'Irregular' : s.block || 'Not placed', s.account === 'new' ? 'New' : s.account === 'suspended' ? 'Existing (suspended)' : 'Existing'])} />}
    {view === 'rejected' && <Table headers={['Row', 'Reason']} rows={plan.rejected.map(r => [r.row, r.reason])} />}
    <p className="text-sm text-muted mt-16">Irregular students are detected from an Irregular mark, classes in more than one block, a year level that differs from the block, or subjects without a block. Nothing is saved until you choose Save.</p>
  </DeanDialog>
}
