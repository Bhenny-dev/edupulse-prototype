import { useMemo, useState } from 'react'
import { BookOpen, ClipboardCheck, AlertTriangle, Layers, Plus, X, FileUp, GraduationCap } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspaceViewState } from '../../context/WorkspaceContext'
import { Panel, Empty, Table, CsvButton, useAcademicTabs } from './AcademicUI'
import { deanRecords, courseCatalog, deanDirectory, loadRows } from './deanRecordModel'
import { curriculumCourse } from '../../utils/curriculumMetadata'
import { DeanCards, DeanDialog, DeanFeedback, ConfirmDialog, UploadButton } from './DeanCommon'
import { useDeanAction } from './deanActions'
import { readGrid, planCourseLoads, normalizeBlock, chunk } from './eduSuiteImport'

const groupLabel = course => course.year ? `Year ${course.year}${course.semester ? ` · ${course.semester}` : ''}` : 'Other recorded courses'
export const knownBlocks = (data, model) => [...new Set([...model.blocks.map(b => b.name), ...loadRows(data).map(l => l.block), ...(data.institutional || []).filter(r => r.kind === 'rosters').map(r => String(r.data.Block || ''))])].filter(b => b && b !== 'IRREGULAR').sort()

export default function DeanCourses({ data }) {
  const model = useMemo(() => deanRecords(data), [data])
  const catalog = useMemo(() => courseCatalog(data, model, curriculumCourse), [data, model])
  const directory = useMemo(() => deanDirectory(data, model), [data, model])
  const blocks = useMemo(() => knownBlocks(data, model), [data, model])
  const loads = useMemo(() => loadRows(data), [data])
  const [params, setParams] = useSearchParams()
  const { key: tab, nav } = useAcademicTabs({ items: [['courses', 'Course list'], ['loads', 'Course loads']], label: 'Course views' })
  const [detail, setDetail] = useWorkspaceViewState('dean-detail:records', null)
  const [assigning, setAssigning] = useState(null), [removing, setRemoving] = useState(null), [review, setReview] = useState(null)
  const [search, setSearch] = useState('')
  const action = useDeanAction()
  const show = params.get('show') || 'all'
  const setShow = value => { const next = new URLSearchParams(params); if (value === 'all') next.delete('show'); else next.set('show', value); setParams(next) }
  const loaded = catalog.filter(course => course.loads.length), unloaded = catalog.filter(course => !course.loads.length)
  const matches = course => `${course.code} ${course.title}`.toLowerCase().includes(search.trim().toLowerCase()) && (show === 'all' || (show === 'loaded') === Boolean(course.loads.length))
  const selected = typeof detail === 'string' && detail.startsWith('course:') ? catalog.find(course => course.code === detail.slice(7)) : null
  const groups = [...new Set(catalog.filter(matches).map(groupLabel))].sort((a, b) => (a.startsWith('Other') ? 1 : 0) - (b.startsWith('Other') ? 1 : 0) || a.localeCompare(b))
  const upload = async file => {
    action.setError(''); action.setNotice(null)
    try { setReview({ filename: file.name, plan: planCourseLoads(await readGrid(file), { instructors: directory.instructors, courses: catalog, loads, blocks }) }) }
    catch (failure) { action.setError(failure.message || 'The file could not be read.') }
  }
  const filters = <div className="dean-toolbar">
    <label className="academic-filter">Search courses<input className="form-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Course code or title" /></label>
    <div className="dean-segment" role="group" aria-label="Course load filter">{[['all', `All (${catalog.length})`], ['loaded', `Loaded (${loaded.length})`], ['unloaded', `Not yet loaded (${unloaded.length})`]].map(([value, label]) => <button key={value} className={show === value ? 'active' : ''} aria-pressed={show === value} onClick={() => setShow(value)}>{label}</button>)}</div>
  </div>
  return <>
    {nav}
    <DeanCards items={[
      { label: 'Courses', value: catalog.length, icon: BookOpen, to: '/records?tab=courses' },
      { label: 'Loaded courses', value: loaded.length, icon: ClipboardCheck, to: '/records?tab=loads&show=loaded' },
      { label: 'Not yet loaded', value: unloaded.length, icon: AlertTriangle, tone: 'amber', to: '/records?tab=loads&show=unloaded' },
      { label: 'Class loads', value: loads.length, icon: Layers, tone: 'green', to: '/records?tab=loads' }]} />
    <DeanFeedback action={action} />
    {tab === 'courses' && <Panel title="Course list" actions={<CsvButton headers={['Course', 'Title', 'Units', 'Year and semester', 'Instructors']} rows={catalog.map(c => [c.code, c.title, c.units, groupLabel(c), [...new Set(c.loads.map(l => l.instructorName))].join('; ')])} name="course-list" />}>
      {filters}
      {groups.map(label => <section className="dean-pill-group" key={label} aria-label={label}><h3>{label}</h3><div className="dean-pills">
        {catalog.filter(course => matches(course) && groupLabel(course) === label).map(course => <button key={course.code} className={`dean-pill${course.loads.length ? ' loaded' : ''}`} onClick={() => setDetail(`course:${course.code}`)} aria-label={`${course.code} ${course.title}, ${course.loads.length ? `loaded to ${new Set(course.loads.map(l => l.instructorId)).size} instructor(s)` : 'not yet loaded'}`}>
          <span className="dean-pill-code">{course.code}</span><span className="dean-pill-title">{course.title}</span><span className="dean-pill-state" aria-hidden="true">{course.loads.length ? `${new Set(course.loads.map(l => l.instructorId)).size} instr.` : 'Open'}</span>
        </button>)}
      </div></section>)}
      {!groups.length && <Empty>{catalog.length ? 'No course matches this search.' : 'No courses are recorded yet. Upload the course load or ask the System Admin to import the curriculum.'}</Empty>}
    </Panel>}
    {tab === 'loads' && <Panel title="Course loads" actions={<div className="academic-actions"><UploadButton label={<><FileUp size={15} aria-hidden="true" /> Upload course load</>} onFile={upload} disabled={!directory.managed || Boolean(action.busy)} /><CsvButton headers={['Course', 'Title', 'Instructor', 'Block', 'Semester']} rows={loads.map(l => [l.code, catalog.find(c => c.code === l.code)?.title || '', l.instructorName, l.block, l.semester])} name="course-loads" /></div>}>
      {!directory.managed && <p className="text-sm text-muted mb-16">Preview sample. Loading courses needs a signed-in Dean account.</p>}
      {filters}
      {[['unloaded', 'Not yet loaded', unloaded], ['loaded', 'Loaded', loaded]].filter(([value]) => show === 'all' || show === value).map(([value, title, list]) => <section key={value} className="dean-load-section" aria-label={title}>
        <h3>{title} <span className="text-muted">({list.filter(matches).length})</span></h3>
        {list.filter(matches).map(course => <article key={course.code} className={`dean-load-row${course.loads.length ? '' : ' empty'}`}>
          <button className="dean-load-course" onClick={() => setDetail(`course:${course.code}`)}><strong>{course.code}</strong><span>{course.title}</span><small className="text-muted">{groupLabel(course)}{course.units ? ` · ${course.units} units` : ''}</small></button>
          <div className="dean-chips">{course.loads.length ? course.loads.map(load => <span className="dean-chip" key={load.key}><GraduationCap size={14} aria-hidden="true" />{load.instructorName} · {load.block}{directory.managed && <button onClick={() => setRemoving({ ...load, title: course.title })} aria-label={`Remove ${load.instructorName} from ${course.code} ${load.block}`}><X size={13} aria-hidden="true" /></button>}</span>) : <span className="text-sm text-muted">No instructor loaded yet</span>}</div>
          {directory.managed && <button className="btn btn-secondary btn-sm" onClick={() => setAssigning(course)}><Plus size={15} aria-hidden="true" /> {course.loads.length ? 'Add instructor' : 'Load course'}</button>}
        </article>)}
        {!list.filter(matches).length && <Empty>{value === 'unloaded' ? 'Every listed course has an instructor.' : 'No course is loaded yet.'}</Empty>}
      </section>)}
    </Panel>}
    {selected && <CourseDialog course={selected} managed={directory.managed} onClose={() => setDetail(null)} onAssign={() => setAssigning(selected)} onRemove={load => setRemoving({ ...load, title: selected.title })} />}
    {typeof detail === 'string' && detail.startsWith('course:') && !selected && <DeanDialog title="Record unavailable" onClose={() => setDetail(null)} size="narrow"><Empty>This course is no longer in your records. Close this dialog and choose a current course.</Empty></DeanDialog>}
    {assigning && <AssignDialog course={assigning} instructors={directory.instructors} blocks={blocks} action={action} onClose={() => setAssigning(null)} />}
    {removing && <ConfirmDialog title="Remove course load" confirmLabel="Remove load" danger busy={action.busy} onClose={() => setRemoving(null)} onConfirm={async () => { if (await action.run('Removing course load', { action: 'load.remove', keys: [removing.key] }, () => ({ text: `${removing.instructorName} no longer teaches ${removing.code} for ${removing.block}.` }))) setRemoving(null) }}>
      <p>Remove <strong>{removing.instructorName}</strong> from <strong>{removing.code} — {removing.title}</strong> for block <strong>{removing.block}</strong>?</p><p className="text-sm text-muted">The class list for this block leaves the instructor's course. Published materials and recorded attempts stay in the records.</p>
    </ConfirmDialog>}
    {review && <LoadReview review={review} action={action} onClose={() => setReview(null)} />}
  </>
}

function CourseDialog({ course, managed, onClose, onAssign, onRemove }) {
  return <DeanDialog title={`${course.code} — ${course.title}`} subtitle={[groupLabel(course), course.units && `${course.units} units`, course.classification].filter(Boolean).join(' · ')} icon={BookOpen} onClose={onClose}
    footer={<>{managed && <button className="btn btn-primary" onClick={onAssign}><Plus size={15} aria-hidden="true" /> Add instructor</button>}<button className="btn btn-secondary" onClick={onClose}>Close</button></>}>
    <dl className="dean-facts">
      <div><dt>Instructors loaded</dt><dd>{new Set(course.loads.map(l => l.instructorId)).size}</dd></div>
      <div><dt>Registered students</dt><dd>{course.students}</dd></div>
      <div><dt>Syllabus</dt><dd>{course.approved ? 'Approved' : course.owners.length ? 'In preparation' : 'Not started'}</dd></div>
      {course.prerequisites && <div><dt>Prerequisites</dt><dd>{course.prerequisites}</dd></div>}
    </dl>
    <h3 className="dean-subhead">Course loads</h3>
    <Table headers={['Instructor', 'Block', 'Semester', 'Action']} rows={course.loads.map(load => [load.instructorName, load.block, load.semester || '—', managed ? <button key={load.key} className="btn btn-ghost btn-sm" onClick={() => onRemove({ ...load })}>Remove</button> : '—'])} empty="No instructor is loaded with this course yet." />
    {course.owners.length > 0 && <p className="text-sm text-muted mt-16">Syllabus prepared by {course.owners.join(', ')}.</p>}
  </DeanDialog>
}

function AssignDialog({ course, instructors, blocks, action, onClose }) {
  const active = instructors.filter(person => person.status !== 'suspended')
  const [teacher, setTeacher] = useState(active[0]?.id || ''), [chosen, setChosen] = useState([]), [extra, setExtra] = useState(''), [semester, setSemester] = useState(course.semester || ''), [problem, setProblem] = useState('')
  const typed = extra.split(/[,;]/).map(value => normalizeBlock(value, blocks)).filter(Boolean)
  const target = [...new Set([...chosen, ...typed])]
  const person = active.find(p => p.id === teacher)
  const replaced = target.map(block => course.loads.find(load => load.block === block && load.instructorId !== teacher)).filter(Boolean)
  const submit = async () => {
    setProblem('')
    if (!person) return setProblem('Choose an active instructor.')
    if (!target.length) return setProblem('Choose at least one block.')
    const saved = await action.run('Saving course load', { action: 'load.assign', filename: 'Course page', loads: target.map(block => ({ course_code: course.code, course_title: course.title, instructor_id: teacher, block, semester })) },
      result => ({ text: `${person.name} now teaches ${course.code} for ${target.join(', ')} (${result.created} new, ${result.updated} reassigned).` }))
    if (saved) onClose()
  }
  return <DeanDialog title={`Load ${course.code}`} subtitle={course.title} icon={ClipboardCheck} tone="purple" size="form" onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={Boolean(action.busy)}>{action.busy ? `${action.busy}…` : `Assign to ${target.length || ''} block${target.length === 1 ? '' : 's'}`}</button></>}>
    <div className="dean-form">
      {(problem || action.error) && <p role="alert" className="connected-pulse-warning">{problem || action.error}</p>}
      <label className="dean-field"><span>Instructor</span><select className="form-select" value={teacher} onChange={event => setTeacher(event.target.value)}>{active.map(p => <option key={p.id} value={p.id}>{p.name}{p.has_masters ? ' · Master’s' : ''}{p.specialization ? ` · ${p.specialization}` : ''}</option>)}</select>{!active.length && <small className="text-xs text-muted">Add an instructor on the Instructors page first.</small>}</label>
      <fieldset className="dean-block-picker"><legend>Blocks</legend>
        <div className="dean-chips">{blocks.map(block => { const owner = course.loads.find(load => load.block === block); return <label key={block} className={`dean-chip selectable${chosen.includes(block) ? ' selected' : ''}`}><input type="checkbox" checked={chosen.includes(block)} onChange={event => setChosen(prior => event.target.checked ? [...prior, block] : prior.filter(b => b !== block))} />{block}{owner && <small>· {owner.instructorName}</small>}</label> })}</div>
        <label className="dean-field"><span>Other blocks</span><input className="form-input" value={extra} onChange={event => setExtra(event.target.value)} placeholder="BSIT-3C, BSIT-4A" /></label>
      </fieldset>
      <label className="dean-field"><span>Semester</span><input className="form-input" value={semester} onChange={event => setSemester(event.target.value)} placeholder="1st Semester" /></label>
      {replaced.length > 0 && <p className="dean-warning">{replaced.map(load => `${load.block} is now taught by ${load.instructorName}`).join('; ')}. Assigning replaces that instructor for the block.</p>}
    </div>
  </DeanDialog>
}

function LoadReview({ review, action, onClose }) {
  const { loads } = review.plan
  const ready = loads.filter(load => load.status === 'new' || load.status === 'reassign')
  const count = status => loads.filter(load => load.status === status).length
  const apply = async () => {
    let created = 0, updated = 0
    for (const [index, part] of chunk(ready, 200).entries()) {
      const result = await action.run(`Adding course loads (${index + 1}/${Math.ceil(ready.length / 200)})`, { action: 'load.assign', filename: review.filename, loads: part.map(load => ({ course_code: load.course_code, course_title: load.course_title || undefined, instructor_id: load.instructor.id, block: load.block, semester: load.semester || undefined })) })
      if (!result) return
      created += result.created; updated += result.updated
    }
    action.setNotice({ text: `${review.filename}: ${created} course loads added and ${updated} reassigned. ${count('problem')} rows need attention in the file.` })
    onClose()
  }
  const label = { new: 'Add', reassign: 'Reassign', unchanged: 'Already loaded', problem: 'Needs attention' }
  return <DeanDialog title="Review course load upload" subtitle={`${review.filename} · header found on row ${review.plan.header}`} icon={FileUp} tone="purple" onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" onClick={apply} disabled={!ready.length || Boolean(action.busy)}>{action.busy ? `${action.busy}…` : `Add ${ready.length} course load${ready.length === 1 ? '' : 's'}`}</button></>}>
    {action.error && <p role="alert" className="connected-pulse-warning">{action.error}</p>}
    <div className="dean-review-counts">{['new', 'reassign', 'unchanged', 'problem'].map(status => <span key={status} className={`dean-tag dean-tag-${status}`}>{label[status]}: {count(status)}</span>)}</div>
    <p className="text-sm text-muted mb-16">Instructors are matched by email, employee ID, full name, then a unique surname. Nothing is saved until you add the loads.</p>
    <Table headers={['Row', 'Instructor in file', 'Matched account', 'Course', 'Block', 'Result']} rows={loads.map(load => [load.row, load.instructorText || '—', load.instructor ? `${load.instructor.name} (${load.match})` : '—', `${load.course_code}${load.course_title ? ` — ${load.course_title}` : ''}`, load.block || '—',
      <span key={load.row} className={`dean-tag dean-tag-${load.status}`}>{load.problem || (load.status === 'reassign' ? `Reassign from ${load.previous}` : label[load.status])}</span>])} empty="No course rows were found under the header." />
  </DeanDialog>
}
